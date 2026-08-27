'use client';

import { useEffect, useState } from 'react';
import { Bell, Bike, Building2, Loader2, Pencil, ShoppingBag, Trash2, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { ActiveOrder, Table } from '@/types';

type BusyAction = 'cancel' | 'confirm' | null;

export default function OrderDetailDrawer({
  view, onClose, canEdit, onEditTable, onEditOrder, onCancelTable, onCancelOrder, onConfirmTable, onConfirmOrder,
}: {
  view: { kind: 'mesa'; tableName: string } | { kind: 'order'; orderId: string };
  onClose: () => void;
  canEdit: boolean;
  onEditTable: (tableName: string) => void;
  onEditOrder: (orderId: string) => void;
  onCancelTable: (tableName: string) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onConfirmTable: (tableName: string) => Promise<void>;
  onConfirmOrder: (orderId: string) => Promise<void>;
}) {
  const { tables, activeOrders } = useApp();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const table: Table | undefined = view.kind === 'mesa' ? tables.find(t => t.name === view.tableName) : undefined;
  const order: ActiveOrder | undefined = view.kind === 'order' ? activeOrders.find(o => o.id === view.orderId) : undefined;

  useEffect(() => {
    if ((view.kind === 'mesa' && !table) || (view.kind === 'order' && !order)) onClose();
  }, [view, table, order, onClose]);

  if ((view.kind === 'mesa' && !table) || (view.kind === 'order' && !order)) return null;

  /** Cancelar/confirmar muestran su propio loading y solo cierran el panel si el backend confirmó. */
  const runAction = async (action: Exclude<BusyAction, null>, run: () => Promise<void>) => {
    setBusyAction(action);
    try {
      await run();
      onClose();
    } finally {
      setBusyAction(null);
    }
  };
  const handleCancel = () => runAction('cancel', () => (view.kind === 'mesa' ? onCancelTable(view.tableName) : onCancelOrder(view.orderId)));
  const handleConfirm = () => runAction('confirm', () => (view.kind === 'mesa' ? onConfirmTable(view.tableName) : onConfirmOrder(view.orderId)));

  const items = view.kind === 'mesa' ? (table?.items ?? []) : (order?.items ?? []);
  const total = view.kind === 'mesa' ? (table?.cuenta ?? 0) : (order?.total ?? 0);
  const itemsCount = items.reduce((a, i) => a + i.quantity, 0);

  const title = view.kind === 'mesa' ? `Mesa ${table!.name}` : `#${order!.id}`;
  const typeLabel = view.kind === 'mesa' ? 'En el local' : order!.type === 'llevar' ? 'Para llevar' : 'Delivery';
  const TypeIcon = view.kind === 'mesa' ? Building2 : order!.type === 'llevar' ? ShoppingBag : Bike;
  const pedidoEstado = view.kind === 'mesa' ? table?.pedidoEstado : order?.pedidoEstado;
  const pendienteConfirmacion = pedidoEstado === 'pendiente_confirmacion';

  return (
    <div className="w-full lg:w-96 shrink-0 lg:-my-8 lg:-mr-8 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16">
      <div className="card-lg bg-white flex flex-col overflow-hidden h-full lg:rounded-none lg:border-r-0">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">{title}</h4>
            <p className="text-[11px] text-slate-500">
              {view.kind === 'mesa' ? 'Consumo en curso' : 'Pedido activo, pendiente de cobro'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {pendienteConfirmacion && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 text-xs font-bold animate-section">
              <Bell className="h-4 w-4 shrink-0" /> Pedido armado por el cliente — confírmalo para mandarlo a cocina.
            </div>
          )}
          {/* Info del pedido */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <TypeIcon className="h-3.5 w-3.5 text-brand" /> {typeLabel}
            </span>
            {view.kind === 'mesa' && table?.waiter && (
              <p className="text-slate-500">Atendido por: <span className="text-slate-700 font-medium">{table.waiter}</span></p>
            )}
            {view.kind === 'order' && (
              <>
                <p className="text-slate-500">Cliente: <span className="text-slate-700 font-medium">{order!.customer}</span></p>
                {order!.phone && <p className="text-slate-500">Tel: <span className="text-slate-700 font-medium">{order!.phone}</span></p>}
                {order!.address && <p className="text-slate-500">Dirección: <span className="text-slate-700 font-medium">{order!.address}</span></p>}
                <p className="text-slate-500">Hora: <span className="text-slate-700 font-medium">{order!.createdAt}</span></p>
                {order!.waiter && <p className="text-slate-500">Mozo: <span className="text-slate-700 font-medium">{order!.waiter}</span></p>}
                {order!.docType && (
                  <p className="text-slate-500">Comprobante: <span className="text-slate-700 font-medium uppercase font-bold">{order!.docType} {order!.ruc ? `(RUC ${order!.ruc})` : ''}</span></p>
                )}
                {order!.paymentMethod && (
                  <p className="text-slate-500">Pago: <span className="text-slate-700 font-medium font-bold">{order!.paymentMethod}</span></p>
                )}
                {order!.paymentScreenshot && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">CAPTURA DE PAGO YAPE/PLIN</span>
                    <button
                      type="button"
                      onClick={() => {
                        const win = window.open();
                        if (win) {
                          win.document.write(`<iframe src="${order!.paymentScreenshot}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                        }
                      }}
                      className="group/screenshot relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 hover:border-brand transition-colors block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={order!.paymentScreenshot} alt="Pago Yape/Plin" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/screenshot:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        Haga clic para ampliar
                      </div>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Items */}
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-2">
              Ítems del pedido ({itemsCount})
            </span>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sin ítems registrados.</p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center gap-2 text-xs">
                    <span className="text-slate-700 truncate">{item.quantity}x {item.product.name}</span>
                    <span className="font-mono font-bold text-slate-800 shrink-0">S/. {(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">Total</span>
            <span className="font-mono font-extrabold text-sm text-slate-800">S/. {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Acciones */}
        {canEdit && (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0 space-y-2">
            {pendienteConfirmacion && (
              <button
                onClick={handleConfirm}
                disabled={busyAction !== null}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busyAction === 'confirm' ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirmando...</>
                ) : (
                  <><Bell className="w-3.5 h-3.5" /> Confirmar y enviar a cocina</>
                )}
              </button>
            )}
            <button
              onClick={() => (view.kind === 'mesa' ? onEditTable(view.tableName) : onEditOrder(view.orderId))}
              disabled={busyAction !== null}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-brand hover:bg-brand-hover py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar pedido
            </button>
            <button
              onClick={handleCancel}
              disabled={busyAction !== null}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 py-2 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busyAction === 'cancel' ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelando...</>
              ) : (
                <><Trash2 className="w-3.5 h-3.5" /> Cancelar pedido</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
