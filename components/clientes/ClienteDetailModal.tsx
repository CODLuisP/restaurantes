'use client';

import { Phone, Mail, Calendar, ShoppingBag, Wallet, Receipt, X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { getSegment, SEGMENT_COLORS } from './segment';
import type { Customer } from '@/types';

const PAYMENT_ICON: Record<string, string> = {
  'Efectivo':    '💵',
  'Tarjeta':     '💳',
  'Yape / Plin': '📱',
  'Delivery':    '🛵',
};

interface ClienteDetailModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export default function ClienteDetailModal({ customer, onClose }: ClienteDetailModalProps) {
  if (!customer) return null;
  const segment = getSegment(customer.compras);
  const colors = SEGMENT_COLORS[segment];
  const historial = customer.historial ?? [];

  return (
    <Modal open={!!customer} onClose={onClose} size="lg">
      <div className="relative -mt-2 space-y-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-1 right-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xl font-bold shrink-0">
            {customer.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900">{customer.nombre}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                {segment}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.telefono}</span>
              <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /> {customer.email}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <Wallet className="h-4 w-4 text-brand mx-auto mb-1" />
            <p className="text-sm font-bold text-slate-800">S/. {customer.totalGastado.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500">Total gastado</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <ShoppingBag className="h-4 w-4 text-brand mx-auto mb-1" />
            <p className="text-sm font-bold text-slate-800">{customer.compras}</p>
            <p className="text-[10px] text-slate-500">Pedidos totales</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <Calendar className="h-4 w-4 text-brand mx-auto mb-1" />
            <p className="text-sm font-bold text-slate-800">{customer.ultimaCompra}</p>
            <p className="text-[10px] text-slate-500">Última visita</p>
          </div>
        </div>

        {/* Historial */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="h-4 w-4 text-slate-500" />
            <h4 className="text-sm font-bold text-slate-800">Historial de pedidos</h4>
          </div>

          {historial.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center">
              <p className="text-xs text-slate-400">Este cliente todavía no tiene pedidos registrados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historial.map(order => (
                <div key={order.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                  <span className="text-lg shrink-0">{PAYMENT_ICON[order.metodoPago] ?? '💰'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{order.tipo}</span>
                      <span className="text-[10px] text-slate-400">•</span>
                      <span className="text-[10px] text-slate-500">{order.fecha}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {order.metodoPago} · {order.items} {order.items === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-brand shrink-0">S/. {order.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
