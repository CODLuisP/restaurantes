import { apiFetch } from './client';
import { toFechaParam } from './reportes';

export interface MozoResumenDto {
  nombre: string;
  cantidadSesiones: number;
  totalVentas: number;
}

export interface TopCategoriaDto {
  nombre: string;
  totalVendido: number;
}

export interface TopProductoDto {
  nombre: string;
  cantidadVendida: number;
  totalVendido: number;
}

export interface PedidoDemoradoDto {
  mesa: string;
  cantidadPedidos: number;
  segundosEspera: number;
}

export interface DashboardResumenDto {
  ventasHoy: number;
  cantidadVentasHoy: number;
  mesasTotal: number;
  mesasLibres: number;
  mesasOcupadas: number;
  pedidosHoy: number;
  pedidosEnCocinaAhora: number;
  tiempoPromedioOcupacionMinutos?: number | null;
  pedidosCanceladosHoy: number;
  tasaComprobantesElectronicos: number;
  cantidadComprobantesElectronicos: number;
  rendimientoPorMozo: MozoResumenDto[];
  topCategoriasHoy: TopCategoriaDto[];
  topProductosHoy: TopProductoDto[];
  pedidosDemoradosEnCocina: PedidoDemoradoDto[];
}

export interface VentasResumenDto {
  cantidadVentas: number;
  /** Ventas brutas: tickets, boletas y facturas, sin notas de crédito/débito. */
  totalVentas: number;
  /** Notas que afectan documentos del mismo rango: ajustan las ventas netas. */
  ncPeriodo: number;
  ndPeriodo: number;
  /** Notas que afectan documentos de antes del rango: se muestran aparte, NO ajustan las netas. */
  ncAnteriores: number;
  ndAnteriores: number;
  /** Brutas + notas de débito − notas de crédito, solo las del periodo. */
  ventasNetas: number;
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

export function getDashboardResumen(token: string, fecha: Date, sucursalId?: number) {
  const query = new URLSearchParams({ fecha: toFechaParam(fecha) });
  if (sucursalId) query.set('sucursalId', String(sucursalId));
  return apiFetch<DashboardResumenDto>(`/api/dashboard/resumen?${query.toString()}`, { token });
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

/** Ventas del día elegido/día anterior/mes del día elegido/mes anterior en una sola llamada — reemplaza 4 llamadas a getDashboardVentas. */
export function getVentasComparativo(token: string, fecha: Date, sucursalId?: number) {
  const query = new URLSearchParams({ fecha: toFechaParam(fecha) });
  if (sucursalId) query.set('sucursalId', String(sucursalId));
  return apiFetch<VentasComparativoDto>(`/api/dashboard/ventas-comparativo?${query.toString()}`, { token });
}

export function getVentasPorHora(token: string, fecha: Date, sucursalId?: number) {
  const query = new URLSearchParams({ fecha: toFechaParam(fecha) });
  if (sucursalId) query.set('sucursalId', String(sucursalId));
  return apiFetch<VentaPorHoraDto[]>(`/api/dashboard/ventas-por-hora?${query.toString()}`, { token });
}
