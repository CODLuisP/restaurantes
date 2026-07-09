'use client';

import { useMemo, useState } from 'react';
import { Search, Download, Plus, Users, Eye, Pencil, Trash2, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getSegment, SEGMENT_COLORS, SEGMENTS, type Segment } from '@/components/clientes/segment';
import ClienteDetailModal from '@/components/clientes/ClienteDetailModal';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import type { Customer } from '@/types';

function exportToCsv(customers: Customer[]) {
  const header = ['Nombre', 'Telefono', 'Email', 'Nivel', 'Total gastado', 'Pedidos', 'Ultima compra'];
  const rows = customers.map(c => [
    c.nombre, c.telefono, c.email, getSegment(c.compras), c.totalGastado.toFixed(2), c.compras, c.ultimaCompra,
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ClientesPage() {
  const { customers, removeCustomer, triggerToast } = useApp();
  const [search, setSearch] = useState('');
  const [filterSegment, setFilterSegment] = useState<Segment | 'Todos'>('Todos');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const segmentCounts = useMemo(() => {
    const counts: Record<Segment, number> = { Nuevo: 0, Ocasional: 0, Frecuente: 0, Fiel: 0, VIP: 0 };
    customers.forEach(c => { counts[getSegment(c.compras)]++; });
    return counts;
  }, [customers]);

  const filtered = customers.filter(c => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesSegment = filterSegment === 'Todos' || getSegment(c.compras) === filterSegment;
    return matchesSearch && matchesSegment;
  });

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) { removeCustomer(id); setDeleteConfirm(null); }
    else setDeleteConfirm(id);
  };

  return (
    <div className="space-y-5 animate-section">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-brand p-2 rounded-xl">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">Clientes</h3>
            <p className="text-[11px] text-slate-500">Total de clientes: {customers.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono o email..."
              className="input w-full pl-9 pr-3 py-2"
            />
          </div>
          <button type="button" onClick={() => {}} className="btn-secondary shrink-0">
            Buscar
          </button>
          <select
            value={filterSegment}
            onChange={e => setFilterSegment(e.target.value as Segment | 'Todos')}
            className="input px-3 py-2 shrink-0"
          >
            <option value="Todos">Todos</option>
            {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => exportToCsv(filtered)} className="btn-secondary">
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={() => setShowNewModal(true)} className="btn-primary">
            <Plus className="h-3.5 w-3.5" /> Nuevo cliente
          </button>
        </div>
      </div>

      {/* ── Segment tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {SEGMENTS.map(s => {
          const count = segmentCounts[s.key];
          const pct = customers.length ? Math.round((count / customers.length) * 100) : 0;
          const colors = SEGMENT_COLORS[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setFilterSegment(filterSegment === s.key ? 'Todos' : s.key)}
              className={`text-left card p-3.5 transition-all ${filterSegment === s.key ? 'ring-2 ring-brand' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-bold uppercase tracking-wide ${colors.text}`}>{s.label}</span>
                <span className="text-[10px] text-slate-400">{s.range}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <div className="h-1 rounded-full bg-slate-100 mt-2 mb-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-slate-400">{pct}% del total</p>
            </button>
          );
        })}
      </div>

      {/* ── Tabla ── */}
      <div className="card-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nivel</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total gastado</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Último pedido</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                filtered.map(cust => {
                  const segment = getSegment(cust.compras);
                  const colors = SEGMENT_COLORS[segment];
                  return (
                    <tr
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-bold shrink-0">
                            {cust.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{cust.nombre}</p>
                            <p className="text-[11px] text-slate-400">{cust.telefono}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{cust.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          {segment}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">S/. {cust.totalGastado.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{cust.ultimaCompra}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/5"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerToast('La edición de clientes estará disponible próximamente.', 'info')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cust.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              deleteConfirm === cust.id ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={deleteConfirm === cust.id ? 'Clic de nuevo para confirmar' : 'Eliminar'}
                          >
                            {deleteConfirm === cust.id ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClienteDetailModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
      <NuevoClienteModal open={showNewModal} onClose={() => setShowNewModal(false)} />
    </div>
  );
}
