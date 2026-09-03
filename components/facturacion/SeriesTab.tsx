'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Store, Pencil, ListOrdered } from 'lucide-react';
import { Modal, Input, Button, Spinner, Alert, Badge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  getSeriesFacturacion, updateSucursalFacturacion,
  type SeriesSucursal, type EditarSucursalFacturacion,
} from '@/lib/api/facturacion';
import { ApiError } from '@/lib/api/client';

const SERIE_FIELDS: { serie: keyof SeriesSucursal; correlativo: keyof SeriesSucursal; label: string }[] = [
  { serie: 'serieFactura', correlativo: 'correlativoFactura', label: 'Factura' },
  { serie: 'serieBoleta', correlativo: 'correlativoBoleta', label: 'Boleta' },
  { serie: 'serieNotaCreditoFactura', correlativo: 'correlativoNotaCreditoFactura', label: 'Nota Créd. Fact.' },
  { serie: 'serieNotaCreditoBoleta', correlativo: 'correlativoNotaCreditoBoleta', label: 'Nota Créd. Bol.' },
  { serie: 'serieNotaDebitoFactura', correlativo: 'correlativoNotaDebitoFactura', label: 'Nota Déb. Fact.' },
  { serie: 'serieNotaDebitoBoleta', correlativo: 'correlativoNotaDebitoBoleta', label: 'Nota Déb. Bol.' },
];

type FormState = Record<string, string>;

function buildForm(s: SeriesSucursal): FormState {
  const form: FormState = { nombre: s.nombre };
  for (const f of SERIE_FIELDS) {
    form[f.serie] = String(s[f.serie] ?? '');
    form[f.correlativo] = String(s[f.correlativo] ?? '');
  }
  return form;
}

export default function SeriesTab() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { triggerToast } = useApp();

  const [lista, setLista] = useState<SeriesSucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState<SeriesSucursal | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    getSeriesFacturacion(token)
      .then(setLista)
      .catch(() => setError('No se pudo cargar las series de comprobantes.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const openEdit = (s: SeriesSucursal) => {
    setEditing(s);
    setForm(buildForm(s));
  };

  const closeEdit = () => setEditing(null);

  const handleSave = async () => {
    if (!token || !editing) return;
    setSaving(true);
    try {
      const dto: EditarSucursalFacturacion = { nombre: form.nombre };
      for (const f of SERIE_FIELDS) {
        (dto as Record<string, unknown>)[f.serie] = form[f.serie];
        const correlativoNum = Number(form[f.correlativo]);
        (dto as Record<string, unknown>)[f.correlativo] = Number.isFinite(correlativoNum) ? correlativoNum : undefined;
      }
      await updateSucursalFacturacion(token, editing.sucursalId, dto);
      triggerToast('Series actualizadas.', 'success');
      closeEdit();
      load();
    } catch (err) {
      triggerToast(err instanceof ApiError ? err.message : 'No se pudo guardar las series.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando series de comprobantes...</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-10"><Alert variant="danger" title="No se pudo cargar">{error}</Alert></div>;
  }

  if (lista.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center gap-2">
        <ListOrdered className="h-8 w-8 text-slate-300" />
        <p className="text-xs font-semibold text-slate-600">No hay sucursales registradas en facturación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500">
        Series y correlativos que usa SUNAT para numerar tus comprobantes por sucursal. Solo edítalos si necesitas corregir un error de configuración o hacer una migración — el correlativo avanza automáticamente con cada emisión.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {lista.map(s => (
          <div key={s.sucursalId} className="p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{s.nombre}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-[9px] font-mono font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                      #{s.codEstablecimiento}
                    </span>
                    <Badge variant={s.estado ? 'success' : 'neutral'} size="sm">{s.estado ? 'Activa' : 'Inactiva'}</Badge>
                  </div>
                </div>
              </div>
              <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10 shrink-0">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-slate-100">
              {SERIE_FIELDS.map(f => (
                <div key={f.serie}>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{f.label}</p>
                  <p className="text-xs font-mono font-semibold text-slate-700">
                    {String(s[f.serie]) || '—'}-{String(s[f.correlativo]).padStart(8, '0')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={closeEdit}
        title="Editar series y correlativos"
        subtitle={editing ? `${editing.nombre} · #${editing.codEstablecimiento}` : undefined}
        size="lg"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Guardar cambios</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la sucursal"
            value={form.nombre ?? ''}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          />

          <Alert variant="warning">
            Cambiar un correlativo manualmente puede causar rechazos de SUNAT si no coincide con el último comprobante emitido. Solo edítalo si sabes lo que haces.
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERIE_FIELDS.map(f => (
              <div key={f.serie} className="grid grid-cols-2 gap-2 items-end">
                <Input
                  label={`Serie ${f.label}`}
                  value={form[f.serie] ?? ''}
                  maxLength={4}
                  onChange={e => setForm(prev => ({ ...prev, [f.serie]: e.target.value.toUpperCase() }))}
                />
                <Input
                  label="Correlativo"
                  type="number"
                  min={1}
                  value={form[f.correlativo] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.correlativo]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
