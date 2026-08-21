'use client';

import { useState } from 'react';
import type { OrderItem } from '@/types';
import type { CheckoutForm } from './useCheckoutForm';
import { crearPedidoPublico } from '@/lib/api/publico';
import { ApiError } from '@/lib/api/client';

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
 * origen "cliente": queda pendiente de que el mozo lo confirme desde el Comandero antes
 * de ir a cocina — así el mozo puede verificar el pago (Yape/Plin) o acercarse a la mesa
 * en vez de que cocina reciba algo sin que nadie lo sepa. Aplica igual a mesa, llevar y delivery.
 */
export function usePlaceOrder({ form, cart, setCart, mesaToken, sucursalId, onSuccess }: UsePlaceOrderArgs) {
  const [submitting, setSubmitting] = useState(false);

  const {
    orderType, custName, custPhone, custAddress, tableNum,
    docType, ruc, razonSocial, paymentMethod, paymentScreenshot, setFormError,
    setCustName, setCustPhone, setCustEmail, setCustAddress, setRuc,
    setRazonSocial, setPaymentScreenshot, setPaymentMethod, setDocType,
  } = form;

  const resetForm = () => {
    setCart([]);
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setCustAddress('');
    setRuc('');
    setRazonSocial('');
    setPaymentScreenshot('');
    setPaymentMethod('Efectivo');
    setDocType('Nota de venta');
  };

  const handleConfirmOrder = async () => {
    setFormError('');
    if (!custName.trim()) { setFormError('Por favor ingresa tu nombre.'); return; }
    if (!custPhone.trim()) { setFormError('Por favor ingresa tu número telefónico.'); return; }
    if (orderType === 'delivery' && !custAddress.trim()) { setFormError('Por favor ingresa una dirección de entrega.'); return; }
    if (orderType === 'mesa' && !tableNum.trim()) { setFormError('Por favor ingresa tu número de mesa.'); return; }
    if (docType === 'Factura') {
      if (ruc.trim().length !== 11) { setFormError('El RUC debe tener 11 dígitos.'); return; }
      if (!razonSocial.trim()) { setFormError('Por favor ingresa la Razón Social.'); return; }
    }
    if (paymentMethod === 'Yape / Plin' && !paymentScreenshot) {
      setFormError('Por favor adjunta la captura del pago de Yape o Plin.');
      return;
    }
    if (orderType === 'mesa' && !mesaToken) {
      setFormError('No se pudo identificar tu mesa. Vuelve a escanear el código QR.');
      return;
    }
    if (orderType !== 'mesa' && !sucursalId) {
      setFormError('No se pudo identificar el local. Recarga la página e inténtalo de nuevo.');
      return;
    }

    setSubmitting(true);
    try {
      const items = cart.map(i => ({ productoId: Number(i.product.id), cantidad: i.quantity }));

      const pedido = orderType === 'mesa'
        ? await crearPedidoPublico({
            tipo: 'local',
            mesaToken,
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
