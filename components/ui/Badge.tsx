import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'brand' | 'info' | 'neutral';
export type BadgeSize    = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:  BadgeVariant;
  size?:     BadgeSize;
  dot?:      boolean;
  children:  ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  danger:  'badge badge-danger',
  brand:   'badge badge-brand',
  info:    'badge badge-info',
  neutral: 'badge bg-slate-100 text-slate-600',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-rose-500',
  brand:   'bg-brand',
  info:    'bg-sky-500',
  neutral: 'bg-slate-400',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-[9px] px-1.5 py-0.5',
  md: 'text-[10px] px-2 py-0.5',
};

export function Badge({ variant = 'neutral', size = 'md', dot = false, children, className = '', ...rest }: BadgeProps) {
  return (
    <span className={`${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`} {...rest}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_CLASSES[variant]}`} />}
      {children}
    </span>
  );
}
