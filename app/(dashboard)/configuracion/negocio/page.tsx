'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  MapPin,
  Truck,
  Palette,
  Landmark,
} from 'lucide-react';
import DatosTab from '@/components/configuracion/negocio/DatosTab';
import UbicacionTab from '@/components/configuracion/negocio/UbicacionTab';
import AreasEntregaTab from '@/components/configuracion/negocio/AreasEntregaTab';
import SunatTab from '@/components/configuracion/negocio/SunatTab';

type TabId = 'datos' | 'ubicacion' | 'areas-entrega' | 'apariencia' | 'sunat';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'datos',          label: 'Datos',               icon: Building2 },
  { id: 'sunat',          label: 'SUNAT',                icon: Landmark },
  { id: 'ubicacion',      label: 'Ubicación',            icon: MapPin },
  { id: 'areas-entrega',  label: 'Áreas de entrega',     icon: Truck },
  { id: 'apariencia',     label: 'Apariencia',           icon: Palette },
];

const TAB_IDS = TABS.map(t => t.id);

export default function NegocioPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<TabId>('datos');

  /* Al cargar la página, respeta el tab de la URL (?tab=...) y si no hay ninguno, lo agrega */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tab');
    const resolved = fromUrl && TAB_IDS.includes(fromUrl as TabId) ? (fromUrl as TabId) : 'datos';
    setTab(resolved);
    if (fromUrl !== resolved) router.replace(`${pathname}?tab=${resolved}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeTab = (id: TabId) => {
    setTab(id);
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
  };

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
              onClick={() => changeTab(t.id)}
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
        {tab === 'ubicacion' && <UbicacionTab />}
        {tab === 'areas-entrega' && <AreasEntregaTab />}
        {tab === 'sunat' && <SunatTab />}

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
