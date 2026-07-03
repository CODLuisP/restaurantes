'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, Utensils, Receipt, CalendarClock, Unlock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { MOCK_TABLES } from '@/data/mockData';

export default function MesasPage() {
  const { tables, setTables, setTableStatus, triggerToast } = useApp();
  const { currentUser } = useAuth();
  const router = useRouter();

  const canTakeOrder = currentUser?.role === 'admin' || currentUser?.role === 'mozo';
  const canCharge    = currentUser?.role === 'admin' || currentUser?.role === 'cajero';

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Distribución del Salón de Comensales</h3>
          <p className="text-xs text-slate-500">
            {canTakeOrder
              ? 'Elige una mesa libre para tomar el pedido; el consumo se acumula hasta el cobro.'
              : 'Selecciona una mesa ocupada para cobrar el consumo del comensal.'}
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Disponible</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Ocupada</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Reservada</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => {
          const isOcupada = table.status === 'ocupada';
          const isReservada = table.status === 'reservada';
          const isDisponible = table.status === 'disponible';
          return (
            <div
              key={table.id}
              className={`card-lg p-5 hover:shadow-md transition-all duration-200 relative border-t-4 flex flex-col ${
                isDisponible ? 'border-t-emerald-500' : isOcupada ? 'border-t-rose-500' : 'border-t-amber-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 font-mono">CODE: {table.id.toUpperCase()}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isDisponible ? 'bg-emerald-100 text-emerald-800' : isOcupada ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                }`}>
                  {table.status}
                </span>
              </div>

              <div className="my-4 text-center">
                <h4 className="text-lg font-bold text-slate-800 tracking-tight">{table.name}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Capacidad: {table.capacidad} personas</p>
                {isOcupada && table.waiter && (
                  <p className="text-[10px] text-brand mt-1 font-medium">Atiende: {table.waiter}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500">Consumido:</span>
                <span className="font-mono font-bold text-slate-800">S/. {table.cuenta.toFixed(2)}</span>
              </div>

              {/* Acciones según rol y estado */}
              <div className="mt-3 space-y-2">
                {canTakeOrder && (isDisponible || isReservada) && (
                  <button
                    onClick={() => router.push(`/pos?mesa=${encodeURIComponent(table.name)}`)}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-brand hover:bg-brand-hover py-1.5 rounded-lg transition-colors"
                  >
                    <Utensils className="w-3.5 h-3.5" /> Tomar pedido
                  </button>
                )}
                {canTakeOrder && isOcupada && (
                  <button
                    onClick={() => router.push(`/pos?mesa=${encodeURIComponent(table.name)}`)}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-brand bg-brand/10 hover:bg-brand/20 py-1.5 rounded-lg transition-colors"
                  >
                    <Utensils className="w-3.5 h-3.5" /> Agregar a comanda
                  </button>
                )}
                {canCharge && isOcupada && (
                  <button
                    onClick={() => router.push(`/cobrar?mesa=${encodeURIComponent(table.name)}`)}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-sky-700 hover:bg-sky-800 py-1.5 rounded-lg transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" /> Cobrar
                  </button>
                )}
                {isDisponible && (
                  <button
                    onClick={() => setTableStatus(table.id, 'reservada')}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 py-1.5 rounded-lg transition-colors"
                  >
                    <CalendarClock className="w-3.5 h-3.5" /> Reservar
                  </button>
                )}
                {isReservada && (
                  <button
                    onClick={() => setTableStatus(table.id, 'disponible')}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1.5 rounded-lg transition-colors"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Liberar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-emerald-500/10 border border-brand/10 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-brand" />
          <p className="text-xs text-gray-700">
            <strong>Flujo:</strong> el mozo toma el pedido en una mesa → la comanda llega a Cocina → el cajero cobra desde &quot;Cobrar&quot; y libera la mesa.
          </p>
        </div>
        <button
          onClick={() => { setTables(MOCK_TABLES); triggerToast('Distribución de mesas restablecida.', 'info'); }}
          className="text-xs font-bold text-brand hover:underline shrink-0"
        >
          Restablecer Todo
        </button>
      </div>
    </div>
  );
}
