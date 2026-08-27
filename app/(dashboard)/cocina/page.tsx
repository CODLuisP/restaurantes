'use client';

import { useEffect, useState } from 'react';
import { Clock, ChevronRight, ChevronLeft, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToasts } from '@/hooks/app/useToasts';
import { useCocinaPedidos } from '@/hooks/cocina/useCocinaPedidos';
import { pedidoLabel, pedidoMinutos } from '@/components/cocina/types';
import { Spinner } from '@/components/ui';
import type { PedidoItemDto } from '@/lib/api/pedidos';

const COLUMNS = [
  { status: 'pendiente' as const,      label: 'Pendiente',            dot: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-800',    empty: 'No hay platos pendientes.' },
  { status: 'en_preparacion' as const, label: 'Preparando',           dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-800',  empty: 'No hay platos preparándose.' },
  { status: 'listo' as const,          label: 'Listo para Despachar', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800', empty: 'No hay platos listos para servir hoy.' },
];

function itemName(it: PedidoItemDto) {
  return it.productoNombre
    ? (it.varianteNombre ? `${it.productoNombre} (${it.varianteNombre})` : it.productoNombre)
    : it.comboNombre ?? it.varianteNombre ?? 'Producto';
}

export default function CocinaPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { triggerToast, toasts, dismissToast } = useToasts();
  const { pedidos, loading, moverItemEstado } = useCocinaPedidos(triggerToast);

  /* Refresca el "hace X min" de cada ticket sin necesidad de recargar nada del backend. */
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const [busyItemId, setBusyItemId] = useState<number | null>(null);

  const handleMove = async (itemId: number, estadoActual: string, nuevoEstado: string) => {
    setBusyItemId(itemId);
    try {
      await moverItemEstado(itemId, estadoActual, nuevoEstado);
    } finally {
      setBusyItemId(null);
    }
  };

  /* Agrupa, por columna, los pedidos que tienen al menos un plato en ese estado — cada grupo
     solo lista SUS platos en ese estado; el mismo pedido puede aparecer en varias columnas a la vez. */
  const groupsByColumn = COLUMNS.map(col => ({
    col,
    groups: pedidos
      .map(order => ({ order, items: order.items.filter(it => it.estado === col.status) }))
      .filter(g => g.items.length > 0),
  }));

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col p-6 lg:p-8 overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand bg-slate-100 hover:bg-brand/10 px-3 py-1.5 rounded-full transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al Dashboard
          </button>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Kitchen Display System (KDS)</h3>
            <p className="text-xs text-gray-500">Kanban de preparación gastronómica en tiempo real para chefs.</p>
          </div>
        </div>
        <span className="text-xs bg-brand/10 text-brand px-3 py-1.5 rounded-full font-bold">
          {currentUser?.name} — Sincronizado en vivo con Comandero
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Spinner size="sm" /> Cargando comandas...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 pt-6">
          {groupsByColumn.map(({ col, groups }) => {
            const totalPlatos = groups.reduce((a, g) => a + g.items.length, 0);
            return (
              <div key={col.status} className="bg-slate-50 p-4 rounded-2xl flex flex-col space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} /> {col.label}
                  </span>
                  <span className={`text-[10px] px-2 rounded-full font-bold ${col.badge}`}>
                    {totalPlatos} {col.status === 'en_preparacion' ? 'en curso' : col.status === 'listo' ? 'listos' : 'platos'}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {groups.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 italic">{col.empty}</div>
                  ) : (
                    groups.map(({ order, items }) => (
                      <div key={order.id} className={`card p-4 flex flex-col space-y-3 ${col.status === 'listo' ? 'opacity-80' : ''}`}>
                        <div className="flex justify-between items-center text-[11px] text-slate-500">
                          <span className="font-mono font-bold text-slate-800">
                            #{order.id} - {pedidoLabel(order)}
                            {order.mozoNombre && <span className="ml-1 font-sans font-normal text-slate-400">· {order.mozoNombre}</span>}
                          </span>
                          {col.status !== 'listo' ? (
                            <span className={`font-bold flex items-center gap-1 ${col.status === 'pendiente' ? 'text-rose-500' : 'text-amber-600'}`}>
                              <Clock className="h-3 w-3" /> Hace {pedidoMinutos(order)} min
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-bold font-mono">LISTO</span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {items.map(it => {
                            const busy = busyItemId === it.id;
                            return (
                              <div key={it.id} className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                                <div className={`text-xs font-medium flex-1 min-w-0 ${col.status === 'listo' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                  <span className="truncate">{itemName(it)}</span>
                                  <span className="font-mono ml-1 text-slate-400">x{it.cantidad}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {busy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                  ) : col.status === 'pendiente' ? (
                                    <button
                                      onClick={() => handleMove(it.id, 'pendiente', 'en_preparacion')}
                                      disabled={busy}
                                      className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold py-1 px-2 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      Preparar <ChevronRight className="h-3 w-3" />
                                    </button>
                                  ) : col.status === 'en_preparacion' ? (
                                    <>
                                      <button
                                        onClick={() => handleMove(it.id, 'en_preparacion', 'pendiente')}
                                        disabled={busy}
                                        title="Regresar a pendiente"
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold py-1 px-1.5 rounded-lg transition-colors flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                                      >
                                        <ChevronLeft className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => handleMove(it.id, 'en_preparacion', 'listo')}
                                        disabled={busy}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 px-2 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                      >
                                        Listo <Check className="h-3 w-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">
                                      Por despachar
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 space-y-2 z-[110]">
          {toasts.map(t => (
            <div
              key={t.id}
              onClick={() => dismissToast(t.id)}
              className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg cursor-pointer animate-section"
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
