'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { MOCK_PRODUCTS, MOCK_TABLES, MOCK_CUSTOMERS, INITIAL_KITCHEN_ORDERS, INITIAL_SALES_HISTORY } from '@/data/mockData';
import type { Product, Table, Customer, KitchenOrder, OrderItem, Toast, SalesHistory } from '@/types';

interface KpiStats {
  ventasDia: number;
  ventasMes: number;
  pedidosActivos: number;
  ticketPromedio: number;
  clientesAtendidos: number;
}

interface AppContextType {
  products: Product[];
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  customers: Customer[];
  kitchenOrders: KitchenOrder[];
  salesHistory: SalesHistory[];
  toasts: Toast[];
  triggerToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  kpiStats: KpiStats;
  handleCheckOut: (
    items: OrderItem[],
    paymentMethod: 'Efectivo' | 'Yape / Plin' | 'Tarjeta',
    table: string
  ) => void;
  cycleTableStatus: (tableId: string) => void;
  changeKitchenStatus: (orderId: string, nextStatus: KitchenOrder['status']) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [tables, setTables] = useState<Table[]>(MOCK_TABLES);
  const [customers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>(INITIAL_KITCHEN_ORDERS);
  const [salesHistory, setSalesHistory] = useState<SalesHistory[]>(INITIAL_SALES_HISTORY);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleCheckOut = useCallback(
    (
      items: OrderItem[],
      paymentMethod: 'Efectivo' | 'Yape / Plin' | 'Tarjeta',
      table: string
    ) => {
      if (items.length === 0) {
        triggerToast('El carrito de orden actual está vacío.', 'warning');
        return;
      }

      const orderTotal = items.reduce(
        (acc, item) => acc + item.product.price * item.quantity,
        0
      );
      const newSaleId = `S-${Math.floor(100 + Math.random() * 900)}`;
      const newSale: SalesHistory = {
        id: newSaleId,
        time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
        paymentMethod,
        total: orderTotal,
        table,
      };

      setSalesHistory(prev => [newSale, ...prev]);

      const newKitchenOrder: KitchenOrder = {
        id: `ko${Math.floor(200 + Math.random() * 800)}`,
        table,
        items: items.map(item => ({ name: item.product.name, quantity: item.quantity })),
        status: 'pendiente',
        time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        elapsed: 0,
      };

      setKitchenOrders(prev => [...prev, newKitchenOrder]);
      setTables(prev =>
        prev.map(t =>
          t.name === table ? { ...t, status: 'ocupada', cuenta: orderTotal } : t
        )
      );

      triggerToast(
        `Pedido cobrado con éxito [${newSaleId}]. Enviado a cocina. (${paymentMethod})`,
        'success'
      );
    },
    [triggerToast]
  );

  const cycleTableStatus = useCallback(
    (tableId: string) => {
      setTables(prev =>
        prev.map(t => {
          if (t.id !== tableId) return t;
          const next: Record<Table['status'], Table['status']> = {
            disponible: 'ocupada',
            ocupada: 'reservada',
            reservada: 'disponible',
          };
          return {
            ...t,
            status: next[t.status],
            cuenta: t.status === 'disponible' ? 45.0 : 0,
          };
        })
      );
      triggerToast('Estado de mesa actualizado.', 'info');
    },
    [triggerToast]
  );

  const changeKitchenStatus = useCallback(
    (orderId: string, nextStatus: KitchenOrder['status']) => {
      setKitchenOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      triggerToast(
        `Cola de Cocina: Pedido ${orderId} marcado como [${nextStatus.toUpperCase()}]`,
        'success'
      );
    },
    [triggerToast]
  );

  return (
    <AppContext.Provider
      value={{
        products,
        tables,
        setTables,
        customers,
        kitchenOrders,
        salesHistory,
        toasts,
        triggerToast,
        dismissToast,
        searchQuery,
        setSearchQuery,
        kpiStats,
        handleCheckOut,
        cycleTableStatus,
        changeKitchenStatus,
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
