import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  icon?:     ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
  accent:    'bg-brand-accent hover:bg-brand-subtle text-white font-semibold rounded-xl transition-all shadow-xs inline-flex items-center gap-2',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-[11px] px-3 py-1.5',
  md: 'text-xs px-4 py-2',
  lg: 'text-sm px-5 py-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, children, className = '', disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
        {...rest}
      >
        {loading ? (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
