import { apiFetch } from './client';

// ── Tipos de respuesta ──────────────────────────────────────────────────

export interface ComprobanteListItem {
  id: number;
  fecha: string;
  tipoComprobante: string;
  numero: string;
  clienteTipoDoc: string | null;
  clienteNumDoc: string | null;
  clienteRazonSocial: string | null;
  subtotal: number;
  igv: number;
  total: number;
  metodoPago: string;
  estadoSunat: string | null;
  comprobanteId: string | null;
  hashCpe: string | null;
  tieneSunat: boolean;
}

export interface ComprobanteDetail extends ComprobanteListItem {
  igvPorcentaje: number;
  descuento: number;
  propina: number;
  items: ComprobanteDetailItem[];
}

export interface ComprobanteDetailItem {
  id: number;
  pedidoItemId: number;
  productoNombre: string | null;
  comboNombre: string | null;
  cantidad: number;
  precioUnitario: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReenviarResult {
  exitoso: boolean;
  estadoSunat: string | null;
  mensaje: string | null;
}

// ── Filtros ──────────────────────────────────────────────────────────────

export interface ComprobantesFilters {
  sucursalId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  tipoComprobante?: string;
  estadoSunat?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ── Funciones API ────────────────────────────────────────────────────────

export function getComprobantes(token: string, filters: ComprobantesFilters = {}) {
  const query = new URLSearchParams();
  if (filters.sucursalId) query.set('sucursalId', String(filters.sucursalId));
  if (filters.fechaInicio) query.set('fechaInicio', filters.fechaInicio);
  if (filters.fechaFin) query.set('fechaFin', filters.fechaFin);
  if (filters.tipoComprobante) query.set('tipoComprobante', filters.tipoComprobante);
  if (filters.estadoSunat) query.set('estadoSunat', filters.estadoSunat);
  if (filters.search) query.set('search', filters.search);
  if (filters.page) query.set('page', String(filters.page));
  if (filters.pageSize) query.set('pageSize', String(filters.pageSize));
  const qs = query.toString();
  return apiFetch<PaginatedResult<ComprobanteListItem>>(`/api/comprobantes${qs ? `?${qs}` : ''}`, { token });
}

export function getComprobanteDetalle(token: string, ventaId: number) {
  return apiFetch<ComprobanteDetail>(`/api/comprobantes/${ventaId}`, { token });
}

export function reenviarSunat(token: string, ventaId: number) {
  return apiFetch<ReenviarResult>(`/api/comprobantes/${ventaId}/reenviar-sunat`, { token, method: 'POST' });
}

// ── URLs para descargas (abren en nueva pestaña o descargan) ─────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5004';

export function getPdfUrl(ventaId: number, tamano: string = 'A4') {
  return `${API_URL}/api/comprobantes/${ventaId}/pdf?tamano=${encodeURIComponent(tamano)}`;
}

export function getHtmlUrl(ventaId: number, tamano: string = 'Ticket80mm') {
  return `${API_URL}/api/comprobantes/${ventaId}/html?tamano=${encodeURIComponent(tamano)}`;
}

export async function getXmlUrl(token: string, ventaId: number) {
  const result = await apiFetch<{ url: string }>(`/api/comprobantes/${ventaId}/xml`, { token });
  return result.url;
}

export async function getCdrUrl(token: string, ventaId: number) {
  const result = await apiFetch<{ url: string }>(`/api/comprobantes/${ventaId}/cdr`, { token });
  return result.url;
}
