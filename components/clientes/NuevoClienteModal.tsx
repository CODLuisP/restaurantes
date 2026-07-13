'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { CLIENTES_API } from '@/hooks/clientes/clientesApi';
import type { Cliente, CreateClienteDto, CreateClienteDireccionDto, NivelCliente, TipoDocumento } from '@/types/clientes';

interface NuevoClienteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (cliente: Cliente) => void;
}

const NIVELES: NivelCliente[] = ['NUEVO', 'OCASIONAL', 'FRECUENTE', 'FIEL', 'VIP'];

const DIR_EMPTY: CreateClienteDireccionDto = {
  departamento: '', provincia: '', distrito: '', direccion: '', ubigeo: '', tipo: 'fiscal',
};

const TIPOS_DOC: TipoDocumento[] = ['DNI', 'RUC', 'CE', 'PASAPORTE'];

const FORM_EMPTY = {
  nombre: '', tipoDocumento: 'DNI' as TipoDocumento, numeroDocumento: '',
  telefono: '', email: '', nivel: 'NUEVO' as NivelCliente, notas: '',
};

export default function NuevoClienteModal({ open, onClose, onCreated }: NuevoClienteModalProps) {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const [form, setForm] = useState(FORM_EMPTY);
  const [direcciones, setDirecciones] = useState<CreateClienteDireccionDto[]>([]);
  const [saving, setSaving] = useState(false);

  const token = session?.accessToken;

  const reset = () => { setForm(FORM_EMPTY); setDirecciones([]); };
  const close = () => { onClose(); reset(); };

  const f = (field: keyof typeof FORM_EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const agregarDireccion = () => setDirecciones(prev => [...prev, { ...DIR_EMPTY }]);

  const quitarDireccion = (idx: number) =>
    setDirecciones(prev => prev.filter((_, i) => i !== idx));

  const updateDir = (idx: number, field: keyof CreateClienteDireccionDto, value: string) =>
    setDirecciones(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const dto: CreateClienteDto = {
        nombre: form.nombre.trim(),
        tipoDocumento: form.numeroDocumento.trim() ? form.tipoDocumento : undefined,
        numeroDocumento: form.numeroDocumento.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        nivel: form.nivel,
        notas: form.notas.trim() || undefined,
        direcciones: direcciones.filter(d => d.direccion?.trim()),
      };
      const res = await fetch(CLIENTES_API.create(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error();
      const cliente: Cliente = await res.json();
      triggerToast('Cliente creado correctamente', 'success');
      onCreated(cliente);
      close();
    } catch {
      triggerToast('Error al crear el cliente', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nuevo cliente"
      subtitle="Registra un cliente en tu CRM"
      fullHeight={false}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.nombre.trim()} loading={saving}>Guardar cliente</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Datos principales */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre completo *</label>
          <input type="text" value={form.nombre} onChange={f('nombre')} placeholder="Ej: Juan Pérez" className="input w-full px-3 py-2" autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Documento</label>
            <div className="flex gap-2">
              <select value={form.tipoDocumento} onChange={f('tipoDocumento')} className="input px-3 py-2 w-28 shrink-0">
                {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="text" value={form.numeroDocumento} onChange={f('numeroDocumento')} placeholder="Número" className="input w-full px-3 py-2" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nivel</label>
            <select value={form.nivel} onChange={f('nivel')} className="input w-full px-3 py-2">
              {NIVELES.map(n => <option key={n} value={n}>{n.charAt(0) + n.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Teléfono</label>
            <input type="tel" value={form.telefono} onChange={f('telefono')} placeholder="912 903 330" className="input w-full px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
            <input type="email" value={form.email} onChange={f('email')} placeholder="cliente@correo.com" className="input w-full px-3 py-2" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notas</label>
          <textarea value={form.notas} onChange={f('notas')} placeholder="Observaciones opcionales..." rows={2} className="input w-full px-3 py-2 resize-none" />
        </div>

        {/* Direcciones múltiples */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Direcciones {direcciones.length > 0 && `(${direcciones.length})`}
            </span>
            <button type="button" onClick={agregarDireccion} className="flex items-center gap-1 text-xs text-brand hover:underline">
              <Plus className="h-3 w-3" /> Agregar dirección
            </button>
          </div>

          {direcciones.map((dir, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">Dirección {idx + 1}</span>
                <button type="button" onClick={() => quitarDireccion(idx)} className="p-1 rounded text-slate-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departamento</label>
                  <input className="input w-full px-3 py-2" value={dir.departamento ?? ''} onChange={e => updateDir(idx, 'departamento', e.target.value)} placeholder="Lima" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Provincia</label>
                  <input className="input w-full px-3 py-2" value={dir.provincia ?? ''} onChange={e => updateDir(idx, 'provincia', e.target.value)} placeholder="Lima" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Distrito</label>
                  <input className="input w-full px-3 py-2" value={dir.distrito ?? ''} onChange={e => updateDir(idx, 'distrito', e.target.value)} placeholder="Miraflores" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                  <select className="input w-full px-3 py-2" value={dir.tipo} onChange={e => updateDir(idx, 'tipo', e.target.value)}>
                    <option value="fiscal">Fiscal</option>
                    <option value="entrega">Entrega</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección</label>
                <input className="input w-full px-3 py-2" value={dir.direccion ?? ''} onChange={e => updateDir(idx, 'direccion', e.target.value)} placeholder="Av. Principal 123" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
