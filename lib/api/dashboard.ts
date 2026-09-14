import { apiFetch } from './client';
import { toFechaParam } from './reportes';

export interface DashboardResumenDto {
  ventasHoy: number;
  cantidadVentasHoy: number;
  mesasTotal: number;
  mesasLibres: number;
  mesasOcupadas: number;
  pedidosHoy: number;
  pedidosEnCocinaAhora: number;
  tiempoPromedioOcupacionMinutos?: number | null;
}

export interface VentasResumenDto {
  cantidadVentas: number;
  totalVentas: number;
  ticketPromedio: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalYape: number;
  totalPlin: number;
  totalOtro: number;
}

export interface VentaPorHoraDto {
  hora: number;
  monto: number;
  cantidad: number;
}

export interface VentasComparativoDto {
  hoy: VentasResumenDto;
  ayer: VentasResumenDto;
  mesActual: VentasResumenDto;
  mesAnterior: VentasResumenDto;
}

export function getDashboardResumen(token: string, sucursalId?: number) {
  const qs = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<DashboardResumenDto>(`/api/dashboard/resumen${qs}`, { token });
}

export function getDashboardVentas(
  token: string, fechaInicio: Date, fechaFin: Date, sucursalId?: number
) {
  const query = new URLSearchParams({
    fechaInicio: toFechaParam(fechaInicio),
    fechaFin: toFechaParam(fechaFin),
  });
  if (sucursalId) query.set('sucursalId', String(sucursalId));
  return apiFetch<VentasResumenDto>(`/api/dashboard/ventas?${query.toString()}`, { token });
}

/** Ventas de hoy/ayer/mes actual/mes anterior en una sola llamada — reemplaza 4 llamadas a getDashboardVentas. */
export function getVentasComparativo(token: string, sucursalId?: number) {
  const qs = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<VentasComparativoDto>(`/api/dashboard/ventas-comparativo${qs}`, { token });
}

export function getVentasPorHora(token: string, fecha: Date, sucursalId?: number) {
  const query = new URLSearchParams({ fecha: toFechaParam(fecha) });
  if (sucursalId) query.set('sucursalId', String(sucursalId));
  return apiFetch<VentaPorHoraDto[]>(`/api/dashboard/ventas-por-hora?${query.toString()}`, { token });
}
