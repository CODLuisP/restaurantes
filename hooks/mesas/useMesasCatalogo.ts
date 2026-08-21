'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Table, OrderItem, Toast } from '@/types';
import { ApiError } from '@/lib/api/client';
import { createMesa, deleteMesa, getMesasEstado, setMesaEstado, type MesaEstadoDto, type MesaEstado } from '@/lib/api/mesas';
import {
  getPedidoBySesion, crearPedido, agregarItemsPedido,
  actualizarItemPedido, eliminarItemPedido, cancelarPedido, confirmarPedido, type PedidoDto,
} from '@/lib/api/pedidos';
import { crearSesionMesa, cerrarSesionMesa } from '@/lib/api/sesionesMesa';
import { usePedidoEvents } from '@/hooks/realtime/usePedidoEvents';
import { useSesionCerradaEvents, type SesionCerradaPayload } from '@/hooks/realtime/useSesionCerradaEvents';

const ESTADO_TO_STATUS: Record<MesaEstado, Table['status']> = {
  libre: 'disponible',
  ocupada: 'ocupada',
  reservada: 'reservada',
};

/** Ítems del pedido → OrderItem, usando el id de la FILA (pedido_item) como product.id
 *  para que actualizar/quitar un ítem ya enviado apunte al recurso correcto del backend. */
function mapPedidoItems(pedido: PedidoDto | null): OrderItem[] {
  return (pedido?.items ?? [])
    .filter(i => i.estado !== 'cancelado')
    .map(i => ({
      product: {
        id: String(i.id),
        name: i.productoNombre ?? i.comboNombre ?? i.varianteNombre ?? 'Producto',
        price: i.precioUnitario,
        category: '',
        image: '',
        status: 'available',
        stock: 999,
        sku: '',
        unit: 'Porción',
      },
      quantity: i.cantidad,
    }));
}

function mesaEstadoToTable(mesa: MesaEstadoDto, pedido: PedidoDto | null): Table {
  const items = mapPedidoItems(pedido);
  const cuenta = items.reduce((a, i) => a + i.product.price * i.quantity, 0);
  return {
    id: String(mesa.mesaId),
    name: String(mesa.numero),
    ubicacion: mesa.ubicacion ?? '',
    capacidad: mesa.capacidad,
    status: ESTADO_TO_STATUS[mesa.estado],
    cuenta,
    items,
    waiter: pedido?.mozoNombre ?? undefined,
    sesionMesaId: mesa.sesionId ?? undefined,
    pedidoId: pedido?.id,
    pedidoEstado: pedido?.estado,
    nombreCliente: mesa.nombreCliente ?? undefined,
  };
}

/**
 * Mesas contra el backend real: catálogo (admin crea/elimina), ocupación y comandas.
 * Tomar/editar/cancelar un pedido en mesa crea o actualiza una SesionMesa + Pedido reales,
 * y se refresca en vivo (WebSocket) cuando cocina o cualquier otro mozo lo modifica.
 */
export function useMesasCatalogo(triggerToast: (message: string, type?: Toast['type']) => void) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;
  const mozoId = authSession?.user?.id ? Number(authSession.user.id) : undefined;
  const sucursalId = authSession?.user?.sucursalId ?? undefined;

  const [tables, setTables] = useState<Table[]>([]);
  const [mesasEstado, setMesasEstado] = useState<MesaEstadoDto[]>([]);
  const [mesasLoading, setMesasLoading] = useState(true);

  const loadMesas = useCallback(async () => {
    if (!token) { setMesasLoading(false); return; }
    setMesasLoading(true);
    try {
      const mesas = await getMesasEstado(token, sucursalId);
      setMesasEstado(mesas);
      const pedidos = await Promise.all(
        mesas.map(m => (m.sesionId ? getPedidoBySesion(token, m.sesionId).catch(() => null) : Promise.resolve(null)))
      );
      setTables(prev => {
        const prevById = new Map(prev.map(t => [t.id, t]));
        return mesas.map((m, i) => {
          const built = mesaEstadoToTable(m, pedidos[i]);
          const local = prevById.get(built.id);
          // x/y/groupId son puramente decorativos (unir mesas en el plano) y no vienen del backend.
          return local ? { ...built, x: local.x, y: local.y, groupId: local.groupId } : built;
        });
      });
    } catch {
      triggerToast('No se pudo cargar el listado de mesas.', 'error');
    } finally {
      setMesasLoading(false);
    }
  }, [token, sucursalId, triggerToast]);

  useEffect(() => { loadMesas(); }, [loadMesas]);

  /* Tiempo real: cualquier pedido de tipo "local" (mesa) que cambie en la sucursal refresca el tablero. */
  const handlePedidoEvent = useCallback((pedido: PedidoDto) => {
    if (pedido.sesionTipo === 'local') loadMesas();
  }, [loadMesas]);
  usePedidoEvents(handlePedidoEvent);

  /* Tiempo real: si el cajero/admin cobra y libera una mesa desde Cobrar, el mozo la ve libre al instante. */
  const handleSesionCerrada = useCallback((payload: SesionCerradaPayload) => {
    if (payload.mesaId != null) loadMesas();
  }, [loadMesas]);
  useSesionCerradaEvents(handleSesionCerrada);

  const addTable = useCallback(
    async (ubicacion: string, numero: string, capacidad: number) => {
      if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
      const num = parseInt(numero, 10);
      if (!num || num <= 0) { triggerToast('Ingrese un número de mesa válido.', 'warning'); return; }
      try {
        await createMesa(token, { sucursalId, numero: num, capacidad, ubicacion: ubicacion.trim() || null });
        await loadMesas();
        triggerToast(`Mesa ${num} creada.`, 'success');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo crear la mesa.', 'error');
      }
    },
    [token, sucursalId, triggerToast, loadMesas]
  );

  const removeTable = useCallback(
    async (tableId: string) => {
      if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
      try {
        await deleteMesa(token, Number(tableId));
        setTables(prev => prev.filter(t => t.id !== tableId));
        triggerToast('Mesa eliminada.', 'info');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo eliminar la mesa.', 'error');
      }
    },
    [token, triggerToast]
  );

  /** Mozo: envía la comanda de una mesa a cocina. Si ya hay sesión/pedido abiertos, agrega los ítems ahí. */
  const sendOrderToKitchen = useCallback(
    async (tableName: string, nombreComensal: string | undefined, items: OrderItem[]) => {
      if (!token || !mozoId) { triggerToast('Sesión expirada.', 'error'); return false; }
      if (items.length === 0) { triggerToast('La comanda está vacía. Agregue platos antes de enviar.', 'warning'); return false; }

      const mesa = mesasEstado.find(m => String(m.numero) === tableName);
      if (!mesa) { triggerToast('La mesa ya no existe.', 'error'); return false; }

      try {
        let sesionId = mesa.sesionId ?? undefined;
        let pedidoId: number | undefined;

        if (!sesionId) {
          const sesion = await crearSesionMesa(token, {
            mesaId: mesa.mesaId, tipo: 'local', mozoId,
            nombreCliente: nombreComensal?.trim() || undefined, numComensales: 1,
          });
          sesionId = sesion.id;
        } else {
          const pedidoActual = await getPedidoBySesion(token, sesionId).catch(() => null);
          pedidoId = pedidoActual?.id;
        }

        const itemsDto = items.map(i => ({ productoId: Number(i.product.id), cantidad: i.quantity }));
        if (pedidoId) await agregarItemsPedido(token, pedidoId, itemsDto);
        else await crearPedido(token, { sesionMesaId: sesionId, mozoId, origen: 'mozo', items: itemsDto });

        await loadMesas();
        triggerToast(`Comanda de Mesa ${tableName} enviada a cocina.`, 'success');
        return true;
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo enviar la comanda.', 'error');
        return false;
      }
    },
    [token, mozoId, mesasEstado, triggerToast, loadMesas]
  );

  const updateTableItemQty = useCallback(
    async (tableName: string, pedidoItemId: string, delta: number) => {
      if (!token) return;
      const table = tables.find(t => t.name === tableName);
      const current = table?.items?.find(i => i.product.id === pedidoItemId);
      if (!current) return;

      const newQty = current.quantity + delta;
      try {
        if (newQty <= 0) await eliminarItemPedido(token, Number(pedidoItemId));
        else await actualizarItemPedido(token, Number(pedidoItemId), { cantidad: newQty });
        await loadMesas();
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el ítem.', 'error');
      }
    },
    [token, tables, triggerToast, loadMesas]
  );

  const removeTableItem = useCallback(
    async (tableName: string, pedidoItemId: string) => {
      if (!token) return;
      try {
        await eliminarItemPedido(token, Number(pedidoItemId));
        await loadMesas();
        triggerToast('Ítem quitado del pedido.', 'info');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo quitar el ítem.', 'error');
      }
    },
    [token, triggerToast, loadMesas]
  );

  /** El mozo confirma un pedido que armó el cliente por QR: recién ahí se manda a cocina. */
  const confirmarPedidoCliente = useCallback(
    async (tableName: string) => {
      if (!token) return;
      const table = tables.find(t => t.name === tableName);
      if (!table?.pedidoId) return;
      try {
        await confirmarPedido(token, table.pedidoId);
        await loadMesas();
        triggerToast(`Pedido de Mesa ${tableName} confirmado y enviado a cocina.`, 'success');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo confirmar el pedido.', 'error');
      }
    },
    [token, tables, triggerToast, loadMesas]
  );

  /** Cancela toda la comanda de la mesa y libera la mesa (cierra pedido + sesión). */
  const cancelTableOrder = useCallback(
    async (tableName: string) => {
      if (!token) return;
      const table = tables.find(t => t.name === tableName);
      if (!table?.pedidoId || !table.sesionMesaId) return;
      try {
        await cancelarPedido(token, table.pedidoId);
        await cerrarSesionMesa(token, table.sesionMesaId);
        await loadMesas();
        triggerToast(`Pedido de Mesa ${tableName} cancelado. Mesa liberada.`, 'info');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo cancelar el pedido.', 'error');
      }
    },
    [token, tables, triggerToast, loadMesas]
  );

  /** Reservar/liberar una mesa disponible (no toca el consumo; eso solo se libera cobrando o cancelando). */
  const setTableStatus = useCallback(
    async (tableId: string, status: 'disponible' | 'reservada') => {
      if (!token) return;
      try {
        await setMesaEstado(token, Number(tableId), status === 'disponible' ? 'libre' : 'reservada');
        await loadMesas();
        triggerToast(`Mesa marcada como ${status}.`, 'info');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado de la mesa.', 'error');
      }
    },
    [token, triggerToast, loadMesas]
  );

  /** Tras cobrar el consumo de una mesa (fuera de este hook): cierra la sesión real y libera la mesa. */
  const closeTableAfterCharge = useCallback(
    async (tableName: string) => {
      if (!token) return;
      const table = tables.find(t => t.name === tableName);
      setTables(prev => prev.map(t =>
        t.name === tableName
          ? { ...t, status: 'disponible', items: [], cuenta: 0, waiter: undefined, sesionMesaId: undefined, pedidoId: undefined }
          : t
      ));
      if (!table?.sesionMesaId) return;
      try {
        await cerrarSesionMesa(token, table.sesionMesaId);
      } catch {
        /* best-effort: si falla, la sesión queda abierta en el backend aunque ya no se muestre aquí */
      }
    },
    [token, tables]
  );

  return {
    tables, setTables, mesasLoading,
    addTable, removeTable, setTableStatus,
    sendOrderToKitchen, updateTableItemQty, removeTableItem, cancelTableOrder, closeTableAfterCharge,
    confirmarPedidoCliente,
  };
}
