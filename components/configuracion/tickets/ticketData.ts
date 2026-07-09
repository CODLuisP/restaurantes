import type { LucideIcon } from 'lucide-react';
import {
  Image as ImageIcon, Store, Pilcrow, Minus, ClipboardList, Hash,
  User, ListOrdered, Sigma, CreditCard, QrCode,
} from 'lucide-react';

export type Side = 'cliente' | 'cocina';
export type PaperSize = '80mm' | '58mm';

export type BlockType =
  | 'imagen' | 'negocio' | 'texto' | 'separador'
  | 'datos-pedido' | 'numero-pedido' | 'cliente'
  | 'productos' | 'totales' | 'pago' | 'qr';

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

  /* datos-pedido */
  showFecha?: boolean;
  showHora?: boolean;

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

export interface TicketConfig {
  cliente: TicketBlock[];
  cocina: TicketBlock[];
}

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
    case 'datos-pedido':  return { ...base, showFecha: true, showHora: true, align: 'left', size: 'normal' };
    case 'numero-pedido': return { ...base, align: 'center', bold: true, size: 'xlarge' };
    case 'cliente':       return { ...base, showClientName: true, showClientPhone: true, showClientAddress: true, showDeliveryTime: true, size: 'normal' };
    case 'productos':     return { ...base, showModifiers: true, showPrices: true, size: 'normal' };
    case 'totales':       return { ...base, showSubtotal: true, showEnvio: true, size: 'normal' };
    case 'pago':          return { ...base, align: 'center', bold: true, size: 'normal' };
    case 'qr':            return { ...base, align: 'center' };
  }
}

/* ── Datos de ejemplo para la vista previa ── */
export interface SampleItem {
  qty: number; name: string; price: number;
  modifiers?: { label: string; extra?: number; removed?: boolean }[];
}

export const SAMPLE = {
  businessName: 'Restuflu',
  businessAddress: 'GPGX+8G Carbonería, Perú',
  businessPhone: '+51 999 888 777',
  greeting: 'Juan',
  orderNumber: 42,
  date: '10/06/2026',
  time: '08:00',
  customerName: 'Juan Pérez',
  customerPhone: '+51 999 888 777',
  customerAddress: 'Av. Providencia 456, Depto 12',
  deliveryTime: '2:00 p.m.',
  items: [
    {
      qty: 2, name: 'Hamburguesa Clásica', price: 9990,
      modifiers: [
        { label: 'Doble' },
        { label: 'Queso cheddar' },
        { label: 'Bacon', extra: 500 },
        { label: 'Sin cebolla por favor', removed: true },
      ],
    },
    { qty: 1, name: 'Papas Fritas L', price: 3490 },
  ] as SampleItem[],
  subtotal: 13480,
  envio: 2000,
  total: 18460,
  paymentMethod: 'Transferencia',
  currency: 'S/',
};

export const money = (n: number) =>
  `${SAMPLE.currency} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Configuración por defecto ── */
function defaultCliente(): TicketBlock[] {
  return [
    makeBlock('imagen'),
    makeBlock('negocio'),
    { ...makeBlock('texto'), text: '¡Gracias por su preferencia!', bold: false },
    makeBlock('separador'),
    makeBlock('datos-pedido'),
    makeBlock('numero-pedido'),
    makeBlock('separador'),
    makeBlock('cliente'),
    makeBlock('separador'),
    makeBlock('productos'),
    makeBlock('separador'),
    makeBlock('totales'),
    makeBlock('separador'),
    makeBlock('pago'),
    makeBlock('separador'),
    { ...makeBlock('texto'), text: '¡Vuelve pronto!', bold: true },
    makeBlock('qr'),
    makeBlock('separador'),
    { ...makeBlock('texto'), text: 'Generado con GoMenu', size: 'small', bold: false },
  ];
}

function defaultCocina(): TicketBlock[] {
  return [
    { ...makeBlock('texto'), text: 'COCINA', bold: true, size: 'large', upper: true },
    makeBlock('numero-pedido'),
    makeBlock('separador'),
    { ...makeBlock('datos-pedido'), showFecha: false, showHora: true },
    { ...makeBlock('cliente'), showClientPhone: false, showClientAddress: false, showDeliveryTime: true },
    makeBlock('separador'),
    { ...makeBlock('productos'), showPrices: false, size: 'large' },
    makeBlock('separador'),
  ];
}

export function defaultConfig(): TicketConfig {
  return { cliente: defaultCliente(), cocina: defaultCocina() };
}

export const TICKETS_STORAGE_KEY = 'restopro.tickets.v1';
