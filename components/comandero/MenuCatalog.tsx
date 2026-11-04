'use client';

import { useState } from 'react';
import { ArrowLeft, BookOpen, Search, X } from 'lucide-react';
import type { OrderType, Product } from '@/types';
import ProductCard from './ProductCard';
import CustomizeModal from './CustomizeModal';

interface MenuCatalogProps {
  orderType: OrderType;
  selectedTable: string;
  /** La mesa ya tiene consumo: se está agregando a su comanda, no creando un pedido nuevo. */
  mesaOcupada?: boolean;
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
  onAddToCart: (product: Product, varianteId?: number | null, extraIds?: number[]) => void;
  onBack: () => void;
}


/** Columna izquierda del editor: buscador, categorías y grilla de platos de la carta. */
export default function MenuCatalog({
  orderType,
  selectedTable,
  mesaOcupada,
  editingOrderId,
  search,
  setSearch,
  isSearching,
  rawQuery,
  hasMenuProducts,
  categories,
  activeCategory,
  setSelectedCategory,
  filteredProducts,
  onAddToCart,
  onBack,
}: MenuCatalogProps) {
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const handleOpenModal = (product: Product) => {
    setModalProduct(product);
  };

  const handleConfirmModal = (varianteId?: number | null, extraIds?: number[]) => {
    if (modalProduct) {
      onAddToCart(modalProduct, varianteId, extraIds);
      setModalProduct(null);
    }
  };

  /* En "Todos" se agrupa la carta completa por categoría en vez de una grilla plana. */
  const groupedByCategory =
    activeCategory === 'Todos' && !isSearching
      ? Array.from(
          filteredProducts.reduce((acc, p) => {
            if (!acc.has(p.category)) acc.set(p.category, []);
            acc.get(p.category)!.push(p);
            return acc;
          }, new Map<string, Product[]>())
        ).sort(([a], [b]) => a.localeCompare(b))
      : null;

  return (
    <div className="flex-1 flex flex-col min-w-0 px-4 py-5 lg:px-6 lg:h-full lg:overflow-y-auto">
      {/* Header Superior del Pedido: Volver e Info */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-4 shrink-0">
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
        <div>
          <h4 className="text-sm font-extrabold text-slate-800">
            {editingOrderId
              ? `Editando pedido #${editingOrderId} · ${orderType === 'llevar' ? 'Para llevar' : 'Delivery'}`
              : orderType === 'mesa'
                ? mesaOcupada
                  ? `Mesa ${selectedTable} · Agregar a la comanda`
                  : `Nuevo pedido · Mesa ${selectedTable}`
                : `Nuevo pedido · ${orderType === 'llevar' ? 'Para llevar' : 'Delivery'}`}
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
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
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
                activeCategory === cat
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {isSearching && (
        <p className="text-[11px] text-slate-500 mb-4 shrink-0">
          {filteredProducts.length === 0 ? (
            <>
              Sin resultados para <strong>“{rawQuery}”</strong>.
            </>
          ) : (
            <>
              {filteredProducts.length} resultado
              {filteredProducts.length !== 1 ? 's' : ''} para{' '}
              <strong>“{rawQuery}”</strong> en toda la carta.
            </>
          )}
        </p>
      )}

      {/* Grid de platos */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!hasMenuProducts ? (
          <div className="text-center py-12 space-y-2">
            <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
            <p className="text-xs text-slate-500">
              No hay platos disponibles en la Carta del Día.
            </p>
          </div>
        ) : groupedByCategory ? (
          <div className="space-y-6">
            {groupedByCategory.map(([cat, products]) => (
              <div key={cat}>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 sticky top-0 z-10 bg-[#f8fbf9] py-1">
                  {cat}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenModal={handleOpenModal}
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
                onOpenModal={handleOpenModal}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de personalización cuando el producto tiene extras */}
      {modalProduct && (
        <CustomizeModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onConfirm={handleConfirmModal}
        />
      )}
    </div>
  );
}

