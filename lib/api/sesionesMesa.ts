import { apiFetch } from './client';
import type { PedidoDto } from './pedidos';

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

/** Como SesionMesaDto, pero con el pedido completo (items/variantes/extras) y lo ya facturado de
 *  cada sesión ya resuelto en el backend — evita 1+N+N requests al cargar llevar/delivery. */
export interface SesionActivaTableroDto {
  id: number;
  sucursalId: number;
  tipo: SesionMesaTipo;
  mozoNombre?: string | null;
  nombreCliente?: string | null;
  numComensales: number;
  abiertaAt: string;
  estado: string;
  delivery?: DeliveryInfoDto | null;
  pedido: PedidoDto | null;
  facturado: Record<string, number>;
}

export function getSesionesActivasTablero(token: string, tipo: SesionMesaTipo, sucursalId?: number) {
  const query = new URLSearchParams({ tipo });
  if (sucursalId) query.set('sucursalId', String(sucursalId));
  return apiFetch<SesionActivaTableroDto[]>(`/api/sesiones-mesa/tablero?${query.toString()}`, { token });
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
