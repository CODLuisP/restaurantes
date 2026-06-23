import type { HTMLAttributes } from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

export function Spinner({ size = 'md', className = '', ...rest }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block rounded-full border-brand border-t-transparent animate-spin ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    />
  );
}

/* ── Full-page loading overlay ───────────────────────────────── */

interface LoadingOverlayProps {
  label?: string;
}

export function LoadingOverlay({ label = 'Cargando...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

/* ── Inline loading row (for tables, lists) ─────────────────── */

export function LoadingRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      <td colSpan={cols} className="p-8 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Spinner size="sm" />
          <span className="text-xs">Cargando datos...</span>
        </div>
      </td>
    </tr>
  );
}
