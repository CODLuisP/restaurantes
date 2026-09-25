'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getConfiguracion } from '@/lib/api/configuracion';
import { getMiEmpresa, type EmpresaDto } from '@/lib/api/empresas';
import { getSucursales, type Sucursal } from '@/lib/api/sucursales';
import { getTicketsConfig, type TicketsConfigDto } from '@/lib/api/ticketsConfig';
import {
  DEFAULT_METODOS_PAGO, DEFAULT_METODOS_ENTREGA, parseMetodosPago, parseMetodosEntrega,
  type MetodosPago, type MetodosEntrega,
} from '@/lib/config/metodos';
import { defaultConfig, type TicketBlock, type PaperSize } from '@/components/configuracion/tickets/ticketData';

/** Qué parte de la carga falló — para que cada vista muestre su propio aviso de error. */
export interface NegocioConfigErrores {
  configuracion: boolean;
  empresa: boolean;
  sucursales: boolean;
  ticketsConfig: boolean;
}

/** Datos del negocio que se imprimen en los bloques "Negocio"/"Imagen" de los tickets. */
export interface NegocioTicket {
  businessName?: string;
  logoUrl?: string;
  ruc?: string;
  direccion?: string;
}

const SIN_ERRORES: NegocioConfigErrores = { configuracion: false, empresa: false, sucursales: false, ticketsConfig: false };

/**
 * Configuración central del negocio: se carga UNA vez por sesión (AppContext la expone con
 * useApp()) para que ninguna vista tenga que pedirla por su cuenta al navegar.
 *
 * - Configuración de la sucursal del usuario (tabla configuracion): métodos de pago/entrega,
 *   % de IGV, impresora de cocina y si la sucursal ya está sincronizada con facturación.
 *   El superadmin no tiene sucursal fija → estos quedan en sus defaults / null; las vistas que
 *   él usa trabajan con la sucursal elegida en su selector.
 * - Empresa (tabla empresas): datos completos + interruptor de facturación electrónica.
 * - Sucursales de la empresa (todas, activas e inactivas; cada vista filtra lo que necesita).
 * - Plantillas de tickets (Configuración → Tickets).
 *
 * Cambios hechos en ESTA sesión: llamar a refreshNegocioConfig() después de guardar.
 * Cambios hechos desde otro dispositivo: se ven al recargar la página.
 */
export function useNegocioConfig() {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;
  const sucursalId = authSession?.user?.sucursalId ?? undefined;

  const [metodosPago, setMetodosPago] = useState<MetodosPago>(DEFAULT_METODOS_PAGO);
  const [metodosEntrega, setMetodosEntrega] = useState<MetodosEntrega>(DEFAULT_METODOS_ENTREGA);
  const [igvPorcentaje, setIgvPorcentaje] = useState(18);
  const [impresoraCocina, setImpresoraCocina] = useState(false);
  const [sucursalSincronizada, setSucursalSincronizada] = useState<boolean | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaDto | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [ticketsConfig, setTicketsConfig] = useState<TicketsConfigDto | null>(null);
  const [negocioConfigErrores, setNegocioConfigErrores] = useState<NegocioConfigErrores>(SIN_ERRORES);
  const [negocioConfigLoading, setNegocioConfigLoading] = useState(true);

  const refreshNegocioConfig = useCallback(async () => {
    if (!token) { setNegocioConfigLoading(false); return; }
    setNegocioConfigLoading(true);
    const [config, emp, sucs, tickets] = await Promise.allSettled([
      sucursalId ? getConfiguracion(token, sucursalId) : Promise.resolve(null),
      getMiEmpresa(token),
      getSucursales(token),
      getTicketsConfig(token),
    ]);
    /* Si alguna falla, se queda con lo último cargado (o los defaults) y se marca el error. */
    if (config.status === 'fulfilled' && config.value) {
      const c = config.value;
      setIgvPorcentaje(c.igvPorcentaje ?? 18);
      setMetodosPago(parseMetodosPago(c.metodosPagoJson));
      setMetodosEntrega(parseMetodosEntrega(c.metodosEntregaJson));
      setImpresoraCocina(c.impresoraCocina ?? false);
      setSucursalSincronizada(c.sincronizadoFacturacion ?? null);
    }
    if (emp.status === 'fulfilled') setEmpresa(emp.value);
    if (sucs.status === 'fulfilled') setSucursales(sucs.value);
    if (tickets.status === 'fulfilled') setTicketsConfig(tickets.value);
    setNegocioConfigErrores({
      configuracion: config.status === 'rejected',
      empresa: emp.status === 'rejected',
      sucursales: sucs.status === 'rejected',
      ticketsConfig: tickets.status === 'rejected',
    });
    setNegocioConfigLoading(false);
  }, [token, sucursalId]);

  useEffect(() => { refreshNegocioConfig(); }, [refreshNegocioConfig]);

  const usarFacturacionElectronica = empresa ? empresa.usarFacturacionElectronica : null;

  /* Plantilla de la comanda de cocina: si no hay nada guardado (o el JSON está corrupto) se
     imprime con la plantilla por defecto. */
  const cocinaBlocks = useMemo<TicketBlock[]>(() => {
    if (ticketsConfig?.cocinaJson) {
      try { return JSON.parse(ticketsConfig.cocinaJson); } catch { /* plantilla por defecto */ }
    }
    return defaultConfig().cocina;
  }, [ticketsConfig]);

  const ticketPaperSize: PaperSize =
    ticketsConfig?.paperSize === '58mm' || ticketsConfig?.paperSize === '80mm' ? ticketsConfig.paperSize : '80mm';

  const negocioTicket = useMemo<NegocioTicket>(() => ({
    businessName: empresa ? (empresa.razonSocial || empresa.nombreComercial || empresa.nombre || undefined) : undefined,
    logoUrl: empresa?.logoUrl ?? undefined,
    ruc: empresa?.ruc || undefined,
    direccion: empresa ? (empresa.direccionCompleta || empresa.direccion || undefined) : undefined,
  }), [empresa]);

  return {
    metodosPago, metodosEntrega, igvPorcentaje, impresoraCocina, sucursalSincronizada,
    empresa, usarFacturacionElectronica,
    sucursales, setSucursales,
    ticketsConfig, cocinaBlocks, ticketPaperSize, negocioTicket,
    negocioConfigLoading, negocioConfigErrores, refreshNegocioConfig,
  };
}
