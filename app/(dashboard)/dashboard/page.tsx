'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import ExcelJS from 'exceljs';
import { DollarSign, TrendingUp, ShoppingCart, Utensils, Users, FileText, Sparkles, ShieldAlert, Loader2, Radio } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { SucursalSelector } from '@/components/ui/SucursalSelector';
import {
  getDashboardResumen, getVentasComparativo, getVentasPorHora,
  type DashboardResumenDto, type VentasResumenDto, type VentaPorHoraDto,
} from '@/lib/api/dashboard';
import { getVentas, type VentaDto } from '@/lib/api/ventas';
import { getClientes } from '@/lib/api/clientes';
import { toFechaParam } from '@/lib/api/reportes';

/* Recharts es pesado y solo corre en cliente — se carga aparte del bundle inicial. */
const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), {
  ssr: false,
  loading: () => <div className="h-44 animate-pulse bg-slate-100 rounded-lg" />,
});

const money = (n: number) => `S/. ${n.toFixed(2)}`;

function pctCambio(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

/** Lunes de la semana de `d` (semana con inicio Lima/Perú). */
function inicioSemana(d: Date): Date {
  const dia = d.getDay(); // 0=domingo .. 6=sábado
  const offset = dia === 0 ? 6 : dia - 1;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - offset);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  otro: 'Otro',
};

const METODO_BADGE: Record<string, string> = {
  efectivo: 'bg-amber-100 text-amber-800',
  tarjeta: 'bg-brand/10 text-brand',
  yape: 'bg-emerald-100 text-emerald-800',
  plin: 'bg-emerald-100 text-emerald-800',
  otro: 'bg-slate-100 text-slate-700',
};

const BRAND_COLOR = 'FF007542';

async function exportVentasExcel(ventas: VentaDto[], fecha: Date, usuario: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RestoPro';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Ventas', { views: [{ state: 'frozen', ySplit: 4 }] });

  const columnas = ['Código', 'Hora', 'Mesa', 'Comprobante', 'Nº Items', 'Método de Pago', 'Monto Total'];
  sheet.columns = [
    { key: 'codigo', width: 10 },
    { key: 'hora', width: 12 },
    { key: 'mesa', width: 14 },
    { key: 'comprobante', width: 18 },
    { key: 'items', width: 10 },
    { key: 'metodoPago', width: 16 },
    { key: 'total', width: 16 },
  ];

  // ── Encabezado (título + metadata) ──
  sheet.mergeCells(1, 1, 1, columnas.length);
  const tituloCell = sheet.getCell(1, 1);
  tituloCell.value = 'REPORTE DE VENTAS — RESTOPRO';
  tituloCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  tituloCell.alignment = { vertical: 'middle', horizontal: 'left' };
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR } };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, columnas.length);
  const subtituloCell = sheet.getCell(2, 1);
  const fechaTxt = fecha.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  subtituloCell.value = `Ventas del ${fechaTxt}  ·  Por: ${usuario}  ·  Total: ${ventas.length} venta${ventas.length === 1 ? '' : 's'}`;
  subtituloCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
  subtituloCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // ── Fila 3 en blanco como respiro visual ──

  // ── Encabezado de la tabla ──
  const headerRow = sheet.getRow(4);
  headerRow.values = columnas;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E8C45' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
  });
  headerRow.height = 20;

  // ── Filas de datos ──
  ventas.forEach((v, idx) => {
    const row = sheet.addRow({
      codigo: `S-${v.id}`,
      hora: new Date(v.pagadoAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      mesa: v.mesaNumero ? `Mesa ${v.mesaNumero}` : '—',
      comprobante: v.numeroComprobante ?? '—',
      items: v.items.reduce((acc, i) => acc + i.cantidad, 0),
      metodoPago: METODO_LABEL[v.metodoPago] ?? v.metodoPago,
      total: v.total,
    });

    row.getCell('codigo').alignment = { horizontal: 'center' };
    row.getCell('hora').alignment = { horizontal: 'center' };
    row.getCell('items').alignment = { horizontal: 'center' };
    row.getCell('metodoPago').alignment = { horizontal: 'center' };
    row.getCell('total').numFmt = '"S/." #,##0.00';
    row.getCell('total').alignment = { horizontal: 'right' };

    if (idx % 2 === 1) {
      columnas.forEach((_, i) => {
        row.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columnas.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ventas-${toFechaParam(fecha)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { triggerToast } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const [resumen, setResumen] = useState<DashboardResumenDto | null>(null);
  const [ventasHoy, setVentasHoy] = useState<VentasResumenDto | null>(null);
  const [ventasAyer, setVentasAyer] = useState<VentasResumenDto | null>(null);
  const [ventasMes, setVentasMes] = useState<VentasResumenDto | null>(null);
  const [ventasMesAnterior, setVentasMesAnterior] = useState<VentasResumenDto | null>(null);
  const [ventasPorHora, setVentasPorHora] = useState<VentaPorHoraDto[]>([]);
  const [ventasRecientes, setVentasRecientes] = useState<VentaDto[]>([]);
  const [clientesStats, setClientesStats] = useState<{ total: number; nuevos: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => new Date());

  const puedeVer = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const hoyStr = toFechaParam(new Date());
  const esHoy = toFechaParam(fechaSeleccionada) === hoyStr;

  useEffect(() => {
    if (!token || !puedeVer) return;
    if (isSuperAdmin && !sId) return;

    const lunes = inicioSemana(fechaSeleccionada);
    const fechaStr = toFechaParam(fechaSeleccionada);

    setLoading(true);
    setError(null);

    Promise.all([
      getDashboardResumen(token, sId ?? undefined),
      getVentasComparativo(token, fechaSeleccionada, sId ?? undefined),
      getVentasPorHora(token, fechaSeleccionada, sId ?? undefined),
      getVentas(token, { sucursalId: sId ?? undefined, fechaInicio: fechaStr, fechaFin: fechaStr }),
      getClientes(token),
    ])
      .then(([resumenRes, comparativoRes, horaRes, ventasRes, clientesRes]) => {
        setResumen(resumenRes);
        setVentasHoy(comparativoRes.hoy);
        setVentasAyer(comparativoRes.ayer);
        setVentasMes(comparativoRes.mesActual);
        setVentasMesAnterior(comparativoRes.mesAnterior);
        setVentasPorHora(horaRes);
        setVentasRecientes(ventasRes.slice().sort((a, b) => b.pagadoAt.localeCompare(a.pagadoAt)));
        setClientesStats({
          total: clientesRes.length,
          nuevos: clientesRes.filter(c => new Date(c.creadoEn) >= lunes).length,
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar el dashboard.');
      })
      .finally(() => setLoading(false));
  }, [token, sId, isSuperAdmin, puedeVer, fechaSeleccionada]);

  const pctVsAyer = useMemo(
    () => pctCambio(ventasHoy?.totalVentas ?? 0, ventasAyer?.totalVentas ?? 0),
    [ventasHoy, ventasAyer]
  );
  const pctVsMesAnterior = useMemo(
    () => pctCambio(ventasMes?.totalVentas ?? 0, ventasMesAnterior?.totalVentas ?? 0),
    [ventasMes, ventasMesAnterior]
  );

  const metodosPago = useMemo(() => {
    if (!ventasHoy || ventasHoy.totalVentas <= 0) return [];
    const entradas: { key: string; monto: number }[] = [
      { key: 'yape', monto: ventasHoy.totalYape },
      { key: 'plin', monto: ventasHoy.totalPlin },
      { key: 'tarjeta', monto: ventasHoy.totalTarjeta },
      { key: 'efectivo', monto: ventasHoy.totalEfectivo },
      { key: 'otro', monto: ventasHoy.totalOtro },
    ];
    return entradas
      .filter(e => e.monto > 0)
      .map(e => ({ ...e, pct: Math.round((e.monto / ventasHoy.totalVentas) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [ventasHoy]);

  const tipComercial = useMemo(() => {
    if (metodosPago.length === 0) return null;
    const top = metodosPago[0];
    return `${METODO_LABEL[top.key] ?? top.key} lidera los cobros con ${top.pct}% del total.`;
  }, [metodosPago]);

  if (!puedeVer) {
    return (
      <div className="card-lg max-w-md mx-auto my-16 p-8 text-center space-y-3 animate-section">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Acceso restringido</h3>
        <p className="text-xs text-slate-500">Solo el <strong>administrador</strong> puede ver el dashboard ejecutivo.</p>
      </div>
    );
  }

  const kpis: { label: string; icon: typeof DollarSign; color: string; value: string; sub: string; live?: boolean }[] = [
    {
      label: esHoy ? 'Ventas del Día' : 'Ventas del Día Elegido', icon: DollarSign, color: '#007542',
      value: money(ventasHoy?.totalVentas ?? 0),
      sub: pctVsAyer === null ? 'Sin ventas el día anterior para comparar' : `${pctVsAyer >= 0 ? '+' : ''}${pctVsAyer.toFixed(1)}% vs día anterior`,
    },
    {
      label: 'Ventas del Mes', icon: TrendingUp, color: '#1E8C45',
      value: money(ventasMes?.totalVentas ?? 0),
      sub: pctVsMesAnterior === null ? 'Sin ventas el mes anterior para comparar' : `${pctVsMesAnterior >= 0 ? '+' : ''}${pctVsMesAnterior.toFixed(1)}% vs mes anterior`,
    },
    {
      label: 'Pedidos Activos', icon: ShoppingCart, color: '#3AA346', live: true,
      value: `${resumen?.pedidosEnCocinaAhora ?? 0}`,
      sub: `${resumen?.pedidosHoy ?? 0} pedidos hoy`,
    },
    {
      label: 'Ticket Promedio', icon: Utensils, color: '#58BB43',
      value: money(ventasHoy?.ticketPromedio ?? 0),
      sub: esHoy ? 'Sobre ventas cobradas hoy' : 'Sobre ventas del día elegido',
    },
    {
      label: 'Clientes CRM', icon: Users, color: '#1E8C45',
      value: `${clientesStats?.total ?? 0}`,
      sub: `+${clientesStats?.nuevos ?? 0} nuevos esa semana`,
    },
  ];

  return (
    <div className="space-y-5 animate-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Resumen Ejecutivo de Ventas</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Monitoreo de operaciones gastronómicas — RestoPro Perú.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={toFechaParam(fechaSeleccionada)}
            max={hoyStr}
            onChange={e => e.target.value && setFechaSeleccionada(new Date(`${e.target.value}T00:00:00`))}
            className="input px-3 py-1.5 text-xs"
          />
          <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />
        </div>
      </div>

      {isSuperAdmin && !sId ? (
        <div className="card-lg p-12 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-slate-500">Elige una sucursal para ver su dashboard.</p>
        </div>
      ) : loading ? (
        <div className="card-lg p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-brand animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Cargando dashboard...</p>
        </div>
      ) : error ? (
        <div className="card-lg p-6 border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-700 font-medium">{error}</p>
        </div>
      ) : (
      <>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="card px-4 py-3 hover:shadow-md transition-all group duration-300">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold tracking-wider uppercase">{kpi.label}</span>
                <span className="flex items-center gap-1.5">
                  {kpi.live && (
                    <span title="En vivo">
                      <Radio className="h-5 w-5 text-rose-500 pulse-active" />
                    </span>
                  )}
                  <Icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" style={{ color: kpi.color }} />
                </span>
              </div>
              <p className="text-base font-bold text-slate-800 mt-1.5 font-mono">{kpi.value}</p>
              <p className="text-[10px] text-slate-400 mt-1">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue chart */}
        <div className="card p-4 lg:col-span-8 space-y-3">
          <div className="pb-2 border-b border-slate-200">
            <h4 className="text-xs font-semibold text-slate-800">Curva de Ingresos Diarios (S/.)</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Ingresos cobrados {esHoy ? 'hoy' : 'ese día'}, acumulados por hora
            </p>
          </div>
          <RevenueChart ventasPorHora={ventasPorHora} esHoy={esHoy} />
        </div>

        {/* Payment methods */}
        <div className="card p-4 lg:col-span-4 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-800">Métodos de Pago</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Sobre las ventas cobradas {esHoy ? 'hoy' : 'ese día'}</p>
          </div>
          {metodosPago.length === 0 ? (
            <p className="text-[11px] text-slate-400">Todavía no hay ventas cobradas {esHoy ? 'hoy' : 'ese día'}.</p>
          ) : (
            <div className="space-y-3">
              {metodosPago.map(m => (
                <div key={m.key}>
                  <div className="flex justify-between text-[11px] text-slate-700 font-medium mb-1">
                    <span>{METODO_LABEL[m.key] ?? m.key}</span>
                    <span className="font-mono">{m.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.key === 'efectivo' ? 'bg-amber-500' : m.key === 'tarjeta' ? 'bg-brand' : 'bg-emerald-500'}`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {tipComercial && (
            <div className="bg-brand/10 border border-brand/20 p-3 rounded-lg space-y-1">
              <p className="text-[11px] font-semibold text-brand flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 shrink-0" /> Tip Comercial
              </p>
              <p className="text-[10px] text-slate-600 leading-snug">{tipComercial}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sales history */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="text-xs font-semibold text-gray-800">Ventas Recientes Registradas (POS)</h4>
            <p className="text-[10px] text-gray-400">Ventas cobradas {esHoy ? 'hoy' : 'ese día'}</p>
          </div>
          <button
            onClick={() => {
              if (ventasRecientes.length === 0) { triggerToast('No hay ventas para exportar.', 'info'); return; }
              exportVentasExcel(ventasRecientes, fechaSeleccionada, currentUser?.name ?? '—');
            }}
            className="btn-ghost"
          >
            <FileText className="h-3 w-3" /> Exportar (.XLSX)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Hora en Lima</th>
                <th className="p-3">Mesa Destino</th>
                <th className="p-3">Comprobante</th>
                <th className="p-3">Nº Items</th>
                <th className="p-3">Método de Pago</th>
                <th className="p-3 text-right">Monto Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventasRecientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">Todavía no hay ventas cobradas {esHoy ? 'hoy' : 'ese día'}.</td>
                </tr>
              )}
              {ventasRecientes.map(v => (
                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 font-mono font-semibold text-gray-800">S-{v.id}</td>
                  <td className="p-3 text-gray-500">
                    {new Date(v.pagadoAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3">
                    <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                      {v.mesaNumero ? `Mesa ${v.mesaNumero}` : '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    {v.numeroComprobante ? (
                      <span className="font-mono text-[11px] text-slate-600">{v.numeroComprobante}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="p-3 font-mono">{v.items.reduce((acc, i) => acc + i.cantidad, 0)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${METODO_BADGE[v.metodoPago] ?? 'bg-slate-100 text-slate-700'}`}>
                      {METODO_LABEL[v.metodoPago] ?? v.metodoPago}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-gray-900">{money(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
