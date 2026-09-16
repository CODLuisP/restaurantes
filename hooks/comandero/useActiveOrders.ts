'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { ActiveOrder, OrderItem, OrderType, Toast } from '@/types';
import { ApiError } from '@/lib/api/client';
import {
  getSesionesActivasTablero, crearSesionMesa, cerrarSesionMesa,
  type SesionActivaTableroDto, type SesionMesaDto,
} from '@/lib/api/sesionesMesa';
import {
  getPedidoById, getPedidoBySesion, crearPedido, agregarItemsPedido,
  actualizarItemPedido, eliminarItemPedido, cancelarPedido, confirmarPedido, marcarPedidoEntregado, type PedidoDto,
} from '@/lib/api/pedidos';
import { usePedidoEvents } from '@/hooks/realtime/usePedidoEvents';
import { useSesionCerradaEvents, type SesionCerradaPayload } from '@/hooks/realtime/useSesionCerradaEvents';
import { restarFacturado } from '@/lib/api/ventas';
import { parseCartLineId } from '@/lib/cart/cartLineId';

/** Ítems del pedido → OrderItem, usando el id de la FILA (pedido_item) como product.id
 *  para que actualizar/quitar un ítem ya enviado apunte al recurso correcto del backend. */
function mapPedidoItems(pedido: PedidoDto | null): OrderItem[] {
  return (pedido?.items ?? [])
    .filter(i => i.estado !== 'cancelado')
    .map(i => ({
      product: {
        id: String(i.id),
        name: i.productoNombre
          ? (i.varianteNombre ? `${i.productoNombre} (${i.varianteNombre})` : i.productoNombre)
          : i.comboNombre ?? i.varianteNombre ?? 'Producto',
        price: i.precioUnitario,
        category: '',
        image: '',
        status: 'available',
        stock: 999,
        sku: '',
        unit: 'Porción',
      },
      quantity: i.cantidad,
      kitchenEstado: i.estado,
    }));
}

function pedidoToFields(pedido: PedidoDto, facturado: Map<string, number> = new Map()) {
  const items = restarFacturado(mapPedidoItems(pedido), facturado);
  const total = items.reduce((a, it) => a + it.product.price * it.quantity, 0);
  const itemsCount = items.reduce((a, it) => a + it.quantity, 0);
  return { items, total, itemsCount, pedidoId: pedido.id, pedidoEstado: pedido.estado };
}

/** Para un pedido recién creado (sesión + pedido sueltos, sin pasar por el tablero) — nada
 *  facturado todavía, así que no necesita el mapa de facturado. */
function sesionPedidoToActiveOrder(sesion: SesionMesaDto, pedido: PedidoDto): ActiveOrder {
  const { items, total, itemsCount, pedidoEstado } = pedidoToFields(pedido);
  return {
    id: String(pedido.id),
    type: sesion.tipo === 'delivery' ? 'delivery' : 'llevar',
    sesionMesaId: sesion.id,
    pedidoId: pedido.id,
    pedidoEstado,
    customer: sesion.nombreCliente?.trim() || (sesion.tipo === 'delivery' ? 'Cliente delivery' : 'Cliente mostrador'),
    phone: sesion.delivery?.telefono || undefined,
    address: sesion.delivery?.direccion || undefined,
    items,
    total,
    itemsCount,
    waiter: pedido.mozoNombre ?? sesion.mozoNombre ?? undefined,
    createdAt: new Date(sesion.abiertaAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  };
}

function sesionTableroToActiveOrder(sesion: SesionActivaTableroDto): ActiveOrder {
  const facturado = new Map(Object.entries(sesion.facturado));
  const { items, total, itemsCount, pedidoEstado } = pedidoToFields(
    sesion.pedido ?? { id: 0, sesionMesaId: sesion.id, origen: '', estado: '', createdAt: '', items: [] },
    facturado
  );
  return {
    id: String(sesion.pedido?.id ?? `sesion-${sesion.id}`),
    type: sesion.tipo === 'delivery' ? 'delivery' : 'llevar',
    sesionMesaId: sesion.id,
    pedidoId: sesion.pedido?.id,
    pedidoEstado: sesion.pedido ? pedidoEstado : undefined,
    customer: sesion.nombreCliente?.trim() || (sesion.tipo === 'delivery' ? 'Cliente delivery' : 'Cliente mostrador'),
    phone: sesion.delivery?.telefono || undefined,
    address: sesion.delivery?.direccion || undefined,
    items,
    total,
    itemsCount,
    waiter: sesion.pedido?.mozoNombre ?? sesion.mozoNombre ?? undefined,
    createdAt: new Date(sesion.abiertaAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Pedidos activos "para llevar" y "delivery" contra el backend real (SesionesMesa + Pedidos).
 * Se usa tanto en el Comandero (tomar/editar pedidos) como en Cobrar (cobrarlos y cerrarlos).
 */
export function useActiveOrders(triggerToast: (message: string, type?: Toast['type']) => void) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;
  const mozoId = authSession?.user?.id ? Number(authSession.user.id) : undefined;
  const isSuperAdmin = authSession?.user?.role === 'superadmin';
  const sucursalId = authSession?.user?.sucursalId ?? undefined;

  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [activeOrdersLoading, setActiveOrdersLoading] = useState(true);

  /** `silent`: recarga en segundo plano (disparada por el WebSocket) sin mostrar de nuevo el
   *  spinner de carga completa — evita el "parpadeo" de refresco en cada evento en tiempo real.
   *
   *  2 requests (uno por tipo), cada uno ya con pedido + facturado resuelto server-side — antes
   *  eran 2 (sesiones) + N (pedido de cada una) + N (ventas de cada una), la misma causa de lentitud
   *  que en el tablero de mesas (ver useMesasCatalogo.loadMesas). */
  const loadActiveOrders = useCallback(async (opts?: { silent?: boolean }) => {
    if (!token) { setActiveOrdersLoading(false); return; }
    // Superadmin no tiene sucursal fija y no opera Comandero/Despachar — nada que cargar aquí.
    if (isSuperAdmin && !sucursalId) { setActiveOrders([]); setActiveOrdersLoading(false); return; }
    if (!opts?.silent) setActiveOrdersLoading(true);
    try {
      const [llevar, delivery] = await Promise.all([
        getSesionesActivasTablero(token, 'para_llevar', sucursalId),
        getSesionesActivasTablero(token, 'delivery', sucursalId),
      ]);
      setActiveOrders([...llevar, ...delivery].map(sesionTableroToActiveOrder));
    } catch {
      if (!opts?.silent) triggerToast('No se pudieron cargar los pedidos para llevar/delivery.', 'error');
    } finally {
      if (!opts?.silent) setActiveOrdersLoading(false);
    }
  }, [token, isSuperAdmin, sucursalId, triggerToast]);

  useEffect(() => { loadActiveOrders(); }, [loadActiveOrders]);

  /* Tiempo real: cualquier pedido llevar/delivery de la sucursal que cambie refresca la lista
     (pedidos nuevos del menú público, items agregados, cancelaciones, etc.) de forma silenciosa. */
  const handlePedidoEvent = useCallback((pedido: PedidoDto) => {
    if (pedido.sesionTipo === 'para_llevar' || pedido.sesionTipo === 'delivery') loadActiveOrders({ silent: true });
  }, [loadActiveOrders]);
  usePedidoEvents(handlePedidoEvent);

  /* Tiempo real: si el cajero cobra un pedido llevar/delivery (permitido antes de entregarse),
     su sesión se cierra en el backend y debe desaparecer de esta lista al instante, sin esperar
     a que alguien recargue el Comandero. */
  const handleSesionCerrada = useCallback((payload: SesionCerradaPayload) => {
    setActiveOrders(prev => prev.filter(o => o.sesionMesaId !== payload.sesionId));
  }, []);
  useSesionCerradaEvents(handleSesionCerrada);

  const createActiveOrder = useCallback(
    async (type: Extract<OrderType, 'llevar' | 'delivery'>, info: { customer: string; phone?: string; address?: string }, items: OrderItem[]) => {
      if (!token || !mozoId) { triggerToast('Sesión expirada.', 'error'); return null; }
      if (items.length === 0) { triggerToast('El pedido está vacío. Agregue platos antes de enviar.', 'warning'); return null; }
      if (type === 'delivery' && !info.address?.trim()) { triggerToast('Ingresa la dirección de entrega.', 'warning'); return null; }

      try {
        const sesion = await crearSesionMesa(token, {
          tipo: type === 'llevar' ? 'para_llevar' : 'delivery',
          mozoId,
          sucursalId,
          nombreCliente: info.customer.trim() || undefined,
          numComensales: 1,
          delivery: type === 'delivery' ? { telefono: info.phone?.trim() || '', direccion: info.address!.trim() } : undefined,
        });
        const pedido = await crearPedido(token, {
          sesionMesaId: sesion.id,
          mozoId,
          origen: 'mozo',
          items: items.map(i => {
            const { productoId, varianteId, extraIds } = parseCartLineId(i.product.id);
            return { productoId, varianteId, extraIds, cantidad: i.quantity };
          }),
        });
        const order = sesionPedidoToActiveOrder(sesion, pedido);
        setActiveOrders(prev => [order, ...prev]);
        triggerToast(`Pedido ${type === 'llevar' ? 'para llevar' : 'delivery'} enviado a cocina.`, 'success');
        return order;
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo crear el pedido.', 'error');
        return null;
      }
    },
    [token, mozoId, sucursalId, triggerToast]
  );

  /** Igual que sendOrderToKitchen (mesas): si el pedido YA estaba "pendiente_confirmacion" (armado
   *  por el cliente vía QR, nunca confirmado explícitamente), agregar un ítem lo saca de ese estado
   *  como efecto secundario en el backend — devuelve esa señal + el pedido completo para que el
   *  llamador imprima TODO (platos originales + el nuevo), no solo lo recién agregado. */
  const addItemsToActiveOrder = useCallback(
    async (orderId: string, items: OrderItem[]): Promise<{ ok: boolean; pedido?: PedidoDto; eraPendienteConfirmacion?: boolean }> => {
      if (!token) { triggerToast('Sesión expirada.', 'error'); return { ok: false }; }
      if (items.length === 0) { triggerToast('Agregue platos antes de enviar.', 'warning'); return { ok: false }; }
      const order = activeOrders.find(o => o.id === orderId);
      if (!order?.pedidoId) { triggerToast('El pedido ya no está disponible.', 'warning'); return { ok: false }; }
      const eraPendienteConfirmacion = order.pedidoEstado === 'pendiente_confirmacion';

      try {
        const pedido = await agregarItemsPedido(token, order.pedidoId, items.map(i => {
          const { productoId, varianteId, extraIds } = parseCartLineId(i.product.id);
          return { productoId, varianteId, extraIds, cantidad: i.quantity };
        }));
        setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...pedidoToFields(pedido) } : o));
        triggerToast('Se agregaron platos al pedido y se enviaron a cocina.', 'success');
        return { ok: true, pedido, eraPendienteConfirmacion };
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudieron agregar los platos.', 'error');
        return { ok: false };
      }
    },
    [token, activeOrders, triggerToast]
  );

  const updateActiveOrderItemQty = useCallback(
    async (orderId: string, pedidoItemId: string, delta: number) => {
      if (!token) return;
      const order = activeOrders.find(o => o.id === orderId);
      const current = order?.items.find(i => i.product.id === pedidoItemId);
      if (!order?.pedidoId || !current) return;

      const newQty = current.quantity + delta;
      try {
        if (newQty <= 0) await eliminarItemPedido(token, Number(pedidoItemId));
        else await actualizarItemPedido(token, Number(pedidoItemId), { cantidad: newQty });

        const refreshed = await getPedidoById(token, order.pedidoId);
        setActiveOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, ...pedidoToFields(refreshed) } : o)
              .filter(o => o.id !== orderId || o.items.length > 0)
        );
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el ítem.', 'error');
      }
    },
    [token, activeOrders, triggerToast]
  );

  const removeActiveOrderItem = useCallback(
    async (orderId: string, pedidoItemId: string) => {
      if (!token) return;
      const order = activeOrders.find(o => o.id === orderId);
      if (!order?.pedidoId) return;

      try {
        await eliminarItemPedido(token, Number(pedidoItemId));
        const refreshed = await getPedidoById(token, order.pedidoId);
        setActiveOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, ...pedidoToFields(refreshed) } : o)
              .filter(o => o.id !== orderId || o.items.length > 0)
        );
        triggerToast('Ítem quitado del pedido.', 'info');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo quitar el ítem.', 'error');
      }
    },
    [token, activeOrders, triggerToast]
  );

  /** El mozo confirma un pedido que armó el cliente por el menú público: recién ahí se manda a cocina.
   *  Devuelve el pedido confirmado (con sus items) para que, con "Impresora en cocina" activo, el
   *  llamador pueda imprimir la comanda — si no, esos platos nunca salían impresos. */
  const confirmarActiveOrder = useCallback(
    async (orderId: string): Promise<PedidoDto | null> => {
      if (!token) return null;
      const order = activeOrders.find(o => o.id === orderId);
      if (!order?.pedidoId) return null;
      try {
        const pedido = await confirmarPedido(token, order.pedidoId);
        await loadActiveOrders();
        triggerToast(`Pedido ${order.id} confirmado y enviado a cocina.`, 'success');
        return pedido;
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo confirmar el pedido.', 'error');
        return null;
      }
    },
    [token, activeOrders, triggerToast, loadActiveOrders]
  );

  /** Marca el pedido llevar/delivery como entregado de un solo golpe — para "Impresora en cocina",
   *  donde no hay KDS que lo vaya avanzando de a poco. */
  const marcarActiveOrderEntregado = useCallback(
    async (orderId: string) => {
      if (!token) return;
      const order = activeOrders.find(o => o.id === orderId);
      if (!order?.pedidoId) return;
      try {
        await marcarPedidoEntregado(token, order.pedidoId);
        await loadActiveOrders();
        triggerToast(`Pedido ${order.id} marcado como entregado.`, 'success');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo marcar el pedido como entregado.', 'error');
      }
    },
    [token, activeOrders, triggerToast, loadActiveOrders]
  );

  const cancelActiveOrder = useCallback(
    async (orderId: string) => {
      if (!token) return;
      const order = activeOrders.find(o => o.id === orderId);
      if (!order?.pedidoId || !order.sesionMesaId) return;

      try {
        await cancelarPedido(token, order.pedidoId);
        await cerrarSesionMesa(token, order.sesionMesaId);
        setActiveOrders(prev => prev.filter(o => o.id !== orderId));
        triggerToast('Pedido cancelado.', 'info');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo cancelar el pedido.', 'error');
      }
    },
    [token, activeOrders, triggerToast]
  );

  /** Al cobrarlo (fuera de este hook) el pedido ya se sirvió: solo cerramos la sesión, sin cancelar ítems. */
  const closeActiveOrderAfterCharge = useCallback(
    async (orderId: string) => {
      if (!token) return;
      const order = activeOrders.find(o => o.id === orderId);
      setActiveOrders(prev => prev.filter(o => o.id !== orderId));
      if (!order?.sesionMesaId) return;
      try {
        await cerrarSesionMesa(token, order.sesionMesaId);
      } catch {
        /* best-effort: si falla, la sesión queda abierta en el backend aunque ya no se muestre aquí */
      }
    },
    [token, activeOrders]
  );

  return {
    activeOrders, activeOrdersLoading, loadActiveOrders,
    createActiveOrder, addItemsToActiveOrder, updateActiveOrderItemQty,
    removeActiveOrderItem, cancelActiveOrder, closeActiveOrderAfterCharge, confirmarActiveOrder,
    marcarActiveOrderEntregado,
  };
}
