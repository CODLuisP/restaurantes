'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface RedesSocialesState {
  instagram: string;
  facebook: string;
  tiktok: string;
  sitio: string;
  reviewsLink: string;
}

export const REDES_SOCIALES_STORAGE_KEY = 'restopro_redes_sociales_v1';
const STORAGE_KEY = REDES_SOCIALES_STORAGE_KEY;

export const DEFAULT_REDES_SOCIALES: RedesSocialesState = {
  instagram: '', facebook: '', tiktok: '', sitio: '', reviewsLink: '',
};

interface RedesSocialesContextType {
  redes: RedesSocialesState;
  updateRedes: (changes: Partial<RedesSocialesState>) => void;
}

const RedesSocialesContext = createContext<RedesSocialesContextType | null>(null);

export function RedesSocialesProvider({ children }: { children: React.ReactNode }) {
  const [redes, setRedes] = useState<RedesSocialesState>(DEFAULT_REDES_SOCIALES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRedes({ ...DEFAULT_REDES_SOCIALES, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const updateRedes = useCallback((changes: Partial<RedesSocialesState>) => {
    setRedes(prev => {
      const next = { ...prev, ...changes };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <RedesSocialesContext.Provider value={{ redes, updateRedes }}>
      {children}
    </RedesSocialesContext.Provider>
  );
}

export function useRedesSociales() {
  const ctx = useContext(RedesSocialesContext);
  if (!ctx) throw new Error('useRedesSociales must be used within RedesSocialesProvider');
  return ctx;
}
