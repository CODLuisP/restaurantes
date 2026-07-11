'use client';

import { useState } from 'react';
import { Phone, Mail, Calendar, ShoppingBag, Wallet, Receipt, MapPin, X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { getSegment, SEGMENT_COLORS } from './segment';
import DireccionesModal from './DireccionesModal';
import type { Cliente } from '@/types/clientes';

// Data estática de historial — reemplazar cuando el endpoint de pedidos por cliente esté listo
const PAYMENT_ICON: Record<string, string> = {
  'Efectivo':    '💵',
  'Tarjeta':     '💳',
  'Yape / Plin': '📱',
  'Delivery':    '🛵',
};

interface ClienteDetailModalProps {
  cliente: Cliente | null;
  onClose: () => void;
  onUpdated: (cliente: Cliente) => void;
}

export default function ClienteDetailModal({ cliente, onClose, onUpdated }: ClienteDetailModalProps) {
  const [showDirecciones, setShowDirecciones] = useState(false);
  const [clienteLocal, setClienteLocal] = useState<Cliente | null>(null);

  const current = clienteLocal ?? cliente;
  if (!current) return null;

  const nivelKey = current.nivel.charAt(0).toUpperCase() + current.nivel.slice(1).toLowerCase() as Parameters<typeof getSegment>[0] extends number ? never : any;
  const segmentMap: Record<string, keyof typeof SEGMENT_COLORS> = {
    NUEVO: 'Nuevo', OCASIONAL: 'Ocasional', FRECUENTE: 'Frecuente', FIEL: 'Fiel', VIP: 'VIP',
  };
  const segment = segmentMap[current.nivel] ?? 'Nuevo';
  const colors = SEGMENT_COLORS[segment];

  const primeraDir = current.direcciones?.[0];

  // TODO: reemplazar con datos reales cuando exista endpoint de historial de pedidos por cliente
  const historial: { id: string; fecha: string; tipo: string; metodoPago: string; items: number; total: number }[] = [];

  return (
    <>
      <Modal open={!!current} onClose={onClose} size="lg" fullHeight={false}>
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
              {current.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{current.nombre}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                  {segment}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                {current.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {current.telefono}</span>}
                {current.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /> {current.email}</span>}
              </div>
              {current.numeroDocumento && (
                <p className="text-[11px] text-slate-400 mt-0.5">Doc: {current.numeroDocumento}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Wallet className="h-4 w-4 text-brand mx-auto mb-1" />
              <p className="text-sm font-bold text-slate-800">S/. {current.totalGastado.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500">Total gastado</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <ShoppingBag className="h-4 w-4 text-brand mx-auto mb-1" />
              <p className="text-sm font-bold text-slate-800">—</p>
              <p className="text-[10px] text-slate-500">Pedidos totales</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Calendar className="h-4 w-4 text-brand mx-auto mb-1" />
              <p className="text-sm font-bold text-slate-800">
                {current.ultimoPedido ? new Date(current.ultimoPedido).toLocaleDateString('es-PE') : '—'}
              </p>
              <p className="text-[10px] text-slate-500">Última visita</p>
            </div>
          </div>

          {/* Dirección principal */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {primeraDir ? (primeraDir.direccion || 'Sin detalle de calle') : 'Sin dirección registrada'}
                </p>
                {primeraDir && (
                  <p className="text-[11px] text-slate-400">
                    {[primeraDir.distrito, primeraDir.provincia, primeraDir.departamento].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => setShowDirecciones(true)} className="text-xs text-brand hover:underline shrink-0">
              {current.direcciones.length > 1 ? `Ver todas (${current.direcciones.length})` : 'Gestionar'}
            </button>
          </div>

          {/* Historial de pedidos */}
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

      <DireccionesModal
        cliente={current}
        open={showDirecciones}
        onClose={() => setShowDirecciones(false)}
        onUpdated={(c) => { setClienteLocal(c); onUpdated(c); }}
      />
    </>
  );
}
