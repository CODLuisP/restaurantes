'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCocinaConnection } from '@/lib/realtime/cocinaHub';
import type { PedidoDto } from '@/lib/api/pedidos';

/**
 * Se suscribe al hub de Cocina: cada vez que un pedido se crea, se edita, cambia de estado
 * o se cancela, el backend manda el PedidoDto actualizado por "PedidoCambio". `onEvent` decide
 * qué hacer (viene siempre memoizado con useCallback en quien llama, para no reconectar el listener).
 */
export function usePedidoEvents(onEvent: (pedido: PedidoDto) => void) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;

  useEffect(() => {
    if (!token) return;
    const connection = getCocinaConnection(token);
    connection.on('PedidoCambio', onEvent);
    return () => { connection.off('PedidoCambio', onEvent); };
  }, [token, onEvent]);
}
