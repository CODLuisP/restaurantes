'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Utensils, Store, MapPin, FileText, ChevronLeft, ChevronRight,
  ChevronDown, Star, Clock,
} from 'lucide-react';
import { CARTA_STORAGE_KEY, CARTA_CATEGORIES } from '@/context/CartaContext';
import { BANNERS_STORAGE_KEY, DEFAULT_BANNERS, type Banner } from '@/context/BannersContext';
import { BUSINESS_STORAGE_KEY, type BusinessInfo } from '@/context/BusinessContext';
import type { CartaDelDia, MenuEntry } from '@/types';

const CATEGORY_ICON_BG: Record<string, string> = {
  'Entradas':        'bg-emerald-100 text-emerald-700',
  'Platos de fondo': 'bg-slate-200 text-slate-700',
  'Bebidas':         'bg-blue-100 text-blue-700',
  'Postres':         'bg-pink-100 text-pink-700',
  'Promociones':     'bg-purple-100 text-purple-700',
};

/** Vista pública de la carta, con el mismo look del tab de Productos (banner → negocio → platos). */
export default function PublicMenu({ mesaLabel }: { mesaLabel?: string }) {
  const [carta, setCarta] = useState<CartaDelDia | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [time, setTime] = useState('');

  /* Carga (y refresco cada 5s) desde localStorage: carta, banners e info del negocio. */
  useEffect(() => {
    const load = () => {
      try {
        const c = localStorage.getItem(CARTA_STORAGE_KEY);
        if (c) setCarta(JSON.parse(c));
        const b = localStorage.getItem(BANNERS_STORAGE_KEY);
        setBanners(b ? JSON.parse(b) : DEFAULT_BANNERS);
        const biz = localStorage.getItem(BUSINESS_STORAGE_KEY);
        if (biz) setBusiness(JSON.parse(biz));
      } catch {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }));
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  const activeBanners = banners.filter(b => b.active);

  const allCategories = useMemo(() => {
    const present = carta?.items.map(i => i.category) ?? [];
    return Array.from(new Set([...CARTA_CATEGORIES, ...present]));
  }, [carta]);

  if (!carta || !carta.active) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
          <Utensils className="w-8 h-8 text-brand" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Carta no disponible</h2>
        <p className="text-sm text-gray-500">Por el momento la carta digital no está activa. Por favor consulte a su mozo.</p>
      </div>
    );
  }

  /* Platos disponibles agrupados */
  const availableItems = carta.items.filter(i => i.available);
  const featuredItems = availableItems.filter(i => i.featured);
  const groupedCategories = allCategories
    .map(category => ({ category, items: availableItems.filter(i => i.category === category) }))
    .filter(g => g.items.length > 0);

  const toggle = (key: string) => setCollapsed(s => ({ ...s, [key]: !s[key] }));

  const bizName = business?.name?.trim() || 'Carta del Día';

  return (
    <div className="min-h-screen bg-[#f9fafb] selection:bg-brand selection:text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Banner carrusel + tarjeta de negocio ── */}
        <div className="relative mb-14">
          <div className="relative rounded-2xl overflow-hidden h-44 sm:h-52 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {activeBanners.length > 0 ? (
              <>
                {(() => {
                  const current = activeBanners[bannerIndex % activeBanners.length];
                  return current.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.image} alt={current.title || 'Banner'} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${current.gradient ?? 'from-slate-900 to-slate-700'}`} />
                  );
                })()}
                <div className="absolute inset-0 bg-black/10" />
                {activeBanners.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setBannerIndex(i => (i - 1 + activeBanners.length) % activeBanners.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                      aria-label="Banner anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerIndex(i => (i + 1) % activeBanners.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                      aria-label="Siguiente banner"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {activeBanners.map((b, i) => (
                        <span
                          key={b.id}
                          className={`h-1.5 rounded-full transition-all ${i === bannerIndex % activeBanners.length ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/40">
                <Utensils className="h-8 w-8" />
              </div>
            )}

            {/* Mesa + hora */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {mesaLabel && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-slate-700 inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-brand" /> {mesaLabel}
                </span>
              )}
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-black/40 text-white/80 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {time}
              </span>
            </div>
          </div>

          {/* Tarjeta del negocio */}
          <div className="absolute -bottom-10 left-4 right-4 sm:right-auto flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
            <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-brand/10 border border-slate-200 flex items-center justify-center">
              {business?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logo} alt={bizName} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-6 w-6 text-brand" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">{bizName}</p>
              {business?.address && (
                <p className="text-[11px] text-slate-500 truncate max-w-[260px] flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" /> {business.address}
                </p>
              )}
              {business?.ruc && (
                <p className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1">
                  <FileText className="h-3 w-3 shrink-0 text-slate-400" /> RUC {business.ruc}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Platos por categoría ── */}
        <div className="space-y-3">
          {featuredItems.length > 0 && (
            <PublicCategory
              title="Destacados"
              items={featuredItems}
              collapsed={!!collapsed.destacados}
              onToggle={() => toggle('destacados')}
              highlight
              icon={<Star className="h-4 w-4 text-white fill-white" />}
              iconBg="bg-gradient-to-br from-amber-400 to-fuchsia-500"
            />
          )}

          {groupedCategories.map(({ category, items }) => (
            <PublicCategory
              key={category}
              title={category}
              items={items}
              collapsed={!!collapsed[category]}
              onToggle={() => toggle(category)}
              icon={<Utensils className="h-4 w-4" />}
              iconBg={CATEGORY_ICON_BG[category] ?? 'bg-gray-100 text-gray-600'}
            />
          ))}

          {groupedCategories.length === 0 && (
            <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
              <Utensils className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Aún no hay platos disponibles en la carta.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 pb-4 text-center">
          <p className="text-[10px] text-gray-400">Los precios incluyen IGV{business?.name ? ` • ${business.name}` : ''}</p>
          <p className="text-[10px] text-gray-300 mt-1">Carta digital actualizada en tiempo real</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Sección de categoría (solo lectura) ─── */
function PublicCategory({
  title, items, collapsed, onToggle, icon, iconBg, highlight,
}: {
  title: string;
  items: MenuEntry[];
  collapsed: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border overflow-hidden ${highlight ? 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-purple-50' : 'border-slate-200 bg-white'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</span>
        <span className="text-sm font-bold text-slate-800 truncate flex-1">{title}</span>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${highlight ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
          {items.length} {highlight ? 'destacados' : 'platos'}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(item => (
              <PublicProductCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tarjeta de plato (solo lectura) ─── */
function PublicProductCard({ item }: { item: MenuEntry }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden flex flex-col shadow-sm">
      <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300">
            <Utensils className="h-8 w-8" />
          </div>
        )}
        {item.featured && (
          <span className="absolute top-2 left-2 text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-white" />
          </span>
        )}
        <span className="absolute top-2 right-2 text-[10px] bg-white/90 text-brand px-2 py-0.5 rounded-full font-mono font-bold shadow-sm">
          S/. {item.price.toFixed(2)}
        </span>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h5 className="text-sm font-bold text-slate-800 leading-tight">{item.name}</h5>
        {item.description && (
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.description}</p>
        )}
      </div>
    </div>
  );
}
