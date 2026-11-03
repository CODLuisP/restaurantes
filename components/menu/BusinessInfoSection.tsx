'use client';

import { useState } from 'react';
import { Clock, Info, MapPin, Phone, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui';
import { DAY_LABELS, DAY_ORDER, isOpenNow, normalizeSchedule, type DayKey, type DaySchedule } from '@/context/HorariosContext';
import type { SocialLink } from '@/components/menu/SocialLinksRow';

export interface BusinessInfoSectionProps {
  tipoNegocio: string;
  descripcionCorta?: string;
  descripcionCompleta: string;
  schedule?: Partial<Record<DayKey, Partial<DaySchedule>>>;
  numeroPedidos: string;
  direccion: string;
  telefono?: string;
  socialLinks?: SocialLink[];
}

export function BusinessInfoSection({
  tipoNegocio,
  descripcionCorta,
  descripcionCompleta,
  schedule,
  numeroPedidos,
  direccion,
  telefono,
  socialLinks = [],
}: BusinessInfoSectionProps) {
  const [open, setOpen] = useState(false);
  const normalizedSchedule = normalizeSchedule(schedule);
  const openNow = isOpenNow(normalizedSchedule);
  const phoneDisplay = (telefono ?? '').trim() || numeroPedidos.trim();
  const hasWhatsappLink = socialLinks.some(s => s.tipo === 'whatsapp');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand border border-slate-200 hover:border-brand/40 rounded-full px-3 py-1.5 transition-colors cursor-pointer"
      >
        <Info className="h-3.5 w-3.5" /> Información
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Información del negocio" size="sm" fullHeight={false}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${openNow ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${openNow ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {openNow ? 'Abierto ahora' : 'Cerrado ahora'}
            </span>
          </div>

          {(direccion.trim() || phoneDisplay) && (
            <div className="space-y-1.5">
              {direccion.trim() && (
                <p className="flex items-start gap-1.5 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" /> {direccion}
                </p>
              )}
              {phoneDisplay && (
                <a
                  href={`tel:${phoneDisplay.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" /> {phoneDisplay}
                </a>
              )}
            </div>
          )}

          {descripcionCorta?.trim() && (
            <p className="text-sm font-semibold text-slate-800">{descripcionCorta}</p>
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
                const d = normalizedSchedule[key];
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

          {socialLinks.length > 0 && (
            <div className="space-y-2 pt-1">
              {socialLinks.map((link, idx) => {
                const isInternal = link.href.startsWith('#') || link.href.startsWith('/');
                return (
                  <a
                    key={link.id ?? `${link.label}-${idx}`}
                    href={link.href}
                    target={isInternal ? undefined : '_blank'}
                    rel={isInternal ? undefined : 'noopener noreferrer'}
                    onClick={() => {
                      if (isInternal) setOpen(false);
                    }}
                    className="flex items-center justify-between gap-3 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-brand/40 bg-white hover:bg-slate-50/70 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${link.iconBoxBg ?? 'bg-slate-100'}`}>
                        {link.icon}
                      </span>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-slate-800 truncate">{link.label}</p>
                        {link.subtitle && (
                          <p className="text-[11px] text-slate-500 truncate">{link.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </a>
                );
              })}
            </div>
          )}

          {!hasWhatsappLink && numeroPedidos.trim() && (
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
