'use client';

import { useState } from 'react';
import { Truck, Plus, Trash2 } from 'lucide-react';
import { useGastos } from '@/context/GastosContext';
import { useApp } from '@/context/AppContext';

export default function ProveedoresTab() {
  const { proveedores, gastos, addProveedor, removeProveedor } = useGastos();
  const { triggerToast } = useApp();
  const [name, setName] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addProveedor(trimmed);
    setName('');
    triggerToast(`Proveedor "${trimmed}" agregado.`, 'success');
  };

  const handleRemove = (id: string, proveedorName: string) => {
    removeProveedor(id);
    triggerToast(`Proveedor "${proveedorName}" eliminado.`, 'info');
  };

  return (
    <div className="card-lg p-6 space-y-5">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Ej: Sol, Distribuidora Central..."
          className="input flex-1 px-3 py-2"
        />
        <button type="button" onClick={handleAdd} disabled={!name.trim()} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
          <Plus className="h-3.5 w-3.5" /> Agregar
        </button>
      </div>

      {proveedores.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Truck className="h-7 w-7 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">Aún no tienes proveedores registrados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {proveedores.map(p => {
            const count = gastos.filter(g => g.proveedorId === p.id).length;
            return (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <Truck className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {count} {count === 1 ? 'gasto' : 'gastos'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(p.id, p.name)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  aria-label={`Eliminar ${p.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
