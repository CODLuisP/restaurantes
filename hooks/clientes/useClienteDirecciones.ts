'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import { CLIENTES_API, DIRECCIONES_API } from './clientesApi';
import type { Cliente, CreateClienteDireccionDto, UpdateClienteDireccionDto } from '@/types/clientes';

export function useClienteDirecciones() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();

  const token = session?.accessToken;
  const authHeader = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const refrescarCliente = useCallback(async (clienteId: number): Promise<Cliente | null> => {
    try {
      const res = await fetch(CLIENTES_API.getById(clienteId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }, [token]);

  const agregar = useCallback(async (clienteId: number, dto: CreateClienteDireccionDto): Promise<Cliente | null> => {
    try {
      const res = await fetch(DIRECCIONES_API.agregar(clienteId), {
        method: 'POST', headers: authHeader, body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error();
      triggerToast('Dirección agregada', 'success');
      return refrescarCliente(clienteId);
    } catch {
      triggerToast('Error al agregar dirección', 'error');
      return null;
    }
  }, [token]);

  const editar = useCallback(async (clienteId: number, direccionId: number, dto: UpdateClienteDireccionDto): Promise<Cliente | null> => {
    try {
      const res = await fetch(DIRECCIONES_API.editar(clienteId, direccionId), {
        method: 'PUT', headers: authHeader, body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error();
      triggerToast('Dirección actualizada', 'success');
      return refrescarCliente(clienteId);
    } catch {
      triggerToast('Error al actualizar dirección', 'error');
      return null;
    }
  }, [token]);

  const eliminar = useCallback(async (clienteId: number, direccionId: number): Promise<Cliente | null> => {
    try {
      const res = await fetch(DIRECCIONES_API.eliminar(clienteId, direccionId), {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      triggerToast('Dirección eliminada', 'success');
      return refrescarCliente(clienteId);
    } catch {
      triggerToast('Error al eliminar dirección', 'error');
      return null;
    }
  }, [token]);

  return { agregar, editar, eliminar };
}
