import { forwardRef } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

/* ── Text Input ─────────────────────────────────────────────── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  iconLeft?: ReactNode;
  error?:    string;
  hint?:     string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, iconLeft, error, hint, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`input w-full py-2 ${iconLeft ? 'pl-9 pr-3' : 'px-3'} ${error ? 'border-rose-400 focus:ring-rose-400' : ''} ${className}`}
            {...rest}
          />
        </div>
        {error && <p className="text-[10px] text-rose-500 font-medium">{error}</p>}
        {hint && !error && <p className="text-[10px] text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ── Select ─────────────────────────────────────────────────── */

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string;
  error?:   string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', id, ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`input w-full px-3 py-2 ${error ? 'border-rose-400' : ''} ${className}`}
          {...rest}
        >
          {children}
        </select>
        {error && <p className="text-[10px] text-rose-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
