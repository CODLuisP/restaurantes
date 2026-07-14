'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

export interface DayRange { from: string; to: string }
export interface DaySchedule { enabled: boolean; ranges: DayRange[] }

export const DAY_LABELS: Record<DayKey, string> = {
  lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo',
};
export const DAY_ORDER: DayKey[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

const DEFAULT_RANGE: DayRange = { from: '09:00', to: '22:00' };

export function makeDefaultSchedule(): Record<DayKey, DaySchedule> {
  return {
    lun: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    mar: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    mie: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    jue: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    vie: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    sab: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    dom: { enabled: false, ranges: [{ ...DEFAULT_RANGE }] },
  };
}

/** Convierte JS Date#getDay() (0 = domingo) a nuestra clave de día. */
const JS_DAY_TO_KEY: DayKey[] = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

/** true si, según el horario configurado, el negocio está abierto en este momento. */
export function isOpenNow(schedule: Record<DayKey, DaySchedule>, now = new Date()): boolean {
  const day = schedule[JS_DAY_TO_KEY[now.getDay()]];
  if (!day?.enabled) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return day.ranges.some(r => {
    if (!r.from || !r.to) return false;
    const [fh, fm] = r.from.split(':').map(Number);
    const [th, tm] = r.to.split(':').map(Number);
    return mins >= fh * 60 + fm && mins <= th * 60 + tm;
  });
}

export interface HorariosState {
  zonaHoraria: string;
  schedule: Record<DayKey, DaySchedule>;
  tipoNegocio: string;
  descripcionCompleta: string;
  numeroPedidos: string;
}

export const HORARIOS_STORAGE_KEY = 'restopro_horarios_negocio_v1';
const STORAGE_KEY = HORARIOS_STORAGE_KEY;

export const DEFAULT_HORARIOS: HorariosState = {
  zonaHoraria: 'Peru (Lima)',
  schedule: makeDefaultSchedule(),
  tipoNegocio: 'Restaurante',
  descripcionCompleta: '',
  numeroPedidos: '',
};

interface HorariosContextType {
  horarios: HorariosState;
  updateHorarios: (changes: Partial<HorariosState>) => void;
}

const HorariosContext = createContext<HorariosContextType | null>(null);

export function HorariosProvider({ children }: { children: React.ReactNode }) {
  const [horarios, setHorarios] = useState<HorariosState>(DEFAULT_HORARIOS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHorarios({
          ...DEFAULT_HORARIOS,
          ...parsed,
          schedule: { ...DEFAULT_HORARIOS.schedule, ...(parsed.schedule ?? {}) },
        });
      }
    } catch {}
  }, []);

  const updateHorarios = useCallback((changes: Partial<HorariosState>) => {
    setHorarios(prev => {
      const next = { ...prev, ...changes };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <HorariosContext.Provider value={{ horarios, updateHorarios }}>
      {children}
    </HorariosContext.Provider>
  );
}

export function useHorarios() {
  const ctx = useContext(HorariosContext);
  if (!ctx) throw new Error('useHorarios must be used within HorariosProvider');
  return ctx;
}
