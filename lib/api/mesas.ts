import { apiFetch } from './client';

export type MesaEstado = 'libre' | 'ocupada' | 'reservada';

export interface MesaDto {
  id: number;
  empresaId: number;
  sucursalId: number;
  numero: number;
  capacidad: number;
  estado: MesaEstado;
  ubicacion?: string | null;
  token: string;
}

export interface CreateMesaDto {
  sucursalId?: number | null;
  numero: number;
  capacidad: number;
  ubicacion?: string | null;
}

export function getMesas(token: string, sucursalId?: number) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<MesaDto[]>(`/api/mesas${query}`, { token });
}

/** Fila del tablero de mesas: la mesa + su sesión activa (si la hay) + el consumo acumulado. */
export interface MesaEstadoDto {
  mesaId: number;
  numero: number;
  capacidad: number;
  estado: MesaEstado;
  ubicacion?: string | null;
  sesionId?: number | null;
  nombreCliente?: string | null;
  numComensales?: number | null;
  abiertaAt?: string | null;
  total: number;
}

export function getMesasEstado(token: string, sucursalId?: number) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<MesaEstadoDto[]>(`/api/mesas/estado${query}`, { token });
}

export function setMesaEstado(token: string, id: number, estado: MesaEstado) {
  return apiFetch<void>(`/api/mesas/${id}/estado`, { token, method: 'PUT', body: estado });
}

export function createMesa(token: string, dto: CreateMesaDto) {
  return apiFetch<MesaDto>('/api/mesas', { token, method: 'POST', body: dto });
}

export function deleteMesa(token: string, id: number) {
  return apiFetch<void>(`/api/mesas/${id}`, { token, method: 'DELETE' });
}
