'use client';

import { useState, useEffect } from 'react';
import { Utensils, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { CARTA_STORAGE_KEY, CARTA_CATEGORIES } from '@/context/CartaContext';
import type { CartaDelDia, MenuEntry } from '@/types';

const STORAGE_KEY = CARTA_STORAGE_KEY;
const CATEGORY_ORDER = [...CARTA_CATEGORIES];
const CATEGORY_COLORS: Record<string, string> = {
  'Entradas':        'bg-amber-100 text-amber-700',
  'Platos de fondo': 'bg-green-100 text-green-700',
  'Bebidas':         'bg-blue-100 text-blue-700',
  'Postres':         'bg-pink-100 text-pink-700',
  'Promociones':     'bg-purple-100 text-purple-700',
};

export default function MenuPublico() {
  const [carta, setCarta] = useState<CartaDelDia | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const [time, setTime] = useState('');

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setCarta(JSON.parse(stored));
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

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  if (!carta || !carta.active) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#007542]/10 flex items-center justify-center mb-4">
          <Utensils className="w-8 h-8 text-[#007542]" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Carta no disponible</h2>
        <p className="text-sm text-gray-500">Por el momento la carta digital no está activa. Por favor consulte a su mozo.</p>
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.reduce<Record<string, MenuEntry[]>>((acc, cat) => {
    const items = carta.items.filter(i => i.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const otherCategories = [...new Set(carta.items.map(i => i.category))].filter(c => !CATEGORY_ORDER.includes(c));
  otherCategories.forEach(cat => {
    const items = carta.items.filter(i => i.category === cat);
    if (items.length) grouped[cat] = items;
  });

  return (
    <div className="min-h-screen bg-[#f9fafb] selection:bg-[#007542] selection:text-white">
      {/* Header */}
      <div className="bg-[#005e34] text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Utensils className="w-4 h-4 text-[#58BB43]" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">RestoPro Perú</h1>
              <span className="text-[10px] text-white/60 font-mono uppercase tracking-wider">Carta del Día</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/50">
            <Clock className="w-3 h-3" />
            <span>{time}</span>
          </div>
        </div>
      </div>

      {/* Date badge */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#007542] bg-[#007542]/10 px-3 py-1 rounded-full">
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <span className="text-[10px] text-gray-400">{carta.items.filter(i => i.available).length} platos disponibles</span>
      </div>

      {/* Menu */}
      <div className="max-w-lg mx-auto px-4 pb-10 space-y-4 mt-3">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {category}
                </span>
                <span className="text-[11px] text-gray-400">{items.filter(i => i.available).length} disponibles</span>
              </div>
              {openCategories.has(category)
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {openCategories.has(category) && (
              <div className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <div key={item.id} className={`flex gap-3 px-4 py-3 ${!item.available ? 'opacity-40' : ''} ${idx === 0 ? 'border-t border-gray-100' : ''}`}>
                    {item.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <Utensils className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-800 leading-tight">{item.name}</h3>
                        <span className="text-sm font-bold text-[#007542] shrink-0 font-mono">S/. {item.price.toFixed(2)}</span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                      )}
                      {!item.available && (
                        <span className="inline-block mt-1 text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">No disponible</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8 text-center">
        <p className="text-[10px] text-gray-400">Los precios incluyen IGV • RestoPro Perú S.A.C.</p>
      </div>
    </div>
  );
}
