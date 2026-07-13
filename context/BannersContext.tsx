'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

export interface Banner {
  id: string;
  title: string;
  image: string;
  gradient?: string;
  active: boolean;
  scheduleEnabled: boolean;
  days: DayKey[];
}

export const BANNERS_STORAGE_KEY = 'restopro_banners_v1';
const STORAGE_KEY = BANNERS_STORAGE_KEY;

export const DEFAULT_BANNERS: Banner[] = [
  { id: 'b1', title: 'Banner 2', image: '', gradient: 'from-slate-900 to-slate-700', active: true, scheduleEnabled: false, days: [] },
  { id: 'b2', title: 'Banner',   image: '', gradient: 'from-orange-600 to-rose-900', active: true, scheduleEnabled: false, days: [] },
  { id: 'b3', title: 'Banner 3', image: '', gradient: 'from-slate-500 to-slate-700', active: true, scheduleEnabled: true, days: ['sab', 'dom'] },
];

interface BannersContextType {
  banners: Banner[];
  addBanner: (banner: Omit<Banner, 'id'>) => void;
  updateBanner: (id: string, changes: Partial<Banner>) => void;
  removeBanner: (id: string) => void;
  moveBanner: (index: number, dir: -1 | 1) => void;
}

const BannersContext = createContext<BannersContextType | null>(null);

export function BannersProvider({ children }: { children: React.ReactNode }) {
  const [banners, setBannersState] = useState<Banner[]>(DEFAULT_BANNERS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setBannersState(JSON.parse(stored));
    } catch {}
  }, []);

  const addBanner = useCallback((banner: Omit<Banner, 'id'>) => {
    setBannersState(prev => {
      const next = [...prev, { ...banner, id: `b${Date.now()}` }];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const updateBanner = useCallback((id: string, changes: Partial<Banner>) => {
    setBannersState(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...changes } : b);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeBanner = useCallback((id: string) => {
    setBannersState(prev => {
      const next = prev.filter(b => b.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const moveBanner = useCallback((index: number, dir: -1 | 1) => {
    setBannersState(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <BannersContext.Provider value={{ banners, addBanner, updateBanner, removeBanner, moveBanner }}>
      {children}
    </BannersContext.Provider>
  );
}

export function useBanners() {
  const ctx = useContext(BannersContext);
  if (!ctx) throw new Error('useBanners must be used within BannersProvider');
  return ctx;
}
