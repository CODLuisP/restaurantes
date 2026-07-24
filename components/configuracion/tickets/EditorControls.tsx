'use client';

/* ─── Controles reutilizables del editor de tickets ─── */

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-colors ${
            value === o.value ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none py-1">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-brand w-4 h-4" />
      <span className="text-xs text-slate-700">{label}</span>
    </label>
  );
}

export function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-slate-500 w-14">{label}</span>
      <input type="range" min={0} max={6} value={value} onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-brand" />
      <span className="text-[11px] font-mono text-slate-600 w-4 text-right">{value}</span>
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{children}</p>;
}
