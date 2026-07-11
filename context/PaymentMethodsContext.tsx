'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/** Método de pago que solo se activa/desactiva (efectivo, tarjeta). */
export interface SimplePaymentMethod {
  enabled: boolean;
}

/** Método de pago con QR propio del negocio (Yape, Plin): el usuario carga su QR real. */
export interface QrPaymentMethod {
  enabled: boolean;
  /** QR cargado por el usuario, como data URL. Vacío si no se ha configurado. */
  qrImage: string;
  /** Nombre del titular de la cuenta (como figura en Yape/Plin). */
  holderName: string;
  /** Número de celular asociado a la cuenta Yape/Plin. */
  phone: string;
}

export interface TransferPaymentMethod {
  enabled: boolean;
  bankName: string;
  accountNumber: string;
  cci: string;
}

export interface PaymentMethodsState {
  efectivo: SimplePaymentMethod;
  tarjeta: SimplePaymentMethod;
  yape: QrPaymentMethod;
  plin: QrPaymentMethod;
  transferencia: TransferPaymentMethod;
}

export const PAYMENT_METHODS_STORAGE_KEY = 'restopro_payment_methods_v1';
const STORAGE_KEY = PAYMENT_METHODS_STORAGE_KEY;

export const DEFAULT_PAYMENT_METHODS: PaymentMethodsState = {
  efectivo:      { enabled: true },
  tarjeta:       { enabled: true },
  yape:          { enabled: false, qrImage: '', holderName: '', phone: '' },
  plin:          { enabled: false, qrImage: '', holderName: '', phone: '' },
  transferencia: { enabled: false, bankName: '', accountNumber: '', cci: '' },
};

interface PaymentMethodsContextType {
  methods: PaymentMethodsState;
  updateMethod: <K extends keyof PaymentMethodsState>(key: K, changes: Partial<PaymentMethodsState[K]>) => void;
}

const PaymentMethodsContext = createContext<PaymentMethodsContextType | null>(null);

export function PaymentMethodsProvider({ children }: { children: React.ReactNode }) {
  const [methods, setMethodsState] = useState<PaymentMethodsState>(DEFAULT_PAYMENT_METHODS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMethodsState({
          efectivo: { ...DEFAULT_PAYMENT_METHODS.efectivo, ...parsed.efectivo },
          tarjeta: { ...DEFAULT_PAYMENT_METHODS.tarjeta, ...parsed.tarjeta },
          yape: { ...DEFAULT_PAYMENT_METHODS.yape, ...parsed.yape },
          plin: { ...DEFAULT_PAYMENT_METHODS.plin, ...parsed.plin },
          transferencia: { ...DEFAULT_PAYMENT_METHODS.transferencia, ...parsed.transferencia },
        });
      }
    } catch {}
  }, []);

  const updateMethod = useCallback(<K extends keyof PaymentMethodsState>(key: K, changes: Partial<PaymentMethodsState[K]>) => {
    setMethodsState(prev => {
      const next = { ...prev, [key]: { ...prev[key], ...changes } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <PaymentMethodsContext.Provider value={{ methods, updateMethod }}>
      {children}
    </PaymentMethodsContext.Provider>
  );
}

export function usePaymentMethods() {
  const ctx = useContext(PaymentMethodsContext);
  if (!ctx) throw new Error('usePaymentMethods must be used within PaymentMethodsProvider');
  return ctx;
}
