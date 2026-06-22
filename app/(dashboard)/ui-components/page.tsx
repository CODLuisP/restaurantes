'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function UIComponentsPage() {
  const { triggerToast } = useApp();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-8 animate-section">
      <div>
        <h3 className="text-xl font-bold text-slate-800">Guía de Estilos y Componentes UI de Marca (RestoPro Perú)</h3>
        <p className="text-xs text-slate-500">
          Componentes interactivos para propósitos de diseño de software y auditoría visual de consistencia de marca corporativa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Buttons */}
        <div className="bg-slate-200 p-6 rounded-2xl border border-slate-300 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-300 pb-2">
            1. Botones (Buttons)
          </h4>
          <div className="flex flex-wrap gap-3">
            <button className="bg-[#007542] hover:bg-[#1E8C45] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs">Green Primary</button>
            <button className="bg-[#58BB43] hover:bg-[#3AA346] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">Acento Verde</button>
            <button className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-semibold px-4 py-2 rounded-xl transition-all">Neutral Muted</button>
            <button className="border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold px-4 py-2 rounded-xl transition-all">Danger Outline</button>
          </div>
        </div>

        {/* Forms */}
        <div className="bg-slate-200 p-6 rounded-2xl border border-slate-300 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-300 pb-2">
            2. Formularios (Inputs y Selects)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block uppercase">Buscar Insumo</label>
              <input type="text" defaultValue="Ceviche Clásico" className="w-full text-xs bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-slate-800" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block uppercase">Elegir Salón</label>
              <select className="w-full text-xs bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-slate-800">
                <option>Terraza Exterior</option>
                <option>Salón Principal</option>
                <option>Vip Room</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modals */}
        <div className="bg-slate-200 p-6 rounded-2xl border border-slate-300 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-300 pb-2">
            3. Ventanas Modales Interactivas
          </h4>
          <p className="text-xs text-slate-500">Haz clic para evaluar layouts en superposición modal.</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#007542] hover:bg-[#1E8C45] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            Ver Lanzador Modal Demo
          </button>
        </div>

        {/* Badges */}
        <div className="bg-slate-200 p-6 rounded-2xl border border-slate-300 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-300 pb-2">
            4. Indicadores Visuales (Badges y Tooltips)
          </h4>
          <div className="flex flex-wrap gap-3">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">VIP ACTIVO</span>
            <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full">AGOTADO HOY</span>
            <span className="bg-amber-100 text-amber-850 text-xs font-bold px-2.5 py-1 rounded-full">RESERVADO</span>
          </div>
        </div>

        {/* Skeleton */}
        <div className="bg-slate-200 p-6 rounded-2xl border border-slate-300 shadow-xs space-y-4 col-span-1 lg:col-span-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-300 pb-2">
            5. Skeleton Loaders — Simulación de precarga asíncrona
          </h4>
          <div className="space-y-3 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="rounded-xl bg-slate-300 h-10 w-10" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-2 bg-slate-300 rounded w-1/4" />
                <div className="h-2 bg-slate-300 rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-200 border border-slate-300 rounded-3xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-300">
              <h4 className="text-sm font-bold text-slate-800">Caja de Registro de Control de Maqueta</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-800 text-lg">×</button>
            </div>
            <p className="text-xs text-slate-500">
              Este popup interactivo ha sido programado para validar la superposición de elementos en pantallas reducidas.
            </p>
            <div className="bg-emerald-100 p-3 rounded-2xl text-xs text-emerald-800">
              <strong>Listo:</strong> Los componentes han heredado la paleta verde corporativa correctamente.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs px-4 py-2 rounded-xl font-medium">
                Cerrar Vista
              </button>
              <button
                onClick={() => { setShowModal(false); triggerToast('Cambios del componente guardados.', 'success'); }}
                className="bg-[#007542] text-white text-xs px-4 py-2 rounded-xl font-medium"
              >
                Aplicar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
