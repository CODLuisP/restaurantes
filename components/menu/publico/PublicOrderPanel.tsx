'use client';

import { Minus, Plus, ShoppingCart, Trash2, Utensils, X } from 'lucide-react';
import type { OrderItem } from '@/types';

/** Barra lateral "Tu pedido" de la carta pública — mismo estilo que el panel de pedido del Comandero:
 *  platos agregados con cantidad y nota para cocina, total y botón para continuar. */
export default function PublicOrderPanel({
  cart,
  cartTotal,
  onUpdateQty,
  onUpdateNotas,
  onClear,
  onCheckout,
  disabled = false,
  onClose,
}: {
  cart: OrderItem[];
  cartTotal: number;
  onUpdateQty: (productId: string, delta: number) => void;
  onUpdateNotas: (productId: string, notas: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  /** Local cerrado: no se puede enviar el pedido. */
  disabled?: boolean;
  /** Solo en el cajón móvil: cierra el panel. */
  onClose?: () => void;
}) {
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
        <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <ShoppingCart className="h-4 w-4 text-brand" /> Tu pedido
          {cartCount > 0 && (
            <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-lg font-bold text-[10px]">{cartCount}</span>
          )}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar pedido"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-1.5">
        {cart.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
            <Utensils className="h-8 w-8 stroke-[1.5]" />
            <p className="text-xs font-semibold">Agrega platos desde la carta</p>
          </div>
        ) : (
          cart.map(item => {
            return (
              <div key={item.product.id} className="bg-brand/5 border border-brand/10 rounded-xl p-2.5 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 break-words">{item.product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-brand font-bold">
                        S/ {(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.product.id, -1)}
                      className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                      aria-label={item.quantity === 1 ? `Quitar ${item.product.name}` : `Quitar una unidad de ${item.product.name}`}
                    >
                      {item.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    </button>
                    <span className="text-[11px] font-bold font-mono text-slate-800 w-4 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.product.id, 1)}
                      className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                      aria-label={`Agregar una unidad de ${item.product.name}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  maxLength={200}
                  placeholder="Añadir nota para cocina (ej. sin cebolla)"
                  value={item.notas ?? ''}
                  onChange={e => onUpdateNotas(item.product.id, e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-brand"
                />
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-4 shrink-0 space-y-3">
        <div className="flex justify-between font-mono font-extrabold text-sm text-slate-800">
          <span>Total</span>
          <span>S/. {cartTotal.toFixed(2)}</span>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onCheckout}
            disabled={disabled || cart.length === 0}
            className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
          >
            {disabled ? 'Local cerrado por el momento' : 'Continuar con el pedido'}
          </button>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="w-full text-xs font-bold text-rose-500 hover:bg-rose-50 py-1.5 rounded-lg transition-colors border border-dashed border-rose-200"
            >
              Vaciar pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
