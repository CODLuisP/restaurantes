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
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

export interface SalesHistory {
  id: string;
  time: string;
  itemsCount: number;
  paymentMethod: 'Efectivo' | 'Yape / Plin' | 'Tarjeta';
  total: number;
  table: string;
}
