'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/** Canales por los que un cliente puede recibir su pedido. */
export type DeliveryMethodKey = 'mesa' | 'llevar' | 'delivery';

export interface DeliveryMethodsState {
  mesa: { enabled: boolean };
  llevar: { enabled: boolean };
  delivery: { enabled: boolean };
}

export const DELIVERY_METHODS_STORAGE_KEY = 'restopro_delivery_methods_v1';
const STORAGE_KEY = DELIVERY_METHODS_STORAGE_KEY;

export const DEFAULT_DELIVERY_METHODS: DeliveryMethodsState = {
  mesa:     { enabled: true },
  llevar:   { enabled: true },
  delivery: { enabled: true },
};

interface DeliveryMethodsContextType {
  methods: DeliveryMethodsState;
  setMethodEnabled: (key: DeliveryMethodKey, enabled: boolean) => void;
}

const DeliveryMethodsContext = createContext<DeliveryMethodsContextType | null>(null);

export function DeliveryMethodsProvider({ children }: { children: React.ReactNode }) {
  const [methods, setMethodsState] = useState<DeliveryMethodsState>(DEFAULT_DELIVERY_METHODS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMethodsState({
          mesa:     { ...DEFAULT_DELIVERY_METHODS.mesa, ...parsed.mesa },
          llevar:   { ...DEFAULT_DELIVERY_METHODS.llevar, ...parsed.llevar },
          delivery: { ...DEFAULT_DELIVERY_METHODS.delivery, ...parsed.delivery },
        });
      }
    } catch {}
  }, []);

  const setMethodEnabled = useCallback((key: DeliveryMethodKey, enabled: boolean) => {
    setMethodsState(prev => {
      const next = { ...prev, [key]: { enabled } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <DeliveryMethodsContext.Provider value={{ methods, setMethodEnabled }}>
      {children}
    </DeliveryMethodsContext.Provider>
  );
}

export function useDeliveryMethods() {
  const ctx = useContext(DeliveryMethodsContext);
  if (!ctx) throw new Error('useDeliveryMethods must be used within DeliveryMethodsProvider');
  return ctx;
}
