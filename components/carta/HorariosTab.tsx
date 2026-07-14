'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Toggle } from '@/components/ui';
import { useHorarios, DAY_LABELS, DAY_ORDER, type DayKey, type DaySchedule } from '@/context/HorariosContext';

const DESC_CORTA_MAX = 200;
const DESC_LARGA_MAX = 500;

export default function HorariosTab() {
  const { horarios, updateHorarios } = useHorarios();
  const { zonaHoraria, schedule, tipoNegocio, descripcionCompleta, numeroPedidos } = horarios;
  const [descCorta, setDescCorta] = useState('');

  const updateDay = (key: DayKey, updater: (day: DaySchedule) => DaySchedule) => {
    updateHorarios({ schedule: { ...schedule, [key]: updater(schedule[key]) } });
  };

  const applyToDays = (source: DayKey, targets: DayKey[]) => {
    const next = { ...schedule };
    targets.forEach(t => { next[t] = { enabled: schedule[source].enabled, ranges: schedule[source].ranges.map(r => ({ ...r })) }; });
    updateHorarios({ schedule: next });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">Configura los horarios de atención de tu negocio</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Zona horaria
          </label>
          <input
            type="text"
            value={zonaHoraria}
            onChange={e => updateHorarios({ zonaHoraria: e.target.value })}
            className="input w-full px-3 py-2"
          />
          <p className="text-[11px] text-slate-500">
            Los horarios de apertura y cierre se evalúan en esta zona horaria
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Número para pedidos
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-brand transition-colors">
            <span className="h-6 w-6 rounded-md flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/svgs/redes/whatsapp-icon.svg" alt="WhatsApp" className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={numeroPedidos}
              onChange={e => updateHorarios({ numeroPedidos: e.target.value.replace(/[^\d ()+-]/g, '') })}
              placeholder="+51 999 999 999"
              inputMode="tel"
              className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            El WhatsApp que verán tus clientes para llamar o escribir y hacer pedidos.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {DAY_ORDER.map((key, idx) => {
          const d = schedule[key];
          return (
            <div
              key={key}
              className={`rounded-xl border px-4 py-3 transition-colors ${
                d.enabled ? 'bg-brand/5 border-brand/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={d.enabled}
                    onChange={v => updateDay(key, day => ({ ...day, enabled: v }))}
                  />
                  <span className="text-sm font-semibold text-slate-800">{DAY_LABELS[key]}</span>
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
                        onChange={e => updateDay(key, day => ({
                          ...day,
                          ranges: day.ranges.map((r, i) => i === ri ? { ...r, from: e.target.value } : r),
                        }))}
                        className="input px-2.5 py-1.5 text-xs w-28"
                      />
                      <span className="text-xs text-slate-400">a</span>
                      <input
                        type="time"
                        value={range.to}
                        onChange={e => updateDay(key, day => ({
                          ...day,
                          ranges: day.ranges.map((r, i) => i === ri ? { ...r, to: e.target.value } : r),
                        }))}
                        className="input px-2.5 py-1.5 text-xs w-28"
                      />
                      {d.ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => updateDay(key, day => ({ ...day, ranges: day.ranges.filter((_, i) => i !== ri) }))}
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

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <p className="text-[11px] text-slate-600">
          <strong className="text-slate-700">Tip:</strong> Usa &quot;Agregar rango&quot; para horarios
          partidos (ej: 11:00–15:00 almuerzo + 18:00–23:00 cena). Configura el primer día y usa
          &quot;Lun-Vie&quot; o &quot;Todos&quot; para copiar rápido.
        </p>
      </div>

      {/* Rubro de negocio */}
      <div className="pt-6 border-t border-slate-100">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Rubro de negocio</p>
        <p className="text-[11px] text-slate-500 mt-1">Cómo se categoriza tu negocio y cómo se describe en tu carta digital.</p>
      </div>

      <div className="w-full sm:w-1/2 space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Tipo de negocio
        </label>
        <select
          value={tipoNegocio}
          onChange={e => updateHorarios({ tipoNegocio: e.target.value })}
          className="input w-full px-3 py-2"
        >
          <option>Restaurante</option>
          <option>Cafetería</option>
          <option>Bar</option>
          <option>Food Truck</option>
          <option>Pastelería</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Descripción corta
        </label>
        <input
          type="text"
          value={descCorta}
          onChange={e => setDescCorta(e.target.value.slice(0, DESC_CORTA_MAX))}
          placeholder="Breve descripción para SEO y listados..."
          className="input w-full px-3 py-2"
        />
        <p className="text-right text-[11px] text-slate-400">{descCorta.length}/{DESC_CORTA_MAX}</p>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Descripción completa
        </label>
        <textarea
          value={descripcionCompleta}
          onChange={e => updateHorarios({ descripcionCompleta: e.target.value.slice(0, DESC_LARGA_MAX) })}
          placeholder="Describe tu negocio en detalle..."
          rows={4}
          className="input w-full px-3 py-2 resize-none"
        />
        <p className="text-right text-[11px] text-slate-400">{descripcionCompleta.length}/{DESC_LARGA_MAX}</p>
      </div>
    </div>
  );
}
