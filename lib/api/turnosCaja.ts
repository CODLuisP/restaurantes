import { apiFetch } from './client';

export interface TurnoCajaDto {
  id: number;
  empresaId: number;
  sucursalId: number;
  cajeroId: number;
  cajeroNombre?: string | null;
  montoApertura: number;
  montoCierre?: number | null;
  abiertoAt: string;
  cerradoAt?: string | null;
  estado: 'abierto' | 'cerrado';
  observaciones?: string | null;
}

export interface AbrirTurnoDto {
  sucursalId?: number | null;
  cajeroId: number;
  montoApertura: number;
}

export interface CerrarTurnoDto {
  montoCierre: number;
  observaciones?: string | null;
}

export interface ResumenTurnoDto {
  turnoId: number;
  montoApertura: number;
  cantidadVentas: number;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalYape: number;
  totalPlin: number;
  totalOtro: number;
  totalIngresos: number;
  totalEgresos: number;
  efectivoEsperado: number;
}

export type TipoMovimientoCaja = 'ingreso' | 'egreso';

export interface MovimientoCajaDto {
  id: number;
  turnoId: number;
  tipo: TipoMovimientoCaja;
  monto: number;
  motivo: string;
  usuarioId: number;
  usuarioNombre?: string | null;
  creadoEn: string;
}

export interface CreateMovimientoCajaDto {
  tipo: TipoMovimientoCaja;
  monto: number;
  motivo: string;
}

export function abrirTurno(token: string, dto: AbrirTurnoDto) {
  return apiFetch<TurnoCajaDto>('/api/turnos-caja', { token, method: 'POST', body: dto });
}

export function cerrarTurno(token: string, id: number, dto: CerrarTurnoDto) {
  return apiFetch<TurnoCajaDto>(`/api/turnos-caja/${id}/cerrar`, { token, method: 'POST', body: dto });
}

export function getTurnoActivo(token: string, cajeroId: number) {
  return apiFetch<TurnoCajaDto>(`/api/turnos-caja/activo?cajeroId=${cajeroId}`, { token });
}

/** ¿Hay algún turno abierto en la sucursal (de cualquier cajero)? Usado para el gate de mozos, no para "mi turno". */
export function getTurnoActivoSucursal(token: string, sucursalId?: number | null) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<TurnoCajaDto>(`/api/turnos-caja/activo-sucursal${query}`, { token });
}

export function getResumenTurno(token: string, id: number) {
  return apiFetch<ResumenTurnoDto>(`/api/turnos-caja/${id}/resumen`, { token });
}

export function getHistorialTurnos(token: string, params: { sucursalId?: number; desde: string; hasta: string }) {
  const query = new URLSearchParams({ desde: params.desde, hasta: params.hasta });
  if (params.sucursalId) query.set('sucursalId', String(params.sucursalId));
  return apiFetch<TurnoCajaDto[]>(`/api/turnos-caja?${query.toString()}`, { token });
}

export function getMovimientosTurno(token: string, turnoId: number) {
  return apiFetch<MovimientoCajaDto[]>(`/api/turnos-caja/${turnoId}/movimientos`, { token });
}

export function crearMovimientoCaja(token: string, turnoId: number, dto: CreateMovimientoCajaDto) {
  return apiFetch<MovimientoCajaDto>(`/api/turnos-caja/${turnoId}/movimientos`, { token, method: 'POST', body: dto });
}
