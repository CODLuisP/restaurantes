'use client';

import { useState } from 'react';
import { ChevronDown, Utensils } from 'lucide-react';
import type { OrderItem } from '@/types';
import type { ProductoMenu } from './types';
import PublicProductCard from './PublicProductCard';

/* ─── Sección de categoría interactiva ─── */
export default function PublicCategory({
  title,
  items,
  cart,
  onAdd,
  onUpdateQty,
  collapsed,
  onToggle,
  icon,
  iconBg,
  highlight,
}: {
  title: string;
  items: ProductoMenu[];
  cart: OrderItem[];
  onAdd: (item: ProductoMenu) => void;
  onUpdateQty: (productId: string, delta: number) => void;
  collapsed: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconBg: string;
  highlight?: boolean;
}) {
  const [variantSelections, setVariantSelections] = useState<Record<number, number | null>>({});
  return (
    <div
      className={`rounded-2xl border overflow-hidden ${highlight ? "border-amber-200 bg-linear-to-r from-amber-50 via-white to-purple-50" : "border-slate-200 bg-white"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
      >
        <span
          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </span>
        <span className="text-sm font-bold text-slate-800 truncate flex-1">
          {title}
        </span>
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${highlight ? "bg-amber-100 text-amber-700 animate-pulse-slow" : "bg-slate-100 text-slate-600"}`}
        >
          {items.length} {highlight ? "destacados" : "platos"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${collapsed ? "" : "rotate-180"}`}
        />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 animate-section">
            {items.map((item) => {
              const cartItem = cart.find((ci) => ci.product.id === String(item.id));
              const qty = cartItem ? cartItem.quantity : 0;
              return (
                <PublicProductCard
                  key={item.id}
                  item={item}
                  quantity={qty}
                  onAdd={() => onAdd(item)}
                  onUpdateQty={(delta) => onUpdateQty(String(item.id), delta)}
                  selectedVariantId={variantSelections[item.id] ?? null}
                  onSelectVariant={(vid) => setVariantSelections(prev => ({ ...prev, [item.id]: vid }))}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tarjeta de plato interactiva ─── */
