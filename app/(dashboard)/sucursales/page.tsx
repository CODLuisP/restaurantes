'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Store, Plus, Pencil, MapPin, Phone, Loader2 } from 'lucide-react';
import { Modal, Input, Toggle, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  getSucursales, createSucursal, updateSucursal,
  type Sucursal,
} from '@/lib/api/sucursales';

interface FormState {
  nombre: string;
  codEstablecimiento: string;
  direccion: string;
  telefono: string;
  activo: boolean;
}

const emptyForm = (): FormState => ({ nombre: '', codEstablecimiento: '0000', direccion: '', telefono: '', activo: true });

export default function SucursalesPage() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  /* Solo el superadmin administra todas las sucursales de la empresa; un admin regular
     opera fijo sobre la suya y no puede crear otras (el backend ya lo rechaza igual). */
  const isSuperAdmin = session?.user?.role === 'superadmin';

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sucursal | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = () => {
    if (!token) return;
    setCargando(true);
    getSucursales(token)
      .then(setSucursales)
      .catch(() => triggerToast('Error al cargar las sucursales.', 'error'))
      .finally(() => setCargando(false));
  };

  useEffect(load, [token]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (s: Sucursal) => {
    setEditing(s);
    setForm({ nombre: s.nombre, codEstablecimiento: s.codEstablecimiento ?? '0000', direccion: s.direccion ?? '', telefono: s.telefono ?? '', activo: s.activo });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSubmit = async () => {
    if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
    const nombre = form.nombre.trim();
    if (!nombre) { triggerToast('Ingresa un nombre para la sucursal.', 'warning'); return; }

    setSaving(true);
    try {
      if (editing) {
        const actualizada = await updateSucursal(token, editing.id, {
          nombre, codEstablecimiento: form.codEstablecimiento.trim() || '0000', direccion: form.direccion.trim() || null, telefono: form.telefono.trim() || null, activo: form.activo,
        });
        setSucursales(prev => prev.map(s => (s.id === editing.id ? actualizada : s)));
        triggerToast('Sucursal actualizada.', 'success');
      } else {
        const creada = await createSucursal(token, {
          nombre, codEstablecimiento: form.codEstablecimiento.trim() || '0000', direccion: form.direccion.trim() || null, telefono: form.telefono.trim() || null,
        });
        setSucursales(prev => [...prev, creada]);
        triggerToast('Sucursal creada.', 'success');
      }
      closeModal();
    } catch {
      triggerToast('No se pudo guardar la sucursal.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (s: Sucursal, activo: boolean) => {
    if (!token) return;
    setTogglingId(s.id);
    try {
      const actualizada = await updateSucursal(token, s.id, {
        nombre: s.nombre, codEstablecimiento: s.codEstablecimiento, direccion: s.direccion, telefono: s.telefono, activo,
      });
      setSucursales(prev => prev.map(x => (x.id === s.id ? actualizada : x)));
    } catch {
      triggerToast('No se pudo cambiar el estado de la sucursal.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Sucursales</h3>
          <p className="text-xs text-slate-500">Administra los locales de tu negocio.</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>Agregar sucursal</Button>
        )}
      </div>

      {cargando ? (
        <div className="card-lg flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 text-slate-300 animate-spin" />
        </div>
      ) : sucursales.length === 0 ? (
        <div className="card-lg flex flex-col items-center justify-center text-center py-20 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
            <Store className="h-7 w-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Todavía no hay sucursales configuradas</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Agrega el primer local de tu negocio para empezar a operar desde ahí.
          </p>
          {isSuperAdmin && (
            <Button onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />} className="mt-2">Agregar sucursal</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sucursales.map(s => (
            <div key={s.id} className={`card-lg p-5 space-y-3 ${!s.activo ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <Store className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{s.nombre}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${s.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {s.activo ? 'Activa' : 'Inactiva'}
                      </span>
                      <span className="text-[9px] font-mono font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                        #{s.codEstablecimiento ?? '0000'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10 shrink-0">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /> {s.direccion || 'Sin dirección'}</div>
                <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" /> {s.telefono || 'Sin teléfono'}</div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-600">Sucursal activa</span>
                <Toggle checked={s.activo} onChange={v => handleToggleActivo(s, v)} disabled={togglingId === s.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar sucursal' : 'Nueva sucursal'}
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={saving}>{editing ? 'Guardar cambios' : 'Crear sucursal'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nombre *" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Sucursal Miraflores" />
          <Input label="Código Establecimiento" value={form.codEstablecimiento} onChange={e => setForm(f => ({ ...f, codEstablecimiento: e.target.value }))} placeholder="0000" maxLength={10} />
          <Input label="Dirección" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Av. Larco 123" />
          <Input label="Teléfono" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+51 999 888 777" />
          {editing && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-slate-700">Sucursal activa</span>
              <Toggle checked={form.activo} onChange={v => setForm(f => ({ ...f, activo: v }))} />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
