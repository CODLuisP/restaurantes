import { apiFetch } from './client';

export interface CategoriaVentaDto {
  categoriaNombre: string;
  cantidadVendida: number;
  totalVendido: number;
}

export interface TiemposOperacionDto {
  /** Minutos promedio reales (creación del ítem → marcado "listo" en Cocina). Null sin datos. */
  prepCocinaMinutos: number | null;
  /** Minutos promedio reales que las mesas estuvieron ocupadas (abierta_at → cerrada_at). */
  permanenciaMesaMinutos: number | null;
  /** Aproximación (creación del pedido → pago de la venta) para delivery — no es el tiempo real
   *  de entrega en la calle, eso no se registra. */
  despachoDeliveryMinutos: number | null;
}

export interface AforoHoraDto {
  hora: number;
  cantidad: number;
}

export interface ReporteResumenDto {
  categorias: CategoriaVentaDto[];
  tiempos: TiemposOperacionDto;
  aforo: AforoHoraDto[];
}

/** Formatea una fecha local (no UTC) como YYYY-MM-DD para los query params del backend. */
export const toFechaParam = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function getReporteResumen(
  token: string,
  params: { sucursalId?: number; fechaInicio: string; fechaFin: string }
) {
  const query = new URLSearchParams({ fechaInicio: params.fechaInicio, fechaFin: params.fechaFin });
  if (params.sucursalId) query.set('sucursalId', String(params.sucursalId));
  return apiFetch<ReporteResumenDto>(`/api/reportes/resumen?${query.toString()}`, { token });
}
