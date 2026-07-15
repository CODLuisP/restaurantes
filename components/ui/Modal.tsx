'use client';

import { useEffect, useRef, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { SidebarContext } from '@/context/SidebarContext';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title?:    string;
  subtitle?: string;
  children?:  ReactNode;
  footer?:   ReactNode;
  /** Ancho máximo del contenido dentro del panel (el panel siempre llena el área). */
  size?:     ModalSize;
  /** Si es false, el panel se ajusta a su contenido (centrado) en vez de llenar el alto de la pantalla. Por defecto true. */
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
  open, onClose, title, subtitle, children, footer, size = 'md', fullHeight = true, closeOnOverlayClick = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sidebar = useContext(SidebarContext);
  const isCollapsed = sidebar ? sidebar.isCollapsed : false;
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
      className={`fixed inset-y-0 right-0 left-0 ${sidebar ? (isCollapsed ? 'md:left-16' : 'md:left-64') : ''} bg-black/60 backdrop-blur-sm z-40 flex ${fullHeight ? 'items-stretch' : 'items-center'} justify-center p-4 sm:p-6`}
    >
      <div className={`card-lg w-full ${SIZE_CLASSES[size]} ${fullHeight ? 'h-full' : 'max-h-[85vh]'} flex flex-col overflow-hidden`}>
        {/* Header */}
        {title && (
          <div className={`flex items-start justify-between px-6 py-4 shrink-0 ${children ? 'border-b border-slate-200' : ''}`}>
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
        {children && (
        <div className="text-xs text-slate-600 leading-relaxed px-6 py-5 flex-1 overflow-y-auto">
          {children}
        </div>
        )}

        {/* Footer */}
        {footer && (
          <div className={`flex justify-end gap-2 px-6 py-4 shrink-0 ${children ? 'border-t border-slate-200' : ''}`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
