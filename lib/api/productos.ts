import { apiFetch } from './client';
import type {
  ProductoDto,
  CreateProductoDto,
  UpdateProductoDto,
  SetPrecioSucursalDto,
  ProductoSucursalDto,
  ProductoVarianteDto,
  CreateProductoVarianteDto,
  UpdateProductoVarianteDto,
} from '@/types/productos';

export interface ProductosFilters {
  sucursalId?: number;
  categoriaId?: number;
  soloDisponibles?: boolean;
}

export function getProductos(token: string, filtros?: ProductosFilters) {
  const params = new URLSearchParams();
  if (filtros?.sucursalId) params.set('sucursalId', String(filtros.sucursalId));
  if (filtros?.categoriaId) params.set('categoriaId', String(filtros.categoriaId));
  if (filtros?.soloDisponibles) params.set('soloDisponibles', 'true');
  const qs = params.toString();
  return apiFetch<ProductoDto[]>(`/api/productos${qs ? `?${qs}` : ''}`, { token });
}

export function getProductoById(token: string, id: number, sucursalId?: number) {
  const qs = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<ProductoDto>(`/api/productos/${id}${qs}`, { token });
}

export function createProducto(token: string, dto: CreateProductoDto) {
  return apiFetch<ProductoDto>('/api/productos', { token, method: 'POST', body: dto });
}

export function updateProducto(token: string, id: number, dto: UpdateProductoDto) {
  return apiFetch<ProductoDto>(`/api/productos/${id}`, { token, method: 'PUT', body: dto });
}

export function setPrecioSucursal(
  token: string,
  productoId: number,
  sucursalId: number,
  dto: SetPrecioSucursalDto
) {
  return apiFetch<ProductoSucursalDto>(`/api/productos/${productoId}/sucursales/${sucursalId}`, {
    token,
    method: 'PUT',
    body: dto,
  });
}

export function deleteProducto(token: string, id: number) {
  return apiFetch<void>(`/api/productos/${id}`, { token, method: 'DELETE' });
}

// ── Variantes ──

export function getVariantes(token: string, productoId: number) {
  return apiFetch<ProductoVarianteDto[]>(`/api/productos/${productoId}/variantes`, { token });
}

export function createVariante(token: string, productoId: number, dto: CreateProductoVarianteDto) {
  return apiFetch<ProductoVarianteDto>(`/api/productos/${productoId}/variantes`, {
    token,
    method: 'POST',
    body: dto,
  });
}

export function updateVariante(token: string, id: number, dto: UpdateProductoVarianteDto) {
  return apiFetch<ProductoVarianteDto>(`/api/productos/variantes/${id}`, {
    token,
    method: 'PUT',
    body: dto,
  });
}

export function deleteVariante(token: string, id: number) {
  return apiFetch<void>(`/api/productos/variantes/${id}`, { token, method: 'DELETE' });
}
