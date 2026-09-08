'use client';

import { useEffect, useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useApp } from '@/context/AppContext';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';
import { SucursalSelector } from '@/components/ui';
import { getReporteResumen, toFechaParam, type ReporteResumenDto } from '@/lib/api/reportes';

const CATEGORY_COLORS = ['bg-brand', 'bg-brand-hover', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-rose-500'];

/** Primer día del mes actual, en horario local (no UTC). */
function primerDiaDelMes(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const fmtMinutos = (min: number | null) => (min == null ? 'Sin datos' : `${Math.round(min)} min`);
const fmtHora24 = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function ReportesPage() {
  const { triggerToast } = useApp();
  const { token, isSuperAdmin, sucursales, sId, selectSucursal } = useSucursalSelector();

  const [fechaInicio, setFechaInicio] = useState(() => toFechaParam(primerDiaDelMes()));
  const [fechaFin, setFechaFin] = useState(() => toFechaParam(new Date()));
  const [reporte, setReporte] = useState<ReporteResumenDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!token || !sId) return;
    setLoading(true);
    setError(false);
    getReporteResumen(token, { sucursalId: sId, fechaInicio, fechaFin })
      .then(setReporte)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token, sId, fechaInicio, fechaFin]);

  const totalCategorias = reporte?.categorias.reduce((a, c) => a + c.totalVendido, 0) ?? 0;
  const maxAforo = Math.max(1, ...(reporte?.aforo.map(a => a.cantidad) ?? [0]));

  const handleExportExcel = async () => {
    if (!reporte) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'RestoPro';
      workbook.created = new Date();

      const catSheet = workbook.addWorksheet('Categorías más vendidas');
      catSheet.columns = [
        { header: 'Categoría', key: 'nombre', width: 30 },
        { header: 'Cantidad vendida', key: 'cantidad', width: 18 },
        { header: 'Total vendido (S/.)', key: 'total', width: 20 },
      ];
      reporte.categorias.forEach(c =>
        catSheet.addRow({ nombre: c.categoriaNombre, cantidad: c.cantidadVendida, total: c.totalVendido })
      );
      catSheet.getRow(1).font = { bold: true };
      catSheet.getColumn('total').numFmt = '"S/." #,##0.00';

      const tiemposSheet = workbook.addWorksheet('Tiempos de operación');
      tiemposSheet.columns = [
        { header: 'Métrica', key: 'metrica', width: 32 },
        { header: 'Minutos promedio', key: 'valor', width: 20 },
      ];
      tiemposSheet.addRow({ metrica: 'Preparación en Cocina', valor: reporte.tiempos.prepCocinaMinutos ?? 'Sin datos' });
      tiemposSheet.addRow({ metrica: 'Tiempo Permanencia Mesa', valor: reporte.tiempos.permanenciaMesaMinutos ?? 'Sin datos' });
      tiemposSheet.addRow({ metrica: 'Despacho Delivery (aprox.)', valor: reporte.tiempos.despachoDeliveryMinutos ?? 'Sin datos' });
      tiemposSheet.getRow(1).font = { bold: true };

      const aforoSheet = workbook.addWorksheet('Aforo por hora');
      aforoSheet.columns = [
        { header: 'Hora', key: 'hora', width: 10 },
        { header: 'Cantidad de pedidos', key: 'cantidad', width: 20 },
      ];
      reporte.aforo.forEach(a => aforoSheet.addRow({ hora: fmtHora24(a.hora), cantidad: a.cantidad }));
      aforoSheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-${fechaInicio}-a-${fechaFin}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      triggerToast('Reporte descargado como archivo Excel.', 'success');
    } catch {
      triggerToast('No se pudo generar el archivo Excel.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Módulo de Reportería del Sistema</h3>
          <p className="text-xs text-gray-500">Visualizaciones avanzadas para decisiones corporativas mensuales.</p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={!reporte || exporting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
          ) : (
            <><Share2 className="h-4 w-4" /> Exportar a Excel (.xlsx)</>
          )}
        </button>
      </div>

      {/* Filtros: sucursal (solo superadmin) y rango de fechas */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SucursalSelector visible={isSuperAdmin} sucursales={sucursales} sId={sId} onChange={selectSucursal} />
        <div className="flex items-center gap-2 text-xs">
          <label className="text-slate-500 font-semibold">Desde</label>
          <input type="date" value={fechaInicio} max={fechaFin} onChange={e => setFechaInicio(e.target.value)} className="input px-2 py-1.5 text-xs" />
          <label className="text-slate-500 font-semibold">Hasta</label>
          <input type="date" value={fechaFin} min={fechaInicio} max={toFechaParam(new Date())} onChange={e => setFechaFin(e.target.value)} className="input px-2 py-1.5 text-xs" />
        </div>
      </div>

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

      {!loading && !error && reporte && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Categorías más vendidas */}
          <div className="card-lg p-5 space-y-4">
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

          {/* Tiempos promedio de operación */}
          <div className="card-lg p-5 space-y-4">
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

          {/* Distribución de aforo por horarios */}
          <div className="card-lg p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Distribución de Aforo por Horarios</h4>
            {reporte.aforo.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Sin pedidos en el rango seleccionado.</p>
            ) : (
              <div className="flex justify-between items-end h-28 pt-2 gap-1 overflow-x-auto">
                {reporte.aforo.map(bar => (
                  <div key={bar.hora} className="flex-1 min-w-[18px] flex flex-col items-center gap-1" title={`${fmtHora24(bar.hora)} — ${bar.cantidad} pedidos`}>
                    <div
                      className="w-full bg-brand rounded"
                      style={{ height: `${Math.max(4, (bar.cantidad / maxAforo) * 96)}px` }}
                    />
                    <span className="text-[8px] text-slate-500 font-mono">{fmtHora24(bar.hora)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
