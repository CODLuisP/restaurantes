import type { HTMLAttributes } from 'react';

/* ── Base pulse block ───────────────────────────────────────── */

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?:  string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const ROUNDED: Record<string, string> = {
  sm:   'rounded',
  md:   'rounded-lg',
  lg:   'rounded-xl',
  full: 'rounded-full',
};

export function Skeleton({ width, height, rounded = 'md', className = '', style, ...rest }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200 ${ROUNDED[rounded]} ${className}`}
      style={{ width, height, ...style }}
      {...rest}
    />
  );
}

/* ── Text lines ─────────────────────────────────────────────── */

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="8px" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

/* ── Avatar / icon placeholder ──────────────────────────────── */

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' }[size];
  return <Skeleton className={sz} rounded="lg" />;
}

/* ── Full card skeleton ─────────────────────────────────────── */

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <Skeleton height="10px" width="50%" />
          <Skeleton height="8px"  width="30%" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <Skeleton height="28px" rounded="lg" />
    </div>
  );
}

/* ── KPI card skeleton ──────────────────────────────────────── */

export function SkeletonKPI() {
  return (
    <div className="card px-4 py-3 space-y-2 animate-pulse">
      <div className="flex justify-between">
        <Skeleton height="8px" width="50%" />
        <Skeleton height="16px" width="16px" rounded="sm" />
      </div>
      <Skeleton height="20px" width="70%" />
      <Skeleton height="8px"  width="40%" />
    </div>
  );
}

/* ── Table row skeleton ─────────────────────────────────────── */

export function SkeletonTableRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="p-4">
              <Skeleton height="10px" width={c === 0 ? '60%' : '80%'} className="animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
