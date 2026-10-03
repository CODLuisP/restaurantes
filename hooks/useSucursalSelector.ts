'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';

export interface SucursalOption {
  id: number;
  nombre: string;
  codEstablecimiento?: string | null;
  sincronizadoFacturacion?: boolean;
}

/**
 * Centraliza el patrón repetido en las páginas escopadas por sucursal: toma las sucursales
 * activas (ya cargadas una vez en AppContext, sin volver a pedirlas) y resuelve cuál mostrar
 * por defecto (la del usuario logueado, o la primera si es superadmin). El consumidor reacciona
 * a cambios de `sId` con su propio `useEffect` para cargar los datos de esa sucursal.
 * `sucursalesLoading` es true mientras la lista todavía no llegó (para no quedarse cargando
 * para siempre si la empresa no tiene sucursales activas).
 */
export function useSucursalSelector() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === 'superadmin';
  const { sucursales: todas, negocioConfigLoading } = useApp();

  const sucursales = useMemo<SucursalOption[]>(() => todas
    .filter(s => s.activo)
    .map(s => ({
      id: s.id, nombre: s.nombre, codEstablecimiento: s.codEstablecimiento,
      sincronizadoFacturacion: s.sincronizadoFacturacion,
    })), [todas]);

  const [sId, setSId] = useState<number | null>(null);

  useEffect(() => {
    if (sId !== null) return;
    const id = session?.user?.sucursalId ?? sucursales[0]?.id;
    if (id) setSId(id);
  }, [sId, sucursales, session?.user?.sucursalId]);

  const sucursalesLoading = negocioConfigLoading && todas.length === 0;

  return { token, isSuperAdmin, sucursales, sId, selectSucursal: setSId, sucursalesLoading };
}
