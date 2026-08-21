'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCocinaConnection } from '@/lib/realtime/cocinaHub';

export interface SesionCerradaPayload {
  sesionId: number;
  mesaId: number | null;
}

/** Se suscribe al hub de Cocina: una sesión se cerró (mesa liberada al cobrar/cancelar, o un
 *  pedido llevar/delivery cobrado antes de entregarse) — para refrescar mesas y llevar/delivery en vivo. */
export function useSesionCerradaEvents(onEvent: (payload: SesionCerradaPayload) => void) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;

  useEffect(() => {
    if (!token) return;
    const connection = getCocinaConnection(token);
    connection.on('SesionCerrada', onEvent);
    return () => { connection.off('SesionCerrada', onEvent); };
  }, [token, onEvent]);
}
