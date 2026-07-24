import { apiFetch } from './client';

export interface BannerPublicoDto {
  imagenUrl: string;
  gradient?: string | null;
}

export interface ProductoMenuPublicoDto {
  id: number;
  nombre: string;
  precio: number;
  categoriaNombre: string;
  descripcion: string;
  imagenUrl: string;
  variantes: { id: number; nombre: string; precio: number }[];
}

export interface CategoriaMenuPublicoDto {
  id: number;
  nombre: string;
  orden: number;
}

export interface MenuPublicoDto {
  categorias: CategoriaMenuPublicoDto[];
  productos: ProductoMenuPublicoDto[];
}

export interface ConfiguracionPublicaDto {
  logoUrl?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  sitioWeb?: string | null;
  reviewsLink?: string | null;
  zonaHoraria?: string | null;
  tipoNegocio?: string | null;
  descripcionCompleta?: string | null;
  whatsappPedidos?: string | null;
  horariosJson?: string | null;
}

export interface SucursalPublicaDto {
  nombre?: string | null;
  direccion?: string | null;
}

export interface CierrePublicoDto {
  motivo: string;
  desde: string;
  hasta: string;
}

export interface MesaPublicaDto {
  sucursalId?: number;
}

export function getBannersPublico(sucursalId: number) {
  return apiFetch<BannerPublicoDto[]>(`/api/publico/banners?sucursalId=${sucursalId}`);
}

export function getMenuPublico(sucursalId: number) {
  return apiFetch<MenuPublicoDto>(`/api/publico/menu?sucursalId=${sucursalId}`);
}

export function getConfiguracionPublica(sucursalId: number) {
  return apiFetch<ConfiguracionPublicaDto>(`/api/publico/configuracion?sucursalId=${sucursalId}`);
}

export function getSucursalPublica(sucursalId: number) {
  return apiFetch<SucursalPublicaDto>(`/api/publico/sucursal?sucursalId=${sucursalId}`);
}

export function getCierresPublico(sucursalId: number) {
  return apiFetch<CierrePublicoDto[]>(`/api/publico/cierres?sucursalId=${sucursalId}`);
}

export function getMesaPublica(mesaId: string) {
  return apiFetch<MesaPublicaDto>(`/api/publico/mesas/${mesaId}`);
}
