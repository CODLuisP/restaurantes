'use client';

import { Bell } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { OrderTypePublico } from '@/hooks/menu/useCheckoutForm';

interface OrderSuccessModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderType: OrderTypePublico;
}

/** Confirmación tras enviar el pedido desde el menú público — el pedido todavía no fue a
 *  cocina: queda esperando a que un mozo lo revise y lo confirme. */
export default function OrderSuccessModal({ open, onClose, orderId, orderType }: OrderSuccessModalProps) {
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
          <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center animate-section">
            <Bell className="h-9 w-9" />
          </div>
          <h4 className="text-base font-extrabold text-slate-800 animate-section">
            ¡Pedido recibido!
          </h4>
          <p className="text-xs text-slate-500 max-w-xs animate-section">
            Tu pedido{" "}
            <strong className="text-slate-800 font-mono font-bold">
              #{orderId}
            </strong>{" "}
            fue registrado. En unos instantes un mozo se acercará a confirmarlo.
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
          </div>
        </div>
      </Modal>

  );
}
