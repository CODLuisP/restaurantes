'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Toast } from '@/types';
import { ApiError } from '@/lib/api/client';
import { getCocina, cambiarEstadoPedido, cambiarEstadoItemPedido, type PedidoDto } from '@/lib/api/pedidos';
import { usePedidoEvents } from '@/hooks/realtime/usePedidoEvents';

const ESTADOS_ACTIVOS = ['pendiente', 'en_preparacion', 'listo'];

/**
 * Pedidos activos de la sucursal (mesa + llevar + delivery) para Cocina (KDS) y Por despachar.
 * Se cargan una vez y luego se mantienen sincronizados en vivo por el hub de SignalR — nadie
 * necesita refrescar la pantalla para ver una comanda nueva o un cambio de estado.
 */
export function useCocinaPedidos(triggerToast: (message: string, type?: Toast['type']) => void) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;
  const sucursalId = authSession?.user?.sucursalId ?? undefined;

  const [pedidos, setPedidos] = useState<PedidoDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      setPedidos(await getCocina(token, sucursalId));
    } catch {
      triggerToast('No se pudieron cargar los pedidos de cocina.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, sucursalId, triggerToast]);

  useEffect(() => { load(); }, [load]);

  const handlePedidoEvent = useCallback((pedido: PedidoDto) => {
    setPedidos(prev => {
      const activo = ESTADOS_ACTIVOS.includes(pedido.estado);
      const yaEstaba = prev.some(p => p.id === pedido.id);
      if (!activo) return prev.filter(p => p.id !== pedido.id);
      return yaEstaba ? prev.map(p => (p.id === pedido.id ? pedido : p)) : [...prev, pedido];
    });
  }, []);
  usePedidoEvents(handlePedidoEvent);

  /** Avanza TODOS los ítems del pedido de un estado al siguiente (pendiente→en_preparacion→listo→entregado). */
  const avanzarEstado = useCallback(
    async (pedidoId: number, estadoActual: string, nuevoEstado: string) => {
      if (!token) return;
      try {
        // El propio evento "PedidoCambio" del hub actualiza (o quita) el pedido de la lista local.
        await cambiarEstadoPedido(token, pedidoId, estadoActual, nuevoEstado);
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el pedido.', 'error');
      }
    },
    [token, triggerToast]
  );

  /** Mueve UN plato individual entre columnas (pendiente ↔ en_preparacion → listo), sin tocar
   *  al resto de ítems del pedido. Notifica a Comandero en vivo vía el mismo hub de SignalR. */
  const moverItemEstado = useCallback(
    async (itemId: number, estadoActual: string, nuevoEstado: string) => {
      if (!token) return;
      try {
        // El propio evento "PedidoCambio" del hub actualiza (o quita) el pedido de la lista local.
        await cambiarEstadoItemPedido(token, itemId, estadoActual, nuevoEstado);
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el plato.', 'error');
      }
    },
    [token, triggerToast]
  );

  return { pedidos, loading, avanzarEstado, moverItemEstado };
}
