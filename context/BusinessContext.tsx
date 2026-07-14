'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/** Tipo de afectación del IGV aplicado por defecto en los comprobantes. */
export type IgvType = 'Gravado' | 'Exonerado' | 'Inafecto';
/** Porcentaje de IGV aplicado al emitir (18% general, 10.5% régimen de restaurantes/agrarios). */
export type IgvPercent = 18 | 10.5;
/** Tamaño de papel para la impresora térmica de comprobantes. */
export type PaperSize = '58mm' | '80mm';

export interface BusinessInfo {
  /** Nombre comercial (marca), el que ve el cliente en la carta. */
  name: string;
  /** Razón social registrada ante SUNAT (puede diferir del nombre comercial). */
  razonSocial: string;
  ruc: string;
  address: string;
  /** Logo del negocio como data URL (imagen subida) o vacío si no se ha configurado. */
  logo: string;

  /** Dirección elegida en el mapa (tab Ubicación), distinta del campo "Ubicación / Dirección" de Datos. */
  ubicacionDireccion: string;
  /** Si es false, `ubicacionDireccion` no se muestra en la carta pública (solo se usa internamente para zonas de entrega). */
  mostrarDireccionEnMenu: boolean;

  /* ── SUNAT: facturación electrónica ─────────────────────── */
  /** Usuario SOL (Clave SOL) para operaciones con SUNAT. */
  solUser: string;
  /** Clave SOL. Se almacena localmente para autocompletar el envío de comprobantes. */
  solPassword: string;
  /** Tipo de afectación del IGV usado por defecto al emitir. */
  igvType: IgvType;
  /** Porcentaje de IGV usado por defecto al emitir. */
  igvPercent: IgvPercent;
  /** Nombre del archivo del certificado digital (.pfx/.p12) cargado. */
  certFileName: string;
  /** Fecha de emisión del certificado (ISO). */
  certIssuedAt: string;
  /** Fecha de vencimiento del certificado (ISO). */
  certExpiresAt: string;
  /** Tamaño de papel de la impresora térmica usada para imprimir comprobantes. */
  paperSize: PaperSize;
}

export const BUSINESS_STORAGE_KEY = 'restopro_business_info_v1';
const STORAGE_KEY = BUSINESS_STORAGE_KEY;

export const DEFAULT_BUSINESS: BusinessInfo = {
  name: '',
  razonSocial: '',
  ruc: '',
  address: '',
  logo: '',
  ubicacionDireccion: '',
  mostrarDireccionEnMenu: true,
  solUser: '',
  solPassword: '',
  igvType: 'Gravado',
  igvPercent: 18,
  certFileName: '',
  certIssuedAt: '',
  certExpiresAt: '',
  paperSize: '80mm',
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
