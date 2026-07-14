'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Wallet, Tags, Truck } from 'lucide-react';
import GastosTab from '@/components/gastos/GastosTab';
import CategoriasTab from '@/components/gastos/CategoriasTab';
import ProveedoresTab from '@/components/gastos/ProveedoresTab';

type TabId = 'gastos' | 'categorias' | 'proveedores';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'gastos',      label: 'Gastos',      icon: Wallet },
  { id: 'categorias',  label: 'Categorías',  icon: Tags },
  { id: 'proveedores', label: 'Proveedores', icon: Truck },
];

const TAB_IDS = TABS.map(t => t.id);

export default function GastosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<TabId>('gastos');

  /* Al cargar la página, respeta el tab de la URL (?tab=...) y si no hay ninguno, lo agrega */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tab');
    const resolved = fromUrl && TAB_IDS.includes(fromUrl as TabId) ? (fromUrl as TabId) : 'gastos';
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
      <div className="flex items-center justify-between gap-3 pb-5">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Gastos</h3>
          <p className="text-xs text-slate-500">Registra compras y cuentas por pagar, y descuéntalas de tu caja.</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => changeTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mt-2">
        {tab === 'gastos' && <GastosTab />}
        {tab === 'categorias' && <CategoriasTab />}
        {tab === 'proveedores' && <ProveedoresTab />}
      </div>
    </div>
  );
}
