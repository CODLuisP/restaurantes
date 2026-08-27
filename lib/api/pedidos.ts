import { apiFetch } from './client';

export interface PedidoItemDto {
  id: number;
  productoId?: number | null;
  productoNombre?: string | null;
  varianteId?: number | null;
  varianteNombre?: string | null;
  comboId?: number | null;
  comboNombre?: string | null;
  cantidad: number;
  precioUnitario: number;
  notas?: string | null;
  estado: string;
}

export interface PedidoDto {
  id: number;
  sesionMesaId: number;
  mesaNumero?: number | null;
  mozoId?: number | null;
  mozoNombre?: string | null;
  confirmadoPor?: number | null;
  origen: string;
  estado: string;
  observaciones?: string | null;
  createdAt: string;
  /** "local" | "delivery" | "para_llevar" — de la sesión de mesa asociada. */
  sesionTipo?: string | null;
  /** Nombre del comensal o del cliente (llevar/delivery); puede venir vacío. */
  nombreCliente?: string | null;
  items: PedidoItemDto[];
}

export interface CreatePedidoItemDto {
  productoId?: number;
  varianteId?: number;
  comboId?: number;
  cantidad: number;
  notas?: string;
}

export interface CreatePedidoDto {
  sesionMesaId: number;
  mozoId?: number;
  origen?: 'mozo' | 'cliente';
  observaciones?: string;
  items: CreatePedidoItemDto[];
}

export interface UpdatePedidoItemDto {
  cantidad: number;
  notas?: string;
}

export function getPedidoById(token: string, id: number) {
  return apiFetch<PedidoDto>(`/api/pedidos/${id}`, { token });
}

export function getPedidoBySesion(token: string, sesionMesaId: number) {
  return apiFetch<PedidoDto>(`/api/pedidos/sesion/${sesionMesaId}`, { token });
}

export function crearPedido(token: string, dto: CreatePedidoDto) {
  return apiFetch<PedidoDto>('/api/pedidos', { token, method: 'POST', body: dto });
}

/** El mozo confirma un pedido que armó el cliente por QR: pasa de "pendiente_confirmacion" a cocina. */
export function confirmarPedido(token: string, pedidoId: number) {
  return apiFetch<PedidoDto>(`/api/pedidos/${pedidoId}/confirmar`, { token, method: 'POST' });
}

export function agregarItemsPedido(token: string, pedidoId: number, items: CreatePedidoItemDto[]) {
  return apiFetch<PedidoDto>(`/api/pedidos/${pedidoId}/items`, { token, method: 'POST', body: items });
}

export function actualizarItemPedido(token: string, itemId: number, dto: UpdatePedidoItemDto) {
  return apiFetch<void>(`/api/pedidos/items/${itemId}`, { token, method: 'PUT', body: dto });
}

export function eliminarItemPedido(token: string, itemId: number) {
  return apiFetch<void>(`/api/pedidos/items/${itemId}`, { token, method: 'DELETE' });
}

export function cancelarPedido(token: string, pedidoId: number) {
  return apiFetch<void>(`/api/pedidos/${pedidoId}/cancelar`, { token, method: 'POST' });
}

export interface ResumenCocinaDto {
  pendientes: number;
  enPreparacion: number;
  listos: number;
}

/** Pedidos activos (no entregados/cancelados/pendientes de confirmar) de la sucursal, para el KDS. */
export function getCocina(token: string, sucursalId?: number) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<PedidoDto[]>(`/api/pedidos/cocina${query}`, { token });
}

export function getResumenCocina(token: string, sucursalId?: number) {
  const query = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<ResumenCocinaDto>(`/api/pedidos/cocina/resumen${query}`, { token });
}

/** Transición en bloque de todos los ítems del pedido: pendiente→en_preparacion→listo→entregado. */
export function cambiarEstadoPedido(token: string, pedidoId: number, estadoActual: string, nuevoEstado: string) {
  const query = new URLSearchParams({ estadoActual, nuevoEstado });
  return apiFetch<PedidoDto>(`/api/pedidos/${pedidoId}/estado?${query.toString()}`, { token, method: 'POST' });
}

/** Mueve UN plato individual entre columnas de Cocina (pendiente ↔ en_preparacion → listo), sin
 *  afectar al resto de ítems del pedido. */
export function cambiarEstadoItemPedido(token: string, itemId: number, estadoActual: string, nuevoEstado: string) {
  const query = new URLSearchParams({ estadoActual, nuevoEstado });
  return apiFetch<PedidoDto>(`/api/pedidos/items/${itemId}/estado?${query.toString()}`, { token, method: 'POST' });
}
