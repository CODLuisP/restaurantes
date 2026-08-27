import { apiFetch } from './client';

export interface ConfiguracionDto {
  id: number;
  empresaId: number;
  sucursalId: number;
  igvPorcentaje: number;
  monedaSimbolo: string;
  logoUrl?: string | null;
  instagram: string;
  facebook: string;
  tiktok: string;
  sitioWeb: string;
  reviewsLink?: string | null;
  zonaHoraria: string;
  tipoNegocio: string;
  descripcionCorta?: string | null;
  descripcionCompleta?: string | null;
  whatsappPedidos?: string | null;
  horariosJson?: string | null;
  metodosPagoJson?: string | null;
  metodosEntregaJson?: string | null;
  ubicacionLat?: number | null;
  ubicacionLng?: number | null;
  ubicacionDireccion?: string | null;
  mostrarDireccionMenu?: boolean | null;
}
export interface UpdateConfiguracionDto {
  igvPorcentaje: number;
  monedaSimbolo: string;
  logoUrl?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  sitioWeb?: string | null;
  reviewsLink?: string | null;
  zonaHoraria?: string | null;
  tipoNegocio?: string | null;
  descripcionCorta?: string | null;
  descripcionCompleta?: string | null;
  whatsappPedidos?: string | null;
  horariosJson?: string | null;
  metodosPagoJson?: string | null;
  metodosEntregaJson?: string | null;
  ubicacionLat?: number | null;
  ubicacionLng?: number | null;
  ubicacionDireccion?: string | null;
  mostrarDireccionMenu?: boolean | null;
}

export function getConfiguracion(token: string, sucursalId: number) {
  return apiFetch<ConfiguracionDto>(`/api/configuracion/${sucursalId}`, { token });
}

export function updateConfiguracion(token: string, sucursalId: number, dto: UpdateConfiguracionDto) {
  return apiFetch<ConfiguracionDto>(`/api/configuracion/${sucursalId}`, { token, method: 'PUT', body: dto });
}

export interface UpdateUbicacionDto {
  ubicacionLat?: number | null;
  ubicacionLng?: number | null;
  ubicacionDireccion?: string | null;
  mostrarDireccionMenu: boolean;
}

export function updateUbicacion(token: string, sucursalId: number, dto: UpdateUbicacionDto) {
  return apiFetch<ConfiguracionDto>(`/api/configuracion/${sucursalId}/ubicacion`, { token, method: 'PATCH', body: dto });
}
