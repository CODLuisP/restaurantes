'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title?:    string;
  subtitle?: string;
  children?: ReactNode;
  footer?:   ReactNode;
  /** Ancho máximo del contenido dentro del panel. */
  size?:     ModalSize;
  /** Si es true, el panel llena el alto de la pantalla. Por defecto false (se ajusta al contenido). */
  fullHeight?: boolean;
  /** Si es false, hacer click fuera del modal no lo cierra (solo "X" / botones del footer). Por defecto true. */
  closeOnOverlayClick?: boolean;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  fullHeight = false,
  closeOnOverlayClick = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !closeOnOverlayClick) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, closeOnOverlayClick]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (closeOnOverlayClick && e.target === overlayRef.current) onClose(); }}
      className={`fixed inset-0 bg-black/60 z-50 flex ${fullHeight ? 'items-stretch' : 'items-center'} justify-center p-4 sm:p-6`}
    >
      <div className={`card-lg w-full ${SIZE_CLASSES[size]} ${fullHeight ? 'h-full flex flex-col' : 'max-h-[90vh] flex flex-col'} overflow-hidden shadow-2xl`}>
        {/* Header */}
        {title && (
          <div className={`flex items-start justify-between px-6 py-4 shrink-0 ${children ? 'border-b border-slate-200' : ''}`}>
            <div>
              <h4 className="text-sm font-bold text-slate-800">{title}</h4>
              {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Body */}
        {children && (
          <div className={`text-xs text-slate-600 leading-relaxed px-6 py-5 ${fullHeight ? 'flex-1' : 'shrink-0'} overflow-y-auto max-h-[calc(90vh-130px)]`}>
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className={`flex justify-end gap-2 px-6 py-4 shrink-0 bg-slate-50/50 ${children ? 'border-t border-slate-200' : ''}`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
