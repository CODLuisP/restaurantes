import type { PaymentMethod } from '@/types';

export type EstadoSunat = 'Aceptado' | 'Rechazado' | 'Pendiente' | 'De Baja';
export type TipoComprobante = 'Boleta' | 'Factura' | 'Ticket' | 'NotaCredito' | 'NotaDebito';
export type EnvioStatus = 'Enviado' | 'Pendiente';
export type FormatoImpresion = 'A4' | 'Ticket 80mm' | 'Ticket 58mm' | 'A5';

export interface ComprobanteItem {
  name: string;
  quantity: number;
  price: number;
}

/** Comprobante con los campos extendidos que necesita la vista de Comprobantes. */
export interface Comprobante {
  id: string; // ID interno (ej. S-701)
  fecha: string; // DD/MM/AAAA HH:MM
  tipo: TipoComprobante;
  numero: string; // Ej: F001-00015115
  clienteDoc: { type: 'DNI' | 'RUC' | string; number: string; name: string };
  monto: number;
  igv: number;
  subtotal: number;
  estadoSunat: EstadoSunat | null;
  correoStatus: EnvioStatus;
  correoDestino?: string;
  whatsappStatus: EnvioStatus;
  whatsappDestino?: string;
  items: ComprobanteItem[];
  metodoPago: PaymentMethod | string;
  hash: string;
  comprobanteIdExterno?: string | null;
  tieneSunat: boolean;
  ventaAfectadaId?: number | null;
  numeroVentaAfectada?: string | null;
  codMotivo?: string | null;
  desMotivo?: string | null;
}

export const TIPO_COMPROBANTE_LABEL: Record<TipoComprobante, string> = {
  Boleta: 'Boleta',
  Factura: 'Factura',
  Ticket: 'Ticket',
  NotaCredito: 'Nota de Crédito',
  NotaDebito: 'Nota de Débito',
};

export const SUNAT_BADGE_COLOR: Record<EstadoSunat, string> = {
  Aceptado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  Rechazado: 'bg-rose-50 text-rose-700 border-rose-200',
  'De Baja': 'bg-slate-100 text-slate-600 border-slate-200',
};

/** Siguiente correlativo disponible para la serie del tipo indicado (B001 / F001). */
export function nextNumeroComprobante(comprobantes: Comprobante[], tipo: TipoComprobante): string {
  if (tipo === 'Ticket') {
    const nums = comprobantes
      .filter(c => c.tipo === 'Ticket')
      .map(c => {
        const parts = c.numero.split('-');
        return parts.length > 1 ? parseInt(parts[1]) : 0;
      });
    const next = Math.max(...nums, 0) + 1;
    return `T-${String(next).padStart(6, '0')}`;
  }
  const serie = tipo === 'Boleta' ? 'B001' : 'F001';
  const correlativos = comprobantes
    .filter(c => c.tipo === tipo)
    .map(c => {
      const parts = c.numero.split('-');
      return parts.length > 1 ? parseInt(parts[1]) : 0;
    });
  const next = Math.max(...correlativos, 0) + 1;
  return `${serie}-${String(next).padStart(6, '0')}`;
}

export const nuevoHash = () => Math.random().toString(36).slice(2, 14).toUpperCase();

// ── Mapeo de datos de la API a la interfaz Comprobante del frontend ──

export function mapApiToComprobante(item: {
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
  ventaAfectadaId?: number | null;
  numeroVentaAfectada?: string | null;
  codMotivo?: string | null;
  desMotivo?: string | null;
}): Comprobante {
  const tipoMap: Record<string, TipoComprobante> = {
    ticket: 'Ticket',
    boleta: 'Boleta',
    factura: 'Factura',
    nota_credito: 'NotaCredito',
    nota_debito: 'NotaDebito',
  };

  const docTypeMap: Record<string, string> = {
    dni: 'DNI',
    ruc: 'RUC',
    ce: 'CE',
  };

  const fecha = new Date(item.fecha);
  const fechaStr = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  return {
    id: String(item.id),
    fecha: fechaStr,
    tipo: tipoMap[item.tipoComprobante] ?? 'Ticket',
    numero: item.numero,
    clienteDoc: {
      type: docTypeMap[item.clienteTipoDoc ?? ''] ?? (item.clienteTipoDoc?.toUpperCase() ?? '-'),
      number: item.clienteNumDoc ?? '-',
      name: item.clienteRazonSocial ?? 'CLIENTE GENERAL',
    },
    monto: item.total,
    igv: item.igv,
    subtotal: item.subtotal,
    estadoSunat: item.tieneSunat ? (item.estadoSunat as EstadoSunat ?? 'Pendiente') : null,
    correoStatus: 'Pendiente',
    whatsappStatus: 'Pendiente',
    items: [],
    metodoPago: item.metodoPago as PaymentMethod,
    hash: item.hashCpe ?? '',
    comprobanteIdExterno: item.comprobanteId,
    tieneSunat: item.tieneSunat,
    ventaAfectadaId: item.ventaAfectadaId ?? null,
    numeroVentaAfectada: item.numeroVentaAfectada ?? null,
    codMotivo: item.codMotivo ?? null,
    desMotivo: item.desMotivo ?? null,
  };
}
