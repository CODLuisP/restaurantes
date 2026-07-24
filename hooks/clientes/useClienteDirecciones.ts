'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import {
  getClienteById, agregarDireccionCliente, editarDireccionCliente, eliminarDireccionCliente,
} from '@/lib/api/clientes';
import type { Cliente, CreateClienteDireccionDto, UpdateClienteDireccionDto } from '@/types/clientes';

export function useClienteDirecciones() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;

  const refrescarCliente = useCallback(async (clienteId: number): Promise<Cliente | null> => {
    if (!token) return null;
    try {
      return await getClienteById(token, clienteId);
    } catch {
      return null;
    }
  }, [token]);

  const agregar = useCallback(async (clienteId: number, dto: CreateClienteDireccionDto): Promise<Cliente | null> => {
    if (!token) return null;
    try {
      await agregarDireccionCliente(token, clienteId, dto);
      triggerToast('Dirección agregada', 'success');
      return refrescarCliente(clienteId);
    } catch {
      triggerToast('Error al agregar dirección', 'error');
      return null;
    }
  }, [token, triggerToast, refrescarCliente]);

  const editar = useCallback(async (clienteId: number, direccionId: number, dto: UpdateClienteDireccionDto): Promise<Cliente | null> => {
    if (!token) return null;
    try {
      await editarDireccionCliente(token, clienteId, direccionId, dto);
      triggerToast('Dirección actualizada', 'success');
      return refrescarCliente(clienteId);
    } catch {
      triggerToast('Error al actualizar dirección', 'error');
      return null;
    }
  }, [token, triggerToast, refrescarCliente]);

  const eliminar = useCallback(async (clienteId: number, direccionId: number): Promise<Cliente | null> => {
    if (!token) return null;
    try {
      await eliminarDireccionCliente(token, clienteId, direccionId);
      triggerToast('Dirección eliminada', 'success');
      return refrescarCliente(clienteId);
    } catch {
      triggerToast('Error al eliminar dirección', 'error');
      return null;
    }
  }, [token, triggerToast, refrescarCliente]);

  return { agregar, editar, eliminar };
}
