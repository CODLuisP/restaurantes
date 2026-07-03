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
}

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface Table {
  id: string;
  name: string;
  capacidad: number;
  status: 'disponible' | 'ocupada' | 'reservada';
  cuenta: number;
  items?: OrderItem[];
  waiter?: string;
}

export interface Customer {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  ultimaCompra: string;
  totalGastado: number;
  compras: number;
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

export type Role = 'admin' | 'cajero' | 'mozo';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  pin: string;
  station: string;
  active: boolean;
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
  status: 'abierta' | 'cerrada';
  openedBy: string;
  openedAt: string;
  openingAmount: number;
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
export type DocType = 'Boleta' | 'Factura';

/* Canal / tipo de pedido */
export type OrderType = 'mesa' | 'llevar' | 'delivery';

/** Pedido activo que NO ocupa mesa (para llevar o delivery), pendiente de cobro. */
export interface ActiveOrder {
  id: string;
  type: 'llevar' | 'delivery';
  customer: string;
  phone?: string;
  address?: string;      // solo delivery
  items: OrderItem[];
  total: number;
  itemsCount: number;
  waiter?: string;
  createdAt: string;     // hora
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
}

export interface MenuEntry {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  available: boolean;
  image?: string;
}

export interface CartaDelDia {
  date: string;
  active: boolean;
  items: MenuEntry[];
}
