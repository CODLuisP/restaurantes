import { apiFetch } from './client';

export interface Usuario {
  id: number;
  empresaId: number;
  sucursalId: number | null;
  rolId: number;
  rolNombre: string;
  nombre: string;
  username: string;
  email: string;
  activo: boolean;
  createdAt: string;
}

export interface CreateUsuarioPayload {
  sucursalId?: number | null;
  rolId: number;
  nombre: string;
  username: string;
  email?: string;
  password?: string;
  pin?: string;
}

export interface UpdateUsuarioPayload {
  sucursalId?: number | null;
  rolId: number;
  nombre: string;
  email?: string;
  password?: string;
  pin?: string;
  activo: boolean;
}

export function getUsuarios(token: string, filters?: { sucursalId?: number; rolId?: number }) {
  const params = new URLSearchParams();
  if (filters?.sucursalId) params.set('sucursalId', String(filters.sucursalId));
  if (filters?.rolId) params.set('rolId', String(filters.rolId));
  const qs = params.toString();
  return apiFetch<Usuario[]>(`/api/usuarios${qs ? `?${qs}` : ''}`, { token });
}

export function createUsuario(token: string, dto: CreateUsuarioPayload) {
  return apiFetch<Usuario>('/api/usuarios', { token, method: 'POST', body: dto });
}

export function updateUsuario(token: string, id: number, dto: UpdateUsuarioPayload) {
  return apiFetch<Usuario>(`/api/usuarios/${id}`, { token, method: 'PUT', body: dto });
}
