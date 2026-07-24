import type { HTMLAttributes } from 'react';
import { UtensilsCrossed } from 'lucide-react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
}

const CONTAINER_SIZES: Record<SpinnerSize, string> = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-11 w-11',
  xl: 'h-16 w-16',
};

const ICON_SIZES: Record<SpinnerSize, string> = {
  xs: 'h-2 w-2',
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-7 w-7',
};

const BORDER_WIDTHS: Record<SpinnerSize, string> = {
  xs: 'border-[1.5px]',
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-[2.5px]',
  xl: 'border-3',
};

export function Spinner({ size = 'md', className = '', ...rest }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`relative inline-flex items-center justify-center ${CONTAINER_SIZES[size]} shrink-0 ${className}`}
      {...rest}
    >
      {/* Outer spinning gradient ring */}
      <span
        className={`absolute inset-0 rounded-full border-brand/20 border-t-brand border-r-brand-accent animate-spin ${BORDER_WIDTHS[size]}`}
      />
      {/* Centered pulsing culinary icon */}
      <UtensilsCrossed className={`${ICON_SIZES[size]} text-brand animate-pulse`} />
    </span>
  );
}

/* ── Full-page / Component loading overlay ───────────────────── */

interface LoadingOverlayProps {
  label?: string;
}

export function LoadingOverlay({ label = 'Cargando...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
      <div className="p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center gap-3 text-center min-w-[210px] animate-in fade-in zoom-in-95 duration-200">
        <Spinner size="xl" />
        <p className="text-xs font-semibold text-slate-700 tracking-wide">{label}</p>
      </div>
    </div>
  );
}

/* ── Inline loading row (for tables, lists) ─────────────────── */

export function LoadingRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      <td colSpan={cols} className="p-8 text-center">
        <div className="flex items-center justify-center gap-2.5 text-slate-500">
          <Spinner size="sm" />
          <span className="text-xs font-medium">Cargando datos...</span>
        </div>
      </td>
    </tr>
  );
}
