import { apiFetch } from './client';

export interface Sucursal {
  id: number;
  empresaId: number;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  activo: boolean;
  createdAt: string;
}

export function getSucursales(token: string) {
  return apiFetch<Sucursal[]>('/api/sucursales', { token });
}
