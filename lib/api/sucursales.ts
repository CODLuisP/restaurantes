import { apiFetch } from './client';

export interface Sucursal {
  id: number;
  empresaId: number;
  nombre: string;
  codEstablecimiento?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  activo: boolean;
  createdAt: string;
}

export interface UpdateSucursalDto {
  nombre: string;
  codEstablecimiento?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  activo: boolean;
}

export interface CreateSucursalDto {
  nombre: string;
  codEstablecimiento?: string | null;
  direccion?: string | null;
  telefono?: string | null;
}

export function getSucursales(token: string) {
  return apiFetch<Sucursal[]>('/api/sucursales', { token });
}

export function getSucursalById(token: string, id: number) {
  return apiFetch<Sucursal>(`/api/sucursales/${id}`, { token });
}

export function createSucursal(token: string, dto: CreateSucursalDto) {
  return apiFetch<Sucursal>('/api/sucursales', { token, method: 'POST', body: dto });
}

export function updateSucursal(token: string, id: number, dto: UpdateSucursalDto) {
  return apiFetch<Sucursal>(`/api/sucursales/${id}`, { token, method: 'PUT', body: dto });
}
