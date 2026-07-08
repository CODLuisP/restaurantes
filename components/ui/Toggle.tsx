interface ToggleProps {
  checked:   boolean;
  onChange:  (checked: boolean) => void;
  label?:    string;
  hint?:     string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, hint, disabled }: ToggleProps) {
  const switchEl = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
        checked ? 'bg-brand' : 'bg-slate-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );

  if (!label && !hint) return switchEl;

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {label && <p className="text-sm font-medium text-slate-800">{label}</p>}
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {switchEl}
    </div>
  );
}
