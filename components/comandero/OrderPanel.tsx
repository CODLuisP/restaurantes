'use client';

import type { MutableRefObject } from 'react';
import { Loader2, Minus, Plus, Send, ShoppingCart, Trash2, Utensils, X } from 'lucide-react';
import { Spinner } from '@/components/ui';
import type { OrderItem, OrderType } from '@/types';
import DeliveryLocationPicker from './DeliveryLocationPicker';

interface OrderPanelProps {
  orderType: OrderType;
  custName: string;
  setCustName: (v: string) => void;
  custPhone: string;
  setCustPhone: (v: string) => void;
  custAddress: string;
  setCustAddress: (v: string) => void;
  editingOrderId: string | null;
  /* Mapa de delivery */
  isLoaded: boolean;
  posicion: { lat: number; lng: number } | null;
  autocompleteRef: MutableRefObject<google.maps.places.Autocomplete | null>;
  onPlaceChanged: () => void;
  onGeocodeManual: (e: React.MouseEvent) => void;
  onMapClick: (e: google.maps.MapMouseEvent) => void;
  onMarkerDragEnd: (e: google.maps.MapMouseEvent) => void;
  /* Ítems */
  existingItems: OrderItem[];
  existingTotal: number;
  onExistingQty: (productId: string, delta: number) => void;
  onRemoveExisting: (productId: string) => void;
  cart: OrderItem[];
  onUpdateQty: (productId: string, delta: number) => void;
  cartTotal: number;
  isCajaOpen: boolean;
  onSend: () => void;
  /** true mientras la comanda se envía a cocina — bloquea el panel para evitar doble envío. */
  sending?: boolean;
  onClearCart: () => void;
}

/** Columna derecha del editor: datos del cliente, ubicación de delivery, ítems y totales. */
export default function OrderPanel({
  orderType,
  custName, setCustName, custPhone, setCustPhone, custAddress, setCustAddress,
  editingOrderId, isLoaded, posicion, autocompleteRef,
  onPlaceChanged, onGeocodeManual, onMapClick, onMarkerDragEnd,
  existingItems, existingTotal, onExistingQty, onRemoveExisting, cart, onUpdateQty, cartTotal,
  isCajaOpen, onSend, sending, onClearCart,
}: OrderPanelProps) {
  return (
        <div className="w-full lg:w-96 shrink-0 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-full flex flex-col justify-between overflow-y-auto">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Título Pedido */}
            <div className="border-b border-slate-100 pb-3 mb-4 shrink-0 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-brand" /> Pedido
              </span>
              <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-lg font-bold text-[10px]">
                {orderType === 'mesa' ? 'Mesa' : orderType === 'llevar' ? 'Llevar' : 'Delivery'}
              </span>
            </div>

            {/* Datos del Cliente */}
            <div className="mb-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 shrink-0 space-y-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                {orderType === 'mesa' ? 'Comensal (opcional)' : 'Datos del Cliente (Opcional)'}
              </span>

              {orderType === 'mesa' && (
                <div>
                  <input
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    placeholder="Nombre del comensal — si lo dejas vacío, se identifica por el número de mesa"
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200"
                  />
                </div>
              )}

              {orderType === 'llevar' && (
                <div className="space-y-2">
                  <input
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    disabled={!!editingOrderId}
                    placeholder="Nombre del cliente"
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <input
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    disabled={!!editingOrderId}
                    placeholder="Teléfono"
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="space-y-2">
                  <input
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    disabled={!!editingOrderId}
                    placeholder="Nombre del cliente"
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <input
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    disabled={!!editingOrderId}
                    placeholder="Teléfono"
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <DeliveryLocationPicker
                    isLoaded={isLoaded}
                    custAddress={custAddress}
                    setCustAddress={setCustAddress}
                    editingOrderId={editingOrderId}
                    posicion={posicion}
                    autocompleteRef={autocompleteRef}
                    onPlaceChanged={onPlaceChanged}
                    onGeocodeManual={onGeocodeManual}
                    onMapClick={onMapClick}
                    onMarkerDragEnd={onMarkerDragEnd}
                  />
                </div>
              )}
            </div>

            {/* Listado de Platos */}
            <div className="flex-grow overflow-y-auto space-y-3 pr-1 relative">
              {sending && (
                <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-xl">
                  <Spinner size="md" />
                  <span className="text-xs font-bold text-slate-500">Enviando comanda a cocina...</span>
                </div>
              )}
              {/* Platos Ya Enviados */}
              {existingItems.length > 0 && (
                <div className="space-y-1.5 animate-section">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                    Ya en servicio
                  </span>
                  {existingItems.map(item => (
                    <div key={item.product.id} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{item.product.name}</p>
                        <span className="text-[10px] font-mono text-slate-400">S/. {(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onExistingQty(item.product.id, -1)} className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"><Minus className="h-3 w-3" /></button>
                        <span className="text-[11px] font-bold font-mono text-slate-700 w-4 text-center">{item.quantity}</span>
                        <button onClick={() => onExistingQty(item.product.id, 1)} className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"><Plus className="h-3 w-3" /></button>
                        <button onClick={() => onRemoveExisting(item.product.id)} className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50" title="Quitar"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-dashed border-slate-200 my-2" />
                </div>
              )}

              {/* Platos Por Enviar */}
              {cart.length > 0 && (
                <div className="space-y-1.5 animate-section">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                    Por enviar ahora
                  </span>
                  {cart.map(item => (
                    <div key={item.product.id} className="bg-brand/5 border border-brand/10 rounded-xl px-3 py-2 flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-800 truncate">{item.product.name}</p>
                        <span className="text-[10px] font-mono text-brand font-bold">S/. {(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onUpdateQty(item.product.id, -1)} className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"><Minus className="h-3 w-3" /></button>
                        <span className="text-[11px] font-bold font-mono text-slate-800 w-4 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQty(item.product.id, 1)} className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {existingItems.length === 0 && cart.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <Utensils className="h-8 w-8 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-400">Agrega productos desde el catálogo</p>
                </div>
              )}
            </div>
          </div>

          {/* Totales y Botones */}
          <div className="border-t border-slate-100 pt-4 mt-4 shrink-0 space-y-3">
            <div className="space-y-1 text-xs text-slate-500">
              {orderType === 'mesa' ? (
                <>
                  <div className="flex justify-between font-mono"><span>Comanda nueva</span><span>S/. {cartTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between font-mono"><span>Ya en la mesa</span><span>S/. {existingTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between font-mono font-extrabold text-sm text-slate-800 border-t border-dashed border-slate-200 pt-2"><span>Total</span><span>S/. {(cartTotal + existingTotal).toFixed(2)}</span></div>
                </>
              ) : (
                <>
                  {editingOrderId && <div className="flex justify-between font-mono"><span>Ya en el pedido</span><span>S/. {existingTotal.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-mono font-extrabold text-sm text-slate-800"><span>{editingOrderId ? 'Nuevo en este envío' : 'Total'}</span><span>S/. {cartTotal.toFixed(2)}</span></div>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <button
                onClick={onSend}
                disabled={!isCajaOpen || cart.length === 0 || sending}
                className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="h-4 w-4" /> Enviar a Cocina</>
                )}
              </button>
              {cart.length > 0 && (
                <button
                  onClick={onClearCart}
                  disabled={sending}
                  className="w-full text-xs font-bold text-rose-500 hover:bg-rose-50 py-1.5 rounded-lg transition-colors border border-dashed border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Vaciar ítems nuevos
                </button>
              )}
            </div>
          </div>
        </div>
  );
}
