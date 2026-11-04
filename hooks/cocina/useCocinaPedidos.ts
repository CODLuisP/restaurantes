'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { Toast } from '@/types';
import { ApiError } from '@/lib/api/client';
import { cambiarEstadoPedido, cambiarEstadoItemPedido } from '@/lib/api/pedidos';
import { useCocinaPedidosContext } from '@/context/CocinaPedidosContext';

/**
 * Pedidos activos de la sucursal (mesa + llevar + delivery) para Cocina (KDS) y Por despachar.
 * La lista vive en CocinaPedidosProvider (una sola carga + una sola suscripción al hub para todo
 * el dashboard); este hook solo agrega las acciones, que avisan errores con el toast de quien llama.
 */
export function useCocinaPedidos(triggerToast: (message: string, type?: Toast['type']) => void) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;
  const { pedidos, loading } = useCocinaPedidosContext();

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
