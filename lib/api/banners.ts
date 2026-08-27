import { apiFetch } from './client';
import type { BannerDto, CreateBannerDto, UpdateBannerDto, ReorderBannersDto } from '@/types/banners';

export function getBanners(token: string, sucursalId: number) {
  return apiFetch<BannerDto[]>(`/api/banners?sucursalId=${sucursalId}`, { token });
}

export function createBanner(token: string, sucursalId: number, dto: CreateBannerDto) {
  return apiFetch<BannerDto>(`/api/banners?sucursalId=${sucursalId}`, {
    token,
    method: 'POST',
    body: dto,
  });
}

export function updateBanner(token: string, id: number, dto: UpdateBannerDto) {
  return apiFetch<BannerDto>(`/api/banners/${id}`, { token, method: 'PUT', body: dto });
}

export function deleteBanner(token: string, id: number) {
  return apiFetch<void>(`/api/banners/${id}`, { token, method: 'DELETE' });
}

export function reorderBanners(token: string, sucursalId: number, dto: ReorderBannersDto) {
  return apiFetch<void>(`/api/banners/reorder?sucursalId=${sucursalId}`, {
    token,
    method: 'PUT',
    body: dto,
  });
}
