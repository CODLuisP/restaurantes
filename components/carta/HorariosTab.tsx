'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Toggle } from '@/components/ui';

type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

interface DayRange { from: string; to: string }
interface DaySchedule { enabled: boolean; ranges: DayRange[] }

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'lun', label: 'Lunes' },
  { key: 'mar', label: 'Martes' },
  { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves' },
  { key: 'vie', label: 'Viernes' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const DEFAULT_RANGE: DayRange = { from: '09:00', to: '22:00' };

function makeDefaultSchedule(): Record<DayKey, DaySchedule> {
  return {
    lun: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    mar: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    mie: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    jue: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    vie: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    sab: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    dom: { enabled: false, ranges: [{ ...DEFAULT_RANGE }] },
  };
}

export default function HorariosTab() {
  const [zonaHoraria, setZonaHoraria] = useState('Peru (Lima)');
  const [schedule, setSchedule] = useState<Record<DayKey, DaySchedule>>(makeDefaultSchedule);

  const updateDay = (key: DayKey, updater: (day: DaySchedule) => DaySchedule) => {
    setSchedule(prev => ({ ...prev, [key]: updater(prev[key]) }));
  };

  const applyToDays = (source: DayKey, targets: DayKey[]) => {
    setSchedule(prev => {
      const next = { ...prev };
      targets.forEach(t => { next[t] = { enabled: prev[source].enabled, ranges: prev[source].ranges.map(r => ({ ...r })) }; });
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">Configura los horarios de atención de tu negocio</p>

      <div className="w-full sm:w-1/2 space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Zona horaria
        </label>
        <input
          type="text"
          value={zonaHoraria}
          onChange={e => setZonaHoraria(e.target.value)}
          className="input w-full px-3 py-2"
        />
        <p className="text-[11px] text-slate-500">
          Los horarios de apertura y cierre se evalúan en esta zona horaria
        </p>
      </div>

      <div className="space-y-3">
        {DAYS.map((day, idx) => {
          const d = schedule[day.key];
          return (
            <div
              key={day.key}
              className={`rounded-xl border px-4 py-3 transition-colors ${
                d.enabled ? 'bg-brand/5 border-brand/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={d.enabled}
                    onChange={v => updateDay(day.key, day => ({ ...day, enabled: v }))}
                  />
                  <span className="text-sm font-semibold text-slate-800">{day.label}</span>
                </div>
                {idx === 0 ? (
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-brand">
                    <button type="button" onClick={() => applyToDays('lun', ['mar', 'mie', 'jue', 'vie'])} className="hover:underline">
                      Lun-Vie
                    </button>
                    <button type="button" onClick={() => applyToDays('lun', ['mar', 'mie', 'jue', 'vie', 'sab', 'dom'])} className="hover:underline">
                      Todos
                    </button>
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
                        onChange={e => updateDay(day.key, day => ({
                          ...day,
                          ranges: day.ranges.map((r, i) => i === ri ? { ...r, from: e.target.value } : r),
                        }))}
                        className="input px-2.5 py-1.5 text-xs w-28"
                      />
                      <span className="text-xs text-slate-400">a</span>
                      <input
                        type="time"
                        value={range.to}
                        onChange={e => updateDay(day.key, day => ({
                          ...day,
                          ranges: day.ranges.map((r, i) => i === ri ? { ...r, to: e.target.value } : r),
                        }))}
                        className="input px-2.5 py-1.5 text-xs w-28"
                      />
                      {d.ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => updateDay(day.key, day => ({ ...day, ranges: day.ranges.filter((_, i) => i !== ri) }))}
                          className="p-1 text-slate-400 hover:text-rose-500"
                          aria-label="Quitar rango"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateDay(day.key, day => ({ ...day, ranges: [...day.ranges, { from: '', to: '' }] }))}
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

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <p className="text-[11px] text-slate-600">
          <strong className="text-slate-700">Tip:</strong> Usa &quot;Agregar rango&quot; para horarios
          partidos (ej: 11:00–15:00 almuerzo + 18:00–23:00 cena). Configura el primer día y usa
          &quot;Lun-Vie&quot; o &quot;Todos&quot; para copiar rápido.
        </p>
      </div>
    </div>
  );
}
