'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, X } from 'lucide-react';
import { Toggle, Select, Button, Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getConfiguracion, updateConfiguracion } from '@/lib/api/configuracion';
import { getSucursales, getSucursalById } from '@/lib/api/sucursales';

type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';
interface DayRange { from: string; to: string }
interface DaySchedule { enabled: boolean; ranges: DayRange[] }

const DAY_LABELS: Record<DayKey, string> = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };
const DAY_ORDER: DayKey[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const DEFAULT_RANGE: DayRange = { from: '09:00', to: '22:00' };
const DESC_CORTA_MAX = 200;
const DESC_LARGA_MAX = 500;

function defaultSchedule(): Record<DayKey, DaySchedule> {
  return {
    lun: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] }, mar: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    mie: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] }, jue: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    vie: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] }, sab: { enabled: true, ranges: [{ ...DEFAULT_RANGE }] },
    dom: { enabled: false, ranges: [{ ...DEFAULT_RANGE }] },
  };
}

export default function HorariosTab() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === 'superadmin';

  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [sId, setSId] = useState<number | null>(null);
  const [zonaHoraria, setZonaHoraria] = useState('Peru (Lima)');
  const [numeroPedidos, setNumeroPedidos] = useState('');
  const [schedule, setSchedule] = useState<Record<DayKey, DaySchedule>>(defaultSchedule());
  const [tipoNegocio, setTipoNegocio] = useState('Restaurante');
  const [descCorta, setDescCorta] = useState('');
  const [descCompleta, setDescCompleta] = useState('');
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
    getConfiguracion(token, id).then(c => {
      setZonaHoraria(c.zonaHoraria ?? 'Peru (Lima)');
      setNumeroPedidos(c.whatsappPedidos || '');
      setTipoNegocio(c.tipoNegocio ?? 'Restaurante');
      setDescCorta(c.descripcionCorta ?? '');
      setDescCompleta(c.descripcionCompleta ?? '');
      if (c.horariosJson) { try { setSchedule({ ...defaultSchedule(), ...JSON.parse(c.horariosJson) }); } catch { setSchedule(defaultSchedule()); } }
      else setSchedule(defaultSchedule());
      if (!c.whatsappPedidos) {
        getSucursalById(token, id).then(s => { if (s.telefono) setNumeroPedidos(s.telefono); }).catch(() => {});
      }
    }).catch(() => {
      setZonaHoraria('Peru (Lima)'); setNumeroPedidos(''); setSchedule(defaultSchedule());
      setTipoNegocio('Restaurante'); setDescCorta(''); setDescCompleta('');
    }).finally(() => setLoading(false));
  };

  const handleSave = async () => {
    if (!token || !sId) return;
    setSaving(true);
    try {
      let igv = 18, moneda = 'S/.'; let logo: string | null = null; let inst = '', fb = '', tkt = '', sw = '', rl: string | null = null;
      try { const c = await getConfiguracion(token, sId); igv = c.igvPorcentaje; moneda = c.monedaSimbolo; logo = c.logoUrl ?? null; inst = c.instagram ?? ''; fb = c.facebook ?? ''; tkt = c.tiktok ?? ''; sw = c.sitioWeb ?? ''; rl = c.reviewsLink ?? null; } catch {}
      await updateConfiguracion(token, sId, {
        igvPorcentaje: igv, monedaSimbolo: moneda, logoUrl: logo,
        zonaHoraria, tipoNegocio, descripcionCorta: descCorta, descripcionCompleta: descCompleta,
        whatsappPedidos: numeroPedidos, horariosJson: JSON.stringify(schedule),
        instagram: inst, facebook: fb, tiktok: tkt, sitioWeb: sw, reviewsLink: rl,
      });
      triggerToast('Horarios guardados.', 'success');
    } catch { triggerToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

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

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-600">Cargando horarios y configuración...</p>
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

      <p className="text-sm text-slate-600">Configura los horarios de atención de tu negocio</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Zona horaria</label>
          <input type="text" value={zonaHoraria} onChange={e => setZonaHoraria(e.target.value)} className="input w-full px-3 py-2" />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Número para pedidos</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <span className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"><img src="/svgs/redes/whatsapp-icon.svg" alt="WhatsApp" className="h-5 w-5" /></span>
            <input type="text" value={numeroPedidos} onChange={e => setNumeroPedidos(e.target.value.replace(/[^\d ()+-]/g, ''))} placeholder="+51 999 999 999" inputMode="tel" className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none" />
          </div>
        </div>
      </div>

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
                    <button type="button" onClick={() => applyToDays('lun', ['mar','mie','jue','vie'])} className="hover:underline">Lun-Vie</button>
                    <button type="button" onClick={() => applyToDays('lun', ['mar','mie','jue','vie','sab','dom'])} className="hover:underline">Todos</button>
                  </div>
                ) : !d.enabled ? <span className="text-[11px] italic text-slate-400">Cerrado</span> : null}
              </div>
              {d.enabled && (
                <div className="space-y-2 pl-11">
                  {d.ranges.map((range, ri) => (
                    <div key={ri} className="flex items-center gap-2">
                      <input type="time" value={range.from} onChange={e => updateDay(key, day => ({ ...day, ranges: day.ranges.map((r, i) => i === ri ? { ...r, from: e.target.value } : r) }))} className="input px-2.5 py-1.5 text-xs w-28" />
                      <span className="text-xs text-slate-400">a</span>
                      <input type="time" value={range.to} onChange={e => updateDay(key, day => ({ ...day, ranges: day.ranges.map((r, i) => i === ri ? { ...r, to: e.target.value } : r) }))} className="input px-2.5 py-1.5 text-xs w-28" />
                      {d.ranges.length > 1 && <button type="button" onClick={() => updateDay(key, day => ({ ...day, ranges: day.ranges.filter((_, i) => i !== ri) }))} className="p-1 text-slate-400 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => updateDay(key, day => ({ ...day, ranges: [...day.ranges, { from: '', to: '' }] }))} className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"><Plus className="h-3 w-3" /> Agregar rango</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-slate-100"><p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Rubro de negocio</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de negocio</label>
          <select value={tipoNegocio} onChange={e => setTipoNegocio(e.target.value)} className="input w-full px-3 py-2">
            <option>Restaurante</option><option>Cafetería</option><option>Bar</option><option>Food Truck</option><option>Pastelería</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción corta</label>
          <input type="text" value={descCorta} onChange={e => setDescCorta(e.target.value.slice(0, DESC_CORTA_MAX))} placeholder="Breve descripción..." className="input w-full px-3 py-2" />
          <p className="text-right text-[11px] text-slate-400">{descCorta.length}/{DESC_CORTA_MAX}</p>
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción completa</label>
        <textarea value={descCompleta} onChange={e => setDescCompleta(e.target.value.slice(0, DESC_LARGA_MAX))} placeholder="Describe tu negocio en detalle..." rows={4} className="input w-full px-3 py-2 resize-none" />
        <p className="text-right text-[11px] text-slate-400">{descCompleta.length}/{DESC_LARGA_MAX}</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
      </div>
    </div>
  );
}
