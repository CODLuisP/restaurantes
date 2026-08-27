'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getCocinaConnection } from '@/lib/realtime/cocinaHub';
import type { MesaDto } from '@/lib/api/mesas';

export type MesaEvent =
  | { type: 'creada'; mesa: MesaDto }
  | { type: 'eliminada'; mesaId: number }
  | { type: 'cambio'; mesa: MesaDto }
  | { type: 'grupo'; mesas: MesaDto[] };

/**
 * Se suscribe al hub de Cocina para altas/bajas/cambios de mesa y uniones/separaciones de grupo
 * ("MesaCreada", "MesaEliminada", "MesaCambio", "MesaGrupoActualizado"), para que el tablero de
 * mesas y los avisos en vivo no dependan de un refresco manual.
 */
export function useMesaEvents(onEvent: (event: MesaEvent) => void) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;

  useEffect(() => {
    if (!token) return;
    const connection = getCocinaConnection(token);

    const onCreada = (mesa: MesaDto) => onEvent({ type: 'creada', mesa });
    const onEliminada = (payload: { mesaId: number }) => onEvent({ type: 'eliminada', mesaId: payload.mesaId });
    const onCambio = (mesa: MesaDto) => onEvent({ type: 'cambio', mesa });
    const onGrupo = (mesas: MesaDto[]) => onEvent({ type: 'grupo', mesas });

    connection.on('MesaCreada', onCreada);
    connection.on('MesaEliminada', onEliminada);
    connection.on('MesaCambio', onCambio);
    connection.on('MesaGrupoActualizado', onGrupo);

    return () => {
      connection.off('MesaCreada', onCreada);
      connection.off('MesaEliminada', onEliminada);
      connection.off('MesaCambio', onCambio);
      connection.off('MesaGrupoActualizado', onGrupo);
    };
  }, [token, onEvent]);
}
