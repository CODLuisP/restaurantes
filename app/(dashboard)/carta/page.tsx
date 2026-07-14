'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Package, Upload, Image, QrCode, Share2, Clock, CalendarClock } from 'lucide-react';
import ProductosTab from '@/components/carta/ProductosTab';
import ImportarTab from '@/components/carta/ImportarTab';
import BannersTab from '@/components/carta/BannersTab';
import QrTab from '@/components/carta/QrTab';
import RedesSocialesTab from '@/components/carta/RedesSocialesTab';
import HorariosTab from '@/components/carta/HorariosTab';
import CierresProgramadosTab from '@/components/carta/CierresProgramadosTab';

type TabId = 'carta' | 'importar' | 'banners' | 'qr' | 'redes' | 'horarios' | 'cierres';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'carta',      label: 'Carta',                icon: Package },
  { id: 'importar',   label: 'Importar',             icon: Upload },
  { id: 'banners',    label: 'Banners',               icon: Image },
  { id: 'qr',         label: 'QR y Link de la Carta', icon: QrCode },
  { id: 'redes',      label: 'Redes Sociales',        icon: Share2 },
  { id: 'horarios',   label: 'Horarios y rubro de negocio', icon: Clock },
  { id: 'cierres',    label: 'Cierres programados',   icon: CalendarClock },
];

const TAB_IDS = TABS.map(t => t.id);

export default function CartaPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<TabId>('carta');

  /* Al cargar la página, respeta el tab de la URL (?tab=...) y si no hay ninguno, lo agrega */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tab');
    const resolved = fromUrl && TAB_IDS.includes(fromUrl as TabId) ? (fromUrl as TabId) : 'carta';
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
      <div className="pb-5">
        <h3 className="text-xl font-bold text-slate-900">Menú Digital</h3>
        <p className="text-xs text-slate-500">Gestiona los platos, importaciones, banners y la bienvenida de tu carta.</p>
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
      <div className="mt-6">
        {tab === 'carta' && (
          <ProductosTab onGoToImportar={() => changeTab('importar')} onGoToBanners={() => changeTab('banners')} />
        )}
        {tab === 'importar' && <ImportarTab />}
        {tab === 'banners' && <BannersTab />}
        {tab === 'qr' && <QrTab />}

        {(tab === 'redes' || tab === 'horarios' || tab === 'cierres') && (
          <div className="card-lg p-8">
            {tab === 'redes' && <RedesSocialesTab />}
            {tab === 'horarios' && <HorariosTab />}
            {tab === 'cierres' && <CierresProgramadosTab />}
          </div>
        )}
      </div>
    </div>
  );
}
