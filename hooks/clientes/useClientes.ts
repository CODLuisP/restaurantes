'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import { CLIENTES_API } from './clientesApi';
import type { Cliente } from '@/types/clientes';

export function useClientes(enabled: boolean = true) {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  const token = session?.accessToken;
  const sessionError = (session as any)?.error;

  const fetchClientes = useCallback(async () => {
    if (!token || sessionError) return;
    setLoading(true);
    try {
      const res = await fetch(CLIENTES_API.getAll(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { triggerToast('Sesión expirada, vuelve a iniciar sesión', 'error'); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Cliente[] = await res.json();
      setClientes(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg && !msg.includes('Failed to fetch')) {
        triggerToast('Error al cargar clientes', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchClienteById = useCallback(async (id: number): Promise<Cliente | null> => {
    if (!token) return null;
    try {
      const res = await fetch(CLIENTES_API.getById(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      triggerToast('Error al obtener el cliente', 'error');
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (token && enabled && !sessionError) fetchClientes();
  }, [token, enabled, sessionError]);

  return { clientes, setClientes, loading, fetchClientes, fetchClienteById };
}
