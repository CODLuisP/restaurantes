'use client';

import { useState } from 'react';
import { Clock, Info, MapPin } from 'lucide-react';
import { Modal } from '@/components/ui';
import { DAY_LABELS, DAY_ORDER, isOpenNow, type DayKey, type DaySchedule } from '@/context/HorariosContext';

export interface BusinessInfoSectionProps {
  tipoNegocio: string;
  descripcionCompleta: string;
  schedule: Record<DayKey, DaySchedule>;
  numeroPedidos: string;
  direccion: string;
}

export function BusinessInfoSection({ tipoNegocio, descripcionCompleta, schedule, numeroPedidos, direccion }: BusinessInfoSectionProps) {
  const [open, setOpen] = useState(false);
  const openNow = isOpenNow(schedule);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand border border-slate-200 hover:border-brand/40 rounded-full px-3 py-1.5 transition-colors"
      >
        <Info className="h-3.5 w-3.5" /> Información
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Información del negocio" size="sm" fullHeight={false}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {tipoNegocio.trim() && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-brand/10 text-brand">{tipoNegocio}</span>
            )}
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${openNow ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${openNow ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {openNow ? 'Abierto ahora' : 'Cerrado ahora'}
            </span>
          </div>

          {direccion.trim() && (
            <p className="flex items-start gap-1.5 text-sm text-slate-600">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" /> {direccion}
            </p>
          )}

          {descripcionCompleta.trim() && (
            <p className="text-sm text-slate-600 whitespace-pre-line">{descripcionCompleta}</p>
          )}

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Horario de atención
            </p>
            <div className="space-y-0.5 text-xs">
              {DAY_ORDER.map(key => {
                const d = schedule[key];
                return (
                  <div key={key} className="flex items-center justify-between py-0.5">
                    <span className="font-medium text-slate-700">{DAY_LABELS[key]}</span>
                    <span className={d.enabled ? 'text-slate-600' : 'text-slate-400 italic'}>
                      {d.enabled ? d.ranges.filter(r => r.from && r.to).map(r => `${r.from}–${r.to}`).join(', ') || '—' : 'Cerrado'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {numeroPedidos.trim() && (
            <a
              href={`https://wa.me/${numeroPedidos.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/svgs/redes/whatsapp-icon.svg" alt="" className="h-5 w-5" />
              Pedir por WhatsApp
            </a>
          )}
        </div>
      </Modal>
    </>
  );
}
