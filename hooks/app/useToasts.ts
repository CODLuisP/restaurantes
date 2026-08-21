'use client';

import { useCallback, useState } from 'react';
import type { Toast } from '@/types';

/** Sistema global de notificaciones: cada toast se auto-descarta a los 4 segundos. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const triggerToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, triggerToast, dismissToast };
}
