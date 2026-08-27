import { apiFetch } from './client';

export type GastoEstado = 'pagado' | 'pendiente' | 'anulado';

export interface GastoDto {
  id: number;
  sucursalId: number;
  fecha: string;
  descripcion: string;
  categoriaId?: number | null;
  proveedorId?: number | null;
  estado: GastoEstado;
  monto: number;
  usuarioId: number;
}

export interface UpsertGastoDto {
  fecha: string;
  descripcion: string;
  categoriaId?: number | null;
  proveedorId?: number | null;
  estado: GastoEstado;
  monto: number;
}

export interface GastoCategoriaDto {
  id: number;
  sucursalId: number;
  nombre: string;
}

export interface GastoProveedorDto {
  id: number;
  sucursalId: number;
  nombre: string;
}

export function getGastos(token: string, sucursalId?: number, desde?: string, hasta?: string) {
  const query = new URLSearchParams();
  if (sucursalId) query.set('sucursalId', String(sucursalId));
  if (desde) query.set('desde', desde);
  if (hasta) query.set('hasta', hasta);
  const qs = query.toString();
  return apiFetch<GastoDto[]>(`/api/gastos${qs ? `?${qs}` : ''}`, { token });
}

export function crearGasto(token: string, dto: UpsertGastoDto, sucursalId?: number) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<GastoDto>(`/api/gastos${query}`, { token, method: 'POST', body: dto });
}

export function actualizarGasto(token: string, id: number, dto: UpsertGastoDto) {
  return apiFetch<GastoDto>(`/api/gastos/${id}`, { token, method: 'PUT', body: dto });
}

/** No hay borrado físico: anula el gasto (conserva el historial). */
export function anularGastoApi(token: string, id: number) {
  return apiFetch<GastoDto>(`/api/gastos/${id}`, { token, method: 'DELETE' });
}

export function getGastoCategorias(token: string, sucursalId?: number) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<GastoCategoriaDto[]>(`/api/gastos/categorias${query}`, { token });
}

export function crearGastoCategoria(token: string, nombre: string, sucursalId?: number) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<GastoCategoriaDto>(`/api/gastos/categorias${query}`, { token, method: 'POST', body: { nombre } });
}

export function eliminarGastoCategoria(token: string, id: number) {
  return apiFetch<void>(`/api/gastos/categorias/${id}`, { token, method: 'DELETE' });
}

export function getGastoProveedores(token: string, sucursalId?: number) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<GastoProveedorDto[]>(`/api/gastos/proveedores${query}`, { token });
}

export function crearGastoProveedor(token: string, nombre: string, sucursalId?: number) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<GastoProveedorDto>(`/api/gastos/proveedores${query}`, { token, method: 'POST', body: { nombre } });
}

export function eliminarGastoProveedor(token: string, id: number) {
  return apiFetch<void>(`/api/gastos/proveedores/${id}`, { token, method: 'DELETE' });
}
