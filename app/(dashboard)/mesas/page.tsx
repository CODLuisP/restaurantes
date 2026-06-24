'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '@/context/AppContext';
import { MOCK_TABLES } from '@/data/mockData';
import type { Table } from '@/types';

export default function MesasPage() {
  const { tables, setTables, cycleTableStatus, triggerToast } = useApp();
  const [qrMesa, setQrMesa] = useState<Table | null>(null);

  const [baseUrl, setBaseUrl] = useState('');
  useEffect(() => { setBaseUrl(window.location.origin); }, []);

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
              className={`card-lg p-5 hover:shadow-md transition-all duration-200 group relative border-t-4 ${
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

              <button
                onClick={() => cycleTableStatus(table.id)}
                className="w-full my-4 text-center"
              >
                <h4 className="text-lg font-bold text-slate-800 tracking-tight">{table.name}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Capacidad: {table.capacidad} personas</p>
              </button>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500">Total Consumido:</span>
                <span className="font-mono font-bold text-slate-800">S/. {table.cuenta.toFixed(2)}</span>
              </div>

              <button
                onClick={e => { e.stopPropagation(); setQrMesa(table); }}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-brand bg-brand/10 hover:bg-brand/20 py-1.5 rounded-lg transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                Ver QR
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-emerald-500/10 border border-brand/10 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-brand" />
          <p className="text-xs text-gray-700">
            <strong>Tip operativo:</strong> Puedes hacer clic en el nombre de cualquier mesa para cambiar su estado, o en &quot;Ver QR&quot; para mostrar el código a los clientes.
          </p>
        </div>
        <button
          onClick={() => { setTables(MOCK_TABLES); triggerToast('Distribución de mesas restablecida.', 'info'); }}
          className="text-xs font-bold text-brand hover:underline"
        >
          Restablecer Todo
        </button>
      </div>

      {/* QR Modal */}
      {qrMesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
            <div className="bg-[#005e34] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">{qrMesa.name}</h3>
                <p className="text-white/60 text-[11px] font-mono uppercase tracking-wider">Carta Digital</p>
              </div>
              <button onClick={() => setQrMesa(null)} className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-inner border border-slate-100">
                <QRCodeSVG
                  value={`${baseUrl}/menu/${qrMesa.id}`}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#005e34"
                  level="M"
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-700">Escanea para ver la carta del día</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1 break-all">{baseUrl}/menu/{qrMesa.id}</p>
              </div>
              <a
                href={`${baseUrl}/menu/${qrMesa.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center px-4 py-2 rounded-xl text-sm font-semibold bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
              >
                Abrir Carta del Cliente
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
