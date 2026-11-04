import type { LucideIcon } from 'lucide-react';
import {
  Image as ImageIcon, Store, Pilcrow, Minus, ClipboardList, Hash,
  User, ListOrdered, Sigma, CreditCard, QrCode, FileText, Table, Calculator, Wallet,
} from 'lucide-react';

/** Los tres comprobantes que se imprimen al cobrar, cada uno con su propia plantilla. */
export type ComprobanteKind = 'boleta' | 'factura' | 'notaVenta';
export type Side = ComprobanteKind | 'cocina';
export const COMPROBANTE_KINDS: ComprobanteKind[] = ['boleta', 'factura', 'notaVenta'];
export type PaperSize = '80mm' | '58mm';

export type BlockType =
  | 'imagen' | 'negocio' | 'texto' | 'separador'
  | 'datos-pedido' | 'numero-pedido' | 'cliente'
  | 'productos' | 'totales' | 'pago' | 'qr'
  | 'comprobante-cabecera' | 'detalle-comprobante' | 'totales-comprobante' | 'forma-pago';

/** Color de las barras del comprobante (cabecera de tipo, tabla e importe total). */
export const COMPROBANTE_COLOR = '#1f2d4d';

export type Align = 'left' | 'center' | 'right';
export type FontSize = 'small' | 'normal' | 'large' | 'xlarge';
export type SepStyle = 'guiones' | 'puntos' | 'linea' | 'estrellas' | 'ondas';

export interface TicketBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  spaceTop: number;
  spaceBottom: number;

  /* imagen */
  imgSource?: 'logo' | 'uploaded';
  imgUrl?: string;
  imgSize?: 'chico' | 'mediano' | 'grande';

  /* texto / formato compartido */
  text?: string;
  align?: Align;
  bold?: boolean;
  size?: FontSize;
  upper?: boolean;

  /* separador */
  sepStyle?: SepStyle;

  /* negocio */
  showName?: boolean;
  compactName?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  /** Antepone "Dir. Fiscal:" a la dirección (formato de comprobante). */
  fiscalAddress?: boolean;

  /* datos-pedido / cliente: etiqueta y valor en dos columnas (formato de comprobante) */
  tabular?: boolean;
  showClientDoc?: boolean;

  /* datos-pedido */
  showFecha?: boolean;
  showHora?: boolean;
  /** Nombre del mozo que atendió/tomó el pedido — útil sobre todo en el ticket de cocina. */
  showMozo?: boolean;

  /* cliente */
  showClientName?: boolean;
  showClientPhone?: boolean;
  showClientAddress?: boolean;
  showDeliveryTime?: boolean;

  /* productos */
  showModifiers?: boolean;
  showPrices?: boolean;

  /* totales */
  showSubtotal?: boolean;
  showEnvio?: boolean;
}

export type TicketConfig = Record<Side, TicketBlock[]>;

/** Lo que cambia entre boleta, factura y nota de venta al imprimir (y en la vista previa). */
export const DOC_META: Record<ComprobanteKind, {
  label: string; docLabel: string; sampleNumber: string;
  clienteDocLabel: string; sampleCustomer: string; sampleDoc: string;
}> = {
  boleta:    { label: 'Boleta',        docLabel: 'BOLETA ELECTRÓNICA',  sampleNumber: 'B001-00000017', clienteDocLabel: 'Doc.:', sampleCustomer: 'Clientes varios', sampleDoc: '0' },
  factura:   { label: 'Factura',       docLabel: 'FACTURA ELECTRÓNICA', sampleNumber: 'F001-00000006', clienteDocLabel: 'RUC:',  sampleCustomer: 'SHALOM EMPRESARIAL S.A.C.', sampleDoc: '20512528458' },
  notaVenta: { label: 'Nota de venta', docLabel: 'NOTA DE VENTA',       sampleNumber: '00000029',      clienteDocLabel: 'Doc.:', sampleCustomer: 'Clientes varios', sampleDoc: '0' },
};

/* ── Metadatos por tipo de bloque ── */
export const BLOCK_META: Record<BlockType, { label: string; icon: LucideIcon; subtitle: (b: TicketBlock) => string }> = {
  'imagen':        { label: 'Imagen',           icon: ImageIcon,     subtitle: b => (b.imgSource === 'uploaded' ? 'Imagen subida' : 'Logo del negocio') },
  'negocio':       { label: 'Negocio',          icon: Store,         subtitle: () => 'Nombre y datos del local' },
  'texto':         { label: 'Texto',            icon: Pilcrow,       subtitle: b => (b.text?.trim() ? b.text.slice(0, 22) : 'Texto libre') },
  'separador':     { label: 'Separador',        icon: Minus,         subtitle: b => SEP_LABEL[b.sepStyle ?? 'guiones'] },
  'datos-pedido':  { label: 'Datos del pedido', icon: ClipboardList, subtitle: () => 'Fecha y hora' },
  'numero-pedido': { label: 'Número de pedido', icon: Hash,          subtitle: () => 'Pedido #42' },
  'cliente':       { label: 'Cliente',          icon: User,          subtitle: () => 'Datos del comensal' },
  'productos':     { label: 'Productos',        icon: ListOrdered,   subtitle: () => 'Detalle del pedido' },
  'totales':       { label: 'Totales',          icon: Sigma,         subtitle: () => 'Subtotal y total' },
  'pago':          { label: 'Pago',             icon: CreditCard,    subtitle: () => 'Método de pago' },
  'qr':            { label: 'QR',               icon: QrCode,        subtitle: () => 'Código QR' },
  'comprobante-cabecera': { label: 'Tipo y número', icon: FileText,    subtitle: () => 'RUC, BOLETA ELECTRÓNICA y N°' },
  'detalle-comprobante':  { label: 'Detalle SUNAT', icon: Table,       subtitle: () => 'Cód, cant, desc, P.Vent, total' },
  'totales-comprobante':  { label: 'Totales SUNAT', icon: Calculator,  subtitle: () => 'Gravadas, IGV, total y en letras' },
  'forma-pago':           { label: 'Forma de pago', icon: Wallet,      subtitle: () => 'Contado y método' },
};

export const SEP_LABEL: Record<SepStyle, string> = {
  guiones: 'Guiones', puntos: 'Puntos', linea: 'Línea', estrellas: 'Estrellas', ondas: 'Ondas',
};

export const SEP_CHAR: Record<SepStyle, string> = {
  guiones: '-', puntos: '·', linea: '─', estrellas: '*', ondas: '~',
};

/* ── Bloques que se pueden añadir ── */
export const ADDABLE: BlockType[] = [
  'imagen', 'negocio', 'texto', 'separador', 'datos-pedido',
  'numero-pedido', 'cliente', 'productos', 'totales', 'pago', 'qr',
  'comprobante-cabecera', 'detalle-comprobante', 'totales-comprobante', 'forma-pago',
];

let seq = 0;
const uid = () => `blk-${Date.now().toString(36)}-${seq++}`;

/** Crea un bloque nuevo con valores por defecto según su tipo. */
export function makeBlock(type: BlockType): TicketBlock {
  const base: TicketBlock = { id: uid(), type, visible: true, spaceTop: 0, spaceBottom: 0 };
  switch (type) {
    case 'imagen':        return { ...base, imgSource: 'logo', imgSize: 'mediano', spaceBottom: 0 };
    case 'negocio':       return { ...base, showName: true, compactName: false, showAddress: true, showPhone: false, align: 'center', bold: true, size: 'large' };
    case 'texto':         return { ...base, text: 'Texto', align: 'center', bold: false, size: 'normal', upper: false };
    case 'separador':     return { ...base, sepStyle: 'guiones' };
    case 'datos-pedido':  return { ...base, showFecha: true, showHora: true, showMozo: false, align: 'left', size: 'normal' };
    case 'numero-pedido': return { ...base, align: 'center', bold: true, size: 'xlarge' };
    case 'cliente':       return { ...base, showClientName: true, showClientPhone: true, showClientAddress: true, showDeliveryTime: true, size: 'normal' };
    case 'productos':     return { ...base, showModifiers: true, showPrices: true, size: 'normal' };
    case 'totales':       return { ...base, showSubtotal: true, showEnvio: true, size: 'normal' };
    case 'pago':          return { ...base, align: 'center', bold: true, size: 'normal' };
    case 'qr':            return { ...base, align: 'center' };
    case 'comprobante-cabecera': return { ...base };
    case 'detalle-comprobante':  return { ...base, size: 'small' };
    case 'totales-comprobante':  return { ...base, size: 'normal' };
    case 'forma-pago':           return { ...base, size: 'normal' };
  }
}

/* ── Datos de ejemplo para la vista previa ── */
export interface SampleItem {
  qty: number; name: string; price: number;
  modifiers?: { label: string; extra?: number; removed?: boolean }[];
}

export const SAMPLE = {
  businessName: 'Mi Restaurante',
  businessAddress: 'Av. Larco 123, Miraflores, Lima',
  businessPhone: '+51 987 654 321',
  greeting: 'Juan',
  orderNumber: 42,
  date: '10/06/2026',
  time: '08:00',
  customerName: 'Juan Pérez',
  customerPhone: '+51 987 654 321',
  customerAddress: 'Jr. Las Begonias 456, San Isidro',
  deliveryTime: '2:00 p.m.',
  mozo: 'Carlos Ramos',
  items: [
    {
      qty: 2, name: 'Lomo Saltado', price: 64,
      modifiers: [
        { label: 'Porción grande' },
        { label: 'Huevo frito', extra: 4 },
        { label: 'Sin cebolla por favor', removed: true },
      ],
    },
    { qty: 1, name: 'Chicha Morada 1L', price: 12 },
  ] as SampleItem[],
  subtotal: 80,
  envio: 5,
  total: 85,
  paymentMethod: 'Yape',
  currency: 'S/',
  ruc: '20603202326',
  docLabel: 'BOLETA ELECTRÓNICA',
  docNumber: 'B001-00000006',
  customerDoc: '16756609',
  igvPorcentaje: 18,
};

export const money = (n: number) =>
  `${SAMPLE.currency} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Configuración por defecto ── */
/** Diseño de comprobante (mismo formato que el PDF del OSE) — barras de color, detalle con código,
 *  desglose de IGV, importe en letras y forma de pago. Boleta y factura cierran con el QR SUNAT y
 *  la leyenda de representación impresa; la nota de venta, que no es electrónica, no lleva QR. */
export function defaultComprobante(kind: ComprobanteKind): TicketBlock[] {
  const sep = { ...makeBlock('separador'), sepStyle: 'linea' as SepStyle };
  const cierre: TicketBlock[] = kind === 'notaVenta'
    ? [
        { ...makeBlock('texto'), text: 'Documento interno, no válido como comprobante de pago electrónico', size: 'small', bold: false, spaceTop: 1 },
        { ...makeBlock('texto'), text: '¡Gracias por su preferencia!', size: 'normal', bold: true },
      ]
    : [
        makeBlock('qr'),
        { ...makeBlock('texto'), text: `Representación impresa de ${DOC_META[kind].docLabel}`, size: 'small', bold: false },
      ];
  return [
    makeBlock('imagen'),
    { ...makeBlock('negocio'), showAddress: true, fiscalAddress: true, compactName: false },
    { ...sep, id: uid() },
    makeBlock('comprobante-cabecera'),
    { ...sep, id: uid() },
    { ...makeBlock('cliente'), tabular: true, showClientDoc: true, showClientPhone: false, showClientAddress: false, showDeliveryTime: false },
    { ...makeBlock('datos-pedido'), tabular: true, showFecha: true, showHora: true },
    { ...sep, id: uid() },
    makeBlock('detalle-comprobante'),
    { ...sep, id: uid() },
    makeBlock('totales-comprobante'),
    { ...sep, id: uid() },
    makeBlock('forma-pago'),
    ...cierre,
  ];
}

function defaultCocina(): TicketBlock[] {
  return [
    { ...makeBlock('texto'), text: 'COCINA', bold: true, size: 'large', upper: true },
    makeBlock('numero-pedido'),
    makeBlock('separador'),
    { ...makeBlock('datos-pedido'), showFecha: false, showHora: true, showMozo: true },
    { ...makeBlock('cliente'), showClientPhone: false, showClientAddress: false, showDeliveryTime: true },
    makeBlock('separador'),
    { ...makeBlock('productos'), showPrices: false, size: 'large' },
    makeBlock('separador'),
  ];
}

export function defaultConfig(): TicketConfig {
  return {
    boleta: defaultComprobante('boleta'),
    factura: defaultComprobante('factura'),
    notaVenta: defaultComprobante('notaVenta'),
    cocina: defaultCocina(),
  };
}

export type ComprobanteTemplates = Record<ComprobanteKind, TicketBlock[]>;

/** Lee las plantillas de comprobante guardadas en tickets_config.cliente_json. Hoy se guardan como
 *  { boleta, factura, notaVenta }; antes era UNA sola lista para todo cobro: si llega en ese formato
 *  viejo, boleta y factura la heredan (así no se pierde lo que ya se había diseñado) y la nota de
 *  venta arranca con su plantilla por defecto. JSON vacío o corrupto → plantillas por defecto. */
export function parseComprobanteTemplates(json?: string | null): ComprobanteTemplates {
  const def = defaultConfig();
  const base: ComprobanteTemplates = { boleta: def.boleta, factura: def.factura, notaVenta: def.notaVenta };
  if (!json) return base;
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data)) return { ...base, boleta: data, factura: data };
    return {
      boleta: Array.isArray(data?.boleta) ? data.boleta : base.boleta,
      factura: Array.isArray(data?.factura) ? data.factura : base.factura,
      notaVenta: Array.isArray(data?.notaVenta) ? data.notaVenta : base.notaVenta,
    };
  } catch {
    return base;
  }
}

export function serializeComprobanteTemplates(t: ComprobanteTemplates): string {
  return JSON.stringify({ boleta: t.boleta, factura: t.factura, notaVenta: t.notaVenta });
}
