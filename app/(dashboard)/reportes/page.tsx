'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import { exportClientes } from '@/lib/reportes/excelResumen';
import { METODO_PAGO_LABEL } from '@/lib/reportes/excel';
import { CalendarRange, Download, FileSpreadsheet, Loader2, TrendingUp, TrendingDown, Wallet, Percent, Receipt, Ticket } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { SucursalSelector, Select } from '@/components/ui';
import { ReportesExcelModal } from '@/components/reportes/ReportesExcelModal';
import { DesgloseNotas } from '@/components/reportes/DesgloseNotas';
import { getUsuarios, type Usuario } from '@/lib/api/usuarios';
import {
  getReporteResumen, getRankingProductos, getReporteVentasPeriodo, getReporteClientes, toFechaParam,
  type ReporteResumenDto, type RankingProductosDto, type ReporteVentasDto, type KpiVentasDto,
} from '@/lib/api/reportes';
import { PERIODOS, rangoPeriodo, parseFecha, diasEnRango, type PeriodoRapido } from '@/lib/reportes/periodos';

// Paleta de la marca (verdes) con plomo como neutro, sin colores extra que compitan.
const CATEGORY_COLORS = ['bg-brand', 'bg-brand-hover', 'bg-brand-subtle', 'bg-brand-accent', 'bg-slate-400', 'bg-slate-300'];

// Recharts necesita hex; coinciden con los tokens de design-tokens.css.
const COLOR_VENTAS = '#007542';
const COLOR_IGV = '#94a3b8';

const DOC_META: Record<string, { label: string; color: string }> = {
  boleta:       { label: 'Boletas',          color: '#007542' },
  factura:      { label: 'Facturas',         color: '#094127' },
  ticket:       { label: 'Notas de venta',   color: '#58BB43' },
  nota_credito: { label: 'Notas de crédito', color: '#94a3b8' },
  nota_debito:  { label: 'Notas de débito',  color: '#cbd5e1' },
};

/** Roles que realmente cobran/atienden una venta — excluye cocinero, repartidor, etc. */
const ROLES_VISIBLES = ['admin', 'cajero', 'mozo'];

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtMinutos = (min: number | null) => (min == null ? 'Sin datos' : `${Math.round(min)} min`);
const fmtHora24 = (h: number) => `${String(h).padStart(2, '0')}:00`;

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function calcTrend(actual: number, anterior: number): { texto: string; sube: boolean } | null {
  if (anterior === 0) return actual === 0 ? null : { texto: 'Nuevo', sube: true };
  const diff = ((actual - anterior) / Math.abs(anterior)) * 100;
  return { texto: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`, sube: diff >= 0 };
}

interface PuntoGrafico { etiqueta: string; ventas: number; igv: number }

/** Una barra por día (rango corto) o por mes (rango largo), rellenando los períodos sin ventas con 0. */
function armarSerie(desde: string, hasta: string, diaria: ReporteVentasDto['diaria']): PuntoGrafico[] {
  const porDia = new Map(diaria.map(d => [d.fecha, d]));
  const dias = diasEnRango(desde, hasta);
  const inicio = parseFecha(desde);

  if (dias > 62) {
    const meses = new Map<string, PuntoGrafico>();
    for (let i = 0; i < dias; i++) {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!meses.has(key)) meses.set(key, { etiqueta: MESES_CORTOS[d.getMonth()], ventas: 0, igv: 0 });
      const p = meses.get(key)!;
      const v = porDia.get(toFechaParam(d));
      if (v) { p.ventas += v.ventas; p.igv += v.igv; }
    }
    return [...meses.values()];
  }

  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const v = porDia.get(toFechaParam(d));
    const etiqueta = dias <= 7
      ? DIAS_CORTOS[d.getDay()]
      : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { etiqueta, ventas: v?.ventas ?? 0, igv: v?.igv ?? 0 };
  });
}

function KpiCard({ icon, label, value, actual, anterior, detalle }: {
  icon: React.ReactNode; label: string; value: string; actual: number; anterior: number; detalle?: string;
}) {
  const trend = calcTrend(actual, anterior);
  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">{icon}</div>
        {trend && (
          <span
            title="Comparado con el período anterior de igual duración"
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.sube ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
          >
            {trend.sube ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.texto}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{label}</p>
        <p className="text-xl font-mono font-bold text-slate-800 leading-tight">{value}</p>
        {detalle && <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{detalle}</p>}
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const [periodo, setPeriodo] = useState<PeriodoRapido | 'personalizado'>('mes');
  const [showCustom, setShowCustom] = useState(false);
  const [draftDesde, setDraftDesde] = useState('');
  const [draftHasta, setDraftHasta] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() => rangoPeriodo('mes').desde);
  const [fechaFin, setFechaFin] = useState(() => rangoPeriodo('mes').hasta);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [reporte, setReporte] = useState<ReporteResumenDto | null>(null);
  const [ranking, setRanking] = useState<RankingProductosDto | null>(null);
  const [ventas, setVentas] = useState<ReporteVentasDto | null>(null);
  const [rankingTab, setRankingTab] = useState<'top' | 'bottom'>('top');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [exportandoClientes, setExportandoClientes] = useState(false);

  // Los usuarios dependen de la sucursal; al cambiarla se reinicia el filtro.
  useEffect(() => {
    if (!token || !sId) return;
    setUsuarioId(null);
    getUsuarios(token, { sucursalId: sId })
      .then(data => setUsuarios(data.filter(u => ROLES_VISIBLES.includes(u.rolNombre.toLowerCase()))))
      .catch(() => setUsuarios([]));
  }, [token, sId]);

  useEffect(() => {
    if (!token || !sId) return;
    let cancelado = false;
    setLoading(true);
    setError(false);
    const filtros = { sucursalId: sId, fechaInicio, fechaFin, usuarioId: usuarioId ?? undefined };
    Promise.all([
      getReporteResumen(token, filtros),
      getRankingProductos(token, filtros),
      getReporteVentasPeriodo(token, filtros),
    ])
      .then(([resumenRes, rankingRes, ventasRes]) => {
        if (cancelado) return;
        setReporte(resumenRes);
        setRanking(rankingRes);
        setVentas(ventasRes);
      })
      .catch(() => { if (!cancelado) setError(true); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [token, sId, fechaInicio, fechaFin, usuarioId]);

  const elegirPeriodo = (p: PeriodoRapido) => {
    const r = rangoPeriodo(p);
    setPeriodo(p);
    setShowCustom(false);
    setFechaInicio(r.desde);
    setFechaFin(r.hasta);
  };

  // Al abrir "Personalizar" el borrador arranca con el rango vigente (no vacío).
  const togglePersonalizar = () => {
    if (!showCustom) { setDraftDesde(fechaInicio); setDraftHasta(fechaFin); }
    setShowCustom(v => !v);
  };

  const borradorValido = !!draftDesde && !!draftHasta && draftDesde <= draftHasta;
  const borradorCambio = draftDesde !== fechaInicio || draftHasta !== fechaFin;

  const aplicarPersonalizado = () => {
    if (!borradorValido) return;
    setPeriodo('personalizado');
    setFechaInicio(draftDesde);
    setFechaFin(draftHasta);
  };

  const serie = useMemo(
    () => (ventas ? armarSerie(fechaInicio, fechaFin, ventas.diaria) : []),
    [ventas, fechaInicio, fechaFin]
  );
  const donut = useMemo(
    () => (ventas?.documentos ?? []).map(d => ({
      name: DOC_META[d.tipo]?.label ?? d.tipo,
      value: d.cantidad,
      color: DOC_META[d.tipo]?.color ?? '#94a3b8',
    })),
    [ventas]
  );

  const totalMedios = ventas?.mediosPago.reduce((a, m) => a + m.total, 0) ?? 0;
  const totalCategorias = reporte?.categorias.reduce((a, c) => a + c.totalVendido, 0) ?? 0;

  const exportarClientes = async () => {
    if (!token || !sId) return;
    setExportandoClientes(true);
    try {
      const todos = await getReporteClientes(token, { sucursalId: sId, fechaInicio, fechaFin, usuarioId: usuarioId ?? undefined });
      const usuarioNombre = usuarioId ? usuarios.find(u => u.id === usuarioId)?.nombre : null;
      await exportClientes(
        todos,
        {
          generadoPor: session?.user?.name ?? 'Usuario',
          contexto: `Sucursal: ${sucursales.find(s => s.id === sId)?.nombre ?? '—'}  ·  ${fechaInicio} al ${fechaFin}  ·  Usuario: ${usuarioNombre ?? 'Todos'}`,
        },
        `resumen-clientes-${fechaInicio}-a-${fechaFin}`
      );
      triggerToast('Reporte descargado como archivo Excel.', 'success');
    } catch {
      triggerToast('No se pudo generar el archivo Excel.', 'error');
    } finally {
      setExportandoClientes(false);
    }
  };
  const maxAforo = Math.max(1, ...(reporte?.aforo.map(a => a.cantidad) ?? [0]));
  const actual: KpiVentasDto | undefined = ventas?.actual;
  const anterior: KpiVentasDto | undefined = ventas?.anterior;
  const sucursalNombre = sucursales.find(s => s.id === sId)?.nombre ?? '—';
  const tituloGrafico = diasEnRango(fechaInicio, fechaFin) > 62 ? 'Ventas por mes' : 'Ventas por día';

  return (
    <div className="space-y-4 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Módulo de Reportería del Sistema</h3>
          <p className="text-xs text-gray-500">Visualizaciones avanzadas para decisiones corporativas mensuales.</p>
        </div>
        <button onClick={() => setShowExcel(true)} disabled={!sId} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
          <FileSpreadsheet className="h-4 w-4" /> Reportes Excel
        </button>
      </div>

      {/* Filtros: período, sucursal (solo superadmin) y usuario */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs w-fit">
          {PERIODOS.map(p => (
            <button
              key={p.key}
              onClick={() => elegirPeriodo(p.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${periodo === p.key ? 'bg-brand text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={togglePersonalizar}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 ${periodo === 'personalizado' ? 'bg-brand text-white shadow-xs' : showCustom ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Personalizar
          </button>
        </div>

        <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />

        <div className="w-full sm:w-52">
          <Select value={usuarioId ?? ''} onChange={e => setUsuarioId(e.target.value ? Number(e.target.value) : null)} aria-label="Usuario">
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </Select>
        </div>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 w-fit text-xs shadow-xs">
          <input type="date" value={draftDesde} max={draftHasta || toFechaParam(new Date())}
            onChange={e => setDraftDesde(e.target.value)} className="input px-2 py-1.5 text-xs" aria-label="Desde" />
          <span className="text-slate-400">→</span>
          <input type="date" value={draftHasta} min={draftDesde} max={toFechaParam(new Date())}
            onChange={e => setDraftHasta(e.target.value)} className="input px-2 py-1.5 text-xs" aria-label="Hasta" />
          <button
            onClick={aplicarPersonalizado}
            disabled={!borradorValido || !borradorCambio}
            className="btn-primary text-[11px] px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>
        </div>
      )}

      {loading && (
        <div className="card-lg p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-brand animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Cargando reportes...</p>
        </div>
      )}

      {!loading && error && (
        <div className="card-lg p-6 border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-700 font-medium">No se pudo cargar el reporte. Intenta de nuevo.</p>
        </div>
      )}

      {!loading && !error && actual && anterior && (
        <>
          {/* KPIs con tendencia vs. el período anterior */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<Wallet className="h-4 w-4" />} label="Ventas netas (inc. IGV)" value={money(actual.totalVentas)}
              actual={actual.totalVentas} anterior={anterior.totalVentas}
              detalle={[
                `Bruto ${money(actual.totalBruto)}`,
                actual.ncPeriodo > 0 ? `− NC ${money(actual.ncPeriodo)}` : '',
                actual.ndPeriodo > 0 ? `+ ND ${money(actual.ndPeriodo)}` : '',
              ].filter(Boolean).join(' ')}
            />
            <KpiCard icon={<Percent className="h-4 w-4" />} label="IGV" value={money(actual.totalIgv)} actual={actual.totalIgv} anterior={anterior.totalIgv} />
            <KpiCard icon={<Receipt className="h-4 w-4" />} label="Documentos emitidos" value={actual.documentos.toLocaleString('es-PE')} actual={actual.documentos} anterior={anterior.documentos} />
            <KpiCard icon={<Ticket className="h-4 w-4" />} label="Promedio por venta" value={money(actual.ticketPromedio)} actual={actual.ticketPromedio} anterior={anterior.ticketPromedio} />
          </div>

          <DesgloseNotas
            ncPeriodo={actual.ncPeriodo}
            ndPeriodo={actual.ndPeriodo}
            ncAnteriores={actual.ncAnteriores}
            ndAnteriores={actual.ndAnteriores}
            periodo="del período"
          />

          {/* Ventas por día/mes + distribución de documentos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card-lg p-4 space-y-3 lg:col-span-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{tituloGrafico}</h4>
                <p className="text-[11px] text-slate-400">Comparativa de ventas e IGV</p>
              </div>
              {actual.documentos === 0 ? (
                <p className="text-xs text-slate-400 italic py-16 text-center">Sin ventas en el rango seleccionado.</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serie} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="etiqueta" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value, name) => [money(Number(value)), name === 'ventas' ? 'Ventas' : 'IGV']}
                        cursor={{ fill: 'rgba(0,117,66,0.06)' }}
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                      />
                      <Bar dataKey="ventas" fill={COLOR_VENTAS} radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="igv" fill={COLOR_IGV} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_VENTAS }} />Ventas</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_IGV }} />IGV</span>
              </div>
            </div>

            <div className="card-lg p-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Distribución de documentos</h4>
                <p className="text-[11px] text-slate-400">Cantidad por tipo de comprobante</p>
              </div>
              {donut.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-16 text-center">Sin documentos en el rango seleccionado.</p>
              ) : (
                <>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donut} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2} stroke="none">
                          {donut.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-1.5">
                    {donut.map(d => (
                      <li key={d.name} className="flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                        <span className="font-mono font-bold text-slate-800">{d.value}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && !error && reporte && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Categorías más vendidas */}
          <div className="card-lg p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Categorías Más Vendidas</h4>
            {reporte.categorias.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Sin ventas en el rango seleccionado.</p>
            ) : (
              <div className="space-y-3">
                {reporte.categorias.map((cat, i) => {
                  const pct = totalCategorias > 0 ? Math.round((cat.totalVendido / totalCategorias) * 100) : 0;
                  return (
                    <div key={cat.categoriaNombre}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="truncate pr-2">{cat.categoriaNombre}</span>
                        <span className="font-mono font-bold shrink-0">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tiempos promedio de operación (no dependen del usuario) */}
          <div className="card-lg p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tiempos Promedio Operación</h4>
            <div className="space-y-4">
              {[
                { label: 'Preparación en Cocina', sub: 'Desde que se pide el plato hasta "listo"', value: reporte.tiempos.prepCocinaMinutos, color: 'text-emerald-600' },
                { label: 'Tiempo Permanencia Mesa', sub: 'Total permanencia comensal', value: reporte.tiempos.permanenciaMesaMinutos, color: 'text-amber-600' },
                { label: 'Despacho Delivery', sub: 'Desde el pedido hasta el cobro (aprox.)', value: reporte.tiempos.despachoDeliveryMinutos, color: 'text-indigo-600' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center gap-3">
                  <div className="text-xs text-slate-600 min-w-0">
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.sub}</p>
                  </div>
                  <span className={`font-mono text-sm font-bold shrink-0 ${item.color}`}>{fmtMinutos(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Distribución de aforo por horarios (no depende del usuario) */}
          <div className="card-lg p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Distribución de Aforo por Horarios</h4>
            {reporte.aforo.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Sin pedidos en el rango seleccionado.</p>
            ) : (
              <div className="flex justify-between items-end h-28 pt-2 gap-1 overflow-x-auto">
                {reporte.aforo.map(bar => (
                  <div key={bar.hora} className="flex-1 min-w-[18px] flex flex-col items-center gap-1" title={`${fmtHora24(bar.hora)} — ${bar.cantidad} pedidos`}>
                    <div className="w-full bg-brand rounded" style={{ height: `${Math.max(4, (bar.cantidad / maxAforo) * 96)}px` }} />
                    <span className="text-[8px] text-slate-500 font-mono">{fmtHora24(bar.hora)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && ranking && ventas && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ranking de Productos</h4>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setRankingTab('top')}
                className={`text-[11px] font-semibold px-3 py-1 rounded-md transition-colors ${rankingTab === 'top' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}
              >
                Top 10
              </button>
              <button
                onClick={() => setRankingTab('bottom')}
                className={`text-[11px] font-semibold px-3 py-1 rounded-md transition-colors ${rankingTab === 'bottom' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
              >
                Menos vendidos
              </button>
            </div>
          </div>
          {(rankingTab === 'top' ? ranking.top : ranking.bottom).length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">Sin ventas en el rango seleccionado.</p>
          ) : (
            <div>
              {(rankingTab === 'top' ? ranking.top : ranking.bottom).map((p, i) => (
                <div key={p.productoId} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 w-5">{i + 1}.</span>
                    <span className="text-xs text-slate-700 truncate">{p.productoNombre}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">{p.cantidadVendida} und.</span>
                    <span className="text-xs font-mono font-bold text-slate-800">S/. {p.totalVendido.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medios de pago (sin notas de crédito/débito) */}
        <div className="card-lg p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Medios de Pago</h4>
          {ventas.mediosPago.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">Sin pagos en el rango seleccionado.</p>
          ) : (
            <div className="space-y-3">
              {ventas.mediosPago.map((m, i) => {
                const pct = totalMedios > 0 ? Math.round((m.total / totalMedios) * 100) : 0;
                return (
                  <div key={m.medio}>
                    <div className="flex justify-between items-baseline text-xs text-slate-600 mb-1 gap-3">
                      <span className="font-semibold">{METODO_PAGO_LABEL[m.medio] ?? m.medio}
                        <span className="ml-2 text-[10px] font-mono font-normal text-slate-400">{m.cantidad} op.</span>
                      </span>
                      <span className="font-mono shrink-0"><b className="text-slate-800">{money(m.total)}</b> <span className="text-slate-400">· {pct}%</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>

        {/* Resumen por cliente: top 10 por monto; el listado completo va en el Excel */}
        <div className="card-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Resumen por Cliente</h4>
              <p className="text-[11px] text-slate-400">Top 10 por monto · montos netos</p>
            </div>
            <button
              onClick={exportarClientes}
              disabled={exportandoClientes || ventas.clientes.length === 0}
              className="btn-secondary text-[11px] px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportandoClientes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Exportar todos
            </button>
          </div>
          {ventas.clientes.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">Sin ventas en el rango seleccionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                    <th className="text-left font-bold py-1.5 pr-3">Cliente</th>
                    <th className="text-center font-bold py-1.5 px-3">N° Docs</th>
                    <th className="text-right font-bold py-1.5 px-3">Subtotal</th>
                    <th className="text-right font-bold py-1.5 px-3">IGV</th>
                    <th className="text-right font-bold py-1.5 pl-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.clientes.map(c => (
                    <tr key={`${c.numDoc ?? '-'}-${c.cliente}`} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-3 text-slate-700">
                        <span className="font-semibold">{c.cliente}</span>
                        {c.numDoc && <span className="ml-2 text-[10px] font-mono text-slate-400">{c.numDoc}</span>}
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono text-slate-500">{c.documentos}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">{money(c.subtotal)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">{money(c.igv)}</td>
                      <td className="py-1.5 pl-3 text-right font-mono font-bold text-slate-800">{money(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      <ReportesExcelModal
        open={showExcel}
        onClose={() => setShowExcel(false)}
        token={token}
        sucursalId={sId}
        sucursalNombre={sucursalNombre}
        usuarios={usuarios}
        desdeInicial={fechaInicio}
        hastaInicial={fechaFin}
        usuarioInicial={usuarioId}
      />
    </div>
  );
}
