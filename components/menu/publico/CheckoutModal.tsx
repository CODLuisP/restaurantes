'use client';

import { useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import type { OrderItem } from '@/types';
import type { CheckoutForm } from '@/hooks/menu/useCheckoutForm';
import { DEFAULT_METODOS_ENTREGA, type MetodosEntrega } from '@/lib/config/metodos';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  form: CheckoutForm;
  cart: OrderItem[];
  cartTotal: number;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onPlaceOrder: () => void;
  submitting?: boolean;
  mesaLabel?: string;
  metodosEntrega?: MetodosEntrega;
}

/** Checkout del menú público: tipo de pedido y datos del cliente. Comprobante y método de pago
 *  los define el mozo al confirmar el pedido, no el cliente en este paso. */
export default function CheckoutModal({
  open, onClose, form, cart, cartTotal, onUpdateCartQty, onPlaceOrder, submitting, mesaLabel,
  metodosEntrega = DEFAULT_METODOS_ENTREGA,
}: CheckoutModalProps) {
  const {
    orderType, setOrderType, custName, setCustName, custPhone, setCustPhone,
    custEmail, setCustEmail, custAddress, setCustAddress, tableNum, setTableNum,
    formError, setFormError, autocompleteRef, isLoaded, handlePlaceChanged,
  } = form;

  /* Con QR de mesa (mesaLabel) el número ya viene resuelto; sin él, el cliente lo escribe a mano
     (se resuelve por número + sucursal) — ver campo "Número de Mesa" más abajo. */
  const canMesa = metodosEntrega.mesa.enabled;
  const canLlevar = metodosEntrega.llevar.enabled;
  const canDelivery = metodosEntrega.delivery.enabled;

  /* Si el tipo de pedido seleccionado queda deshabilitado (o la config
     recién carga), cae a la primera opción disponible en vez de dejar algo que ya no se acepta.
     Depende también de `orderType`: si el destino al que cae también termina deshabilitado
     (ej. se desactivan Llevar y Delivery a la vez), este mismo efecto se vuelve a evaluar en
     vez de quedarse atascado en un tipo que ya nadie ofrece. */
  const enabledOrderTypes = [
    ...(canMesa ? (['mesa'] as const) : []),
    ...(canLlevar ? (['llevar'] as const) : []),
    ...(canDelivery ? (['delivery'] as const) : []),
  ];
  useEffect(() => {
    if (enabledOrderTypes.length > 0 && !enabledOrderTypes.includes(orderType)) {
      setOrderType(enabledOrderTypes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canMesa, canLlevar, canDelivery, orderType]);


  return (
      <Modal
        open={open}
        onClose={onClose}
        title="Completa tu Pedido"
        subtitle="Ingresa tus datos para procesar el pedido e iniciar la preparación"
        size="md"
        fullHeight={true}
        footer={
          <div className="flex gap-2 w-full">
            <Button
              variant="secondary"
              className="flex-1 py-3"
              onClick={() => onClose()}
              disabled={submitting}
            >
              Atrás
            </Button>
            <Button className="flex-1 py-3" onClick={onPlaceOrder} disabled={submitting || enabledOrderTypes.length === 0 || cart.length === 0}>
              {submitting ? 'Enviando...' : 'Confirmar y Enviar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pb-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl animate-section">
              {formError}
            </div>
          )}

          {enabledOrderTypes.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-xl">
              No hay ningún canal de entrega disponible en este momento. Contacta al local directamente.
            </div>
          )}

          {/* Resumen de Compra */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Resumen del pedido
            </span>
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-150 pr-1">
              {cart.map((i) => (
                <div
                  key={i.product.id}
                  className="py-2 flex justify-between items-center gap-2 text-xs"
                >
                  <span className="text-slate-700 font-semibold flex-1 min-w-0 truncate">
                    {i.product.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty(i.product.id, -1)}
                      className="h-6 w-6 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-rose-600 transition-colors"
                      aria-label={i.quantity === 1 ? `Quitar ${i.product.name}` : `Quitar una unidad de ${i.product.name}`}
                    >
                      {i.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    </button>
                    <span className="w-4 text-center font-mono font-bold text-slate-700">{i.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty(i.product.id, 1)}
                      className="h-6 w-6 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-brand transition-colors"
                      aria-label={`Agregar una unidad de ${i.product.name}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="font-mono font-bold text-slate-800 w-16 text-right shrink-0">
                    S/. {(i.product.price * i.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-slate-400 text-center py-3">Tu carrito quedó vacío.</p>
              )}
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center font-bold text-slate-800 text-sm">
              <span>Total</span>
              <span className="font-mono font-extrabold text-brand">
                S/. {cartTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Tipo de Pedido — solo los canales habilitados en Configuración → Métodos de entrega */}
          {(canMesa || canLlevar || canDelivery) && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">
                ¿Cómo deseas recibir tu pedido?
              </label>
              <div className={`grid gap-2 ${{ 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[[canMesa, canLlevar, canDelivery].filter(Boolean).length as 1 | 2 | 3]}`}>
                {canMesa && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType("mesa");
                      setFormError("");
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      orderType === "mesa"
                        ? "border-brand bg-brand/5 text-brand font-bold"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Comer Aquí
                  </button>
                )}
                {canLlevar && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType("llevar");
                      setFormError("");
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      orderType === "llevar"
                        ? "border-brand bg-brand/5 text-brand font-bold"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Llevar / Recoger
                  </button>
                )}
                {canDelivery && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType("delivery");
                      setFormError("");
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      orderType === "delivery"
                        ? "border-brand bg-brand/5 text-brand font-bold"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Delivery
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Campos del cliente */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre completo *"
                placeholder="Ej. María Fe Mendoza"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                required
              />
              <Input
                label="Teléfono / Celular *"
                placeholder="Ej. 987654321"
                value={custPhone}
                onChange={(e) =>
                  setCustPhone(e.target.value.replace(/\D/g, ""))
                }
                inputMode="tel"
                required
              />
            </div>

            <Input
              label="Correo electrónico (Opcional)"
              placeholder="Ej. maria@correo.com"
              value={custEmail}
              onChange={(e) => setCustEmail(e.target.value)}
              type="email"
            />

            {/* Si es Mesa */}
            {orderType === "mesa" && (
              <div className="space-y-1">
                <Input
                  label="Número de Mesa *"
                  placeholder="Ej. 5"
                  value={tableNum}
                  onChange={(e) => setTableNum(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  disabled={!!mesaLabel}
                  required
                />
                {!mesaLabel && (
                  <p className="text-[10px] text-slate-400">Escribe el número impreso en el cartelito de tu mesa. El mozo confirmará tu pedido antes de mandarlo a cocina.</p>
                )}
              </div>
            )}

            {/* Si es Delivery */}
            {orderType === "delivery" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650 block">
                  Dirección de entrega *
                </label>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(auto) => (autocompleteRef.current = auto)}
                    onPlaceChanged={handlePlaceChanged}
                    options={{ componentRestrictions: { country: "pe" } }}
                  >
                    <input
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      placeholder="Dirección, calle, número, distrito..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-white"
                      required
                    />
                  </Autocomplete>
                ) : (
                  <input
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="Dirección, calle, número, distrito..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-white"
                    required
                  />
                )}
              </div>
            )}
          </div>

        </div>
      </Modal>

  );
}
