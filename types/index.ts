export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  status: 'available' | 'out_of_stock';
  stock: number;
  sku: string;
  unit: string;
  /** Variantes disponibles del producto en el catálogo (ej. "Helada"/"Al tiempo") — no aplica a un ítem ya en el carrito. */
  variants?: { id: number; name: string; price: number }[];
}

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface Table {
  id: string;
  name: string;
  /** Salón/zona del local (viene del backend, texto libre). Vacío = sin salón asignado. */
  ubicacion: string;
  capacidad: number;
  status: 'disponible' | 'ocupada' | 'reservada';
  cuenta: number;
  items?: OrderItem[];
  waiter?: string;
  /** Ids del backend (RestaurantesAPI) detrás del consumo actual de la mesa: sesión + pedido. */
  sesionMesaId?: number;
  pedidoId?: number;
  /** Estado del pedido activo — "pendiente_confirmacion" significa que lo armó el cliente por QR y falta que el mozo lo confirme. */
  pedidoEstado?: string;
  /** Nombre del comensal/representante de mesa, opcional — si no se da, se identifica por el número de mesa. */
  nombreCliente?: string;
  /** Posición en el plano del salón (px desde la esquina sup. izq. del lienzo). */
  x?: number;
  y?: number;
  /** Mesas unidas comparten el mismo groupId y se operan como una sola. */
  groupId?: string;
}

export interface CustomerOrder {
  id: string;
  fecha: string;
  tipo: string;
  metodoPago: string;
  items: number;
  total: number;
}

export interface Customer {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  ultimaCompra: string;
  totalGastado: number;
  compras: number;
  historial?: CustomerOrder[];
}

export interface KitchenOrder {
  id: string;
  table: string;
  items: { name: string; quantity: number; notes?: string }[];
  status: 'pendiente' | 'preparando' | 'listo';
  time: string;
  elapsed: number;
  waiter?: string;
}

/* ── Usuarios / Personal & Roles ───────────────────────────── */

export type Role = 'admin' | 'cajero' | 'mozo' | 'cocinero' | 'repartidor';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  pin: string;
  station: string;
  active: boolean;
  /** Username real contra el backend (RestaurantesAPI) — ausente en usuarios mock locales. */
  username?: string;
  empresaId?: number;
  sucursalId?: number | null;
}

/* ── Caja (apertura / arqueo / cierre) ─────────────────────── */

export type CashMovementType = 'ingreso' | 'egreso';

export interface CashMovement {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  time: string;
  by: string;
}

export interface CashSession {
  id: string;
  /** Id numérico del turno en el backend (RestaurantesAPI), cuando la sesión ya está conectada. */
  turnoId?: number;
  status: 'abierta' | 'cerrada';
  openedBy: string;
  openedAt: string;
  openingAmount: number;
  /* Continuidad entre turnos: lo que el cierre anterior contó físicamente */
  previousClosingAmount?: number;
  /* openingAmount - previousClosingAmount (0 si coincide, ≠0 = posible faltante/sobrante entre turnos) */
  openingDifference?: number;
  movements: CashMovement[];
  /* Acumulado de ventas de la sesión, separado por método de pago */
  cashSales: number;
  cardSales: number;
  digitalSales: number;
  salesCount: number;
  /* Datos de cierre (arqueo) */
  closedBy?: string;
  closedAt?: string;
  countedAmount?: number;   // efectivo contado físicamente al cerrar
  expectedAmount?: number;  // efectivo esperado en caja
  difference?: number;      // contado - esperado (sobrante + / faltante -)
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

export type PaymentMethod = 'Efectivo' | 'Yape / Plin' | 'Tarjeta';
/** 'Nota de venta' = venta interna sin comprobante electrónico ante SUNAT. */
export type DocType = 'Boleta' | 'Factura' | 'Nota de venta';

/** Documento de identidad del cliente para el comprobante. */
export interface CustomerDoc {
  type: 'DNI' | 'RUC';
  number: string;
  name: string;
}

/** Datos con los que se cobra una comanda (o una parte, en cuentas separadas). */
export interface ChargeInput {
  method: PaymentMethod;
  docType: DocType;
  cashier?: string;
  customer?: string;
  /** Identificación tributaria del cliente (DNI para boleta, RUC para factura). */
  customerDoc?: CustomerDoc;
  /** Efectivo entregado por el cliente (para calcular el vuelto). */
  received?: number;
  /** Monto a cobrar; si se omite, se cobra el total pendiente. Se usa en cuentas separadas. */
  amount?: number;
  /** Nº de ítems de esta (sub)cuenta. */
  itemsCount?: number;
  /** Si true (por defecto), libera la mesa / cierra el pedido tras cobrar. En cuentas separadas se pasa false hasta el último pago. */
  closeAfter?: boolean;
  /** Ítems reales (id de pedido_item del backend + cantidad) que cubre este cobro — obligatorio para registrar la venta real. */
  chargeItems: { pedidoItemId: number; cantidad: number }[];
}

/* Canal / tipo de pedido */
export type OrderType = 'mesa' | 'llevar' | 'delivery';

/** Pedido activo que NO ocupa mesa (para llevar o delivery), pendiente de cobro. */
export interface ActiveOrder {
  id: string;
  type: 'llevar' | 'delivery';
  /** Ids del backend (RestaurantesAPI) que respaldan este pedido: sesión de mesa + pedido. */
  sesionMesaId?: number;
  pedidoId?: number;
  /** Estado del pedido — "pendiente_confirmacion" significa que lo armó el cliente por el menú público y falta que el mozo lo confirme. */
  pedidoEstado?: string;
  customer: string;
  phone?: string;
  address?: string;      // solo delivery
  items: OrderItem[];
  total: number;
  itemsCount: number;
  waiter?: string;
  createdAt: string;     // hora
  docType?: string;
  ruc?: string;
  razonSocial?: string;
  paymentMethod?: string;
  paymentScreenshot?: string;
}

export interface SalesHistory {
  id: string;
  time: string;
  itemsCount: number;
  paymentMethod: PaymentMethod;
  total: number;
  table: string;
  docType?: DocType;
  comprobante?: string;   // Ej. "B001-000123"
  waiter?: string;
  cashier?: string;
  customerDoc?: CustomerDoc;
  received?: number;      // efectivo entregado
  change?: number;        // vuelto entregado
}

export interface MenuEntry {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  available: boolean;
  image?: string;
  featured?: boolean;
}

export interface CartaDelDia {
  date: string;
  active: boolean;
  items: MenuEntry[];
}
