'use client';

import { BellRing, Check, Clock, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

export default function DespacharPage() {
  const { kitchenOrders, dispatchOrder } = useApp();
  const { currentUser } = useAuth();

  /* El admin ve todas las comandas listas; el mozo, solo las suyas */
  const ready = kitchenOrders.filter(
    o => o.status === 'listo' && (currentUser?.role === 'admin' || o.waiter === currentUser?.name)
  );

  return (
    <div className="space-y-6 animate-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BellRing className="h-5 w-5 text-brand" /> Por despachar
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Comandas que cocina marcó como <strong>listas</strong>. Recógelas, sírvelas y confirma la entrega.
          </p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-bold inline-flex items-center gap-1.5 w-max ${
          ready.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
        }`}>
          <BellRing className="h-3.5 w-3.5" /> {ready.length} lista{ready.length !== 1 ? 's' : ''}
        </span>
      </div>

      {ready.length === 0 ? (
        <div className="card-lg p-12 text-center space-y-3 max-w-md mx-auto">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Todo despachado</h4>
          <p className="text-xs text-slate-500">
            No tienes comandas listas por recoger. Cuando cocina marque una como lista, aparecerá aquí y te avisaremos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ready.map(order => (
            <div key={order.id} className="card-lg p-4 flex flex-col space-y-3 border-t-4 border-t-emerald-500">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-slate-800 text-sm">{order.table}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">
                  Listo
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono">{order.id}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {order.time}</span>
              </div>

              <div className="space-y-1 border-t border-slate-100 pt-2">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{it.name}</span>
                    <span className="font-mono">x{it.quantity}</span>
                  </div>
                ))}
              </div>

              {order.waiter && (
                <p className="text-[10px] text-slate-400">Atiende: {order.waiter}</p>
              )}

              <button
                onClick={() => dispatchOrder(order.id)}
                className="w-full mt-auto bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" /> Marcar entregado
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
