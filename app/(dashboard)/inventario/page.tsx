'use client';

import { useState } from 'react';
import { Search, PlusCircle, AlertTriangle, AlertCircle, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function InventarioPage() {
  const { products, triggerToast } = useApp();
  const [inventorySearch, setInventorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = products
    .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
    .filter(p =>
      p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(inventorySearch.toLowerCase())
    );

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Control Físico de Inventario</h3>
          <p className="text-xs text-gray-500">Módulo para regular el stock disponible en almacén para la carta hoy.</p>
        </div>
        <button
          onClick={() => triggerToast('Mecanismo para registrar insumos no habilitado en maquetación.', 'info')}
          className="btn-primary"
        >
          <PlusCircle className="h-4 w-4" /> Registrar Ítem
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={inventorySearch}
            onChange={e => setInventorySearch(e.target.value)}
            className="input w-full pl-9 pr-4 py-1.5"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Categoría:</span>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input px-3 py-1.5"
          >
            <option value="all">Todas</option>
            <option value="Entradas">Entradas</option>
            <option value="Platos de fondo">Platos de Fondo</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Postres">Postres</option>
            <option value="Promociones">Promociones</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="p-4">SKU / Código</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Unidad</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => {
                const isLow = p.stock > 0 && p.stock <= 12;
                const isZero = p.stock === 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-semibold text-slate-700">{p.sku}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                          <img src={p.image} alt="" className="h-full w-full object-cover" />
                        </div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{p.category}</td>
                    <td className="p-4 text-slate-600">{p.unit}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-800">{p.stock}</td>
                    <td className="p-4">
                      {isZero ? (
                        <span className="badge badge-danger flex items-center gap-1 w-max">
                          <AlertTriangle className="h-3.5 w-3.5" /> REABASTECER URGENTE (0)
                        </span>
                      ) : isLow ? (
                        <span className="badge badge-warning flex items-center gap-1 w-max">
                          <AlertCircle className="h-3.5 w-3.5" /> Stock Mínimo ({p.stock})
                        </span>
                      ) : (
                        <span className="badge badge-success flex items-center gap-1 w-max">
                          <Check className="h-3.5 w-3.5" /> Óptimo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
