'use client';

import { useState } from 'react';
import type { OrderItem } from '@/types';
import type { CheckoutForm } from './useCheckoutForm';
import { crearPedidoPublico } from '@/lib/api/publico';
import { ApiError } from '@/lib/api/client';
import { parseCartLineId } from '@/components/menu/publico/types';

interface UsePlaceOrderArgs {
  form: CheckoutForm;
  cart: OrderItem[];
  setCart: (items: OrderItem[]) => void;
  /** Token de la mesa (viene de la URL del QR). Requerido para pedidos "mesa". */
  mesaToken?: string;
  /** Sucursal del menú público. Requerida para pedidos "llevar"/"delivery" (no hay mesa que la indique). */
  sucursalId?: number;
  onSuccess: (orderId: string) => void;
}

/**
 * Valida el checkout del menú público y crea el pedido real contra el backend con
 * origen "cliente": queda "pendiente_confirmacion" hasta que un mozo lo confirme desde
 * "Por confirmar" — recién ahí el pedido queda asignado a ese mozo y se manda a cocina.
 * El comprobante y el método de pago se definen en ese momento, no en este formulario.
 * Aplica igual a mesa, llevar y delivery.
 */
export function usePlaceOrder({ form, cart, setCart, mesaToken, sucursalId, onSuccess }: UsePlaceOrderArgs) {
  const [submitting, setSubmitting] = useState(false);

  const {
    orderType, custName, custPhone, custAddress, tableNum, setFormError,
    setCustName, setCustPhone, setCustEmail, setCustAddress,
  } = form;

  const resetForm = () => {
    setCart([]);
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setCustAddress('');
  };

  const handleConfirmOrder = async () => {
    setFormError('');
    if (!custName.trim()) { setFormError('Por favor ingresa tu nombre.'); return; }
    if (!custPhone.trim()) { setFormError('Por favor ingresa tu número telefónico.'); return; }
    if (orderType === 'delivery' && !custAddress.trim()) { setFormError('Por favor ingresa una dirección de entrega.'); return; }
    if (orderType === 'mesa' && !tableNum.trim()) { setFormError('Por favor ingresa tu número de mesa.'); return; }
    if (orderType === 'mesa' && !mesaToken && !sucursalId) {
      setFormError('No se pudo identificar el local. Recarga la página e inténtalo de nuevo.');
      return;
    }
    if (orderType !== 'mesa' && !sucursalId) {
      setFormError('No se pudo identificar el local. Recarga la página e inténtalo de nuevo.');
      return;
    }

    setSubmitting(true);
    try {
      const items = cart.map(i => {
        const { productoId, varianteId } = parseCartLineId(i.product.id);
        return { productoId, varianteId, cantidad: i.quantity };
      });

      const pedido = orderType === 'mesa'
        ? await crearPedidoPublico({
            tipo: 'local',
            mesaToken,
            // Sin QR de mesa (link genérico): se resuelve por el número que el cliente escribió a mano.
            numeroMesa: mesaToken ? undefined : parseInt(tableNum, 10),
            sucursalId: mesaToken ? undefined : sucursalId,
            nombreCliente: custName.trim(),
            numComensales: 1,
            items,
          })
        : await crearPedidoPublico({
            tipo: orderType === 'delivery' ? 'delivery' : 'para_llevar',
            sucursalId,
            nombreCliente: custName.trim(),
            telefono: custPhone.trim(),
            direccion: orderType === 'delivery' ? custAddress.trim() : undefined,
            numComensales: 1,
            items,
          });

      onSuccess(String(pedido.id));
      resetForm();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Hubo un error al enviar tu pedido. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return { handleConfirmOrder, submitting };
}
