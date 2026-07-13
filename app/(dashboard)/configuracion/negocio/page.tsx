'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Phone,
  MapPin,
  Share2,
  Clock,
  Palette,
  CalendarClock,
} from 'lucide-react';
import DatosTab from '@/components/configuracion/negocio/DatosTab';
import ContactoTab from '@/components/configuracion/negocio/ContactoTab';
import UbicacionTab from '@/components/configuracion/negocio/UbicacionTab';
import RedesSocialesTab from '@/components/configuracion/negocio/RedesSocialesTab';
import HorariosTab from '@/components/configuracion/negocio/HorariosTab';
import CierresProgramadosTab from '@/components/configuracion/negocio/CierresProgramadosTab';

type TabId = 'datos' | 'contacto' | 'ubicacion' | 'redes' | 'horarios' | 'apariencia' | 'cierres';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'datos',       label: 'Datos',               icon: Building2 },
  { id: 'contacto',    label: 'Contacto',             icon: Phone },
  { id: 'ubicacion',   label: 'Ubicación',            icon: MapPin },
  { id: 'redes',       label: 'Redes Sociales',       icon: Share2 },
  { id: 'horarios',    label: 'Horarios',             icon: Clock },
  { id: 'apariencia',  label: 'Apariencia',           icon: Palette },
  { id: 'cierres',     label: 'Cierres programados',  icon: CalendarClock },
];

export default function NegocioPage() {
  const [tab, setTab] = useState<TabId>('datos');

  return (
    <div className="space-y-0 animate-section">
      {/* Header */}
      <div className="flex items-center gap-3 pb-5">
        <div className="bg-brand p-2.5 rounded-xl shrink-0">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Configuración del Negocio</h3>
          <p className="text-xs text-slate-500">Configura los datos de tu restaurante</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 pb-3 px-0.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="card-lg p-8 mt-6">
        {tab === 'datos' && <DatosTab />}
        {tab === 'contacto' && <ContactoTab />}
        {tab === 'ubicacion' && <UbicacionTab />}
        {tab === 'redes' && <RedesSocialesTab />}
        {tab === 'horarios' && <HorariosTab />}
        {tab === 'cierres' && <CierresProgramadosTab />}

        {tab === 'apariencia' && (
          <div className="py-16 text-center space-y-1">
            <p className="text-sm font-semibold text-slate-700">Apariencia</p>
            <p className="text-xs text-slate-500">Esta sección estará disponible próximamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
