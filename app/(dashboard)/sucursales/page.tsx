'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Store, Plus, Pencil, MapPin, Phone, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal, Input, Toggle, Button, Alert } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  getSucursales, createSucursal, updateSucursal, sincronizarSucursalFacturacion, calcularSeriesPorDefecto,
  type Sucursal, type SeriesFacturacionOverride,
} from '@/lib/api/sucursales';

const SERIE_FIELDS: { serie: keyof SeriesFacturacionOverride; correlativo: keyof SeriesFacturacionOverride; label: string }[] = [
  { serie: 'serieFactura', correlativo: 'correlativoFactura', label: 'Factura' },
  { serie: 'serieBoleta', correlativo: 'correlativoBoleta', label: 'Boleta' },
  { serie: 'serieNotaCreditoFactura', correlativo: 'correlativoNotaCreditoFactura', label: 'Nota Créd. Fact.' },
  { serie: 'serieNotaCreditoBoleta', correlativo: 'correlativoNotaCreditoBoleta', label: 'Nota Créd. Bol.' },
  { serie: 'serieNotaDebitoFactura', correlativo: 'correlativoNotaDebitoFactura', label: 'Nota Déb. Fact.' },
  { serie: 'serieNotaDebitoBoleta', correlativo: 'correlativoNotaDebitoBoleta', label: 'Nota Déb. Bol.' },
];

type SyncFormState = Record<string, string>;

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
  const [sincronizandoId, setSincronizandoId] = useState<number | null>(null);
  const [syncTarget, setSyncTarget] = useState<Sucursal | null>(null);
  const [syncForm, setSyncForm] = useState<SyncFormState>({});

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

  const openSincronizar = (s: Sucursal) => {
    const defaults = calcularSeriesPorDefecto(s.codEstablecimiento ?? '0000');
    const form: SyncFormState = {};
    for (const f of SERIE_FIELDS) {
      form[f.serie] = defaults[f.serie as keyof typeof defaults];
      form[f.correlativo] = '1';
    }
    setSyncForm(form);
    setSyncTarget(s);
  };

  const closeSincronizar = () => setSyncTarget(null);

  const handleSincronizar = async () => {
    if (!token || !syncTarget) return;
    setSincronizandoId(syncTarget.id);
    try {
      const series: SeriesFacturacionOverride = {};
      for (const f of SERIE_FIELDS) {
        (series as Record<string, unknown>)[f.serie] = syncForm[f.serie];
        const correlativoNum = Number(syncForm[f.correlativo]);
        (series as Record<string, unknown>)[f.correlativo] = Number.isFinite(correlativoNum) ? correlativoNum : undefined;
      }
      const actualizada = await sincronizarSucursalFacturacion(token, syncTarget.id, series);
      setSucursales(prev => prev.map(x => (x.id === syncTarget.id ? actualizada : x)));
      if (actualizada.sincronizadoFacturacion) {
        triggerToast('Sucursal sincronizada con facturación.', 'success');
        closeSincronizar();
      } else {
        triggerToast('No se pudo sincronizar todavía. Verifica la API de facturación e intenta de nuevo.', 'warning');
      }
    } catch {
      triggerToast('No se pudo sincronizar la sucursal con facturación.', 'error');
    } finally {
      setSincronizandoId(null);
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
                      {!s.sincronizadoFacturacion && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> No sincronizada
                        </span>
                      )}
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

              {!s.sincronizadoFacturacion && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => openSincronizar(s)}
                  loading={sincronizandoId === s.id}
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  Sincronizar con facturación
                </Button>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-600">Sucursal activa</span>
                <Toggle checked={s.activo} onChange={v => handleToggleActivo(s, v)} disabled={togglingId === s.id} />
              </div>

              {s.sincronizadoFacturacion && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Sincronizada con SUNAT
                </div>
              )}
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

      <Modal
        open={!!syncTarget}
        onClose={closeSincronizar}
        title="Sincronizar con facturación"
        subtitle={syncTarget ? `${syncTarget.nombre} · #${syncTarget.codEstablecimiento ?? '0000'}` : undefined}
        size="lg"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={closeSincronizar} disabled={sincronizandoId === syncTarget?.id}>Cancelar</Button>
            <Button onClick={handleSincronizar} loading={sincronizandoId === syncTarget?.id}>Sincronizar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert variant="info">
            Estas series se calcularon como sugerencia a partir del código de establecimiento. No todas las sucursales
            deben usar la misma numeración — revísalas y ajústalas antes de sincronizar si hace falta.
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERIE_FIELDS.map(f => (
              <div key={f.serie} className="grid grid-cols-2 gap-2 items-end">
                <Input
                  label={`Serie ${f.label}`}
                  value={syncForm[f.serie] ?? ''}
                  maxLength={4}
                  onChange={e => setSyncForm(prev => ({ ...prev, [f.serie]: e.target.value.toUpperCase() }))}
                />
                <Input
                  label="Correlativo"
                  type="number"
                  min={1}
                  value={syncForm[f.correlativo] ?? ''}
                  onChange={e => setSyncForm(prev => ({ ...prev, [f.correlativo]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
