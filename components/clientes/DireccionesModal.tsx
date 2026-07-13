'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, MapPin } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useClienteDirecciones } from '@/hooks/clientes/useClienteDirecciones';
import type { Cliente, ClienteDireccion, CreateClienteDireccionDto, UpdateClienteDireccionDto } from '@/types/clientes';

interface DireccionesModalProps {
  cliente: Cliente | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (cliente: Cliente) => void;
}

const TIPO_LABELS = { fiscal: 'Fiscal', entrega: 'Entrega', ambos: 'Ambos' };

const FORM_EMPTY: CreateClienteDireccionDto = {
  departamento: '', provincia: '', distrito: '', direccion: '', ubigeo: '', tipo: 'fiscal',
};

export default function DireccionesModal({ cliente, open, onClose, onUpdated }: DireccionesModalProps) {
  const { agregar, editar, eliminar } = useClienteDirecciones();
  const [editando, setEditando] = useState<ClienteDireccion | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState<CreateClienteDireccionDto>(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  if (!cliente) return null;

  const resetForm = () => { setForm(FORM_EMPTY); setEditando(null); setAgregando(false); };

  const handleAgregar = async () => {
    setSaving(true);
    const actualizado = await agregar(cliente.id, form);
    if (actualizado) onUpdated(actualizado);
    setSaving(false);
    resetForm();
  };

  const handleEditar = async () => {
    if (!editando) return;
    setSaving(true);
    const dto: UpdateClienteDireccionDto = { ...form, activo: editando.activo };
    const actualizado = await editar(cliente.id, editando.id, dto);
    if (actualizado) onUpdated(actualizado);
    setSaving(false);
    resetForm();
  };

  const handleEliminar = async (id: number) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    const actualizado = await eliminar(cliente.id, id);
    if (actualizado) onUpdated(actualizado);
    setDeleteConfirm(null);
  };

  const iniciarEdicion = (dir: ClienteDireccion) => {
    setEditando(dir);
    setAgregando(false);
    setForm({
      departamento: dir.departamento ?? '',
      provincia: dir.provincia ?? '',
      distrito: dir.distrito ?? '',
      direccion: dir.direccion ?? '',
      ubigeo: dir.ubigeo ?? '',
      tipo: dir.tipo,
    });
  };

  const formulario = (
    <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departamento</label>
          <input className="input w-full px-3 py-2" value={form.departamento ?? ''} onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))} placeholder="Lima" />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Provincia</label>
          <input className="input w-full px-3 py-2" value={form.provincia ?? ''} onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))} placeholder="Lima" />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Distrito</label>
          <input className="input w-full px-3 py-2" value={form.distrito ?? ''} onChange={e => setForm(f => ({ ...f, distrito: e.target.value }))} placeholder="Miraflores" />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
          <select className="input w-full px-3 py-2" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as CreateClienteDireccionDto['tipo'] }))}>
            <option value="fiscal">Fiscal</option>
            <option value="entrega">Entrega</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección</label>
        <input className="input w-full px-3 py-2" value={form.direccion ?? ''} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Av. Principal 123" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={resetForm}>Cancelar</Button>
        <Button size="sm" loading={saving} onClick={editando ? handleEditar : handleAgregar}>
          {editando ? 'Guardar cambios' : 'Agregar'}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Direcciones — ${cliente.nombre}`}
      subtitle="Gestiona las direcciones de este cliente"
      fullHeight={false}
      size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      <div className="space-y-4">
        {cliente.direcciones.length === 0 && !agregando ? (
          <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center">
            <MapPin className="h-5 w-5 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Este cliente no tiene direcciones registradas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cliente.direcciones.map(dir => (
              <div key={dir.id} className="flex items-start gap-3 border border-slate-200 rounded-xl px-4 py-3">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800">{dir.direccion || '—'}</p>
                  <p className="text-[11px] text-slate-500">
                    {[dir.distrito, dir.provincia, dir.departamento].filter(Boolean).join(', ')}
                  </p>
                  <span className="text-[10px] font-semibold text-brand">{TIPO_LABELS[dir.tipo]}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => iniciarEdicion(dir)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleEliminar(dir.id)}
                    className={`p-1.5 rounded-lg transition-colors ${deleteConfirm === dir.id ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                  >
                    {deleteConfirm === dir.id ? <Check className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(agregando || editando) && formulario}

        {!agregando && !editando && (
          <button onClick={() => { setAgregando(true); setForm(FORM_EMPTY); }} className="flex items-center gap-2 text-xs text-brand hover:underline">
            <Plus className="h-3.5 w-3.5" /> Agregar dirección
          </button>
        )}
      </div>
    </Modal>
  );
}
