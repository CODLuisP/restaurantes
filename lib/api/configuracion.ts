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
  impresoraCocina?: boolean;
  /** Solo lectura: la sucursal ya está sincronizada con la API de facturación. */
  sincronizadoFacturacion?: boolean;
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
  impresoraCocina?: boolean | null;
}

export function getConfiguracion(token: string, sucursalId: number) {
  return apiFetch<ConfiguracionDto>(`/api/configuracion/${sucursalId}`, { token });
}

export function updateConfiguracion(token: string, sucursalId: number, dto: UpdateConfiguracionDto) {
  return apiFetch<ConfiguracionDto>(`/api/configuracion/${sucursalId}`, { token, method: 'PUT', body: dto });
}

/**
 * Guarda solo los campos indicados SIN pisar el resto de la configuración.
 * El PUT del backend recibe la configuración completa: si se envía solo una parte, lo demás
 * (métodos de pago/entrega, horarios, ubicación, redes…) puede quedar en blanco. Por eso se parte
 * siempre de la configuración actual y solo se sobreescribe lo que cambió.
 */
export async function guardarConfiguracion(
  token: string,
  sucursalId: number,
  cambios: Partial<UpdateConfiguracionDto>,
) {
  const a = await getConfiguracion(token, sucursalId);
  return updateConfiguracion(token, sucursalId, {
    igvPorcentaje: a.igvPorcentaje, monedaSimbolo: a.monedaSimbolo, logoUrl: a.logoUrl ?? null,
    instagram: a.instagram, facebook: a.facebook, tiktok: a.tiktok, sitioWeb: a.sitioWeb, reviewsLink: a.reviewsLink ?? null,
    zonaHoraria: a.zonaHoraria, tipoNegocio: a.tipoNegocio,
    descripcionCorta: a.descripcionCorta ?? null, descripcionCompleta: a.descripcionCompleta ?? null,
    whatsappPedidos: a.whatsappPedidos ?? null, horariosJson: a.horariosJson ?? null,
    metodosPagoJson: a.metodosPagoJson ?? null, metodosEntregaJson: a.metodosEntregaJson ?? null,
    ubicacionLat: a.ubicacionLat ?? null, ubicacionLng: a.ubicacionLng ?? null,
    ubicacionDireccion: a.ubicacionDireccion ?? null, mostrarDireccionMenu: a.mostrarDireccionMenu ?? null,
    impresoraCocina: a.impresoraCocina ?? null,
    ...cambios,
  });
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
