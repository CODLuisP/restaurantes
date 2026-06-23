import type { HTMLAttributes, ReactNode } from 'react';

export type CardSize = 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  size?:        CardSize;
  interactive?: boolean;
  children:     ReactNode;
  padding?:     'none' | 'sm' | 'md' | 'lg';
}

const PADDING_CLASSES = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

export function Card({ size = 'md', interactive = false, padding = 'md', children, className = '', ...rest }: CardProps) {
  const base    = size === 'lg' ? 'card-lg' : 'card';
  const hover   = interactive ? 'hover:shadow-md transition-all duration-200 cursor-pointer' : '';
  const padCls  = PADDING_CLASSES[padding];

  return (
    <div className={`${base} ${padCls} ${hover} ${className}`} {...rest}>
      {children}
    </div>
  );
}

interface CardHeaderProps { title: string; subtitle?: string; action?: ReactNode; }
export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-slate-200">
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h4>
        {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
