const TONES: Record<string, string> = {
  brand:   'bg-brand/10 text-brand',
  amber:   'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky:     'bg-sky-50 text-sky-600',
  violet:  'bg-violet-50 text-violet-600',
};

/** Tarjeta compacta de indicador (icono + etiqueta + valor) usada en Caja y Cobrar. */
export function StatCard({
  icon, tone, label, value,
}: { icon: React.ReactNode; tone: string; label: string; value: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TONES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide truncate">{label}</p>
        <p className="text-lg font-mono font-bold text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}
