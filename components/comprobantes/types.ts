import type { PaymentMethod } from '@/types';

export type EstadoSunat = 'Aceptado' | 'Rechazado' | 'Pendiente' | 'De Baja';
export type TipoComprobante = 'Boleta' | 'Factura';
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
  clienteDoc: { type: 'DNI' | 'RUC'; number: string; name: string };
  monto: number;
  igv: number;
  subtotal: number;
  estadoSunat: EstadoSunat;
  correoStatus: EnvioStatus;
  correoDestino?: string;
  whatsappStatus: EnvioStatus;
  whatsappDestino?: string;
  items: ComprobanteItem[];
  metodoPago: PaymentMethod;
  hash: string;
}

export const SUNAT_BADGE_COLOR: Record<EstadoSunat, string> = {
  Aceptado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  Rechazado: 'bg-rose-50 text-rose-700 border-rose-200',
  'De Baja': 'bg-slate-100 text-slate-600 border-slate-200',
};

/** Siguiente correlativo disponible para la serie del tipo indicado (B001 / F001). */
export function nextNumeroComprobante(comprobantes: Comprobante[], tipo: TipoComprobante): string {
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
