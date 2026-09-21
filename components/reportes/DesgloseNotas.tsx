import { TrendingDown, TrendingUp, History } from 'lucide-react';

interface Props {
  ncPeriodo: number;
  ndPeriodo: number;
  ncAnteriores: number;
  ndAnteriores: number;
  /** Cómo se llama el rango en pantalla: "del día", "del período"… */
  periodo: string;
}

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Notas de crédito/débito clasificadas por la fecha del documento que afectan: las del período ajustan
 *  las ventas netas; las anteriores corrigen ventas de otro período y se informan aparte. */
export function DesgloseNotas({ ncPeriodo, ndPeriodo, ncAnteriores, ndAnteriores, periodo }: Props) {
  if (ncPeriodo + ndPeriodo + ncAnteriores + ndAnteriores <= 0) return null;

  const tiles = [
    { key: 'nc', label: `NC ${periodo}`, hint: 'Restan de las ventas netas', valor: -ncPeriodo, icon: TrendingDown, tono: 'bg-rose-50 border-rose-100 text-rose-600' },
    { key: 'nd', label: `ND ${periodo}`, hint: 'Suman a las ventas netas', valor: ndPeriodo, icon: TrendingUp, tono: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
    { key: 'nca', label: 'NC anteriores', hint: 'Afectan documentos previos · no restan', valor: -ncAnteriores, icon: History, tono: 'bg-slate-50 border-slate-200 text-slate-500' },
    { key: 'nda', label: 'ND anteriores', hint: 'Afectan documentos previos · no suman', valor: ndAnteriores, icon: History, tono: 'bg-slate-50 border-slate-200 text-slate-500' },
  ];

  return (
    <div className="card-lg p-4 space-y-3">
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Desglose de notas</h4>
        <p className="text-[11px] text-slate-400">Impacto de notas de crédito y débito según la fecha del documento que afectan</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(t => {
          const Icon = t.icon;
          const inactivo = t.valor === 0;
          return (
            <div key={t.key} className={`rounded-lg border px-3 py-2 ${inactivo ? 'bg-slate-50/60 border-slate-100 text-slate-300' : t.tono}`}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                <Icon className="h-3 w-3" /> {t.label}
              </div>
              <p className="text-sm font-mono font-bold mt-0.5">{t.valor < 0 ? '−' : ''}{money(Math.abs(t.valor))}</p>
              <p className="text-[9px] opacity-80 leading-tight">{t.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
