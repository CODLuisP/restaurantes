'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, X } from 'lucide-react';
import { Toggle, Button, Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  DAY_LABELS,
  DAY_ORDER,
  makeDefaultSchedule,
  normalizeSchedule,
  type DayKey,
  type DaySchedule,
} from '@/context/HorariosContext';
import { getConfiguracion, guardarConfiguracion } from '@/lib/api/configuracion';
import { useSucursalSelector } from '@/hooks/useSucursalSelector';

const DESC_CORTA_MAX = 200;
const DESC_LARGA_MAX = 500;

export default function HorariosTab({ sucursalId: propSucursalId }: { sucursalId?: number | null }) {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;

  const { sId: fallbackSId, sucursalesLoading } = useSucursalSelector();
  const sId = propSucursalId !== undefined ? propSucursalId : fallbackSId;

  const [schedule, setSchedule] = useState<Record<DayKey, DaySchedule>>(makeDefaultSchedule());
  const [descCorta, setDescCorta] = useState('');
  const [descCompleta, setDescCompleta] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  /** Si la carga falla no se muestran valores por defecto como si fueran reales (guardarlos pisaría lo guardado). */
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (sId) load(sId);
    else if (!sucursalesLoading) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sId, sucursalesLoading]);

  const load = (id: number) => {
    if (!token) return;
    setLoading(true);
    setLoadError(false);
    getConfiguracion(token, id)
      .then(c => {
        setDescCorta(c.descripcionCorta ?? '');
        setDescCompleta(c.descripcionCompleta ?? '');
        if (c.horariosJson) {
          try {
            setSchedule(normalizeSchedule(JSON.parse(c.horariosJson)));
          } catch {
            setSchedule(makeDefaultSchedule());
          }
        } else {
          setSchedule(makeDefaultSchedule());
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  const handleSave = async () => {
    if (!token || !sId) return;

    // Cada día abierto necesita rangos completos y con la hora de cierre posterior a la de apertura.
    for (const key of DAY_ORDER) {
      const d = schedule[key];
      if (!d.enabled) continue;
      const incompleto = d.ranges.some(r => !r.from || !r.to);
      const alReves = d.ranges.some(r => r.from && r.to && r.to <= r.from);
      if (incompleto) {
        triggerToast(`${DAY_LABELS[key]}: completa la hora de apertura y de cierre (o quita el rango).`, 'warning');
        return;
      }
      if (alReves) {
        triggerToast(`${DAY_LABELS[key]}: la hora de cierre debe ser posterior a la de apertura.`, 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      await guardarConfiguracion(token, sId, {
        descripcionCorta: descCorta,
        descripcionCompleta: descCompleta,
        horariosJson: JSON.stringify(schedule),
      });
      triggerToast('Horarios guardados.', 'success');
    } catch {
      triggerToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (key: DayKey, updater: (day: DaySchedule) => DaySchedule) => {
    setSchedule(prev => ({ ...prev, [key]: updater(prev[key]) }));
  };

  const applyToDays = (source: DayKey, targets: DayKey[]) => {
    setSchedule(prev => {
      const next = { ...prev };
      targets.forEach(t => {
        next[t] = {
          enabled: prev[source].enabled,
          ranges: prev[source].ranges.map(r => ({ ...r })),
        };
      });
      return next;
    });
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando horarios y configuración...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-slate-700">No se pudo cargar la configuración de horarios.</p>
        <p className="text-xs text-slate-500">Para no pisar lo que ya tenías guardado, no se muestran valores por defecto.</p>
        <Button onClick={() => sId && load(sId)}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">Configura los horarios de atención de tu negocio</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DAY_ORDER.map((key, idx) => {
          const d = schedule[key];
          return (
            <div key={key} className={`rounded-xl border px-4 py-3 ${d.enabled ? 'bg-brand/5 border-brand/20' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Toggle checked={d.enabled} onChange={v => updateDay(key, day => ({ ...day, enabled: v }))} />
                  <span className="text-sm font-semibold text-slate-800">{DAY_LABELS[key]}</span>
                </div>
                {idx === 0 ? (
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-brand">
                    <button type="button" onClick={() => applyToDays('lun', ['mar', 'mie', 'jue', 'vie'])} className="hover:underline">Lun-Vie</button>
                    <button type="button" onClick={() => applyToDays('lun', ['mar', 'mie', 'jue', 'vie', 'sab', 'dom'])} className="hover:underline">Todos</button>
                  </div>
                ) : !d.enabled ? (
                  <span className="text-[11px] italic text-slate-400">Cerrado</span>
                ) : null}
              </div>
              {d.enabled && (
                <div className="space-y-2 pl-11">
                  {d.ranges.map((range, ri) => (
                    <div key={ri} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={range.from}
                        onChange={e =>
                          updateDay(key, day => ({
                            ...day,
                            ranges: day.ranges.map((r, i) => (i === ri ? { ...r, from: e.target.value } : r)),
                          }))
                        }
                        className="input px-2.5 py-1.5 text-xs w-28"
                      />
                      <span className="text-xs text-slate-400">a</span>
                      <input
                        type="time"
                        value={range.to}
                        onChange={e =>
                          updateDay(key, day => ({
                            ...day,
                            ranges: day.ranges.map((r, i) => (i === ri ? { ...r, to: e.target.value } : r)),
                          }))
                        }
                        className="input px-2.5 py-1.5 text-xs w-28"
                      />
                      {d.ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateDay(key, day => ({
                              ...day,
                              ranges: day.ranges.filter((_, i) => i !== ri),
                            }))
                          }
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateDay(key, day => ({ ...day, ranges: [...day.ranges, { from: '', to: '' }] }))}
                    className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Agregar rango
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-slate-100">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Descripción del negocio</p>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción corta</label>
        <input
          type="text"
          value={descCorta}
          onChange={e => setDescCorta(e.target.value.slice(0, DESC_CORTA_MAX))}
          placeholder="Breve descripción..."
          className="input w-full px-3 py-2"
        />
        <p className="text-right text-[11px] text-slate-400">{descCorta.length}/{DESC_CORTA_MAX}</p>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción completa</label>
        <textarea
          value={descCompleta}
          onChange={e => setDescCompleta(e.target.value.slice(0, DESC_LARGA_MAX))}
          placeholder="Describe tu negocio en detalle..."
          rows={4}
          className="input w-full px-3 py-2 resize-none"
        />
        <p className="text-right text-[11px] text-slate-400">{descCompleta.length}/{DESC_LARGA_MAX}</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
      </div>
    </div>
  );
}
