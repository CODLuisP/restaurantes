'use client';

import { Search, X } from 'lucide-react';
import type { EstadoSunat, TipoComprobante } from './types';

interface ComprobantesFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  filterTipo: 'Todos' | TipoComprobante;
  setFilterTipo: (v: 'Todos' | TipoComprobante) => void;
  filterEstado: 'Todos' | EstadoSunat;
  setFilterEstado: (v: 'Todos' | EstadoSunat) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  fechaDesde: string;
  setFechaDesde: (v: string) => void;
  fechaHasta: string;
  setFechaHasta: (v: string) => void;
  montoMin: string;
  setMontoMin: (v: string) => void;
  montoMax: string;
  setMontoMax: (v: string) => void;
}

/** Búsqueda, filtros por tipo/estado SUNAT y filtros avanzados por fecha y monto. */
export default function ComprobantesFilters({
  search, setSearch, filterTipo, setFilterTipo, filterEstado, setFilterEstado,
  showAdvanced, setShowAdvanced, fechaDesde, setFechaDesde, fechaHasta, setFechaHasta,
  montoMin, setMontoMin, montoMax, setMontoMax,
}: ComprobantesFiltersProps) {
  return (
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, RUC/DNI o nº comprobante..."
              className="input w-full pl-9 pr-3 py-2 text-xs"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Tipo:</span>
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value as any)}
              className="input px-3 py-1.5 text-xs font-semibold"
            >
              <option value="Todos">Todos</option>
              <option value="Factura">Facturas</option>
              <option value="Boleta">Boletas</option>
              <option value="Ticket">Tickets</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">SUNAT:</span>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value as any)}
              className="input px-3 py-1.5 text-xs font-semibold"
            >
              <option value="Todos">Todos</option>
              <option value="Aceptado">Aceptado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Rechazado">Rechazado</option>
              <option value="De Baja">De Baja</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn-secondary text-[11px] py-1.5 px-3 ${showAdvanced ? 'bg-slate-200 border-slate-400' : ''}`}
          >
            Filtros avanzados
          </button>
        </div>

        {/* Panel de Filtros Avanzados */}
        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 animate-section">
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
        )}
      </div>
  );
}
