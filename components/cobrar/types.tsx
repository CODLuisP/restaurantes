import { Bike, Coins, CreditCard, Grid, ShoppingBag, Smartphone } from 'lucide-react';
import type { OrderItem, OrderType, PaymentMethod } from '@/types';

export const money = (n: number) => `S/. ${n.toFixed(2)}`;
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const onlyDigits = (s: string) => s.replace(/\D/g, '');

export const PAYMENTS: { id: PaymentMethod; label: string; icon: React.ReactNode; cls: string }[] = [
  { id: 'Efectivo',    label: 'Efectivo',    icon: <Coins className="h-4 w-4" />,      cls: 'bg-brand hover:bg-brand-hover' },
  { id: 'Yape / Plin', label: 'Yape / Plin', icon: <Smartphone className="h-4 w-4" />, cls: 'bg-emerald-600 hover:bg-emerald-700' },
  { id: 'Tarjeta',     label: 'Tarjeta',     icon: <CreditCard className="h-4 w-4" />, cls: 'bg-sky-700 hover:bg-sky-800' },
];

export const TYPE_META: Record<OrderType, { label: string; icon: React.ReactNode; badge: string }> = {
  mesa:     { label: 'En mesa',     icon: <Grid className="h-3 w-3" />,        badge: 'bg-emerald-100 text-emerald-700' },
  llevar:   { label: 'Para llevar', icon: <ShoppingBag className="h-3 w-3" />, badge: 'bg-amber-100 text-amber-700' },
  delivery: { label: 'Delivery',    icon: <Bike className="h-3 w-3" />,        badge: 'bg-violet-100 text-violet-700' },
};

/** Etiqueta legible del estado agregado del pedido (para el aviso de "no se puede cobrar todavía"). */
export const ESTADO_PEDIDO_LABEL: Record<string, string> = {
  pendiente_confirmacion: 'Pedido pendiente de confirmar',
  pendiente: 'Pedido pendiente',
  en_preparacion: 'Platos en preparación',
  listo: 'Platos listos, falta que el mozo los sirva',
};

/** Mensajes de error del servicio de facturación electrónica. */
export const EMIT_ERRORS: Record<string, string> = {
  ruc_invalido:           'El RUC ingresado no es válido (debe tener 11 dígitos).',
  razon_social_requerida: 'Falta la razón social para emitir la factura.',
  dni_invalido:           'El DNI debe tener 8 dígitos.',
  invalid_doc_type:       'Tipo de comprobante inválido.',
  provider_error:         'El servicio de facturación rechazó el comprobante.',
  provider_unreachable:   'No se pudo contactar al servicio de facturación.',
};

/** Elemento cobrable unificado (mesa ocupada o pedido para llevar/delivery). */
export interface Chargeable {
  key: string;
  kind: OrderType;
  ref: string;            // nombre de mesa o id de pedido
  label: string;
  customer?: string;
  phone?: string;
  address?: string;
  waiter?: string;
  items: OrderItem[];
  total: number;
  itemsCount: number;
  time?: string;
  /** Estado agregado del pedido (pendiente/en_preparacion/listo/entregado). Para mesas, solo se puede cobrar cuando está "entregado". */
  pedidoEstado?: string;
}

export type Filter = 'todos' | OrderType;

/** Modo de división de la cuenta al cobrar: completa, en partes iguales o por ítems. */
export type SplitMode = 'full' | 'equal' | 'items';
