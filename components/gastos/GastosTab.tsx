'use client';

import { useMemo, useState } from 'react';
import {
  Plus, Pencil, Ban, Wallet, CalendarClock, AlertTriangle, Search,
} from 'lucide-react';
import { useGastos, type Gasto, type GastoStatus } from '@/context/GastosContext';
import { useApp } from '@/context/AppContext';
import { Modal, Input, Select, Button } from '@/components/ui';

const money = (n: number) => `S/. ${n.toFixed(2)}`;

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '');
};

type RangeMode = 'hoy' | '7dias' | '30dias' | 'custom';
type StatusFilter = 'activos' | 'pagado' | 'pendiente' | 'anulado' | 'todos';

const emptyForm = () => ({
  date: todayStr(),
  description: '',
  categoriaId: '' as string,
  proveedorId: '' as string,
  status: 'pagado' as GastoStatus,
  amount: '',
});

export default function GastosTab() {
  const { gastos, categorias, proveedores, addGasto, updateGasto, anularGasto } = useGastos();
  const { triggerToast } = useApp();

  const [rangeMode, setRangeMode] = useState<RangeMode>('30dias');
  const [dateFrom, setDateFrom] = useState(daysAgoStr(29));
  const [dateTo, setDateTo] = useState(todayStr());
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [proveedorFilter, setProveedorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('activos');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const applyRange = (mode: RangeMode) => {
    setRangeMode(mode);
    if (mode === 'hoy') { setDateFrom(todayStr()); setDateTo(todayStr()); }
    else if (mode === '7dias') { setDateFrom(daysAgoStr(6)); setDateTo(todayStr()); }
    else if (mode === '30dias') { setDateFrom(daysAgoStr(29)); setDateTo(todayStr()); }
  };

  const categoriaName = (id: string | null) => (id ? categorias.find(c => c.id === id)?.name : null) ?? '—';
  const proveedorName = (id: string | null) => (id ? proveedores.find(p => p.id === id)?.name : null) ?? '—';

  const filtered = useMemo(() => {
    return gastos.filter(g => {
      if (g.date < dateFrom || g.date > dateTo) return false;
      if (categoriaFilter && g.categoriaId !== categoriaFilter) return false;
      if (proveedorFilter && g.proveedorId !== proveedorFilter) return false;
      if (statusFilter === 'activos' && g.status === 'anulado') return false;
      if (statusFilter !== 'activos' && statusFilter !== 'todos' && g.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [gastos, dateFrom, dateTo, categoriaFilter, proveedorFilter, statusFilter]);

  const stats = useMemo(() => {
    const activos = filtered.filter(g => g.status !== 'anulado');
    const totalPeriodo = activos.reduce((sum, g) => sum + g.amount, 0);
    const porPagar = activos.filter(g => g.status === 'pendiente').reduce((sum, g) => sum + g.amount, 0);
    const today = todayStr();
    const vencidos = activos
      .filter(g => g.status === 'pendiente' && g.date < today)
      .reduce((sum, g) => sum + g.amount, 0);
    return { totalPeriodo, porPagar, vencidos };
  }, [filtered]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (g: Gasto) => {
    setEditingId(g.id);
    setForm({
      date: g.date,
      description: g.description,
      categoriaId: g.categoriaId ?? '',
      proveedorId: g.proveedorId ?? '',
      status: g.status,
      amount: String(g.amount),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    const description = form.description.trim();
    const amount = Number(form.amount);
    if (!description || !amount || amount <= 0) return;

    const payload = {
      date: form.date,
      description,
      categoriaId: form.categoriaId || null,
      proveedorId: form.proveedorId || null,
      status: form.status,
      amount,
    };

    if (editingId) {
      updateGasto(editingId, payload);
      triggerToast('Gasto actualizado.', 'success');
    } else {
      addGasto(payload);
      triggerToast('Gasto registrado.', 'success');
    }
    closeForm();
  };

  const handleAnular = (g: Gasto) => {
    anularGasto(g.id);
    triggerToast(`Gasto "${g.description}" anulado.`, 'info');
  };

  const statusBadge = (status: GastoStatus, isVencido: boolean) => {
    if (status === 'anulado') return <span className="badge bg-slate-100 text-slate-500">Anulado</span>;
    if (status === 'pagado') return <span className="badge badge-success">Pagado</span>;
    if (isVencido) return <span className="badge badge-danger">Vencido</span>;
    return <span className="badge badge-warning">Pendiente</span>;
  };

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-lg p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="h-3 w-3" /> Total del período
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{money(stats.totalPeriodo)}</p>
        </div>
        <div className="card-lg p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3" /> Por pagar
          </p>
          <p className="text-2xl font-extrabold text-amber-500 mt-1">{money(stats.porPagar)}</p>
        </div>
        <div className="card-lg p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Vencidos
          </p>
          <p className="text-2xl font-extrabold text-rose-500 mt-1">{money(stats.vencidos)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
          {(['hoy', '7dias', '30dias'] as RangeMode[]).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => applyRange(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                rangeMode === mode ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {mode === 'hoy' ? 'Hoy' : mode === '7dias' ? '7 días' : '30 días'}
            </button>
          ))}
        </div>

        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setRangeMode('custom'); }}
          className="input px-3 py-2 text-xs"
        />
        <span className="text-slate-400 text-xs">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setRangeMode('custom'); }}
          className="input px-3 py-2 text-xs"
        />

        <select value={categoriaFilter} onChange={e => setCategoriaFilter(e.target.value)} className="input px-3 py-2 text-xs">
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={proveedorFilter} onChange={e => setProveedorFilter(e.target.value)} className="input px-3 py-2 text-xs">
          <option value="">Todos los proveedores</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="input px-3 py-2 text-xs">
          <option value="activos">Pagados y pendientes</option>
          <option value="pagado">Pagados</option>
          <option value="pendiente">Pendientes</option>
          <option value="anulado">Anulados</option>
          <option value="todos">Todos</option>
        </select>

        <button type="button" onClick={openCreate} className="btn-primary ml-auto shrink-0">
          <Plus className="h-3.5 w-3.5" /> Nuevo gasto
        </button>
      </div>

      {/* Tabla */}
      <div className="card-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Search className="h-7 w-7 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-500">No hay gastos en este período con esos filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Fecha</th>
                  <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Descripción</th>
                  <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Categoría</th>
                  <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Proveedor</th>
                  <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Estado</th>
                  <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right">Importe</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => {
                  const isVencido = g.status === 'pendiente' && g.date < todayStr();
                  return (
                    <tr key={g.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{fmtDate(g.date)}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{g.description}</td>
                      <td className="px-5 py-3 text-slate-500">{categoriaName(g.categoriaId)}</td>
                      <td className="px-5 py-3 text-slate-500">{proveedorName(g.proveedorId)}</td>
                      <td className="px-5 py-3">{statusBadge(g.status, isVencido)}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-800 whitespace-nowrap">{money(g.amount)}</td>
                      <td className="px-5 py-3">
                        {g.status !== 'anulado' && (
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => openEdit(g)} className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
                              <Pencil className="h-3 w-3" /> Editar
                            </button>
                            <button onClick={() => handleAnular(g)} className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:underline">
                              <Ban className="h-3 w-3" /> Anular
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editingId ? 'Editar gasto' : 'Nuevo gasto'}
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.description.trim() || !Number(form.amount)}>
              {editingId ? 'Guardar cambios' : 'Registrar gasto'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha *"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="Importe (S/.) *"
              type="number" min={0} step={0.5}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          <Input
            label="Descripción *"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ej: Recibo de luz"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoría"
              value={form.categoriaId}
              onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
            >
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select
              label="Proveedor"
              value={form.proveedorId}
              onChange={e => setForm(f => ({ ...f, proveedorId: e.target.value }))}
            >
              <option value="">Sin proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, status: 'pagado' }))}
                className={`py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  form.status === 'pagado' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Pagado
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, status: 'pendiente' }))}
                className={`py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  form.status === 'pendiente' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Pendiente
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
