'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getConfiguracion } from '@/lib/api/configuracion';
import {
  DEFAULT_METODOS_PAGO, DEFAULT_METODOS_ENTREGA, parseMetodosPago, parseMetodosEntrega,
  type MetodosPago, type MetodosEntrega,
} from '@/lib/config/metodos';

/**
 * Config operativa de la sucursal (métodos de pago/entrega habilitados, % de IGV) — la misma
 * que se edita en /configuracion, para que Cobrar y Comandero reflejen de verdad lo configurado
 * en vez de mostrar siempre todas las opciones.
 */
export function useNegocioConfig() {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;
  const sucursalId = authSession?.user?.sucursalId ?? undefined;

  const [metodosPago, setMetodosPago] = useState<MetodosPago>(DEFAULT_METODOS_PAGO);
  const [metodosEntrega, setMetodosEntrega] = useState<MetodosEntrega>(DEFAULT_METODOS_ENTREGA);
  const [igvPorcentaje, setIgvPorcentaje] = useState(18);
  const [negocioConfigLoading, setNegocioConfigLoading] = useState(true);

  const refreshNegocioConfig = useCallback(async () => {
    if (!token || !sucursalId) { setNegocioConfigLoading(false); return; }
    setNegocioConfigLoading(true);
    try {
      const c = await getConfiguracion(token, sucursalId);
      setIgvPorcentaje(c.igvPorcentaje ?? 18);
      setMetodosPago(parseMetodosPago(c.metodosPagoJson));
      setMetodosEntrega(parseMetodosEntrega(c.metodosEntregaJson));
    } catch {
      /* silencioso: si falla, se queda con lo último cargado (o los defaults) */
    } finally {
      setNegocioConfigLoading(false);
    }
  }, [token, sucursalId]);

  useEffect(() => { refreshNegocioConfig(); }, [refreshNegocioConfig]);

  return { metodosPago, metodosEntrega, igvPorcentaje, negocioConfigLoading, refreshNegocioConfig };
}
