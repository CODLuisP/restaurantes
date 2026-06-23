'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title?:    string;
  subtitle?: string;
  children:  ReactNode;
  footer?:   ReactNode;
  size?:     ModalSize;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-section"
    >
      <div className={`card-lg w-full ${SIZE_CLASSES[size]} p-6 space-y-4`}>
        {/* Header */}
        {title && (
          <div className="flex items-start justify-between pb-3 border-b border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-slate-800">{title}</h4>
              {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="text-xs text-slate-600 leading-relaxed">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
