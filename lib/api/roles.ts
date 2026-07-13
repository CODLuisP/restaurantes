import { apiFetch } from './client';

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string | null;
}

export function getRoles(token: string) {
  return apiFetch<Rol[]>('/api/roles', { token });
}
