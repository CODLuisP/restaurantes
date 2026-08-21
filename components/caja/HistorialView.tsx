'use client';

import type { CashSession } from '@/types';
import { money, fmtShort, type QuickRange } from './types';
export default function HistorialView({
  rows, fromDate, toDate, onFromDate, onToDate, activeQuick, onQuickRange,
}: {
  rows: CashSession[];
  fromDate: string;
  toDate: string;
  onFromDate: (v: string) => void;
  onToDate: (v: string) => void;
  activeQuick: QuickRange | null;
  onQuickRange: (r: QuickRange) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(['hoy', '7d', '30d'] as QuickRange[]).map(r => (
            <button
              key={r}
              onClick={() => onQuickRange(r)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                activeQuick === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r === 'hoy' ? 'Hoy' : r === '7d' ? '7 días' : '30 días'}
            </button>
          ))}
        </div>
        <input type="date" value={fromDate} onChange={e => onFromDate(e.target.value)} className="input px-3 py-2 text-xs" />
        <span className="text-slate-400 text-xs">—</span>
        <input type="date" value={toDate} onChange={e => onToDate(e.target.value)} className="input px-3 py-2 text-xs" />
        <select className="input px-3 py-2 text-xs ml-auto" defaultValue="todas">
          <option value="todas">Todas las cajas</option>
          <option value="principal">Caja principal</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wide">
              <th className="text-left px-5 py-3">Apertura</th>
              <th className="text-left px-5 py-3">Cierre</th>
              <th className="text-left px-5 py-3">Caja</th>
              <th className="text-left px-5 py-3">Responsable</th>
              <th className="text-right px-5 py-3">Sistema</th>
              <th className="text-right px-5 py-3">Conteo</th>
              <th className="text-right px-5 py-3">Diferencia</th>
              <th className="text-left px-5 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 italic py-10">
                  No hay turnos de caja en este rango de fechas.
                </td>
              </tr>
            ) : (
              rows.map(s => {
                const diff = s.difference ?? null;
                return (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">{fmtShort(s.openedAt)}</td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{s.closedAt ? fmtShort(s.closedAt) : '—'}</td>
                    <td className="px-5 py-3 text-brand font-semibold whitespace-nowrap">Caja principal</td>
                    <td className="px-5 py-3 text-slate-700 whitespace-nowrap">{s.openedBy}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      {money(s.status === 'abierta' ? s.openingAmount + s.cashSales : s.expectedAmount ?? 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      {s.countedAmount !== undefined ? money(s.countedAmount) : '—'}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono font-bold whitespace-nowrap ${
                      diff === null ? 'text-slate-300' : diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {diff === null ? '—' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${money(Math.abs(diff))}`}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        s.status === 'abierta' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {s.status === 'abierta' ? 'Abierta' : 'Cerrada'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400">Tocá un cierre para ver el arqueo completo e imprimirlo.</p>
    </div>
  );
}

/* ── Subcomponentes ─────────────────────────────────────────── */