'use client';

interface ComprobantesAdvancedFiltersProps {
  showAdvanced: boolean;
  fechaDesde: string;
  setFechaDesde: (v: string) => void;
  fechaHasta: string;
  setFechaHasta: (v: string) => void;
  montoMin: string;
  setMontoMin: (v: string) => void;
  montoMax: string;
  setMontoMax: (v: string) => void;
}

/** Panel de filtros avanzados (fecha y monto). El buscador y los filtros de tipo/SUNAT viven en la barra superior. */
export default function ComprobantesFilters({
  showAdvanced, fechaDesde, setFechaDesde, fechaHasta, setFechaHasta,
  montoMin, setMontoMin, montoMax, setMontoMax,
}: ComprobantesAdvancedFiltersProps) {
  if (!showAdvanced) return null;

  return (
    <div className="card p-4 animate-section">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            className="input w-full px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="input w-full px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monto Mínimo (S/.)</label>
          <input
            type="number"
            placeholder="0.00"
            value={montoMin}
            onChange={e => setMontoMin(e.target.value)}
            className="input w-full px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monto Máximo (S/.)</label>
          <input
            type="number"
            placeholder="1000.00"
            value={montoMax}
            onChange={e => setMontoMax(e.target.value)}
            className="input w-full px-2 py-1.5 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
