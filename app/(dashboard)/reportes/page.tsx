'use client';

import { Share2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function ReportesPage() {
  const { triggerToast } = useApp();

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Módulo de Reportería del Sistema</h3>
          <p className="text-xs text-gray-500">Visualizaciones avanzadas para decisiones corporativas mensuales.</p>
        </div>
        <button
          onClick={() => triggerToast('Reporte descargado como archivo Excel correctamente.', 'success')}
          className="bg-[#007542] hover:bg-[#1E8C45] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
        >
          <Share2 className="h-4 w-4" /> Exportar a Excel (.xlsx)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category revenue */}
        <div className="bg-slate-200 p-5 rounded-2xl border border-slate-300 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Categorías con Mayor Revenue</h4>
          <div className="space-y-3">
            {[
              { label: 'Platos de Fondo', pct: 45, color: 'bg-[#007542]' },
              { label: 'Entradas',        pct: 30, color: 'bg-[#1E8C45]' },
              { label: 'Bebidas',         pct: 15, color: 'bg-emerald-500' },
              { label: 'Postres',         pct: 10, color: 'bg-amber-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>{item.label}</span>
                  <span className="font-mono font-bold">{item.pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-300 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational times */}
        <div className="bg-slate-200 p-5 rounded-2xl border border-slate-300 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tiempos Promedio Operación</h4>
          <div className="space-y-4">
            {[
              { label: 'Preparación en Cocina',  sub: 'Desde ingreso de orden',   value: '14 min', color: 'text-emerald-600' },
              { label: 'Tiempo Permanencia Mesa', sub: 'Total permanencia comensal', value: '52 min', color: 'text-amber-600' },
              { label: 'Despacho Delivery',       sub: 'Ruta promedio en Lima',    value: '28 min', color: 'text-indigo-600' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <div className="text-xs text-slate-600">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-[10px] text-slate-550">{item.sub}</p>
                </div>
                <span className={`font-mono text-sm font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Peak hours chart */}
        <div className="bg-slate-200 p-5 rounded-2xl border border-slate-300 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Distribución de Aforo Pico</h4>
          <div className="flex justify-between items-end h-28 pt-2">
            {[
              { h: 'h-10',     color: 'bg-slate-300',  label: '1pm' },
              { h: 'h-24',     color: 'bg-[#007542]',  label: '2pm' },
              { h: 'h-16',     color: 'bg-slate-300',  label: '3pm' },
              { h: 'h-8',      color: 'bg-slate-300',  label: '4pm' },
              { h: 'h-20',     color: 'bg-emerald-500', label: '8pm' },
              { h: 'h-[88px]', color: 'bg-[#1E8C45]',  label: '9pm' },
            ].map(bar => (
              <div key={bar.label} className="w-1/6 flex flex-col items-center gap-1">
                <div className={`w-full ${bar.color} ${bar.h} rounded`} />
                <span className="text-[9px] text-slate-500 font-mono">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion goal */}
      <div className="bg-slate-200 p-5 rounded-2xl border border-slate-300">
        <h4 className="text-sm font-semibold text-slate-800 mb-4">Meta de Conversión Anual</h4>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative h-24 w-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="36" stroke="#cbd5e1" strokeWidth="8" fill="transparent" />
              <circle cx="48" cy="48" r="36" stroke="#007542" strokeWidth="8" fill="transparent" strokeDasharray="226" strokeDashoffset="45" />
            </svg>
            <span className="absolute text-sm font-bold text-slate-800 font-mono">80%</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <p className="font-bold text-slate-800">Fidelización de Comensales VIP</p>
            <p className="text-slate-600 leading-relaxed">
              Este módulo computa el total de clientes recurrentes registrados en el CRM con más de 12 visitas. Has obtenido un incremento del 14% respecto al mes anterior. ¡Excelente desempeño operativo de la cocina!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
