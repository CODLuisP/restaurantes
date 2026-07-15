import { apiFetch } from './client';
import type { CategoriaDto, CreateCategoriaDto, UpdateCategoriaDto } from '@/types/categorias';

export function getCategorias(token: string) {
  return apiFetch<CategoriaDto[]>('/api/categorias', { token });
}

export function getCategoriaById(token: string, id: number) {
  return apiFetch<CategoriaDto>(`/api/categorias/${id}`, { token });
}

export function createCategoria(token: string, dto: CreateCategoriaDto) {
  return apiFetch<CategoriaDto>('/api/categorias', { token, method: 'POST', body: dto });
}

export function updateCategoria(token: string, id: number, dto: UpdateCategoriaDto) {
  return apiFetch<CategoriaDto>(`/api/categorias/${id}`, { token, method: 'PUT', body: dto });
}

export function deleteCategoria(token: string, id: number) {
  return apiFetch<void>(`/api/categorias/${id}`, { token, method: 'DELETE' });
}
