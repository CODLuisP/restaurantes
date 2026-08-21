'use client';

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
  onAddToCart: (product: Product) => void;
  onBack: () => void;
}

/** Columna izquierda del editor: buscador, categorías y grilla de platos de la carta. */
export default function MenuCatalog({
  orderType, selectedTable, editingOrderId, search, setSearch, isSearching,
  rawQuery, hasMenuProducts, categories, activeCategory, setSelectedCategory, filteredProducts, onAddToCart, onBack,
}: MenuCatalogProps) {
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
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => onAddToCart(product)}
                    className="card-lg hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden transition-all duration-200 flex flex-col group border border-slate-100/60"
                  >
                    <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300"><Utensils className="h-7 w-7" /></div>
                      )}
                    </div>
                    <div className="p-3 flex-grow flex flex-col justify-between">
                      <h5 className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{product.name}</h5>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-mono font-bold text-slate-700">S/. {product.price.toFixed(2)}</span>
                        <div className="bg-emerald-50 p-1.5 rounded-lg text-brand shrink-0"><Plus className="h-3 w-3 stroke-[3]" /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
  );
}
