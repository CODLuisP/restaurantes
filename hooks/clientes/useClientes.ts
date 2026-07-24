'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import { getClientes, getClienteById } from '@/lib/api/clientes';
import { ApiError } from '@/lib/api/client';
import type { Cliente } from '@/types/clientes';

export function useClientes(enabled: boolean = true) {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  const token = session?.accessToken;
  const sessionError = session?.error;

  const fetchClientes = useCallback(async () => {
    if (!token || sessionError) return;
    setLoading(true);
    try {
      const data = await getClientes(token);
      setClientes(data);
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        triggerToast('Sesión expirada, vuelve a iniciar sesión', 'error');
        return;
      }
      triggerToast('Error al cargar clientes', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, sessionError, triggerToast]);

  const fetchClienteById = useCallback(async (id: number): Promise<Cliente | null> => {
    if (!token) return null;
    try {
      return await getClienteById(token, id);
    } catch {
      triggerToast('Error al obtener el cliente', 'error');
      return null;
    }
  }, [token, triggerToast]);

  useEffect(() => {
    if (token && enabled && !sessionError) fetchClientes();
  }, [token, enabled, sessionError, fetchClientes]);

  return { clientes, setClientes, loading, fetchClientes, fetchClienteById };
}
