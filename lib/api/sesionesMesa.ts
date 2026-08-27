import { apiFetch } from './client';

export type SesionMesaTipo = 'local' | 'delivery' | 'para_llevar';

export interface DeliveryInfoDto {
  id: number;
  nombreCliente: string;
  telefono: string;
  direccion: string;
  referencia?: string | null;
  repartidorId?: number | null;
  repartidorNombre?: string | null;
  estadoDelivery: string;
  createdAt: string;
}

export interface SesionMesaDto {
  id: number;
  empresaId: number;
  sucursalId: number;
  mesaId?: number | null;
  mesaNumero?: number | null;
  mozoId?: number | null;
  mozoNombre?: string | null;
  tipo: SesionMesaTipo;
  nombreCliente?: string | null;
  numComensales: number;
  fecha: string;
  abiertaAt: string;
  cerradaAt?: string | null;
  estado: string;
  delivery?: DeliveryInfoDto | null;
}

export interface DeliveryInfoInputDto {
  telefono: string;
  direccion: string;
  referencia?: string;
}

export interface CreateSesionDto {
  mesaId?: number | null;
  mozoId?: number | null;
  tipo: SesionMesaTipo;
  nombreCliente?: string;
  numComensales?: number;
  sucursalId?: number | null;
  delivery?: DeliveryInfoInputDto | null;
}

export function getSesionesActivas(token: string, tipo: SesionMesaTipo, sucursalId?: number) {
  const query = new URLSearchParams({ tipo });
  if (sucursalId) query.set('sucursalId', String(sucursalId));
  return apiFetch<SesionMesaDto[]>(`/api/sesiones-mesa?${query.toString()}`, { token });
}

export function getSesionMesa(token: string, id: number) {
  return apiFetch<SesionMesaDto>(`/api/sesiones-mesa/${id}`, { token });
}

export function crearSesionMesa(token: string, dto: CreateSesionDto) {
  return apiFetch<SesionMesaDto>('/api/sesiones-mesa', { token, method: 'POST', body: dto });
}

export function cerrarSesionMesa(token: string, id: number) {
  return apiFetch<void>(`/api/sesiones-mesa/${id}/cerrar`, { token, method: 'POST' });
}
