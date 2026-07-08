import type { Product, Customer, KitchenOrder, User, ActiveOrder } from '@/types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Carlos Cabrera', role: 'admin',  email: 'carlos.cabrera@restopro.pe', pin: '1092', station: 'Mesa de Control Central',     active: true },
  { id: 'u2', name: 'Miguel Prado',   role: 'cajero', email: 'miguel.prado@restopro.pe',   pin: '4480', station: 'Módulo de Caja Principal',    active: true },
  { id: 'u3', name: 'Lucía Mendoza',  role: 'mozo',   email: 'lucia.mendoza@restopro.pe',  pin: '2540', station: 'Terraza Principal y Salón A', active: true },
  { id: 'u4', name: 'Elena Quispe',   role: 'mozo',   email: 'elena.quispe@restopro.pe',   pin: '0887', station: 'Salón B & Barra',            active: true },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Ceviche Clásico Carretillero',
    price: 39.50,
    category: 'Entradas',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 45,
    sku: 'CEV-001',
    unit: 'Porción',
  },
  {
    id: 'p2',
    name: 'Causa Rellena de Pollo',
    price: 24.00,
    category: 'Entradas',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 30,
    sku: 'CAU-002',
    unit: 'Porción',
  },
  {
    id: 'p3',
    name: 'Anticuchos de Corazón (2 palos)',
    price: 28.50,
    category: 'Entradas',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 12,
    sku: 'ANT-003',
    unit: 'Plato',
  },
  {
    id: 'p4',
    name: 'Lomo Saltado con Papas Amarillas',
    price: 45.00,
    category: 'Platos de fondo',
    image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 60,
    sku: 'LOM-004',
    unit: 'Plato',
  },
  {
    id: 'p5',
    name: 'Ají de Gallina de la Abuela',
    price: 34.00,
    category: 'Platos de fondo',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 25,
    sku: 'AJI-005',
    unit: 'Plato',
  },
  {
    id: 'p6',
    name: 'Arroz con Mariscos Meloso',
    price: 42.00,
    category: 'Platos de fondo',
    image: 'https://images.unsplash.com/photo-1534080391025-09795117f05b?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 5,
    sku: 'ARR-006',
    unit: 'Plato',
  },
  {
    id: 'p7',
    name: 'Tacu Tacu con Lomo al Jugo',
    price: 48.00,
    category: 'Platos de fondo',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400',
    status: 'out_of_stock',
    stock: 0,
    sku: 'TAC-007',
    unit: 'Plato',
  },
  {
    id: 'p8',
    name: 'Chicha Morada RestoPro (Jarra 1L)',
    price: 18.00,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 80,
    sku: 'CHI-008',
    unit: 'Jarra',
  },
  {
    id: 'p9',
    name: 'Inka Kola Personal Vidrio',
    price: 7.50,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 120,
    sku: 'INK-009',
    unit: 'Botella',
  },
  {
    id: 'p10',
    name: 'Suspiro a la Limeña de la Casa',
    price: 16.00,
    category: 'Postres',
    image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 20,
    sku: 'SUS-010',
    unit: 'Copa',
  },
  {
    id: 'p11',
    name: 'Tres Leches de Lúcuma',
    price: 15.00,
    category: 'Postres',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 15,
    sku: 'TRE-011',
    unit: 'Slicing',
  },
  {
    id: 'p12',
    name: 'Súper Combo Marino (2 personas)',
    price: 78.00,
    category: 'Promociones',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400',
    status: 'available',
    stock: 15,
    sku: 'COM-012',
    unit: 'Combo',
  },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', nombre: 'Carlos Rodríguez', telefono: '998 741 236', email: 'carlos.rod@gmail.com', ultimaCompra: '16/06/2026', totalGastado: 1284.50, compras: 24 },
  { id: 'c2', nombre: 'María Fe Mendoza', telefono: '987 123 456', email: 'mafe.mendoza@outlook.com', ultimaCompra: '18/06/2026', totalGastado: 890.00, compras: 15 },
  { id: 'c3', nombre: 'Jean Pierre Alva', telefono: '945 889 771', email: 'jp_alva85@hotmail.com', ultimaCompra: '15/06/2026', totalGastado: 2310.50, compras: 42 },
  { id: 'c4', nombre: 'Gisella Valenzuela', telefono: '954 665 332', email: 'gvalenzuela@luzdelsur.com.pe', ultimaCompra: '11/06/2026', totalGastado: 450.00, compras: 8 },
  { id: 'c5', nombre: 'Renzo Castagneto', telefono: '921 441 552', email: 'renzo.cast@gmail.com', ultimaCompra: '18/06/2026', totalGastado: 120.00, compras: 3 },
];

export const INITIAL_KITCHEN_ORDERS: KitchenOrder[] = [
  {
    id: 'ko101',
    table: 'Mesa 2',
    items: [
      { name: 'Ceviche Clásico Carretillero', quantity: 2 },
      { name: 'Chicha Morada RestoPro (Jarra 1L)', quantity: 1 },
    ],
    status: 'pendiente',
    time: '14:20',
    elapsed: 8,
    waiter: 'Lucía Mendoza',
  },
  {
    id: 'ko102',
    table: 'Mesa 4',
    items: [
      { name: 'Lomo Saltado con Papas Amarillas', quantity: 3 },
      { name: 'Inka Kola Personal Vidrio', quantity: 3 },
      { name: 'Suspiro a la Limeña de la Casa', quantity: 1 },
    ],
    status: 'preparando',
    time: '14:12',
    elapsed: 16,
    waiter: 'Lucía Mendoza',
  },
  {
    id: 'ko103',
    table: 'Mesa 6',
    items: [
      { name: 'Causa Rellena de Pollo', quantity: 4 },
      { name: 'Arroz con Mariscos Meloso', quantity: 2 },
      { name: 'Ají de Gallina de la Abuela', quantity: 2 },
    ],
    status: 'listo',
    time: '13:58',
    elapsed: 30,
    waiter: 'Elena Quispe',
  },
];

export const INITIAL_SALES_HISTORY = [
  { id: 'S-701', time: '11:30', itemsCount: 3, paymentMethod: 'Yape / Plin' as const, total: 85.50, table: 'Mesa 1' },
  { id: 'S-702', time: '12:15', itemsCount: 4, paymentMethod: 'Tarjeta' as const, total: 184.00, table: 'Mesa 4' },
  { id: 'S-703', time: '13:10', itemsCount: 2, paymentMethod: 'Efectivo' as const, total: 54.00, table: 'Mesa 3' },
  { id: 'S-704', time: '13:40', itemsCount: 5, paymentMethod: 'Tarjeta' as const, total: 295.00, table: 'Mesa 6' },
];

/* Pedidos activos para llevar / delivery (pendientes de cobro) */
export const INITIAL_ACTIVE_ORDERS: ActiveOrder[] = [
  {
    id: 'PL-201',
    type: 'llevar',
    customer: 'Renzo Castagneto',
    phone: '921 441 552',
    items: [
      { product: MOCK_PRODUCTS[3], quantity: 1 }, // Lomo Saltado 45.00
      { product: MOCK_PRODUCTS[8], quantity: 2 }, // Inka Kola 7.50
    ],
    total: 60.00,
    itemsCount: 3,
    waiter: 'Lucía Mendoza',
    createdAt: '13:20',
  },
  {
    id: 'DL-305',
    type: 'delivery',
    customer: 'Gisella Valenzuela',
    phone: '954 665 332',
    address: 'Av. Larco 345, Dpto 502 — Miraflores',
    items: [
      { product: MOCK_PRODUCTS[4], quantity: 2 }, // Ají de Gallina 34.00
      { product: MOCK_PRODUCTS[7], quantity: 1 }, // Chicha Morada 18.00
    ],
    total: 86.00,
    itemsCount: 3,
    waiter: 'Elena Quispe',
    createdAt: '13:45',
  },
];
