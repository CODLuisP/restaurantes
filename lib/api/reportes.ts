import { apiFetch } from './client';

export interface CategoriaVentaDto {
  categoriaNombre: string;
  cantidadVendida: number;
  totalVendido: number;
}

export interface TiemposOperacionDto {
  /** Minutos promedio reales (creación del ítem → marcado "listo" en Cocina). Null sin datos. */
  prepCocinaMinutos: number | null;
  /** Minutos promedio reales que las mesas estuvieron ocupadas (abierta_at → cerrada_at). */
  permanenciaMesaMinutos: number | null;
  /** Aproximación (creación del pedido → pago de la venta) para delivery — no es el tiempo real
   *  de entrega en la calle, eso no se registra. */
  despachoDeliveryMinutos: number | null;
}

export interface AforoHoraDto {
  hora: number;
  cantidad: number;
}

export interface ReporteResumenDto {
  categorias: CategoriaVentaDto[];
  tiempos: TiemposOperacionDto;
  aforo: AforoHoraDto[];
}

export interface ProductoVentaDto {
  productoId: number;
  productoNombre: string;
  cantidadVendida: number;
  totalVendido: number;
}

export interface RankingProductosDto {
  top: ProductoVentaDto[];
  bottom: ProductoVentaDto[];
}

/** Formatea una fecha local (no UTC) como YYYY-MM-DD para los query params del backend. */
export const toFechaParam = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export interface KpiVentasDto {
  /** Ventas brutas: tickets, boletas y facturas, sin notas de crédito/débito. */
  totalBruto: number;
  /** Notas que afectan documentos del mismo rango: ajustan las ventas netas. */
  ncPeriodo: number;
  ndPeriodo: number;
  /** Notas que afectan documentos de antes del rango: se muestran aparte, NO ajustan las netas. */
  ncAnteriores: number;
  ndAnteriores: number;
  igvBruto: number;
  igvNcPeriodo: number;
  igvNdPeriodo: number;
  /** Ventas netas = brutas + notas de débito − notas de crédito, solo las del periodo. */
  totalVentas: number;
  /** IGV neto, mismo criterio. */
  totalIgv: number;
  /** Todos los comprobantes emitidos, incluidas notas de crédito/débito. */
  documentos: number;
  ticketPromedio: number;
}

export interface VentaDiariaDto {
  /** yyyy-MM-dd — solo días con ventas. */
  fecha: string;
  ventas: number;
  igv: number;
}

export interface DocumentoTipoDto {
  tipo: string;
  cantidad: number;
  total: number;
}

export interface MedioPagoDto {
  medio: string;
  cantidad: number;
  total: number;
}

export interface ClienteResumenDto {
  cliente: string;
  numDoc: string | null;
  documentos: number;
  /** Netos: las notas de crédito restan. */
  subtotal: number;
  igv: number;
  total: number;
}

export interface ControlCajaTurnoDto {
  turnoId: number;
  cajero: string;
  abiertoAt: string;
  cerradoAt: string | null;
  estado: string;
  montoApertura: number;
  montoCierre: number | null;
  cantidadVentas: number;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalYape: number;
  totalPlin: number;
  totalOtro: number;
  totalIngresos: number;
  totalEgresos: number;
  /** Apertura + efectivo + ingresos − egresos. */
  efectivoEsperado: number;
}

export interface ReporteVentasDto {
  actual: KpiVentasDto;
  /** Periodo inmediatamente anterior, de la misma duración. */
  anterior: KpiVentasDto;
  diaria: VentaDiariaDto[];
  documentos: DocumentoTipoDto[];
  /** Sin notas de crédito/débito, ordenado por monto. */
  mediosPago: MedioPagoDto[];
  /** Top 10 por monto; el listado completo sale de getReporteClientes. */
  clientes: ClienteResumenDto[];
}

interface FiltrosReporte {
  sucursalId?: number;
  fechaInicio: string;
  fechaFin: string;
  usuarioId?: number;
}

function buildQuery(params: FiltrosReporte & { limite?: number; orden?: 'monto' | 'cantidad' }) {
  const query = new URLSearchParams({ fechaInicio: params.fechaInicio, fechaFin: params.fechaFin });
  if (params.sucursalId) query.set('sucursalId', String(params.sucursalId));
  if (params.usuarioId) query.set('usuarioId', String(params.usuarioId));
  if (params.limite !== undefined) query.set('limite', String(params.limite));
  if (params.orden) query.set('orden', params.orden);
  return query.toString();
}

export function getReporteResumen(token: string, params: FiltrosReporte) {
  return apiFetch<ReporteResumenDto>(`/api/reportes/resumen?${buildQuery(params)}`, { token });
}

/** `limite`: omitido = 10, 0 = sin límite. */
export function getRankingProductos(
  token: string,
  params: FiltrosReporte & { limite?: number; orden?: 'monto' | 'cantidad' }
) {
  return apiFetch<RankingProductosDto>(`/api/reportes/productos?${buildQuery(params)}`, { token });
}

/** `limite` omitido o 0 = todos los clientes. */
export function getReporteClientes(token: string, params: FiltrosReporte & { limite?: number }) {
  return apiFetch<ClienteResumenDto[]>(`/api/reportes/clientes?${buildQuery(params)}`, { token });
}

export function getReporteControlCaja(token: string, params: FiltrosReporte) {
  return apiFetch<ControlCajaTurnoDto[]>(`/api/reportes/control-caja?${buildQuery(params)}`, { token });
}

export function getReporteVentasPeriodo(token: string, params: FiltrosReporte) {
  return apiFetch<ReporteVentasDto>(`/api/reportes/ventas-periodo?${buildQuery(params)}`, { token });
}
