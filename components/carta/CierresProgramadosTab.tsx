'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CalendarOff, Trash2 } from 'lucide-react';
import { Button, Modal, Select, Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getCierres, createCierre, deleteCierre } from '@/lib/api/cierres';
import { getSucursales } from '@/lib/api/sucursales';
import type { CierreDto } from '@/types/cierres';

export default function CierresProgramadosTab() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === 'superadmin';

  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [sId, setSId] = useState<number | null>(null);
  const [cierres, setCierres] = useState<CierreDto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getSucursales(token).then(lista => {
      const activas = lista.filter(s => s.activo);
      setSucursales(activas.map(s => ({ id: s.id, nombre: s.nombre })));
      const id = session?.user?.sucursalId ?? activas[0]?.id;
      if (id) { setSId(id); load(id); }
      else { setLoading(false); }
    }).catch(() => setLoading(false));
  }, [token]);

  const load = (id: number) => {
    if (!token) return;
    setLoading(true);
    getCierres(token, id).then(setCierres).catch(() => setCierres([])).finally(() => setLoading(false));
  };

  const handleGuardar = async () => {
    if (!motivo.trim() || !desde || !hasta || !token || !sId) return;
    setSaving(true);
    try {
      const c = await createCierre(token, sId, { motivo: motivo.trim(), desde, hasta });
      setCierres(prev => [...prev, c]);
      setMotivo(''); setDesde(''); setHasta('');
      setModalOpen(false);
      triggerToast('Cierre programado.', 'success');
    } catch { triggerToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await deleteCierre(token, id);
      setCierres(prev => prev.filter(c => c.id !== id));
    } catch { triggerToast('Error al eliminar', 'error'); }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando cierres programados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isSuperAdmin && sucursales.length > 0 && (
        <div className="flex justify-end">
          <Select value={sId ?? ''} onChange={e => { const id = Number(e.target.value); setSId(id); load(id); }}>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Programa cierres futuros con un motivo visible para tus clientes</p>
        <Button size="sm" onClick={() => setModalOpen(true)} className="shrink-0">Nuevo cierre</Button>
      </div>

      {cierres.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
          <CalendarOff className="h-6 w-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay cierres programados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cierres.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{c.motivo}</p>
                <p className="text-[11px] text-slate-500">
                  {new Date(c.desde).toLocaleString('es-PE')} — {new Date(c.hasta).toLocaleString('es-PE')}
                </p>
              </div>
              <button type="button" onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-rose-500 shrink-0" aria-label="Eliminar cierre">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-[11px] text-blue-700">El cierre se activa automáticamente al llegar la hora de inicio y desaparece al llegar la hora de fin. Tus clientes verán el motivo en el menú.</p>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setMotivo(''); setDesde(''); setHasta(''); }}
        title="Nuevo cierre programado"
        subtitle="Tus clientes verán este motivo en el menú durante el cierre"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); setMotivo(''); setDesde(''); setHasta(''); }}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={!motivo.trim() || !desde || !hasta || saving}>{saving ? 'Guardando...' : 'Guardar cierre'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Motivo del cierre *</label>
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Feriado, mantenimiento..." className="input w-full px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desde *</label>
              <input type="datetime-local" value={desde} onChange={e => setDesde(e.target.value)} className="input w-full px-3 py-2" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hasta *</label>
              <input type="datetime-local" value={hasta} onChange={e => setHasta(e.target.value)} className="input w-full px-3 py-2" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
