'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Package, Upload, Image, DoorOpen } from 'lucide-react';
import ProductosTab from '@/components/carta/ProductosTab';
import ImportarTab from '@/components/carta/ImportarTab';
import BannersTab from '@/components/carta/BannersTab';
import PaginaBienvenidaTab from '@/components/carta/PaginaBienvenidaTab';

type TabId = 'productos' | 'importar' | 'banners' | 'bienvenida';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'productos',  label: 'Productos',            icon: Package },
  { id: 'importar',   label: 'Importar',             icon: Upload },
  { id: 'banners',    label: 'Banners',               icon: Image },
  { id: 'bienvenida', label: 'Página de bienvenida',  icon: DoorOpen },
];

export default function CartaPage() {
  const [tab, setTab] = useState<TabId>('productos');

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
      <div className="mt-6">
        {tab === 'productos' && (
          <ProductosTab onGoToImportar={() => setTab('importar')} onGoToBanners={() => setTab('banners')} />
        )}
        {tab === 'importar' && <ImportarTab />}
        {tab === 'banners' && <BannersTab />}
        {tab === 'bienvenida' && <PaginaBienvenidaTab />}
      </div>
    </div>
  );
}
