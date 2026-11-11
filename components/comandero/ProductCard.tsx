'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Utensils } from 'lucide-react';
import type { Product } from '@/types';

export default function ProductCard({
  product,
  onOpenModal,
  onAddToCart,
  disabled = false,
}: {
  product: Product;
  onOpenModal: (product: Product, initialVariantId?: number) => void;
  onAddToCart: (product: Product, varianteId?: number | null, extraIds?: number[]) => void;
  /** Carta pública con el local cerrado: se ve el plato pero no se puede pedir. */
  disabled?: boolean;
}) {
  const tieneVariantes = !!product.variants && product.variants.length > 0;
  const tieneExtras = !!product.extras && product.extras.length > 0;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Precio mínimo / desde
  const minPrice = tieneVariantes
    ? Math.min(...product.variants!.map(v => v.price))
    : product.price;

  const handleCardClick = () => {
    if (tieneVariantes || tieneExtras) {
      if (tieneExtras) {
        // Abre el modal para personalizar variante y extras
        onOpenModal(product);
      } else {
        // Solo tiene variantes: despliega el selector abajo
        setDropdownOpen(prev => !prev);
      }
    } else {
      onAddToCart(product);
    }
  };

  const handleSelectOptionOnlyVariants = (e: React.MouseEvent, variantId: number) => {
    e.stopPropagation();
    onAddToCart(product, variantId, []);
    setDropdownOpen(false);
  };

  return (
    <div className={`flex flex-col relative ${disabled ? 'opacity-60 pointer-events-none select-none' : ''}`} aria-disabled={disabled}>
      <div
        onClick={handleCardClick}
        className={`card-lg hover:shadow-md hover:-translate-y-0.5 overflow-hidden transition-all duration-200 flex flex-col group border cursor-pointer ${
          dropdownOpen ? 'border-brand shadow-sm' : 'border-slate-100/60'
        }`}
      >
        <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-300">
              <Utensils className="h-7 w-7" />
            </div>
          )}
        </div>

        <div className="p-3 flex-grow flex flex-col justify-between">
          <div>
            <h5 className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">
              {product.name}
            </h5>
            {product.description && (
              <p className="text-[10px] text-slate-400 leading-tight line-clamp-2 mt-0.5">
                {product.description}
              </p>
            )}

            {tieneVariantes ? (
              <div className="mt-1">
                <span className="text-[11px] font-bold text-brand">
                  Desde S/ {minPrice.toFixed(2)}
                </span>
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                  Toca para elegir opciones y extras
                  {dropdownOpen ? (
                    <ChevronUp className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  )}
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <span className="text-[11px] font-mono font-bold text-slate-700">
                  S/ {product.price.toFixed(2)}
                </span>
                {tieneExtras && (
                  <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                    Toca para elegir opciones y extras
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end mt-2 pt-2 border-t border-slate-100">
            {tieneExtras ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenModal(product);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg text-brand shrink-0 transition-colors cursor-pointer"
                aria-label={`Personalizar ${product.name}`}
              >
                <Plus className="h-3 w-3 stroke-[3]" />
              </button>
            ) : tieneVariantes ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setDropdownOpen(prev => !prev);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg text-brand shrink-0 transition-colors cursor-pointer"
                aria-label={`Ver opciones de ${product.name}`}
              >
                <Plus className="h-3 w-3 stroke-[3]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg text-brand shrink-0 transition-colors cursor-pointer"
                aria-label={`Agregar ${product.name}`}
              >
                <Plus className="h-3 w-3 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Menú desplegable para productos con solo variantes (sin extras) */}
      {dropdownOpen && tieneVariantes && !tieneExtras && (
        <div className="mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-lg p-2.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-150 z-20">
          <p className="text-[10px] font-semibold text-slate-400 px-1">
            Elige una opción
          </p>
          <div className="space-y-1">
            {product.variants!.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={e => handleSelectOptionOnlyVariants(e, v.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-brand/5 hover:text-brand border border-transparent hover:border-brand/20 transition-all text-left"
              >
                <span>{v.name}</span>
                <span className="font-mono text-brand font-bold">
                  S/ {v.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
