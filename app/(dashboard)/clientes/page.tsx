'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function ClientesPage() {
  const { customers } = useApp();
  const [customerSearch, setCustomerSearch] = useState('');

  const filtered = customers.filter(c =>
    c.nombre.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-section">
      <div className="flex items-center justify-between pb-3 border-b border-gray-150">
        <div>
          <h3 className="text-xl font-bold text-gray-900">CRM Clientes RestoPro</h3>
          <p className="text-xs text-gray-500">
            Registro unificado de hábitos de consumo y fidelización de comensales frecuentes.
          </p>
        </div>
        <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">
          Total: {customers.length} Registrados
        </span>
      </div>

      <div className="bg-slate-200 p-4 rounded-xl border border-slate-300 flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre..."
            value={customerSearch}
            onChange={e => setCustomerSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-slate-100 text-slate-800 border border-slate-300 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(cust => (
          <div key={cust.id} className="bg-slate-200 p-5 rounded-2xl border border-slate-300 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-slate-800">{cust.nombre}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">ID: {cust.id.toUpperCase()}</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">VIP Gold</span>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <p>📱 Telefono: <strong className="text-slate-800">{cust.telefono}</strong></p>
              <p>✉️ Email: <span className="font-mono text-slate-700">{cust.email}</span></p>
              <p>📅 Última Visita: <strong className="text-slate-800">{cust.ultimaCompra}</strong></p>
            </div>

            <div className="pt-3 border-t border-slate-300 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-100 p-2 rounded-xl">
                <p className="text-[10px] text-slate-500">T. Visitas</p>
                <p className="font-mono font-bold text-slate-800">{cust.compras}</p>
              </div>
              <div className="bg-slate-100 p-2 rounded-xl">
                <p className="text-[10px] text-slate-500">Gastado</p>
                <p className="font-mono font-bold text-emerald-700">S/. {cust.totalGastado.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
