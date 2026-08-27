'use client';

import { useState } from 'react';
import { ArrowLeft, BookOpen, Plus, Search, Utensils, X } from 'lucide-react';
import type { OrderType, Product } from '@/types';

interface MenuCatalogProps {
  orderType: OrderType;
  selectedTable: string;
  editingOrderId: string | null;
  search: string;
  setSearch: (v: string) => void;
  isSearching: boolean;
  rawQuery: string;
  hasMenuProducts: boolean;
  categories: string[];
  activeCategory: string;
  setSelectedCategory: (c: string) => void;
  filteredProducts: Product[];
  onAddToCart: (product: Product, varianteId?: number | null) => void;
  onBack: () => void;
}

function ProductCard({
  product, selectedVariantId, onSelectVariant, onAddToCart,
}: {
  product: Product;
  selectedVariantId: number | null;
  onSelectVariant: (id: number | null) => void;
  onAddToCart: (product: Product, varianteId?: number | null) => void;
}) {
  const tieneVariantes = !!product.variants && product.variants.length > 0;
  const precioEfectivo = tieneVariantes
    ? (product.variants!.find(v => v.id === selectedVariantId)?.price ?? product.price)
    : product.price;

  return (
    <div
      onClick={() => { if (!tieneVariantes) onAddToCart(product); }}
      className={`card-lg hover:shadow-md hover:-translate-y-0.5 overflow-hidden transition-all duration-200 flex flex-col group border border-slate-100/60 ${tieneVariantes ? '' : 'cursor-pointer'}`}
    >
      <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300"><Utensils className="h-7 w-7" /></div>
        )}
      </div>
      <div className="p-3 flex-grow flex flex-col justify-between">
        <div>
          <h5 className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{product.name}</h5>
          {tieneVariantes && (
            <div className="flex flex-wrap gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
              {product.variants!.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVariant(selectedVariantId === v.id ? null : v.id)}
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${selectedVariantId === v.id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-mono font-bold text-slate-700">S/. {precioEfectivo.toFixed(2)}</span>
          {tieneVariantes ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onAddToCart(product, selectedVariantId); }}
              className="bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg text-brand shrink-0 transition-colors cursor-pointer"
              aria-label={`Agregar ${product.name}`}
            >
              <Plus className="h-3 w-3 stroke-[3]" />
            </button>
          ) : (
            <div className="bg-emerald-50 p-1.5 rounded-lg text-brand shrink-0"><Plus className="h-3 w-3 stroke-[3]" /></div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Columna izquierda del editor: buscador, categorías y grilla de platos de la carta. */
export default function MenuCatalog({
  orderType, selectedTable, editingOrderId, search, setSearch, isSearching,
  rawQuery, hasMenuProducts, categories, activeCategory, setSelectedCategory, filteredProducts, onAddToCart, onBack,
}: MenuCatalogProps) {
  /* Variante elegida por producto (chips) antes de agregarlo a la comanda. */
  const [variantSelections, setVariantSelections] = useState<Record<string, number | null>>({});

  /* En "Todos" se agrupa la carta completa por categoría en vez de una grilla plana. */
  const groupedByCategory = activeCategory === 'Todos' && !isSearching
    ? Array.from(
        filteredProducts.reduce((acc, p) => {
          if (!acc.has(p.category)) acc.set(p.category, []);
          acc.get(p.category)!.push(p);
          return acc;
        }, new Map<string, Product[]>())
      ).sort(([a], [b]) => a.localeCompare(b))
    : null;

  return (
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-full overflow-y-auto">
          {/* Header Superior del Pedido: Volver e Info */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4 shrink-0">
            <button
              onClick={onBack}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </button>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800">
                {editingOrderId
                  ? `Editando pedido · ${orderType === 'llevar' ? 'Para llevar' : 'Delivery'} · ${editingOrderId}`
                  : `Nuevo pedido · ${orderType === 'mesa' ? 'Mesa' : orderType === 'llevar' ? 'Para llevar' : 'Delivery'} · ${orderType === 'mesa' ? selectedTable : 'General'}`}
              </h4>
              <p className="text-[10px] text-slate-400">
                Selecciona los platos del catálogo para agregarlos a la comanda.
              </p>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative mb-4 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="input w-full pl-9 pr-9 py-2 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Categorías */}
          {!isSearching && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 shrink-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                    activeCategory === cat ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {isSearching && (
            <p className="text-[11px] text-slate-500 mb-4 shrink-0">
              {filteredProducts.length === 0
                ? <>Sin resultados para <strong>“{rawQuery}”</strong>.</>
                : <>{filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''} para <strong>“{rawQuery}”</strong> en toda la carta.</>}
            </p>
          )}

          {/* Grid de platos */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {!hasMenuProducts ? (
              <div className="text-center py-12 space-y-2">
                <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs text-slate-500">No hay platos disponibles en la Carta del Día.</p>
              </div>
            ) : groupedByCategory ? (
              <div className="space-y-6">
                {groupedByCategory.map(([cat, products]) => (
                  <div key={cat}>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 sticky top-0 bg-white py-1">{cat}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                      {products.map(product => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          selectedVariantId={variantSelections[product.id] ?? null}
                          onSelectVariant={id => setVariantSelections(prev => ({ ...prev, [product.id]: id }))}
                          onAddToCart={onAddToCart}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selectedVariantId={variantSelections[product.id] ?? null}
                    onSelectVariant={id => setVariantSelections(prev => ({ ...prev, [product.id]: id }))}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
  );
}
