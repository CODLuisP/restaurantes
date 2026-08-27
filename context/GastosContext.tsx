'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from './AppContext';
import { ApiError } from '@/lib/api/client';
import {
  getGastos, crearGasto, actualizarGasto, anularGastoApi,
  getGastoCategorias, crearGastoCategoria, eliminarGastoCategoria,
  getGastoProveedores, crearGastoProveedor, eliminarGastoProveedor,
  type GastoDto, type GastoCategoriaDto, type GastoProveedorDto, type GastoEstado,
} from '@/lib/api/gastos';

export type GastoStatus = GastoEstado;

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

function mapGasto(dto: GastoDto): Gasto {
  return {
    id: String(dto.id),
    date: dto.fecha.slice(0, 10),
    description: dto.descripcion,
    categoriaId: dto.categoriaId != null ? String(dto.categoriaId) : null,
    proveedorId: dto.proveedorId != null ? String(dto.proveedorId) : null,
    status: dto.estado,
    amount: dto.monto,
  };
}

const mapCategoria = (dto: GastoCategoriaDto): Categoria => ({ id: String(dto.id), name: dto.nombre });
const mapProveedor = (dto: GastoProveedorDto): Proveedor => ({ id: String(dto.id), name: dto.nombre });

interface GastosContextType {
  gastos: Gasto[];
  categorias: Categoria[];
  proveedores: Proveedor[];
  loading: boolean;
  addGasto: (g: Omit<Gasto, 'id'>) => Promise<void>;
  updateGasto: (id: string, changes: Partial<Gasto>) => Promise<void>;
  anularGasto: (id: string) => Promise<void>;
  addCategoria: (name: string) => Promise<void>;
  removeCategoria: (id: string) => Promise<void>;
  addProveedor: (name: string) => Promise<void>;
  removeProveedor: (id: string) => Promise<void>;
}

const GastosContext = createContext<GastosContextType | null>(null);

export function GastosProvider({ children }: { children: React.ReactNode }) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;
  const sucursalId = authSession?.user?.sucursalId ?? undefined;
  const { triggerToast } = useApp();

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getGastos(token, sucursalId),
      getGastoCategorias(token, sucursalId),
      getGastoProveedores(token, sucursalId),
    ]).then(([g, c, p]) => {
      if (cancelled) return;
      setGastos(g.map(mapGasto));
      setCategorias(c.map(mapCategoria));
      setProveedores(p.map(mapProveedor));
    }).catch(() => {
      if (!cancelled) triggerToast('No se pudieron cargar los gastos.', 'error');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token, sucursalId, triggerToast]);

  const addGasto = useCallback(async (g: Omit<Gasto, 'id'>) => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    try {
      const creado = await crearGasto(token, {
        fecha: g.date,
        descripcion: g.description,
        categoriaId: g.categoriaId ? Number(g.categoriaId) : null,
        proveedorId: g.proveedorId ? Number(g.proveedorId) : null,
        estado: g.status,
        monto: g.amount,
      }, sucursalId);
      setGastos(prev => [mapGasto(creado), ...prev]);
      triggerToast('Gasto registrado.', 'success');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo registrar el gasto.', 'error');
    }
  }, [token, sucursalId, triggerToast]);

  const updateGasto = useCallback(async (id: string, changes: Partial<Gasto>) => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    const actual = gastos.find(g => g.id === id);
    if (!actual) return;
    const merged = { ...actual, ...changes };
    try {
      const actualizado = await actualizarGasto(token, Number(id), {
        fecha: merged.date,
        descripcion: merged.description,
        categoriaId: merged.categoriaId ? Number(merged.categoriaId) : null,
        proveedorId: merged.proveedorId ? Number(merged.proveedorId) : null,
        estado: merged.status,
        monto: merged.amount,
      });
      setGastos(prev => prev.map(x => (x.id === id ? mapGasto(actualizado) : x)));
      triggerToast('Gasto actualizado.', 'success');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el gasto.', 'error');
    }
  }, [token, gastos, triggerToast]);

  const anularGasto = useCallback(async (id: string) => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    const actual = gastos.find(g => g.id === id);
    try {
      const anulado = await anularGastoApi(token, Number(id));
      setGastos(prev => prev.map(x => (x.id === id ? mapGasto(anulado) : x)));
      triggerToast(`Gasto "${actual?.description ?? ''}" anulado.`, 'info');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo anular el gasto.', 'error');
    }
  }, [token, gastos, triggerToast]);

  const addCategoria = useCallback(async (name: string) => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    try {
      const creada = await crearGastoCategoria(token, name, sucursalId);
      setCategorias(prev => [...prev, mapCategoria(creada)]);
      triggerToast(`Categoría "${name}" agregada.`, 'success');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo agregar la categoría.', 'error');
    }
  }, [token, sucursalId, triggerToast]);

  const removeCategoria = useCallback(async (id: string) => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    const actual = categorias.find(c => c.id === id);
    try {
      await eliminarGastoCategoria(token, Number(id));
      setCategorias(prev => prev.filter(c => c.id !== id));
      setGastos(prev => prev.map(g => (g.categoriaId === id ? { ...g, categoriaId: null } : g)));
      triggerToast(`Categoría "${actual?.name ?? ''}" eliminada.`, 'info');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo eliminar la categoría.', 'error');
    }
  }, [token, categorias, triggerToast]);

  const addProveedor = useCallback(async (name: string) => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    try {
      const creado = await crearGastoProveedor(token, name, sucursalId);
      setProveedores(prev => [...prev, mapProveedor(creado)]);
      triggerToast(`Proveedor "${name}" agregado.`, 'success');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo agregar el proveedor.', 'error');
    }
  }, [token, sucursalId, triggerToast]);

  const removeProveedor = useCallback(async (id: string) => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    const actual = proveedores.find(p => p.id === id);
    try {
      await eliminarGastoProveedor(token, Number(id));
      setProveedores(prev => prev.filter(p => p.id !== id));
      setGastos(prev => prev.map(g => (g.proveedorId === id ? { ...g, proveedorId: null } : g)));
      triggerToast(`Proveedor "${actual?.name ?? ''}" eliminado.`, 'info');
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo eliminar el proveedor.', 'error');
    }
  }, [token, proveedores, triggerToast]);

  return (
    <GastosContext.Provider
      value={{
        gastos, categorias, proveedores, loading,
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
