'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface BusinessInfo {
  name: string;
  ruc: string;
  address: string;
  /** Logo del negocio como data URL (imagen subida) o vacío si no se ha configurado. */
  logo: string;
}

export const BUSINESS_STORAGE_KEY = 'restopro_business_info_v1';
const STORAGE_KEY = BUSINESS_STORAGE_KEY;

export const DEFAULT_BUSINESS: BusinessInfo = {
  name: '',
  ruc: '',
  address: '',
  logo: '',
};

interface BusinessContextType {
  business: BusinessInfo;
  updateBusiness: (changes: Partial<BusinessInfo>) => void;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusinessState] = useState<BusinessInfo>(DEFAULT_BUSINESS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setBusinessState({ ...DEFAULT_BUSINESS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const persist = useCallback((next: BusinessInfo) => {
    setBusinessState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const updateBusiness = useCallback((changes: Partial<BusinessInfo>) => {
    setBusinessState(prev => {
      const next = { ...prev, ...changes };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <BusinessContext.Provider value={{ business, updateBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
