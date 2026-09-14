'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Check, ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { createCliente } from '@/lib/api/clientes';
import type { Cliente, CreateClienteDto, CreateClienteDireccionDto, NivelCliente, TipoDocumento } from '@/types/clientes';

interface NuevoClienteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (cliente: Cliente) => void;
}

const NIVELES: NivelCliente[] = ['NUEVO', 'OCASIONAL', 'FRECUENTE', 'FIEL', 'VIP'];

const DIR_EMPTY: CreateClienteDireccionDto = {
  departamento: '', provincia: '', distrito: '', direccion: '', ubigeo: '', tipo: 'Fiscal',
};

/* Sugerencias del campo "Tipo" de cada dirección — el usuario igual puede escribir cualquier
   otro valor, no está limitado a estas dos opciones. */
const TIPO_DIRECCION_OPTIONS = ['Fiscal', 'Entrega'];

const TIPOS_DOC: TipoDocumento[] = ['DNI', 'RUC', 'CE'];

/* Longitud exacta de dígitos por tipo de documento (la misma que usa la consulta a json.pe). */
const DOC_LENGTH: Partial<Record<TipoDocumento, number>> = { DNI: 8, RUC: 11, CE: 9 };

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
  const [consultandoDoc, setConsultandoDoc] = useState(false);
  const [openTipoDir, setOpenTipoDir] = useState<number | null>(null);

  const token = session?.accessToken;

  const reset = () => { setForm(FORM_EMPTY); setDirecciones([]); };
  const close = () => { onClose(); reset(); };

  const f = (field: keyof typeof FORM_EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  /* El número de documento solo acepta dígitos, y se limita a la longitud exacta del tipo
     seleccionado (8 DNI / 11 RUC / 9 CE) para no permitir números a medio validar. */
  const handleTipoDocumento = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipoDocumento = e.target.value as TipoDocumento;
    const maxLen = DOC_LENGTH[tipoDocumento];
    setForm(prev => ({
      ...prev,
      tipoDocumento,
      numeroDocumento: maxLen ? prev.numeroDocumento.slice(0, maxLen) : prev.numeroDocumento,
    }));
  };

  const handleNumeroDocumento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxLen = DOC_LENGTH[form.tipoDocumento];
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLen);
    setForm(prev => ({ ...prev, numeroDocumento: digits }));
  };

  /* Autocompleta el nombre/razón social por DNI o RUC apenas el número alcanza su longitud
     válida, consultando la API externa (RENIEC/SUNAT vía json.pe) — misma que usa Cobrar.
     No se busca antes en el CRM local porque aquí justamente se está creando un cliente nuevo. */
  useEffect(() => {
    const digits = form.numeroDocumento.replace(/\D/g, '');
    const isRuc = form.tipoDocumento === 'RUC';
    const isDni = form.tipoDocumento === 'DNI';
    const isCe = form.tipoDocumento === 'CE';
    const longitudValida = isRuc ? digits.length === 11 : isDni ? digits.length === 8 : isCe && digits.length === 9;
    if (!longitudValida) return;

    const endpoint = isRuc ? '/api/consultar-ruc' : isCe ? '/api/consultar-ce' : '/api/consultar-dni';
    const body = isRuc ? { ruc: digits } : isCe ? { ce: digits } : { dni: digits };

    let cancelado = false;
    setConsultandoDoc(true);
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(res => res.json())
      .then(data => {
        if (cancelado || !data.success) return;
        const nombre = isRuc
          ? data.data?.nombre_o_razon_social || ''
          : [data.data?.nombres, data.data?.apellido_paterno, data.data?.apellido_materno].filter(Boolean).join(' ').trim();
        if (nombre) setForm(prev => ({ ...prev, nombre }));

        /* El RUC trae la dirección fiscal del negocio: se coloca como la primera dirección
           (principal) para no obligar a escribirla a mano; las que el usuario agregue con
           "Agregar dirección" quedan después, como direcciones adicionales opcionales. */
        if (isRuc) {
          const { direccion, departamento, provincia, distrito } = data.data ?? {};
          if (direccion || departamento || provincia || distrito) {
            const fiscal: CreateClienteDireccionDto = {
              departamento: departamento || '', provincia: provincia || '', distrito: distrito || '',
              direccion: direccion || '', ubigeo: '', tipo: 'Fiscal',
            };
            setDirecciones(prev => prev.length > 0 ? [fiscal, ...prev.slice(1)] : [fiscal]);
          }
        }
      })
      .catch(() => { /* si falla la consulta, el usuario completa el nombre a mano */ })
      .finally(() => { if (!cancelado) setConsultandoDoc(false); });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.numeroDocumento, form.tipoDocumento]);

  /* La primera dirección es la fiscal/principal; las siguientes son de entrega por defecto,
     para no repetir el mismo tipo en cada una (el usuario igual puede cambiarlo). */
  const agregarDireccion = () =>
    setDirecciones(prev => [...prev, { ...DIR_EMPTY, tipo: prev.length === 0 ? 'Fiscal' : 'Entrega' }]);

  const quitarDireccion = (idx: number) =>
    setDirecciones(prev => prev.filter((_, i) => i !== idx));

  const updateDir = (idx: number, field: keyof CreateClienteDireccionDto, value: string) =>
    setDirecciones(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));

  const handleSubmit = async () => {
    if (!form.nombre.trim() || !token) return;

    const maxLen = DOC_LENGTH[form.tipoDocumento];
    if (form.numeroDocumento && maxLen && form.numeroDocumento.length !== maxLen) {
      triggerToast(`El ${form.tipoDocumento} debe tener ${maxLen} dígitos.`, 'warning');
      return;
    }

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
      const cliente = await createCliente(token, dto);
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Documento</label>
            <div className="flex gap-2">
              <select value={form.tipoDocumento} onChange={handleTipoDocumento} className="input px-3 py-2 w-28 shrink-0">
                {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="relative w-full">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.numeroDocumento}
                  onChange={handleNumeroDocumento}
                  maxLength={DOC_LENGTH[form.tipoDocumento]}
                  placeholder={`Número (${DOC_LENGTH[form.tipoDocumento] ?? '—'} dígitos)`}
                  className="input w-full px-3 py-2 pr-8"
                  autoFocus
                />
                {consultandoDoc && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nivel</label>
            <select value={form.nivel} onChange={f('nivel')} className="input w-full px-3 py-2">
              {NIVELES.map(n => <option key={n} value={n}>{n.charAt(0) + n.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre completo *</label>
          <input type="text" value={form.nombre} onChange={f('nombre')} placeholder="Ej: Juan Pérez" className="input w-full px-3 py-2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1 relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                  <div className="relative">
                    <input
                      className="input w-full px-3 py-2 pr-8"
                      value={dir.tipo}
                      onChange={e => { updateDir(idx, 'tipo', e.target.value); setOpenTipoDir(idx); }}
                      onFocus={() => setOpenTipoDir(idx)}
                      onBlur={() => setTimeout(() => setOpenTipoDir(v => v === idx ? null : v), 150)}
                      placeholder="Fiscal, Entrega o personalizado..."
                    />
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {openTipoDir === idx && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                        {TIPO_DIRECCION_OPTIONS.map(opt => {
                          const selected = dir.tipo.trim().toLowerCase() === opt.toLowerCase();
                          return (
                            <button
                              key={opt}
                              type="button"
                              onMouseDown={() => { updateDir(idx, 'tipo', opt); setOpenTipoDir(null); }}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center justify-between transition-colors ${
                                selected ? 'text-brand font-semibold bg-brand/5' : 'text-slate-700'
                              }`}
                            >
                              {opt}
                              {selected && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
