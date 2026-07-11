'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { CLIENTES_API } from '@/hooks/clientes/clientesApi';
import DireccionesModal from './DireccionesModal';
import type { Cliente, UpdateClienteDto, NivelCliente, TipoDocumento } from '@/types/clientes';

interface EditarClienteModalProps {
  cliente: Cliente | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (cliente: Cliente) => void;
}

const NIVELES: NivelCliente[] = ['NUEVO', 'OCASIONAL', 'FRECUENTE', 'FIEL', 'VIP'];
const TIPOS_DOC: TipoDocumento[] = ['DNI', 'RUC', 'CE', 'PASAPORTE'];

export default function EditarClienteModal({ cliente, open, onClose, onUpdated }: EditarClienteModalProps) {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const [form, setForm] = useState<UpdateClienteDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDirecciones, setShowDirecciones] = useState(false);
  const [clienteLocal, setClienteLocal] = useState<Cliente | null>(null);

  const token = session?.accessToken;

  useEffect(() => {
    if (!cliente) return;
    setClienteLocal(cliente);
    setForm({
      nombre: cliente.nombre,
      tipoDocumento: cliente.tipoDocumento ?? 'DNI',
      numeroDocumento: cliente.numeroDocumento ?? '',
      telefono: cliente.telefono ?? '',
      email: cliente.email ?? '',
      nivel: cliente.nivel,
      notas: cliente.notas ?? '',
      estado: cliente.estado,
    });
  }, [cliente]);

  if (!cliente || !form) return null;

  const f = (field: keyof UpdateClienteDto) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => prev ? ({ ...prev, [field]: e.target.value }) : prev);

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(CLIENTES_API.update(cliente.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, nombre: form.nombre.trim() }),
      });
      if (!res.ok) throw new Error();
      const actualizado: Cliente = await res.json();
      triggerToast('Cliente actualizado', 'success');
      onUpdated(actualizado);
      onClose();
    } catch {
      triggerToast('Error al actualizar el cliente', 'error');
    } finally {
      setSaving(false);
    }
  };

  const primeraDir = clienteLocal?.direcciones?.[0];

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Editar cliente"
        subtitle={`Modificando: ${cliente.nombre}`}
        fullHeight={false}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nombre.trim()} loading={saving}>Guardar cambios</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre completo *</label>
            <input type="text" value={form.nombre} onChange={f('nombre')} className="input w-full px-3 py-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Documento</label>
              <div className="flex gap-2">
                <select value={form.tipoDocumento ?? 'DNI'} onChange={f('tipoDocumento')} className="input px-3 py-2 w-28 shrink-0">
                  {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" value={form.numeroDocumento ?? ''} onChange={f('numeroDocumento')} placeholder="Número" className="input w-full px-3 py-2" />
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
              <input type="tel" value={form.telefono ?? ''} onChange={f('telefono')} className="input w-full px-3 py-2" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <input type="email" value={form.email ?? ''} onChange={f('email')} className="input w-full px-3 py-2" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notas</label>
            <textarea value={form.notas ?? ''} onChange={f('notas')} rows={2} className="input w-full px-3 py-2 resize-none" />
          </div>

          {/* Sección de direcciones */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Direcciones</span>
                <span className="text-[10px] text-slate-400">({clienteLocal?.direcciones?.length ?? 0})</span>
              </div>
              <button onClick={() => setShowDirecciones(true)} className="text-xs text-brand hover:underline">
                Gestionar direcciones
              </button>
            </div>
            {primeraDir && (
              <p className="text-[11px] text-slate-500 truncate">
                {[primeraDir.direccion, primeraDir.distrito, primeraDir.provincia].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      </Modal>

      <DireccionesModal
        cliente={clienteLocal}
        open={showDirecciones}
        onClose={() => setShowDirecciones(false)}
        onUpdated={(c) => { setClienteLocal(c); onUpdated(c); }}
      />
    </>
  );
}
