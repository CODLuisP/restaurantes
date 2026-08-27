'use client';

import { useState } from 'react';
import { Bell, Bike, Building2, Check, Clock, ShoppingBag, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui';

type PendingCard =
  | { key: string; kind: 'mesa'; tableName: string; label: string; waiter?: string; items: { id: string; name: string; qty: number; price: number }[]; total: number }
  | { key: string; kind: 'llevar' | 'delivery'; orderId: string; label: string; customer: string; phone?: string; address?: string; time: string; items: { id: string; name: string; qty: number; price: number }[]; total: number };

export default function PedidosPorConfirmarPage() {
  const {
    tables, activeOrders, mesasLoading, activeOrdersLoading, triggerToast,
    confirmarPedidoCliente, confirmarActiveOrder, cancelTableOrder, cancelActiveOrder,
  } = useApp();
  const { currentUser } = useAuth();
  const canConfirm = currentUser?.role === 'admin' || currentUser?.role === 'mozo';

  const [busyKey, setBusyKey] = useState<string | null>(null);

  const pending: PendingCard[] = [
    ...tables
      .filter(t => t.pedidoEstado === 'pendiente_confirmacion')
      .map(t => ({
        key: `mesa-${t.id}`, kind: 'mesa' as const, tableName: t.name, label: `Mesa ${t.name}`,
        waiter: t.waiter,
        items: (t.items ?? []).map(i => ({ id: i.product.id, name: i.product.name, qty: i.quantity, price: i.product.price })),
        total: t.cuenta,
      })),
    ...activeOrders
      .filter(o => o.pedidoEstado === 'pendiente_confirmacion')
      .map(o => ({
        key: `order-${o.id}`, kind: o.type, orderId: o.id,
        label: o.type === 'llevar' ? 'Para llevar' : 'Delivery',
        customer: o.customer, phone: o.phone, address: o.address, time: o.createdAt,
        items: o.items.map(i => ({ id: i.product.id, name: i.product.name, qty: i.quantity, price: i.product.price })),
        total: o.total,
      })),
  ];

  const loading = mesasLoading || activeOrdersLoading;

  const handleConfirm = async (card: PendingCard) => {
    setBusyKey(card.key);
    try {
      if (card.kind === 'mesa') await confirmarPedidoCliente(card.tableName);
      else await confirmarActiveOrder(card.orderId);
    } finally {
      setBusyKey(null);
    }
  };

  const handleReject = async (card: PendingCard) => {
    if (!window.confirm('¿Rechazar este pedido? El cliente tendrá que volver a armarlo.')) return;
    setBusyKey(card.key);
    try {
      if (card.kind === 'mesa') await cancelTableOrder(card.tableName);
      else await cancelActiveOrder(card.orderId);
      triggerToast('Pedido rechazado.', 'info');
    } finally {
      setBusyKey(null);
    }
  };

  if (!canConfirm) {
    return (
      <div className="card-lg max-w-md mx-auto my-16 p-8 text-center space-y-3 animate-section">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
          <Bell className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Acceso restringido</h3>
        <p className="text-xs text-slate-500">Solo el <strong>mozo</strong> o el <strong>administrador</strong> pueden confirmar pedidos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand" /> Pedidos por confirmar
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pedidos que los propios clientes armaron desde el menú digital. Revísalos y confírmalos para mandarlos a cocina.
          </p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-bold inline-flex items-center gap-1.5 w-max ${
          pending.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
        }`}>
          <Bell className="h-3.5 w-3.5" /> {pending.length} por confirmar
        </span>
      </div>

      {loading ? (
        <div className="card-lg flex items-center justify-center py-20 text-xs text-slate-400 gap-2">
          <Spinner size="sm" /> Cargando pedidos...
        </div>
      ) : pending.length === 0 ? (
        <div className="card-lg p-12 text-center space-y-3 max-w-md mx-auto">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <Check className="h-7 w-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Sin pedidos pendientes</h4>
          <p className="text-xs text-slate-500">
            Cuando un cliente arme su pedido desde el menú digital, aparecerá aquí al instante.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pending.map(card => {
            const Icon = card.kind === 'mesa' ? Building2 : card.kind === 'llevar' ? ShoppingBag : Bike;
            const itemsCount = card.items.reduce((s, i) => s + i.qty, 0);
            const busy = busyKey === card.key;
            return (
              <div key={card.key} className="card-lg p-4 flex flex-col space-y-3 border-t-4 border-t-amber-400">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Icon className="h-4 w-4 text-brand" /> {card.label}
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                    Nuevo
                  </span>
                </div>

                {card.kind === 'mesa' ? (
                  card.waiter && <p className="text-[11px] text-slate-400">Mozo asignado: {card.waiter}</p>
                ) : (
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p className="text-slate-700 font-medium">{card.customer}</p>
                    {card.phone && <p>Tel: {card.phone}</p>}
                    {card.address && <p className="truncate">{card.address}</p>}
                    <span className="flex items-center gap-1 text-slate-400"><Clock className="h-3 w-3" /> {card.time}</span>
                  </div>
                )}

                <div className="space-y-1 border-t border-slate-100 pt-2 max-h-32 overflow-y-auto">
                  {card.items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin ítems.</p>
                  ) : card.items.map(it => (
                    <div key={it.id} className="flex justify-between text-xs font-medium text-slate-700">
                      <span className="truncate">{it.qty}× {it.name}</span>
                      <span className="font-mono shrink-0">S/. {(it.price * it.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs border-t border-dashed border-slate-200 pt-2">
                  <span className="text-slate-500">{itemsCount} ítem{itemsCount !== 1 ? 's' : ''}</span>
                  <span className="font-mono font-bold text-slate-800">S/. {card.total.toFixed(2)}</span>
                </div>

                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handleReject(card)}
                    disabled={busy}
                    className="shrink-0 px-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleConfirm(card)}
                    disabled={busy}
                    className="flex-1 bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Check className="h-4 w-4" /> Confirmar y enviar a cocina
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
