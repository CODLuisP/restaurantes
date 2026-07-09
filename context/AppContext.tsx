'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { MOCK_PRODUCTS, MOCK_CUSTOMERS, INITIAL_KITCHEN_ORDERS, INITIAL_SALES_HISTORY, INITIAL_ACTIVE_ORDERS } from '@/data/mockData';
import type {
  Product, Table, Piso, Customer, KitchenOrder, OrderItem, Toast, SalesHistory,
  CashSession, CashMovement, CashMovementType, PaymentMethod, DocType, ActiveOrder,
} from '@/types';

const CAJA_KEY = 'restopro.caja';
const CAJA_HISTORY_KEY = 'restopro.caja.history';
const PISOS_KEY = 'restopro.pisos';
const TABLES_KEY = 'restopro.tables';

/** Combina items existentes de una mesa con los nuevos, sumando cantidades. */
function mergeItems(existing: OrderItem[] = [], incoming: OrderItem[]): OrderItem[] {
  const map = new Map<string, OrderItem>();
  for (const it of existing) map.set(it.product.id, { ...it });
  for (const it of incoming) {
    const cur = map.get(it.product.id);
    if (cur) cur.quantity += it.quantity;
    else map.set(it.product.id, { ...it });
  }
  return Array.from(map.values());
}

interface KpiStats {
  ventasDia: number;
  ventasMes: number;
  pedidosActivos: number;
  ticketPromedio: number;
  clientesAtendidos: number;
}

interface AppContextType {
  products: Product[];
  pisos: Piso[];
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  /** Crea un nuevo piso/salón (p. ej. "Piso 1", "Terraza"). */
  addPiso: (name: string) => void;
  /** Elimina un piso; solo si no tiene mesas asignadas. */
  removePiso: (pisoId: string) => void;
  /** Agrega una mesa a un piso, identificada por número o letra. */
  addTable: (pisoId: string, name: string, capacidad: number) => void;
  /** Elimina una mesa; solo si está disponible (sin consumo pendiente). */
  removeTable: (tableId: string) => void;
  /** Reubica una mesa en el plano del salón. */
  moveTable: (tableId: string, x: number, y: number) => void;
  /** Une varias mesas disponibles en un solo grupo que se opera como una mesa. */
  mergeTables: (tableIds: string[]) => void;
  /** Separa un grupo de mesas unidas. */
  unmergeTable: (groupId: string) => void;
  customers: Customer[];
  /** Registra un nuevo cliente en el CRM. */
  addCustomer: (data: { nombre: string; telefono: string; email: string }) => void;
  /** Elimina un cliente del CRM. */
  removeCustomer: (id: string) => void;
  kitchenOrders: KitchenOrder[];
  salesHistory: SalesHistory[];
  toasts: Toast[];
  triggerToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  kpiStats: KpiStats;
  /** Mozo: toma una comanda y la envía a cocina; acumula el consumo en la mesa. */
  sendOrderToKitchen: (tableName: string, items: OrderItem[], waiter?: string) => void;
  /** Pedidos que no ocupan mesa (para llevar / delivery), pendientes de cobro. */
  activeOrders: ActiveOrder[];
  /** Crea un pedido para llevar o delivery y lo envía a cocina. */
  createOrder: (
    type: 'llevar' | 'delivery',
    info: { customer: string; phone?: string; address?: string },
    items: OrderItem[],
    waiter?: string
  ) => void;
  /** Cobra un pedido para llevar / delivery, emite comprobante y lo cierra. */
  chargeOrder: (
    orderId: string,
    paymentMethod: PaymentMethod,
    docType: DocType,
    cashier?: string
  ) => SalesHistory | null;
  /** Cajero: cobra el consumo acumulado de una mesa, emite comprobante y la libera. */
  chargeTable: (
    tableName: string,
    paymentMethod: PaymentMethod,
    docType: DocType,
    cashier?: string,
    customer?: string
  ) => SalesHistory | null;
  /** Cambia el estado de una mesa (reservar / liberar). No toca el consumo salvo al liberar. */
  setTableStatus: (tableId: string, status: Table['status']) => void;
  changeKitchenStatus: (orderId: string, nextStatus: KitchenOrder['status']) => void;
  /** El mozo confirma la entrega de una comanda lista (la saca de la cola). */
  dispatchOrder: (orderId: string) => void;
  /* ── Caja ── */
  cashSession: CashSession | null;
  cajaHistory: CashSession[];
  isCajaOpen: boolean;
  cajaExpectedCash: number;
  openCaja: (openingAmount: number, by: string) => void;
  closeCaja: (countedAmount: number, by: string) => CashSession | null;
  addCashMovement: (type: CashMovementType, amount: number, reason: string, by: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>(INITIAL_KITCHEN_ORDERS);
  const [salesHistory, setSalesHistory] = useState<SalesHistory[]>(INITIAL_SALES_HISTORY);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>(INITIAL_ACTIVE_ORDERS);
  const [docSeq, setDocSeq] = useState<Record<DocType, number>>({ Boleta: 105, Factura: 32 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [cajaHistory, setCajaHistory] = useState<CashSession[]>([]);

  /* Hidratar caja y distribución de mesas desde localStorage (solo cliente) */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CAJA_KEY);
      if (stored) setCashSession(JSON.parse(stored));
      const storedHistory = localStorage.getItem(CAJA_HISTORY_KEY);
      if (storedHistory) setCajaHistory(JSON.parse(storedHistory));
      const storedPisos = localStorage.getItem(PISOS_KEY);
      if (storedPisos) setPisos(JSON.parse(storedPisos));
      const storedTables = localStorage.getItem(TABLES_KEY);
      if (storedTables) setTables(JSON.parse(storedTables));
    } catch {
      /* ignora datos corruptos */
    }
  }, []);

  /* Persistir distribución de mesas (solo cliente) */
  useEffect(() => {
    try { localStorage.setItem(PISOS_KEY, JSON.stringify(pisos)); } catch {}
  }, [pisos]);

  useEffect(() => {
    try { localStorage.setItem(TABLES_KEY, JSON.stringify(tables)); } catch {}
  }, [tables]);

  const persistCaja = useCallback((session: CashSession | null) => {
    setCashSession(session);
    try {
      if (session) localStorage.setItem(CAJA_KEY, JSON.stringify(session));
      else localStorage.removeItem(CAJA_KEY);
    } catch {}
  }, []);

  const persistCajaHistory = useCallback((history: CashSession[]) => {
    setCajaHistory(history);
    try { localStorage.setItem(CAJA_HISTORY_KEY, JSON.stringify(history)); } catch {}
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setKitchenOrders(prev =>
        prev.map(order =>
          order.status !== 'listo' ? { ...order, elapsed: order.elapsed + 1 } : order
        )
      );
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const kpiStats = useMemo<KpiStats>(() => {
    const historicalTotal = salesHistory.reduce((sum, item) => sum + item.total, 0);
    const activeTablesTotal = tables
      .filter(t => t.status === 'ocupada')
      .reduce((sum, t) => sum + t.cuenta, 0);

    const totalVentasDia = historicalTotal + activeTablesTotal;
    const occupiedCount = tables.filter(t => t.status === 'ocupada').length;
    const pedidosActivos =
      kitchenOrders.filter(o => o.status !== 'listo').length + occupiedCount;
    const ticketPromedio =
      totalVentasDia / (salesHistory.length + occupiedCount || 1);

    return {
      ventasDia: totalVentasDia,
      ventasMes: totalVentasDia * 25.8 + 84500,
      pedidosActivos,
      ticketPromedio,
      clientesAtendidos: customers.length + 42,
    };
  }, [salesHistory, tables, kitchenOrders, customers]);

  /* ── CRM: alta y baja de clientes ─────────────────────────── */
  const addCustomer = useCallback((data: { nombre: string; telefono: string; email: string }) => {
    const newCustomer: Customer = {
      id: `c${Date.now().toString(36)}`,
      nombre: data.nombre,
      telefono: data.telefono,
      email: data.email,
      ultimaCompra: '—',
      totalGastado: 0,
      compras: 0,
      historial: [],
    };
    setCustomers(prev => [newCustomer, ...prev]);
    triggerToast(`Cliente "${data.nombre}" agregado.`, 'success');
  }, [triggerToast]);

  const removeCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    triggerToast('Cliente eliminado.', 'info');
  }, [triggerToast]);

  /* ── MOZO: tomar comanda y enviarla a cocina ──────────────── */
  const sendOrderToKitchen = useCallback(
    (tableName: string, items: OrderItem[], waiter?: string) => {
      if (items.length === 0) {
        triggerToast('La comanda está vacía. Agregue platos antes de enviar.', 'warning');
        return;
      }
      if (!cashSession || cashSession.status !== 'abierta') {
        triggerToast('La caja está cerrada. No se pueden tomar pedidos hasta que se aperture.', 'error');
        return;
      }

      const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      /* Comanda hacia el KDS de cocina */
      const newKitchenOrder: KitchenOrder = {
        id: `ko${Math.floor(200 + Math.random() * 800)}`,
        table: tableName,
        items: items.map(i => ({ name: i.product.name, quantity: i.quantity })),
        status: 'pendiente',
        time: now,
        elapsed: 0,
        waiter,
      };
      setKitchenOrders(prev => [...prev, newKitchenOrder]);

      /* Acumular el consumo en la mesa (mezcla con lo ya pedido) */
      setTables(prev =>
        prev.map(t => {
          if (t.name !== tableName) return t;
          const merged = mergeItems(t.items, items);
          const cuenta = merged.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
          return { ...t, status: 'ocupada', items: merged, cuenta, waiter: waiter ?? t.waiter };
        })
      );

      triggerToast(`Comanda de ${tableName} enviada a cocina.`, 'success');
    },
    [triggerToast, cashSession]
  );

  /* ── CAJERO: cobrar el consumo de la mesa y emitir comprobante ── */
  const chargeTable = useCallback(
    (
      tableName: string,
      paymentMethod: PaymentMethod,
      docType: DocType,
      cashier?: string,
      customer?: string
    ): SalesHistory | null => {
      if (!cashSession || cashSession.status !== 'abierta') {
        triggerToast('No se puede cobrar: la caja está cerrada.', 'error');
        return null;
      }
      const table = tables.find(t => t.name === tableName);
      if (!table || table.status !== 'ocupada' || table.cuenta <= 0) {
        triggerToast('La mesa no tiene consumo pendiente por cobrar.', 'warning');
        return null;
      }

      const itemsCount = (table.items ?? []).reduce((sum, i) => sum + i.quantity, 0);
      const seq = (docSeq[docType] ?? 0) + 1;
      const serie = docType === 'Boleta' ? 'B001' : 'F001';
      const comprobante = `${serie}-${String(seq).padStart(6, '0')}`;

      const sale: SalesHistory = {
        id: `S-${Math.floor(100 + Math.random() * 900)}`,
        time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        itemsCount,
        paymentMethod,
        total: table.cuenta,
        table: tableName,
        docType,
        comprobante,
        waiter: table.waiter,
        cashier,
      };

      setSalesHistory(prev => [sale, ...prev]);
      setDocSeq(prev => ({ ...prev, [docType]: seq }));

      /* Alimentar la caja según método de pago */
      persistCaja({
        ...cashSession,
        cashSales:    cashSession.cashSales    + (paymentMethod === 'Efectivo'    ? table.cuenta : 0),
        cardSales:    cashSession.cardSales    + (paymentMethod === 'Tarjeta'     ? table.cuenta : 0),
        digitalSales: cashSession.digitalSales + (paymentMethod === 'Yape / Plin' ? table.cuenta : 0),
        salesCount:   cashSession.salesCount + 1,
      });

      /* Liberar la mesa */
      setTables(prev =>
        prev.map(t =>
          t.name === tableName ? { ...t, status: 'disponible', items: [], cuenta: 0, waiter: undefined } : t
        )
      );

      triggerToast(`Cobro realizado (${paymentMethod}). ${docType} ${comprobante} emitida.`, 'success');
      return sale;
    },
    [triggerToast, cashSession, tables, docSeq, persistCaja]
  );

  const setTableStatus = useCallback(
    (tableId: string, status: Table['status']) => {
      setTables(prev =>
        prev.map(t =>
          t.id === tableId
            ? { ...t, status, ...(status === 'disponible' ? { items: [], cuenta: 0, waiter: undefined } : {}) }
            : t
        )
      );
      triggerToast(`Mesa marcada como ${status}.`, 'info');
    },
    [triggerToast]
  );

  /* ── Gestión de pisos y mesas ──────────────────────────────── */
  const addPiso = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        triggerToast('Ingrese un nombre para el salón.', 'warning');
        return;
      }
      const id = `piso-${Date.now().toString(36)}`;
      setPisos(prev => [...prev, { id, name: trimmed }]);
      triggerToast(`Salón "${trimmed}" creado.`, 'success');
    },
    [triggerToast]
  );

  const removePiso = useCallback(
    (pisoId: string) => {
      const hasTables = tables.some(t => t.pisoId === pisoId);
      if (hasTables) {
        triggerToast('No se puede eliminar un salón con mesas asignadas.', 'error');
        return;
      }
      setPisos(prev => prev.filter(p => p.id !== pisoId));
    },
    [tables, triggerToast]
  );

  const addTable = useCallback(
    (pisoId: string, name: string, capacidad: number) => {
      const trimmed = name.trim();
      if (!trimmed) {
        triggerToast('Ingrese un número o letra para identificar la mesa.', 'warning');
        return;
      }
      if (tables.some(t => t.pisoId === pisoId && t.name.toLowerCase() === trimmed.toLowerCase())) {
        triggerToast(`Ya existe una mesa "${trimmed}" en este salón.`, 'warning');
        return;
      }
      const id = `mesa-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
      /* Posición por defecto: se distribuye en cuadrícula dentro del plano. */
      const count = tables.filter(t => t.pisoId === pisoId).length;
      const x = 24 + (count % 5) * 150;
      const y = 24 + Math.floor(count / 5) * 160;
      setTables(prev => [...prev, { id, pisoId, name: trimmed, capacidad, status: 'disponible', cuenta: 0, x, y }]);
      triggerToast(`Mesa "${trimmed}" agregada.`, 'success');
    },
    [tables, triggerToast]
  );

  const removeTable = useCallback(
    (tableId: string) => {
      const table = tables.find(t => t.id === tableId);
      if (table && table.status !== 'disponible') {
        triggerToast('No se puede eliminar una mesa ocupada o reservada.', 'error');
        return;
      }
      setTables(prev => prev.filter(t => t.id !== tableId));
    },
    [tables, triggerToast]
  );

  const moveTable = useCallback((tableId: string, x: number, y: number) => {
    setTables(prev => prev.map(t => (t.id === tableId ? { ...t, x, y } : t)));
  }, []);

  const mergeTables = useCallback(
    (tableIds: string[]) => {
      if (tableIds.length < 2) {
        triggerToast('Selecciona al menos dos mesas para unir.', 'warning');
        return;
      }
      const selected = tables.filter(t => tableIds.includes(t.id));
      if (selected.some(t => t.status !== 'disponible')) {
        triggerToast('Solo se pueden unir mesas disponibles (sin consumo).', 'error');
        return;
      }
      const groupId = `grp-${Date.now().toString(36)}`;
      /* Ordena de izq. a der. y las alinea en fila para que se vean como una sola mesa. */
      const ordered = [...selected].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
      const bx = ordered[0].x ?? 24;
      const by = ordered[0].y ?? 24;
      const rowIndex = new Map(ordered.map((t, i) => [t.id, i]));
      setTables(prev =>
        prev.map(t =>
          rowIndex.has(t.id)
            ? { ...t, groupId, x: bx + rowIndex.get(t.id)! * 74, y: by }
            : t
        )
      );
      const cap = selected.reduce((sum, t) => sum + t.capacidad, 0);
      triggerToast(`Mesas unidas — capacidad combinada de ${cap} personas.`, 'success');
    },
    [tables, triggerToast]
  );

  const unmergeTable = useCallback(
    (groupId: string) => {
      const group = tables
        .filter(t => t.groupId === groupId)
        .sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
      if (group.some(t => t.status !== 'disponible')) {
        triggerToast('Libera la mesa unida antes de separarla.', 'error');
        return;
      }
      const bx = group[0]?.x ?? 24;
      const by = group[0]?.y ?? 24;
      const idx = new Map(group.map((t, i) => [t.id, i]));
      setTables(prev =>
        prev.map(t =>
          t.groupId === groupId
            ? { ...t, groupId: undefined, x: bx + idx.get(t.id)! * 100, y: by }
            : t
        )
      );
      triggerToast('Mesas separadas.', 'info');
    },
    [tables, triggerToast]
  );

  /* ── Pedidos para llevar / delivery ───────────────────────── */
  const createOrder = useCallback(
    (
      type: 'llevar' | 'delivery',
      info: { customer: string; phone?: string; address?: string },
      items: OrderItem[],
      waiter?: string
    ) => {
      if (items.length === 0) {
        triggerToast('El pedido está vacío. Agregue platos antes de enviar.', 'warning');
        return;
      }
      if (!cashSession || cashSession.status !== 'abierta') {
        triggerToast('La caja está cerrada. No se pueden tomar pedidos hasta aperturarla.', 'error');
        return;
      }
      const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const total = items.reduce((a, i) => a + i.product.price * i.quantity, 0);
      const itemsCount = items.reduce((a, i) => a + i.quantity, 0);
      const id = `${type === 'llevar' ? 'PL' : 'DL'}-${Math.floor(200 + Math.random() * 800)}`;

      const order: ActiveOrder = {
        id,
        type,
        customer: info.customer.trim() || (type === 'llevar' ? 'Cliente mostrador' : 'Cliente delivery'),
        phone: info.phone,
        address: info.address,
        items,
        total,
        itemsCount,
        waiter,
        createdAt: now,
      };
      setActiveOrders(prev => [order, ...prev]);

      /* Comanda hacia cocina, etiquetada por tipo */
      const ko: KitchenOrder = {
        id: `ko${Math.floor(200 + Math.random() * 800)}`,
        table: type === 'llevar' ? `Llevar · ${id}` : `Delivery · ${id}`,
        items: items.map(i => ({ name: i.product.name, quantity: i.quantity })),
        status: 'pendiente',
        time: now,
        elapsed: 0,
        waiter,
      };
      setKitchenOrders(prev => [...prev, ko]);

      triggerToast(`Pedido ${type === 'llevar' ? 'para llevar' : 'delivery'} ${id} enviado a cocina.`, 'success');
    },
    [cashSession, triggerToast]
  );

  const chargeOrder = useCallback(
    (orderId: string, paymentMethod: PaymentMethod, docType: DocType, cashier?: string): SalesHistory | null => {
      if (!cashSession || cashSession.status !== 'abierta') {
        triggerToast('No se puede cobrar: la caja está cerrada.', 'error');
        return null;
      }
      const order = activeOrders.find(o => o.id === orderId);
      if (!order) {
        triggerToast('El pedido ya no está disponible.', 'warning');
        return null;
      }
      const seq = (docSeq[docType] ?? 0) + 1;
      const serie = docType === 'Boleta' ? 'B001' : 'F001';
      const comprobante = `${serie}-${String(seq).padStart(6, '0')}`;

      const sale: SalesHistory = {
        id: `S-${Math.floor(100 + Math.random() * 900)}`,
        time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        itemsCount: order.itemsCount,
        paymentMethod,
        total: order.total,
        table: order.type === 'llevar' ? `Para llevar (${order.id})` : `Delivery (${order.id})`,
        docType,
        comprobante,
        waiter: order.waiter,
        cashier,
      };
      setSalesHistory(prev => [sale, ...prev]);
      setDocSeq(prev => ({ ...prev, [docType]: seq }));

      persistCaja({
        ...cashSession,
        cashSales:    cashSession.cashSales    + (paymentMethod === 'Efectivo'    ? order.total : 0),
        cardSales:    cashSession.cardSales    + (paymentMethod === 'Tarjeta'     ? order.total : 0),
        digitalSales: cashSession.digitalSales + (paymentMethod === 'Yape / Plin' ? order.total : 0),
        salesCount:   cashSession.salesCount + 1,
      });

      setActiveOrders(prev => prev.filter(o => o.id !== orderId));
      triggerToast(`Cobro de ${order.id} realizado (${paymentMethod}). ${docType} ${comprobante} emitida.`, 'success');
      return sale;
    },
    [cashSession, activeOrders, docSeq, persistCaja, triggerToast]
  );

  const changeKitchenStatus = useCallback(
    (orderId: string, nextStatus: KitchenOrder['status']) => {
      const order = kitchenOrders.find(o => o.id === orderId);
      setKitchenOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      if (nextStatus === 'listo' && order) {
        /* Aviso dirigido al mozo que tomó la comanda */
        triggerToast(
          `🔔 ${order.table} lista para servir${order.waiter ? ` — avisar a ${order.waiter}` : ''}.`,
          'info'
        );
      } else {
        triggerToast(`Cocina: ${orderId} marcado como ${nextStatus}.`, 'success');
      }
    },
    [kitchenOrders, triggerToast]
  );

  /** El mozo confirma que ya entregó/despachó la comanda lista: sale de la cola. */
  const dispatchOrder = useCallback(
    (orderId: string) => {
      const order = kitchenOrders.find(o => o.id === orderId);
      setKitchenOrders(prev => prev.filter(o => o.id !== orderId));
      triggerToast(`Comanda ${order?.table ?? orderId} entregada.`, 'success');
    },
    [kitchenOrders, triggerToast]
  );

  /* ── Caja ─────────────────────────────────────────────────── */

  const isCajaOpen = cashSession?.status === 'abierta';

  /* Efectivo que debería haber físicamente en caja:
     fondo inicial + ventas en efectivo + ingresos - egresos */
  const cajaExpectedCash = useMemo(() => {
    if (!cashSession) return 0;
    const movements = cashSession.movements.reduce(
      (acc, m) => acc + (m.type === 'ingreso' ? m.amount : -m.amount),
      0
    );
    return cashSession.openingAmount + cashSession.cashSales + movements;
  }, [cashSession]);

  const openCaja = useCallback(
    (openingAmount: number, by: string) => {
      if (cashSession?.status === 'abierta') {
        triggerToast('Ya existe una caja abierta.', 'warning');
        return;
      }
      /* Continuidad: lo que el turno anterior contó físicamente al cerrar debe
         coincidir con el fondo de apertura de este turno. Si no coincide, el
         dinero "desaparecido" entre un cierre y la siguiente apertura queda
         registrado igual — así nadie puede llevarse efectivo sin que se note. */
      const previousClosingAmount = cashSession?.status === 'cerrada' ? cashSession.countedAmount : undefined;
      const openingDifference = previousClosingAmount !== undefined ? openingAmount - previousClosingAmount : undefined;

      const session: CashSession = {
        id: `CJ-${Date.now().toString(36).toUpperCase()}`,
        status: 'abierta',
        openedBy: by,
        openedAt: new Date().toISOString(),
        openingAmount,
        previousClosingAmount,
        openingDifference,
        movements: [],
        cashSales: 0,
        cardSales: 0,
        digitalSales: 0,
        salesCount: 0,
      };
      persistCaja(session);

      if (openingDifference && Math.abs(openingDifference) > 0.001) {
        triggerToast(
          `⚠️ El cierre anterior contó S/. ${previousClosingAmount!.toFixed(2)} y estás abriendo con S/. ${openingAmount.toFixed(2)} ` +
          `(${openingDifference > 0 ? 'sobran' : 'faltan'} S/. ${Math.abs(openingDifference).toFixed(2)} entre turnos).`,
          'warning'
        );
      } else {
        triggerToast(`Caja aperturada por ${by} con fondo de S/. ${openingAmount.toFixed(2)}.`, 'success');
      }
    },
    [cashSession, persistCaja, triggerToast]
  );

  const addCashMovement = useCallback(
    (type: CashMovementType, amount: number, reason: string, by: string) => {
      if (!cashSession || cashSession.status !== 'abierta') {
        triggerToast('No hay caja abierta para registrar movimientos.', 'error');
        return;
      }
      const movement: CashMovement = {
        id: `MV-${Date.now().toString(36).toUpperCase()}`,
        type,
        amount,
        reason,
        time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        by,
      };
      persistCaja({ ...cashSession, movements: [...cashSession.movements, movement] });
      triggerToast(
        `${type === 'ingreso' ? 'Ingreso' : 'Egreso'} de S/. ${amount.toFixed(2)} registrado en caja.`,
        'info'
      );
    },
    [cashSession, persistCaja, triggerToast]
  );

  const closeCaja = useCallback(
    (countedAmount: number, by: string): CashSession | null => {
      if (!cashSession || cashSession.status !== 'abierta') {
        triggerToast('No hay caja abierta para cerrar.', 'error');
        return null;
      }
      const closed: CashSession = {
        ...cashSession,
        status: 'cerrada',
        closedBy: by,
        closedAt: new Date().toISOString(),
        countedAmount,
        expectedAmount: cajaExpectedCash,
        difference: countedAmount - cajaExpectedCash,
      };
      persistCaja(closed);
      persistCajaHistory([closed, ...cajaHistory]);
      const diff = closed.difference ?? 0;
      triggerToast(
        diff === 0
          ? `Caja cerrada y cuadrada correctamente por ${by}.`
          : `Caja cerrada por ${by}. ${diff > 0 ? 'Sobrante' : 'Faltante'} de S/. ${Math.abs(diff).toFixed(2)}.`,
        diff === 0 ? 'success' : 'warning'
      );
      return closed;
    },
    [cashSession, cajaExpectedCash, cajaHistory, persistCaja, persistCajaHistory, triggerToast]
  );

  return (
    <AppContext.Provider
      value={{
        products,
        pisos,
        tables,
        setTables,
        addPiso,
        removePiso,
        addTable,
        removeTable,
        moveTable,
        mergeTables,
        unmergeTable,
        customers,
        addCustomer,
        removeCustomer,
        kitchenOrders,
        salesHistory,
        toasts,
        triggerToast,
        dismissToast,
        searchQuery,
        setSearchQuery,
        kpiStats,
        sendOrderToKitchen,
        activeOrders,
        createOrder,
        chargeOrder,
        chargeTable,
        setTableStatus,
        changeKitchenStatus,
        dispatchOrder,
        cashSession,
        cajaHistory,
        isCajaOpen: !!isCajaOpen,
        cajaExpectedCash,
        openCaja,
        closeCaja,
        addCashMovement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
