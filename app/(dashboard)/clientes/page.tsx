'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Search, Download, Plus, Users, Eye, Pencil, Trash2, Check, MapPin } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getSegment, SEGMENT_COLORS, SEGMENTS } from '@/components/clientes/segment';
import { useClientes } from '@/hooks/clientes/useClientes';
import { CLIENTES_API } from '@/hooks/clientes/clientesApi';
import ClienteDetailModal from '@/components/clientes/ClienteDetailModal';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import EditarClienteModal from '@/components/clientes/EditarClienteModal';
import type { Cliente, NivelCliente } from '@/types/clientes';
import type { Segment } from '@/components/clientes/segment';

const NIVEL_SEGMENT: Record<NivelCliente, Segment> = {
  NUEVO: 'Nuevo', OCASIONAL: 'Ocasional', FRECUENTE: 'Frecuente', FIEL: 'Fiel', VIP: 'VIP',
};

function exportToCsv(clientes: Cliente[]) {
  const header = ['Nombre', 'Documento', 'Teléfono', 'Email', 'Nivel', 'Total gastado', 'Último pedido'];
  const rows = clientes.map(c => [
    c.nombre, c.numeroDocumento ?? '', c.telefono ?? '', c.email ?? '',
    c.nivel, c.totalGastado.toFixed(2),
    c.ultimoPedido ? new Date(c.ultimoPedido).toLocaleDateString('es-PE') : '',
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
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const { clientes, setClientes, loading, fetchClientes } = useClientes();

  const [search, setSearch] = useState('');
  const [filterSegment, setFilterSegment] = useState<Segment | 'Todos'>('Todos');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [editandoCliente, setEditandoCliente] = useState<Cliente | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const token = session?.accessToken;

  const segmentCounts = useMemo(() => {
    const counts: Record<Segment, number> = { Nuevo: 0, Ocasional: 0, Frecuente: 0, Fiel: 0, VIP: 0 };
    clientes.forEach(c => { counts[NIVEL_SEGMENT[c.nivel]]++; });
    return counts;
  }, [clientes]);

  const filtered = clientes.filter(c => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (c.telefono ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesSegment = filterSegment === 'Todos' || NIVEL_SEGMENT[c.nivel] === filterSegment;
    return matchesSearch && matchesSegment;
  });

  const handleDelete = async (id: number) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    try {
      const res = await fetch(CLIENTES_API.delete(id), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setClientes(prev => prev.filter(c => c.id !== id));
      triggerToast('Cliente eliminado', 'success');
    } catch {
      triggerToast('Error al eliminar el cliente', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleCreated = (cliente: Cliente) => {
    setClientes(prev => [cliente, ...prev]);
  };

  const handleUpdated = (cliente: Cliente) => {
    setClientes(prev => prev.map(c => c.id === cliente.id ? cliente : c));
    if (selectedCliente?.id === cliente.id) setSelectedCliente(cliente);
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
            <p className="text-[11px] text-slate-500">Total de clientes: {clientes.length}</p>
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
          <button type="button" onClick={() => fetchClientes()} className="btn-secondary shrink-0">
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
          const pct = clientes.length ? Math.round((count / clientes.length) * 100) : 0;
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
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correo</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nivel</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total gastado</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Último pedido</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    Cargando clientes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const segment = NIVEL_SEGMENT[c.nivel];
                  const colors = SEGMENT_COLORS[segment];
                  const primeraDir = c.direcciones?.[0];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCliente(c)}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-bold shrink-0">
                            {c.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{c.nombre}</p>
                            {c.numeroDocumento && (
                              <p className="text-[11px] text-slate-400">
                                {c.tipoDocumento ? `${c.tipoDocumento}: ` : ''}{c.numeroDocumento}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Correo */}
                      <td className="px-4 py-3 text-xs text-slate-600">{c.email ?? '—'}</td>

                      {/* Dirección */}
                      <td className="px-4 py-3">
                        {primeraDir ? (
                          <div className="flex items-center gap-1 text-xs text-slate-600 max-w-[160px]">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{primeraDir.direccion || [primeraDir.distrito, primeraDir.provincia].filter(Boolean).join(', ') || '—'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Nivel */}
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          {segment}
                        </span>
                      </td>

                      {/* Total gastado */}
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">S/. {c.totalGastado.toFixed(2)}</td>

                      {/* Último pedido */}
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {c.ultimoPedido ? new Date(c.ultimoPedido).toLocaleDateString('es-PE') : '—'}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedCliente(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/5"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditandoCliente(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              deleteConfirm === c.id ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={deleteConfirm === c.id ? 'Clic de nuevo para confirmar' : 'Eliminar'}
                          >
                            {deleteConfirm === c.id ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
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

      <ClienteDetailModal
        cliente={selectedCliente}
        onClose={() => setSelectedCliente(null)}
        onUpdated={handleUpdated}
      />
      <NuevoClienteModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={handleCreated}
      />
      <EditarClienteModal
        cliente={editandoCliente}
        open={!!editandoCliente}
        onClose={() => setEditandoCliente(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
