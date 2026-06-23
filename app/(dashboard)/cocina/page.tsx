'use client';

import { Clock, ChevronRight, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function CocinaPage() {
  const { kitchenOrders, changeKitchenStatus } = useApp();

  const COLUMNS = [
    { status: 'pendiente' as const,  label: 'Pendiente',             dot: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-800',    empty: 'No hay pedidos pendientes.' },
    { status: 'preparando' as const, label: 'Preparando',            dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-800',  empty: 'No hay pedidos preparándose.' },
    { status: 'listo' as const,      label: 'Listo para Despachar',  dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800', empty: 'No hay comandas preparadas para servir hoy.' },
  ];

  return (
    <div className="space-y-6 animate-section">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Kitchen Display System (KDS)</h3>
          <p className="text-xs text-gray-500">Kanban de preparación gastronómica en tiempo real para chefs.</p>
        </div>
        <span className="text-xs bg-brand/10 text-brand px-3 py-1.5 rounded-full font-bold">
          Sincronizado con Comandero POS
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {COLUMNS.map(col => {
          const orders = kitchenOrders.filter(o => o.status === col.status);
          return (
            <div key={col.status} className="bg-slate-50 p-4 rounded-2xl flex flex-col space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} /> {col.label}
                </span>
                <span className={`text-[10px] px-2 rounded-full font-bold ${col.badge}`}>
                  {orders.length} {col.status === 'preparando' ? 'en curso' : col.status === 'listo' ? 'listos' : 'órdenes'}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {orders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400 italic">{col.empty}</div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className={`card p-4 flex flex-col space-y-3 ${col.status === 'listo' ? 'opacity-80' : ''}`}>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span className="font-mono font-bold text-slate-800">{order.id} - {order.table}</span>
                        {col.status === 'pendiente' && (
                          <span className="text-rose-500 font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Hace {order.elapsed} min
                          </span>
                        )}
                        {col.status === 'preparando' && (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Preparando hace {order.elapsed} m
                          </span>
                        )}
                        {col.status === 'listo' && (
                          <span className="text-emerald-500 font-bold font-mono">DESPACHADO</span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx} className={`flex justify-between text-xs font-medium ${col.status === 'listo' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                            <span>{it.name}</span>
                            <span className="font-mono">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-200">
                        {col.status === 'pendiente' && (
                          <button
                            onClick={() => changeKitchenStatus(order.id, 'preparando')}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            Preparar <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                        {col.status === 'preparando' && (
                          <button
                            onClick={() => changeKitchenStatus(order.id, 'listo')}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            ¡Listo para Servir! <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {col.status === 'listo' && (
                          <div className="flex justify-end">
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">
                              Finalizado en {order.elapsed} min
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
