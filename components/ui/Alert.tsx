import type { ReactNode } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, Sparkles } from 'lucide-react';

export type AlertVariant = 'success' | 'warning' | 'danger' | 'info' | 'brand';

interface AlertProps {
  variant?:  AlertVariant;
  title?:    string;
  children:  ReactNode;
  icon?:     ReactNode;
  action?:   ReactNode;
  onClose?:  () => void;
}

const STYLES: Record<AlertVariant, { wrap: string; icon: string; defaultIcon: ReactNode }> = {
  success: {
    wrap: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: 'text-emerald-500',
    defaultIcon: <CheckCircle className="h-4 w-4 shrink-0" />,
  },
  warning: {
    wrap: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: 'text-amber-500',
    defaultIcon: <AlertTriangle className="h-4 w-4 shrink-0" />,
  },
  danger: {
    wrap: 'bg-rose-50 border-rose-200 text-rose-800',
    icon: 'text-rose-500',
    defaultIcon: <AlertCircle className="h-4 w-4 shrink-0" />,
  },
  info: {
    wrap: 'bg-sky-50 border-sky-200 text-sky-800',
    icon: 'text-sky-500',
    defaultIcon: <Info className="h-4 w-4 shrink-0" />,
  },
  brand: {
    wrap: 'bg-brand/10 border-brand/20 text-brand',
    icon: 'text-brand',
    defaultIcon: <Sparkles className="h-4 w-4 shrink-0" />,
  },
};

export function Alert({ variant = 'info', title, children, icon, action, onClose }: AlertProps) {
  const s = STYLES[variant];
  const resolvedIcon = icon ?? s.defaultIcon;

  return (
    <div className={`border rounded-xl p-3.5 flex gap-3 text-xs ${s.wrap}`}>
      <span className={`mt-0.5 ${s.icon}`}>{resolvedIcon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-bold mb-0.5">{title}</p>}
        <p className="leading-snug opacity-90">{children}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 text-base leading-none">
          ×
        </button>
      )}
    </div>
  );
}
