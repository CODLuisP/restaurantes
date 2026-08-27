import { apiFetch } from './client';
import type { ZonaEntregaDto, UpsertZonaEntregaDto, ZonaExclusionDto, UpsertExclusionDto } from '@/types/zonasEntrega';

export function getZonasEntrega(token: string, sucursalId: number) {
  return apiFetch<ZonaEntregaDto[]>(`/api/zonas-entrega?sucursalId=${sucursalId}`, { token });
}

export function createZonaEntrega(token: string, sucursalId: number, dto: UpsertZonaEntregaDto) {
  return apiFetch<ZonaEntregaDto>(`/api/zonas-entrega?sucursalId=${sucursalId}`, { token, method: 'POST', body: dto });
}

export function updateZonaEntrega(token: string, id: number, dto: UpsertZonaEntregaDto) {
  return apiFetch<ZonaEntregaDto>(`/api/zonas-entrega/${id}`, { token, method: 'PUT', body: dto });
}

export function deleteZonaEntrega(token: string, id: number) {
  return apiFetch<void>(`/api/zonas-entrega/${id}`, { token, method: 'DELETE' });
}

export function addZonaExclusion(token: string, zonaId: number, dto: UpsertExclusionDto) {
  return apiFetch<ZonaExclusionDto>(`/api/zonas-entrega/${zonaId}/exclusiones`, { token, method: 'POST', body: dto });
}

export function updateZonaExclusion(token: string, exclusionId: number, dto: UpsertExclusionDto) {
  return apiFetch<ZonaExclusionDto>(`/api/zonas-entrega/exclusiones/${exclusionId}`, { token, method: 'PUT', body: dto });
}

export function deleteZonaExclusion(token: string, exclusionId: number) {
  return apiFetch<void>(`/api/zonas-entrega/exclusiones/${exclusionId}`, { token, method: 'DELETE' });
}
