'use client';

import { AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MOCK_TABLES } from '@/data/mockData';

export default function MesasPage() {
  const { tables, setTables, cycleTableStatus, triggerToast } = useApp();

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Distribución del Salón de Comensales</h3>
          <p className="text-xs text-slate-500">
            Plano visual interactivo en Lima. Haz clic en las mesas para simular y alternar estados.
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Disponible</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Ocupada</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Reservada</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {tables.map(table => {
          const isOcupada = table.status === 'ocupada';
          const isReservada = table.status === 'reservada';
          const isDisponible = table.status === 'disponible';
          return (
            <div
              key={table.id}
              onClick={() => cycleTableStatus(table.id)}
              className={`card-lg p-5 hover:shadow-md cursor-pointer transition-all duration-200 group relative border-t-4 ${
                isDisponible ? 'border-t-emerald-500' : isOcupada ? 'border-t-rose-500' : 'border-t-amber-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 font-mono">CODE: {table.id.toUpperCase()}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isDisponible ? 'bg-emerald-100 text-emerald-850' : isOcupada ? 'bg-rose-100 text-rose-850' : 'bg-amber-100 text-amber-850'
                }`}>
                  {table.status}
                </span>
              </div>
              <div className="my-4 text-center">
                <h4 className="text-lg font-bold text-slate-800 tracking-tight">{table.name}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Capacidad: {table.capacidad} personas</p>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500">Total Consumido:</span>
                <span className="font-mono font-bold text-slate-800">S/. {table.cuenta.toFixed(2)}</span>
              </div>
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] bg-slate-800 text-white px-1 rounded">Alternar</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-emerald-500/10 border border-brand/10 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-brand" />
          <p className="text-xs text-gray-700">
            <strong>Tip operativo:</strong> Puedes hacer clic en cualquier mesa para cambiar su estado comercial secuencialmente.
          </p>
        </div>
        <button
          onClick={() => { setTables(MOCK_TABLES); triggerToast('Distribución de mesas restablecida.', 'info'); }}
          className="text-xs font-bold text-brand hover:underline"
        >
          Restablecer Todo
        </button>
      </div>
    </div>
  );
}
