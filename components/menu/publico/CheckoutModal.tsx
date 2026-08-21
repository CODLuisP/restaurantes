'use client';

import { Autocomplete } from '@react-google-maps/api';
import { Check, Upload, X } from 'lucide-react';
import { Modal, Button, Input, Select } from '@/components/ui';
import type { OrderItem } from '@/types';
import type { CheckoutForm } from '@/hooks/menu/useCheckoutForm';

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
}

/** Checkout del menú público: tipo de pedido, datos del cliente, comprobante y pago. */
export default function CheckoutModal({
  open, onClose, form, cart, cartTotal, onUpdateCartQty, onPlaceOrder, submitting, mesaLabel,
}: CheckoutModalProps) {
  const {
    orderType, setOrderType, custName, setCustName, custPhone, setCustPhone,
    custEmail, setCustEmail, custAddress, setCustAddress, tableNum, setTableNum,
    docType, setDocType, ruc, setRuc, razonSocial, setRazonSocial,
    paymentMethod, setPaymentMethod, paymentScreenshot, setPaymentScreenshot,
    formError, setFormError, autocompleteRef, isLoaded, handlePlaceChanged,
  } = form;

  /** Adjunta el comprobante de pago (Yape/Plin) como imagen en base64. */
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPaymentScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

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
            <Button className="flex-1 py-3" onClick={onPlaceOrder} disabled={submitting}>
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

          {/* Resumen de Compra */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Resumen del pedido
            </span>
            <div className="max-h-32 overflow-y-auto divide-y divide-slate-150 pr-1">
              {cart.map((i) => (
                <div
                  key={i.product.id}
                  className="py-2 flex justify-between items-center text-xs"
                >
                  <span className="text-slate-700 font-semibold">
                    {i.quantity}x {i.product.name}
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    S/. {(i.product.price * i.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center font-bold text-slate-800 text-sm">
              <span>Total</span>
              <span className="font-mono font-extrabold text-brand">
                S/. {cartTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Tipo de Pedido */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">
              ¿Cómo deseas recibir tu pedido?
            </label>
            <div className={`grid gap-2 ${mesaLabel ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {mesaLabel && (
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
            </div>
          </div>

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
              <Input
                label="Número de Mesa / Ubicación *"
                placeholder="Ej. 5"
                value={tableNum}
                onChange={(e) => setTableNum(e.target.value)}
                disabled={!!mesaLabel}
                required
              />
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

          {/* Comprobante */}
          <div className="space-y-3">
            <Select
              label="Tipo de Comprobante"
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
            >
              <option value="Nota de venta">
                Nota de Venta (Venta interna)
              </option>
              <option value="Boleta">Boleta de Venta</option>
              <option value="Factura">Factura</option>
            </Select>

            {docType === "Factura" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl animate-section">
                <Input
                  label="RUC (11 dígitos) *"
                  placeholder="20123456789"
                  value={ruc}
                  onChange={(e) =>
                    setRuc(e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  inputMode="numeric"
                  required
                />
                <Input
                  label="Razón Social *"
                  placeholder="Ej. Inversiones SAC"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-3">
            <Select
              label="Método de Pago"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            >
              <option value="Efectivo">
                {orderType === "delivery"
                  ? "Pago Contra entrega (Efectivo)"
                  : "Pagar en Caja / Mostrador"}
              </option>
              <option value="Tarjeta">Pago con Tarjeta</option>
              <option value="Yape / Plin">Yape / Plin (Pago anticipado)</option>
            </Select>

            {paymentMethod === "Yape / Plin" && (
              <div className="p-4 bg-linear-to-br from-indigo-50 to-blue-50 border border-indigo-150 rounded-xl space-y-3.5 animate-section">
                <div className="text-xs text-indigo-950 space-y-1">
                  <p className="font-bold">Instrucciones de pago anticipado:</p>
                  <p>
                    1. Transfiere el total de{" "}
                    <span className="font-bold text-brand">
                      S/. {cartTotal.toFixed(2)}
                    </span>{" "}
                    a cualquiera de nuestras cuentas:
                  </p>
                  <p className="pl-3 font-mono font-semibold text-slate-800">
                    · Yape / Plin:{" "}
                    <span className="text-indigo-650 font-extrabold text-sm">
                      987 654 321
                    </span>{" "}
                    (RestoPro Perú)
                  </p>
                  <p>
                    2. Sube la captura de pantalla de la transferencia como
                    comprobante aquí abajo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-indigo-700 block">
                    Comprobante de pago *
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("screenshot-upload")?.click()
                      }
                      className="btn-secondary py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> Subir Captura
                    </button>
                    <input
                      id="screenshot-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                    {paymentScreenshot && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 animate-section">
                        <Check className="h-3 w-3 shrink-0" /> Captura lista
                      </span>
                    )}
                  </div>
                  {paymentScreenshot && (
                    <div className="mt-2 relative w-20 h-28 rounded-lg overflow-hidden border border-slate-200 animate-section">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={paymentScreenshot}
                        alt="Captura de Pago"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPaymentScreenshot("")}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer animate-section"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

  );
}
