'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getSucursales } from '@/lib/api/sucursales';

export interface SucursalOption {
  id: number;
  nombre: string;
}

/**
 * Centraliza el patrón repetido en las páginas de Configuración escopadas por sucursal:
 * carga la lista de sucursales activas y resuelve cuál mostrar por defecto (la del usuario
 * logueado, o la primera si es superadmin). El consumidor reacciona a cambios de `sId` con
 * su propio `useEffect` para cargar los datos de esa sucursal.
 */
export function useSucursalSelector() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === 'superadmin';

  const [sucursales, setSucursales] = useState<SucursalOption[]>([]);
  const [sId, setSId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    getSucursales(token).then(lista => {
      const activas = lista.filter(s => s.activo);
      setSucursales(activas.map(s => ({ id: s.id, nombre: s.nombre })));
      const id = session?.user?.sucursalId ?? activas[0]?.id;
      if (id) setSId(id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { token, isSuperAdmin, sucursales, sId, selectSucursal: setSId };
}
