'use client';

import { Store, Plus } from 'lucide-react';

export default function SucursalesPage() {
  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Sucursales</h3>
          <p className="text-xs text-slate-500">Administra los locales de tu negocio.</p>
        </div>
      </div>

      <div className="card-lg flex flex-col items-center justify-center text-center py-20 gap-3">
        <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
          <Store className="h-7 w-7" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Todavía no hay sucursales configuradas</h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Este módulo estará disponible próximamente. Aquí podrás agregar y administrar los distintos locales de tu negocio.
        </p>
        <button
          type="button"
          disabled
          className="mt-2 flex items-center gap-2 text-xs font-bold text-white bg-slate-300 cursor-not-allowed px-4 py-2 rounded-xl"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar sucursal
        </button>
      </div>
    </div>
  );
}
