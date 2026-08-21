'use client';

import { CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { OrderTypePublico } from '@/hooks/menu/useCheckoutForm';

interface OrderSuccessModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderType: OrderTypePublico;
  paymentMethod: string;
}

/** Confirmación tras enviar el pedido desde el menú público. */
export default function OrderSuccessModal({ open, onClose, orderId, orderType, paymentMethod }: OrderSuccessModalProps) {
  return (
      <Modal
        open={open}
        onClose={onClose}
        title=""
        size="sm"
        fullHeight={false}
        footer={
          <Button
            className="w-full py-2.5 font-bold"
            onClick={() => onClose()}
          >
            Entendido, gracias
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
          <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-650 flex items-center justify-center animate-section">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h4 className="text-base font-extrabold text-slate-800 animate-section">
            ¡Pedido Enviado a la Cocina!
          </h4>
          <p className="text-xs text-slate-500 max-w-xs animate-section">
            Tu pedido{" "}
            <strong className="text-slate-800 font-mono font-bold">
              #{orderId}
            </strong>{" "}
            ha sido recibido correctamente y se encuentra en preparación.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-505 mt-2 space-y-1 w-full max-w-xs animate-section">
            <p>
              Tipo de entrega:{" "}
              <strong className="text-slate-700 font-bold uppercase">
                {orderType === "mesa"
                  ? "Mesa"
                  : orderType === "llevar"
                    ? "Llevar"
                    : "Delivery"}
              </strong>
            </p>
            <p>
              Método de pago:{" "}
              <strong className="text-slate-700 font-bold">
                {paymentMethod}
              </strong>
            </p>
          </div>
        </div>
      </Modal>

  );
}
