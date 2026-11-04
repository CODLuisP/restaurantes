'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import { getCocina, type PedidoDto } from '@/lib/api/pedidos';
import { usePedidoEvents } from '@/hooks/realtime/usePedidoEvents';

const ESTADOS_ACTIVOS = ['pendiente', 'en_preparacion', 'listo'];

interface CocinaPedidosValue {
  pedidos: PedidoDto[];
  loading: boolean;
}

const CocinaPedidosContext = createContext<CocinaPedidosValue | null>(null);

/**
 * Pedidos activos de la sucursal (mesa + llevar + delivery), cargados UNA sola vez para todo el
 * dashboard y mantenidos en vivo por el hub de SignalR. Antes cada consumidor (Sidebar, Cocina,
 * Por despachar, Dashboard) hacía su propia carga y su propia suscripción al hub.
 */
export function CocinaPedidosProvider({ children }: { children: React.ReactNode }) {
  const { data: authSession } = useSession();
  const { triggerToast } = useApp();
  const token = authSession?.accessToken;
  const isSuperAdmin = authSession?.user?.role === 'superadmin';
  const sucursalId = authSession?.user?.sucursalId ?? undefined;

  const [pedidos, setPedidos] = useState<PedidoDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    // Superadmin no tiene sucursal fija y no opera Cocina/Comandero/Despachar — nada que cargar aquí.
    if (isSuperAdmin && !sucursalId) { setPedidos([]); setLoading(false); return; }
    let cancelado = false;
    setLoading(true);
    getCocina(token, sucursalId)
      .then(data => { if (!cancelado) setPedidos(data); })
      .catch(() => { if (!cancelado) triggerToast('No se pudieron cargar los pedidos de cocina.', 'error'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [token, isSuperAdmin, sucursalId, triggerToast]);

  const handlePedidoEvent = useCallback((pedido: PedidoDto) => {
    setPedidos(prev => {
      const activo = ESTADOS_ACTIVOS.includes(pedido.estado);
      const yaEstaba = prev.some(p => p.id === pedido.id);
      if (!activo) return prev.filter(p => p.id !== pedido.id);
      return yaEstaba ? prev.map(p => (p.id === pedido.id ? pedido : p)) : [...prev, pedido];
    });
  }, []);
  usePedidoEvents(handlePedidoEvent);

  return (
    <CocinaPedidosContext.Provider value={{ pedidos, loading }}>
      {children}
    </CocinaPedidosContext.Provider>
  );
}

export function useCocinaPedidosContext() {
  const ctx = useContext(CocinaPedidosContext);
  if (!ctx) throw new Error('useCocinaPedidos debe usarse dentro de CocinaPedidosProvider');
  return ctx;
}
