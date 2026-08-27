import { apiFetch } from './client';
import type { CierreDto, CreateCierreDto } from '@/types/cierres';

export function getCierres(token: string, sucursalId: number) {
  return apiFetch<CierreDto[]>(`/api/cierres?sucursalId=${sucursalId}`, { token });
}

export function createCierre(token: string, sucursalId: number, dto: CreateCierreDto) {
  return apiFetch<CierreDto>(`/api/cierres?sucursalId=${sucursalId}`, { token, method: 'POST', body: dto });
}

export function deleteCierre(token: string, id: number) {
  return apiFetch<void>(`/api/cierres/${id}`, { token, method: 'DELETE' });
}
