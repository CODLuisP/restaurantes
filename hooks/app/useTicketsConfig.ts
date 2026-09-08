'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getTicketsConfig } from '@/lib/api/ticketsConfig';
import { getMiEmpresa } from '@/lib/api/empresas';
import { defaultConfig, type TicketBlock, type PaperSize } from '@/components/configuracion/tickets/ticketData';

/** Plantilla de la comanda de cocina configurada en /configuracion/tickets, más el nombre/logo
 *  reales del negocio (para los bloques "Negocio"/"Imagen") — se cargan una vez y se reusan cada
 *  vez que hay que imprimir, en vez de pedirlos de nuevo por cada comanda. */
export function useTicketsConfig() {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;

  const [cocinaBlocks, setCocinaBlocks] = useState<TicketBlock[]>(() => defaultConfig().cocina);
  const [paperSize, setPaperSize] = useState<PaperSize>('80mm');
  const [businessName, setBusinessName] = useState<string | undefined>(undefined);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  const refreshTicketsConfig = useCallback(async () => {
    if (!token) return;
    try {
      const dto = await getTicketsConfig(token);
      if (dto?.cocinaJson) {
        try { setCocinaBlocks(JSON.parse(dto.cocinaJson)); } catch { /* JSON corrupto: se queda con la plantilla anterior */ }
      }
      if (dto?.paperSize === '58mm' || dto?.paperSize === '80mm') setPaperSize(dto.paperSize);
    } catch {
      /* silencioso: si falla, se imprime con la plantilla por defecto */
    }
    try {
      const empresa = await getMiEmpresa(token);
      setBusinessName(empresa.razonSocial || empresa.nombreComercial || empresa.nombre || undefined);
      setLogoUrl(empresa.logoUrl ?? undefined);
    } catch {
      /* silencioso: si falla, los bloques "Negocio"/"Imagen" simplemente no se imprimen */
    }
  }, [token]);

  useEffect(() => { refreshTicketsConfig(); }, [refreshTicketsConfig]);

  return { cocinaBlocks, paperSize, businessName, logoUrl, refreshTicketsConfig };
}
