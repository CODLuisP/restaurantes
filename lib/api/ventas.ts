import { apiFetch } from './client';

export interface VentaItemDto {
  id: number;
  pedidoItemId: number;
  productoNombre?: string | null;
  comboNombre?: string | null;
  cantidad: number;
  precioUnitario: number;
}

export interface VentaDto {
  id: number;
  empresaId: number;
  sucursalId: number;
  sesionMesaId: number;
  cajeroId?: number | null;
  turnoId?: number | null;
  /** "normal" (cubre todo lo pendiente de la sesión) o "split" (cuenta dividida por ítems). */
  tipo: string;
  subtotal: number;
  igvPorcentaje: number;
  igvMonto: number;
  descuento: number;
  propina: number;
  total: number;
  metodoPago: string;
  montoRecibido?: number | null;
  vuelto?: number | null;
  pagadoAt: string;
  tipoComprobante: string;
  tipoDoc?: string | null;
  numDoc?: string | null;
  razonSocial?: string | null;
  /** ID devuelto por el proveedor OSE/SUNAT; null hasta que se emita el comprobante. */
  comprobanteId?: string | null;
  items: VentaItemDto[];
}

export interface VentaItemInputDto {
  pedidoItemId: number;
  cantidad: number;
}

export interface CreateVentaDto {
  sesionMesaId: number;
  cajeroId: number;
  turnoId: number;
  items: VentaItemInputDto[];
  descuento: number;
  propina: number;
  /** efectivo, tarjeta, yape, plin, otro */
  metodoPago: string;
  montoRecibido?: number | null;
  /** ticket, boleta, factura */
  tipoComprobante: string;
  tipoDoc?: string | null;
  numDoc?: string | null;
  razonSocial?: string | null;
}

export function crearVenta(token: string, dto: CreateVentaDto) {
  return apiFetch<VentaDto>('/api/ventas', { token, method: 'POST', body: dto });
}

export function getVentaById(token: string, id: number) {
  return apiFetch<VentaDto>(`/api/ventas/${id}`, { token });
}

export function getVentasBySesion(token: string, sesionMesaId: number) {
  return apiFetch<VentaDto[]>(`/api/ventas/sesion/${sesionMesaId}`, { token });
}

export function getVentas(token: string, params: { sucursalId?: number; fechaInicio?: string; fechaFin?: string } = {}) {
  const query = new URLSearchParams();
  if (params.sucursalId) query.set('sucursalId', String(params.sucursalId));
  if (params.fechaInicio) query.set('fechaInicio', params.fechaInicio);
  if (params.fechaFin) query.set('fechaFin', params.fechaFin);
  const qs = query.toString();
  return apiFetch<VentaDto[]>(`/api/ventas${qs ? `?${qs}` : ''}`, { token });
}

/** Pendiente de usar hasta que se conecte un proveedor OSE/SUNAT real (ver comprobantes). */
export function setVentaComprobante(token: string, id: number, comprobanteId: string) {
  return apiFetch<void>(`/api/ventas/${id}/comprobante`, { token, method: 'PUT', body: comprobanteId });
}

/** Cuánto de cada ítem del pedido (por pedidoItemId) ya se facturó en ventas previas de la sesión
 *  — necesario para cuentas divididas: un ítem ya cobrado no debe volver a ofrecerse ni sumar al total. */
export function cantidadFacturadaPorItem(ventas: VentaDto[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const venta of ventas) {
    for (const item of venta.items) {
      const key = String(item.pedidoItemId);
      map.set(key, (map.get(key) ?? 0) + item.cantidad);
    }
  }
  return map;
}

/** Descuenta lo ya facturado de cada ítem — filtra a 0 los que ya se cobraron por completo. */
export function restarFacturado<T extends { product: { id: string }; quantity: number }>(
  items: T[],
  facturado: Map<string, number>
): T[] {
  return items
    .map(i => ({ ...i, quantity: i.quantity - (facturado.get(i.product.id) ?? 0) }))
    .filter(i => i.quantity > 0);
}
