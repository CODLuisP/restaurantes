'use client';

import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MOCK_PRODUCTS, MOCK_CUSTOMERS, INITIAL_SALES_HISTORY } from '@/data/mockData';
import type {
  Product, Table, Customer, OrderItem, Toast, SalesHistory,
  CashSession, CashMovement, CashMovementType, DocType, ActiveOrder, ChargeInput,
} from '@/types';
import { useToasts } from '@/hooks/app/useToasts';
import { useCajaTurno } from '@/hooks/app/useCajaTurno';
import { useNegocioConfig } from '@/hooks/app/useNegocioConfig';
import type { MetodosPago, MetodosEntrega } from '@/lib/config/metodos';
import { useMesasCatalogo } from '@/hooks/mesas/useMesasCatalogo';
import { useActiveOrders } from '@/hooks/comandero/useActiveOrders';
import { usePedidoEvents } from '@/hooks/realtime/usePedidoEvents';
import { useMesaEvents, type MesaEvent } from '@/hooks/realtime/useMesaEvents';
import { pedidoLabel } from '@/components/cocina/types';
import type { TurnoCajaDto } from '@/lib/api/turnosCaja';
import type { PedidoDto } from '@/lib/api/pedidos';
import { crearVenta } from '@/lib/api/ventas';
import { ApiError } from '@/lib/api/client';

/** Boleta/Factura/Nota de venta (UI) → ticket/boleta/factura (backend). */
const DOC_TYPE_TO_BACKEND: Record<DocType, string> = {
  'Boleta': 'boleta',
  'Factura': 'factura',
  'Nota de venta': 'ticket',
};

/** Efectivo/Yape-Plin/Tarjeta (UI) → efectivo/yape/tarjeta (backend). */
const PAYMENT_TO_BACKEND: Record<string, string> = {
  'Efectivo': 'efectivo',
  'Yape / Plin': 'yape',
  'Tarjeta': 'tarjeta',
};

interface KpiStats {
  ventasDia: number;
  ventasMes: number;
  pedidosActivos: number;
  ticketPromedio: number;
  clientesAtendidos: number;
}

interface AppContextType {
  products: Product[];
  /** Métodos de pago/entrega habilitados y % de IGV configurados en /configuracion — Cobrar,
   *  Comandero y el menú público deben respetarlos en vez de mostrar siempre todo. */
  metodosPago: MetodosPago;
  metodosEntrega: MetodosEntrega;
  igvPorcentaje: number;
  negocioConfigLoading: boolean;
  /** Refresca métodos de pago/entrega e IGV desde el backend — se llama tras guardar cambios
   *  en /configuracion para que Cobrar/Comandero los reflejen sin tener que recargar la sesión. */
  refreshNegocioConfig: () => Promise<void>;
  tables: Table[];
  mesasLoading: boolean;
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  /** Admin: crea una mesa en el backend (compartida entre todos los dispositivos). */
  addTable: (ubicacion: string, numero: string, capacidad: number) => Promise<void>;
  /** Admin: elimina una mesa del backend; solo si está libre (sin consumo pendiente). */
  removeTable: (tableId: string) => Promise<void>;
  /** Reubica una mesa en el plano del salón (solo visual, no persiste en el backend). */
  moveTable: (tableId: string, x: number, y: number) => void;
  /** Une varias mesas disponibles en un solo grupo que se opera como una mesa (persiste en backend). */
  mergeTables: (tableIds: string[]) => Promise<void>;
  /** Separa un grupo de mesas unidas (persiste en backend). */
  unmergeTable: (groupId: string) => Promise<void>;
  customers: Customer[];
  /** Registra un nuevo cliente en el CRM. */
  addCustomer: (data: { nombre: string; telefono: string; email: string }) => void;
  /** Elimina un cliente del CRM. */
  removeCustomer: (id: string) => void;
  salesHistory: SalesHistory[];
  toasts: Toast[];
  triggerToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  kpiStats: KpiStats;
  /** Mozo: toma (o completa) la comanda de una mesa y la envía a cocina en tiempo real. */
  sendOrderToKitchen: (tableName: string, nombreComensal: string | undefined, items: OrderItem[]) => Promise<boolean>;
  /** Ajusta la cantidad de un ítem YA enviado de una mesa (edición post-envío). Si llega a 0, se quita. */
  updateTableItemQty: (tableName: string, pedidoItemId: string, delta: number) => Promise<void>;
  /** Quita por completo un ítem ya enviado de una mesa. */
  removeTableItem: (tableName: string, pedidoItemId: string) => Promise<void>;
  /** Cancela la comanda completa de una mesa y la libera. */
  cancelTableOrder: (tableName: string) => Promise<void>;
  /** El mozo confirma un pedido que armó el cliente por QR — recién ahí se manda a cocina. */
  confirmarPedidoCliente: (tableName: string) => Promise<void>;
  /** Pedidos que no ocupan mesa (para llevar / delivery), pendientes de cobro. Vienen del backend real. */
  activeOrders: ActiveOrder[];
  activeOrdersLoading: boolean;
  /** Crea un pedido para llevar o delivery contra el backend y lo envía a cocina en tiempo real. */
  createOrder: (
    type: 'llevar' | 'delivery',
    info: { customer: string; phone?: string; address?: string },
    items: OrderItem[]
  ) => Promise<ActiveOrder | null>;
  /** Agrega ítems adicionales a un pedido de llevar/delivery ya creado. */
  addItemsToActiveOrder: (orderId: string, items: OrderItem[]) => Promise<boolean>;
  /** Ajusta la cantidad de un ítem YA enviado de un pedido de llevar/delivery. Si llega a 0, se quita. */
  updateActiveOrderItemQty: (orderId: string, pedidoItemId: string, delta: number) => Promise<void>;
  /** Quita por completo un ítem ya enviado de un pedido de llevar/delivery. */
  removeActiveOrderItem: (orderId: string, pedidoItemId: string) => Promise<void>;
  /** Cancela por completo un pedido de llevar/delivery activo (antes de cobrarlo). */
  cancelActiveOrder: (orderId: string) => Promise<void>;
  /** El mozo confirma un pedido de llevar/delivery armado por el cliente — recién ahí se manda a cocina. */
  confirmarActiveOrder: (orderId: string) => Promise<void>;
  /** Cobra un pedido para llevar / delivery (o una parte, en cuentas separadas) registrando la venta real en el backend. */
  chargeOrder: (orderId: string, input: ChargeInput) => Promise<SalesHistory | null>;
  /** Cajero: cobra el consumo de una mesa (o una parte, en cuentas separadas) registrando la venta real en el backend. */
  chargeTable: (tableName: string, input: ChargeInput) => Promise<SalesHistory | null>;
  /** Reserva o libera una mesa disponible (no toca consumo). */
  setTableStatus: (tableId: string, status: 'disponible' | 'reservada') => Promise<void>;
  /* ── Caja ── */
  cashSession: CashSession | null;
  cajaHistory: CashSession[];
  cajaLoading: boolean;
  isCajaOpen: boolean;
  /** ¿Hay caja abierta en el local, de cualquier cajero? Úsalo para gates de acceso (ej. mozos); `isCajaOpen` es el turno propio. */
  sucursalCajaAbierta: boolean;
  /** Turno abierto en el local (de cualquier cajero), con sus datos — null si no hay ninguno. */
  sucursalTurnoActivo: TurnoCajaDto | null;
  /** true si ese turno quedó abierto desde un día calendario anterior (se olvidaron de cerrarlo). */
  sucursalTurnoStale: boolean;
  cajaExpectedCash: number;
  openCaja: (openingAmount: number, by: string) => Promise<void>;
  closeCaja: (countedAmount: number, by: string) => Promise<CashSession | null>;
  addCashMovement: (type: CashMovementType, amount: number, reason: string, by: string) => Promise<void>;
  loadCajaHistory: (desde: string, hasta: string) => Promise<void>;
  /** Admin: cierra un turno ajeno que quedó pendiente (stale) para desbloquear la apertura de uno nuevo. */
  cerrarTurnoAjeno: (turnoId: number, countedAmount: number, by: string) => Promise<void>;
  addManualSale: (sale: SalesHistory) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: authSession } = useSession();
  const isMozo = authSession?.user?.role?.trim().toLowerCase() === 'mozo';
  const isAdmin = authSession?.user?.role?.trim().toLowerCase() === 'admin';
  const token = authSession?.accessToken;
  const cajeroId = authSession?.user?.id ? Number(authSession.user.id) : undefined;

  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [salesHistory, setSalesHistory] = useState<SalesHistory[]>(INITIAL_SALES_HISTORY);
  const [searchQuery, setSearchQuery] = useState('');

  const { toasts, triggerToast, dismissToast } = useToasts();
  const caja = useCajaTurno(triggerToast);
  const { metodosPago, metodosEntrega, igvPorcentaje, negocioConfigLoading, refreshNegocioConfig } = useNegocioConfig();
  const {
    tables, setTables, mesasLoading, loadMesas, addTable, removeTable, setTableStatus,
    mergeTables: mergeTablesBackend, unmergeTable: unmergeTableBackend,
    sendOrderToKitchen, updateTableItemQty, removeTableItem, cancelTableOrder,
    confirmarPedidoCliente,
  } = useMesasCatalogo(triggerToast);
  const {
    activeOrders, activeOrdersLoading, loadActiveOrders, createActiveOrder, addItemsToActiveOrder,
    updateActiveOrderItemQty, removeActiveOrderItem, cancelActiveOrder,
    confirmarActiveOrder,
  } = useActiveOrders(triggerToast);

  /* Aviso en vivo a todo mozo: cuando cocina marca un pedido como "listo", cualquiera puede recogerlo y servirlo. */
  const onPedidoListoParaMozo = useCallback((pedido: PedidoDto) => {
    if (pedido.estado === 'listo' && isMozo) {
      triggerToast(`🔔 ${pedidoLabel(pedido)} lista para servir.`, 'info');
    }
  }, [isMozo, triggerToast]);
  usePedidoEvents(onPedidoListoParaMozo);

  /* Aviso en vivo a todo mozo/admin: el cliente armó (o completó) un pedido por el menú público
     (mesa, llevar o delivery) y hay que revisarlo/confirmarlo antes de que se mande a cocina. */
  const onPedidoPorConfirmar = useCallback((pedido: PedidoDto) => {
    if (pedido.estado === 'pendiente_confirmacion') {
      triggerToast(`🔔 ${pedidoLabel(pedido)} — pedido nuevo del cliente, ve a confirmarlo.`, 'warning');
    }
  }, [triggerToast]);
  usePedidoEvents(onPedidoPorConfirmar);

  /* Aviso en vivo al admin: un mozo agregó, eliminó o unió/separó mesas del salón. */
  const onMesaEventoParaAdmin = useCallback((event: MesaEvent) => {
    if (!isAdmin) return;
    switch (event.type) {
      case 'creada':
        triggerToast(`🔔 Se agregó la Mesa ${event.mesa.numero}.`, 'info');
        break;
      case 'eliminada':
        triggerToast('🔔 Se eliminó una mesa del salón.', 'info');
        break;
      case 'grupo':
        triggerToast(
          event.mesas.some(m => m.grupoId)
            ? `🔔 Se unieron ${event.mesas.length} mesas.`
            : '🔔 Se separó un grupo de mesas.',
          'info'
        );
        break;
    }
  }, [isAdmin, triggerToast]);
  useMesaEvents(onMesaEventoParaAdmin);

  const kpiStats = useMemo<KpiStats>(() => {
    const historicalTotal = salesHistory.reduce((sum, item) => sum + item.total, 0);
    const activeTablesTotal = tables
      .filter(t => t.status === 'ocupada')
      .reduce((sum, t) => sum + t.cuenta, 0);

    const totalVentasDia = historicalTotal + activeTablesTotal;
    const occupiedCount = tables.filter(t => t.status === 'ocupada').length;
    const pedidosActivos = occupiedCount + activeOrders.length;
    const ticketPromedio =
      totalVentasDia / (salesHistory.length + occupiedCount || 1);

    return {
      ventasDia: totalVentasDia,
      ventasMes: totalVentasDia * 25.8 + 84500,
      pedidosActivos,
      ticketPromedio,
      clientesAtendidos: customers.length + 42,
    };
  }, [salesHistory, tables, activeOrders, customers]);

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

  /* ── CAJERO: cobrar el consumo de la mesa (venta real contra el backend) ──
     El backend calcula subtotal/IGV desde los ítems reales del pedido, marca la sesión
     pagada y libera la mesa automáticamente cuando se cubre todo lo pendiente (soporta
     cuentas divididas por ítem) — acá solo se arma el DTO y se refleja el resultado. */
  const chargeTable = useCallback(
    async (tableName: string, input: ChargeInput): Promise<SalesHistory | null> => {
      if (!caja.cashSession || caja.cashSession.status !== 'abierta' || !caja.cashSession.turnoId) {
        triggerToast('No se puede cobrar: la caja está cerrada.', 'error');
        return null;
      }
      if (!token || !cajeroId) {
        triggerToast('Sesión expirada.', 'error');
        return null;
      }
      const table = tables.find(t => t.name === tableName);
      if (!table || table.status !== 'ocupada' || table.cuenta <= 0) {
        triggerToast('La mesa no tiene consumo pendiente por cobrar.', 'warning');
        return null;
      }
      if (!table.sesionMesaId) {
        triggerToast('Esta mesa no tiene una sesión activa en el sistema.', 'error');
        return null;
      }
      if (input.chargeItems.length === 0) {
        triggerToast('Selecciona al menos un ítem para cobrar.', 'warning');
        return null;
      }

      const amount = input.amount ?? table.cuenta;
      const itemsCount = input.itemsCount ?? (table.items ?? []).reduce((sum, i) => sum + i.quantity, 0);

      try {
        const venta = await crearVenta(token, {
          sesionMesaId: table.sesionMesaId,
          cajeroId,
          turnoId: caja.cashSession.turnoId,
          items: input.chargeItems.map(i => ({ pedidoItemId: i.pedidoItemId, cantidad: i.cantidad })),
          descuento: 0,
          propina: 0,
          metodoPago: PAYMENT_TO_BACKEND[input.method],
          montoRecibido: input.received ?? null,
          tipoComprobante: DOC_TYPE_TO_BACKEND[input.docType],
          tipoDoc: input.customerDoc ? (input.customerDoc.type === 'RUC' ? 'ruc' : 'dni') : null,
          numDoc: input.customerDoc?.number ?? null,
          razonSocial: input.customerDoc?.name ?? null,
        });

        const sale: SalesHistory = {
          id: String(venta.id),
          time: new Date(venta.pagadoAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          itemsCount,
          paymentMethod: input.method,
          total: venta.total,
          table: tableName,
          docType: input.docType,
          // El comprobanteId real (Nº de boleta/factura ante SUNAT) todavía no se emite — ver /api/emitir-comprobante.
          comprobante: venta.comprobanteId ?? undefined,
          waiter: table.waiter,
          cashier: input.cashier,
          customerDoc: input.customerDoc,
          received: input.received,
          change: venta.vuelto ?? undefined,
        };

        setSalesHistory(prev => [sale, ...prev]);
        /* Refresca la mesa (cuenta/ítems restantes) tanto si quedó parcialmente cobrada como si se
           cerró del todo — sin esto, un cobro "por ítems" parcial deja el tablero desactualizado y
           permite reintentar cobrar ítems que el backend ya facturó (error 400). */
        await Promise.all([loadMesas(), caja.refreshResumen()]);

        const docLabel = input.docType === 'Nota de venta' ? 'Nota de venta' : `${input.docType} (pendiente de N° SUNAT)`;
        triggerToast(
          `Cobro de S/. ${amount.toFixed(2)} (${input.method}). ${docLabel}${venta.tipo === 'split' ? ' · cuenta parcial' : ''}.`,
          'success'
        );
        return sale;
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo registrar el cobro.', 'error');
        return null;
      }
    },
    [triggerToast, caja.cashSession, caja.refreshResumen, tables, token, cajeroId, loadMesas]
  );

  /* ── Plano de mesas: reubicar/unir (solo visual, no persiste en backend) ── */
  const moveTable = useCallback((tableId: string, x: number, y: number) => {
    setTables(prev => prev.map(t => (t.id === tableId ? { ...t, x, y } : t)));
  }, [setTables]);

  /* Unir/separar mesas persiste en el backend (grupoId real) y se notifica en vivo por WebSocket;
     acá solo se reacomoda la posición en el plano tras confirmarse (eso sí es puramente visual). */
  const mergeTables = useCallback(
    async (tableIds: string[]) => {
      if (tableIds.length < 2) {
        triggerToast('Selecciona al menos dos mesas para unir.', 'warning');
        return;
      }
      const selected = tables.filter(t => tableIds.includes(t.id));
      if (selected.some(t => t.status !== 'disponible')) {
        triggerToast('Solo se pueden unir mesas disponibles (sin consumo).', 'error');
        return;
      }
      await mergeTablesBackend(tableIds);
      /* Ordena de izq. a der. y las alinea en fila para que se vean como una sola mesa. */
      const ordered = [...selected].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
      const bx = ordered[0].x ?? 24;
      const by = ordered[0].y ?? 24;
      const rowIndex = new Map(ordered.map((t, i) => [t.id, i]));
      setTables(prev =>
        prev.map(t =>
          rowIndex.has(t.id)
            ? { ...t, x: bx + rowIndex.get(t.id)! * 74, y: by }
            : t
        )
      );
    },
    [tables, triggerToast, setTables, mergeTablesBackend]
  );

  const unmergeTable = useCallback(
    async (groupId: string) => {
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
      await unmergeTableBackend(groupId);
      setTables(prev =>
        prev.map(t =>
          idx.has(t.id)
            ? { ...t, x: bx + idx.get(t.id)! * 100, y: by }
            : t
        )
      );
    },
    [tables, triggerToast, setTables, unmergeTableBackend]
  );

  /* ── Pedidos para llevar / delivery ───────────────────────── */
  /** Crea el pedido en el backend y lo manda a cocina en tiempo real. */
  const createOrder = useCallback(
    async (type: 'llevar' | 'delivery', info: { customer: string; phone?: string; address?: string }, items: OrderItem[]) => {
      // Ojo: se valida contra la caja del LOCAL (cualquier cajero), no la personal del usuario
      // logueado — un mozo nunca abre su propia caja, pero sí puede tomar pedidos mientras
      // el cajero/admin la tenga abierta. Ver caja.sucursalCajaAbierta.
      if (!caja.sucursalCajaAbierta) {
        triggerToast('La caja está cerrada. No se pueden tomar pedidos hasta aperturarla.', 'error');
        return null;
      }
      return createActiveOrder(type, info, items);
    },
    [caja.sucursalCajaAbierta, triggerToast, createActiveOrder]
  );

  /** Igual que chargeTable pero para pedidos llevar/delivery — misma venta real de backend,
   *  la sesión detrás del pedido (sesionMesaId) no tiene mesa física asociada. */
  const chargeOrder = useCallback(
    async (orderId: string, input: ChargeInput): Promise<SalesHistory | null> => {
      if (!caja.cashSession || caja.cashSession.status !== 'abierta' || !caja.cashSession.turnoId) {
        triggerToast('No se puede cobrar: la caja está cerrada.', 'error');
        return null;
      }
      if (!token || !cajeroId) {
        triggerToast('Sesión expirada.', 'error');
        return null;
      }
      const order = activeOrders.find(o => o.id === orderId);
      if (!order) {
        triggerToast('El pedido ya no está disponible.', 'warning');
        return null;
      }
      if (!order.sesionMesaId) {
        triggerToast('Este pedido no tiene una sesión activa en el sistema.', 'error');
        return null;
      }
      if (input.chargeItems.length === 0) {
        triggerToast('Selecciona al menos un ítem para cobrar.', 'warning');
        return null;
      }

      const amount = input.amount ?? order.total;
      const itemsCount = input.itemsCount ?? order.itemsCount;

      try {
        const venta = await crearVenta(token, {
          sesionMesaId: order.sesionMesaId,
          cajeroId,
          turnoId: caja.cashSession.turnoId,
          items: input.chargeItems.map(i => ({ pedidoItemId: i.pedidoItemId, cantidad: i.cantidad })),
          descuento: 0,
          propina: 0,
          metodoPago: PAYMENT_TO_BACKEND[input.method],
          montoRecibido: input.received ?? null,
          tipoComprobante: DOC_TYPE_TO_BACKEND[input.docType],
          tipoDoc: input.customerDoc ? (input.customerDoc.type === 'RUC' ? 'ruc' : 'dni') : null,
          numDoc: input.customerDoc?.number ?? null,
          razonSocial: input.customerDoc?.name ?? null,
        });

        const sale: SalesHistory = {
          id: String(venta.id),
          time: new Date(venta.pagadoAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          itemsCount,
          paymentMethod: input.method,
          total: venta.total,
          table: order.type === 'llevar' ? `Para llevar (${order.id})` : `Delivery (${order.id})`,
          docType: input.docType,
          comprobante: venta.comprobanteId ?? undefined,
          waiter: order.waiter,
          cashier: input.cashier,
          customerDoc: input.customerDoc,
          received: input.received,
          change: venta.vuelto ?? undefined,
        };
        setSalesHistory(prev => [sale, ...prev]);
        /* Igual que en chargeTable: refresca el pedido (ítems/total restantes) sin importar si
           quedó parcialmente cobrado o se cerró del todo. */
        await Promise.all([loadActiveOrders(), caja.refreshResumen()]);

        const docLabel = input.docType === 'Nota de venta' ? 'Nota de venta' : `${input.docType} (pendiente de N° SUNAT)`;
        triggerToast(
          `Cobro de ${order.id} · S/. ${amount.toFixed(2)} (${input.method}). ${docLabel}${venta.tipo === 'split' ? ' · cuenta parcial' : ''}.`,
          'success'
        );
        return sale;
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo registrar el cobro.', 'error');
        return null;
      }
    },
    [caja.cashSession, caja.refreshResumen, activeOrders, triggerToast, token, cajeroId, loadActiveOrders]
  );

  const addManualSale = useCallback(
    (sale: SalesHistory) => {
      setSalesHistory(prev => [sale, ...prev]);
      caja.setCashSession(prev => prev && prev.status === 'abierta' ? {
        ...prev,
        cashSales:    prev.cashSales    + (sale.paymentMethod === 'Efectivo'    ? sale.total : 0),
        cardSales:    prev.cardSales    + (sale.paymentMethod === 'Tarjeta'     ? sale.total : 0),
        digitalSales: prev.digitalSales + (sale.paymentMethod === 'Yape / Plin' ? sale.total : 0),
        salesCount:   prev.salesCount + 1,
      } : prev);
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        products,
        metodosPago,
        metodosEntrega,
        igvPorcentaje,
        negocioConfigLoading,
        refreshNegocioConfig,
        tables,
        mesasLoading,
        setTables,
        addTable,
        removeTable,
        moveTable,
        mergeTables,
        unmergeTable,
        customers,
        addCustomer,
        removeCustomer,
        salesHistory,
        toasts,
        triggerToast,
        dismissToast,
        searchQuery,
        setSearchQuery,
        kpiStats,
        sendOrderToKitchen,
        updateTableItemQty,
        removeTableItem,
        cancelTableOrder,
        confirmarPedidoCliente,
        activeOrders,
        activeOrdersLoading,
        createOrder,
        addItemsToActiveOrder,
        updateActiveOrderItemQty,
        removeActiveOrderItem,
        cancelActiveOrder,
        confirmarActiveOrder,
        chargeOrder,
        chargeTable,
        setTableStatus,
        cashSession: caja.cashSession,
        cajaHistory: caja.cajaHistory,
        cajaLoading: caja.cajaLoading,
        isCajaOpen: caja.isCajaOpen,
        sucursalCajaAbierta: caja.sucursalCajaAbierta,
        sucursalTurnoActivo: caja.sucursalTurnoActivo,
        sucursalTurnoStale: caja.sucursalTurnoStale,
        cajaExpectedCash: caja.cajaExpectedCash,
        openCaja: caja.openCaja,
        closeCaja: caja.closeCaja,
        addCashMovement: caja.addCashMovement,
        loadCajaHistory: caja.loadCajaHistory,
        cerrarTurnoAjeno: caja.cerrarTurnoAjeno,
        addManualSale,
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
