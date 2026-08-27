/* ── Tarjetas y filas de la vista de Caja ─────────────────── */
export function Row({ label, value, col }: { label: string; value: string; col?: boolean }) {
  if (col) {
    return (
      <div>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">{label}</span>
        <span className="text-sm font-semibold text-slate-800">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono font-semibold text-slate-700">{value}</span>
    </div>
  );
}

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  sky:     'bg-sky-50 text-sky-600',
  violet:  'bg-violet-50 text-violet-600',
  brand:   'bg-brand/10 text-brand',
};

export function StatCard({ icon, tone, label, value }: { icon: React.ReactNode; tone: string; label: string; value: string }) {
  return (
    <div className="card p-4 space-y-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONES[tone]}`}>{icon}</div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{label}</p>
        <p className="text-lg font-mono font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );}
