'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Landmark, ShieldCheck, KeyRound, ListOrdered } from 'lucide-react';
import CertificadoTab from '@/components/facturacion/CertificadoTab';
import CredencialesTab from '@/components/facturacion/CredencialesTab';
import SeriesTab from '@/components/facturacion/SeriesTab';

type TabId = 'certificado' | 'credenciales' | 'series';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'certificado',  label: 'Certificado digital', icon: ShieldCheck },
  { id: 'credenciales', label: 'Credenciales SUNAT',  icon: KeyRound },
  { id: 'series',       label: 'Series y correlativos', icon: ListOrdered },
];

const TAB_IDS = TABS.map(t => t.id);

export default function FacturacionPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<TabId>('certificado');

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tab');
    const resolved = fromUrl && TAB_IDS.includes(fromUrl as TabId) ? (fromUrl as TabId) : 'certificado';
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
      <div className="flex items-center gap-3 pb-4">
        <div className="bg-brand p-2.5 rounded-xl shrink-0">
          <Landmark className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Facturación Electrónica</h3>
          <p className="text-xs text-slate-500">Certificado digital, credenciales SUNAT y series de comprobantes</p>
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
      <div className="card-lg p-3 mt-4">
        {tab === 'certificado' && <CertificadoTab />}
        {tab === 'credenciales' && <CredencialesTab />}
        {tab === 'series' && <SeriesTab />}
      </div>
    </div>
  );
}
