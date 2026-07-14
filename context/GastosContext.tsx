'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type GastoStatus = 'pagado' | 'pendiente' | 'anulado';

export interface Categoria {
  id: string;
  name: string;
}

export interface Proveedor {
  id: string;
  name: string;
}

export interface Gasto {
  id: string;
  /** Fecha del gasto (ISO yyyy-mm-dd). Si está pendiente, se usa también como fecha de vencimiento. */
  date: string;
  description: string;
  categoriaId: string | null;
  proveedorId: string | null;
  status: GastoStatus;
  amount: number;
}

interface GastosState {
  gastos: Gasto[];
  categorias: Categoria[];
  proveedores: Proveedor[];
}

export const GASTOS_STORAGE_KEY = 'restopro_gastos_v1';
const STORAGE_KEY = GASTOS_STORAGE_KEY;

const DEFAULT_STATE: GastosState = {
  gastos: [],
  categorias: [],
  proveedores: [],
};

interface GastosContextType {
  gastos: Gasto[];
  categorias: Categoria[];
  proveedores: Proveedor[];
  addGasto: (g: Omit<Gasto, 'id'>) => void;
  updateGasto: (id: string, changes: Partial<Gasto>) => void;
  anularGasto: (id: string) => void;
  addCategoria: (name: string) => void;
  removeCategoria: (id: string) => void;
  addProveedor: (name: string) => void;
  removeProveedor: (id: string) => void;
}

const GastosContext = createContext<GastosContextType | null>(null);

export function GastosProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GastosState>(DEFAULT_STATE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setState({ ...DEFAULT_STATE, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const addGasto = useCallback((g: Omit<Gasto, 'id'>) => {
    setState(prev => {
      const next = { ...prev, gastos: [{ ...g, id: `gasto-${Date.now().toString(36)}` }, ...prev.gastos] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const updateGasto = useCallback((id: string, changes: Partial<Gasto>) => {
    setState(prev => {
      const next = { ...prev, gastos: prev.gastos.map(g => (g.id === id ? { ...g, ...changes } : g)) };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const anularGasto = useCallback((id: string) => {
    setState(prev => {
      const next = { ...prev, gastos: prev.gastos.map(g => (g.id === id ? { ...g, status: 'anulado' as GastoStatus } : g)) };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const addCategoria = useCallback((name: string) => {
    setState(prev => {
      const next = { ...prev, categorias: [...prev.categorias, { id: `cat-${Date.now().toString(36)}`, name }] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeCategoria = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        categorias: prev.categorias.filter(c => c.id !== id),
        gastos: prev.gastos.map(g => (g.categoriaId === id ? { ...g, categoriaId: null } : g)),
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const addProveedor = useCallback((name: string) => {
    setState(prev => {
      const next = { ...prev, proveedores: [...prev.proveedores, { id: `prov-${Date.now().toString(36)}`, name }] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeProveedor = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        proveedores: prev.proveedores.filter(p => p.id !== id),
        gastos: prev.gastos.map(g => (g.proveedorId === id ? { ...g, proveedorId: null } : g)),
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <GastosContext.Provider
      value={{
        gastos: state.gastos,
        categorias: state.categorias,
        proveedores: state.proveedores,
        addGasto, updateGasto, anularGasto,
        addCategoria, removeCategoria,
        addProveedor, removeProveedor,
      }}
    >
      {children}
    </GastosContext.Provider>
  );
}

export function useGastos() {
  const ctx = useContext(GastosContext);
  if (!ctx) throw new Error('useGastos must be used within GastosProvider');
  return ctx;
}
