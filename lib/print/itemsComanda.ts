/** Adaptadores a los ítems de la comanda de cocina: todo lo que el mozo envió al pedir
 *  (variante, extras y notas del plato) debe salir impreso, igual que en la pantalla de cocina. */

import type { OrderItem } from '@/types';
import type { PedidoItemDto } from '@/lib/api/pedidos';
import type { TicketOrderData } from './renderTicket';

type ItemComanda = TicketOrderData['items'][number];

/** Ítems de un pedido ya guardado en el backend (nombre + variante, extras y notas aparte). */
export function itemsComandaDePedido(items: PedidoItemDto[]): ItemComanda[] {
  return items.map(i => ({
    nombre: [
      i.productoNombre ?? i.comboNombre ?? 'Producto',
      i.varianteNombre && i.productoNombre ? `(${i.varianteNombre})` : '',
    ].filter(Boolean).join(' '),
    cantidad: i.cantidad,
    precio: i.precioUnitario,
    extras: i.extras.map(e => e.nombre),
    notas: i.notas?.trim() || undefined,
  }));
}

/** Ítems del carrito recién enviado: el nombre de la línea ya trae variante y extras. */
export function itemsComandaDeCarrito(items: OrderItem[]): ItemComanda[] {
  return items.map(i => ({
    nombre: i.product.name,
    cantidad: i.quantity,
    precio: i.product.price,
    notas: i.notas?.trim() || undefined,
  }));
}
