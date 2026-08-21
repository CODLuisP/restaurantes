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
  descripcionCorta?: string | null;
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
  mesaId?: number;
  sucursalId?: number;
  numero?: number;
  capacidad?: number;
  estado?: string;
  tieneSesionActiva?: boolean;
}

export interface CrearPedidoClienteItemDto {
  productoId?: number;
  varianteId?: number;
  comboId?: number;
  cantidad: number;
  notas?: string;
}

export interface CrearPedidoClienteDto {
  /** "local" (mesa, requiere mesaToken) | "para_llevar" | "delivery". */
  tipo: 'local' | 'para_llevar' | 'delivery';
  /** Requerido si tipo === "local". */
  mesaToken?: string;
  /** Requerido si tipo !== "local". */
  sucursalId?: number;
  nombreCliente?: string;
  numComensales?: number;
  /** Requeridos si tipo === "delivery". */
  telefono?: string;
  direccion?: string;
  referencia?: string;
  items: CrearPedidoClienteItemDto[];
}

export interface PedidoPublicoDto {
  id: number;
  estado: string;
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

/** El cliente hace su pedido escaneando el QR de su mesa. Queda "pendiente_confirmacion"
 *  hasta que el mozo lo confirme desde el Comandero — recién ahí pasa a Cocina. */
export function crearPedidoPublico(dto: CrearPedidoClienteDto) {
  return apiFetch<PedidoPublicoDto>('/api/publico/pedidos', { method: 'POST', body: dto });
}
