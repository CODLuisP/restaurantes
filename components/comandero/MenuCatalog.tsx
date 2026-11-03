'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookOpen, Check, ChevronDown, ChevronUp, Plus, Search, Utensils, X } from 'lucide-react';
import type { OrderType, Product } from '@/types';

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

function ProductCard({
  product,
  onOpenModal,
  onAddToCart,
}: {
  product: Product;
  onOpenModal: (product: Product, initialVariantId?: number) => void;
  onAddToCart: (product: Product, varianteId?: number | null, extraIds?: number[]) => void;
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
    <div className="flex flex-col relative">
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

            {tieneVariantes ? (
              <div className="mt-1">
                <span className="text-[11px] font-bold text-brand">
                  Desde S/ {minPrice.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                  {product.variants!.length} opciones
                  {dropdownOpen ? (
                    <ChevronUp className="h-3 w-3 inline" />
                  ) : (
                    <ChevronDown className="h-3 w-3 inline" />
                  )}
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <span className="text-[11px] font-mono font-bold text-slate-700">
                  S/ {product.price.toFixed(2)}
                </span>
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

/** Modal de personalización de producto (variante requerida + extras opcionales) */
function CustomizeModal({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (varianteId?: number | null, extraIds?: number[]) => void;
}) {
  const tieneVariantes = !!product.variants && product.variants.length > 0;
  const tieneExtras = !!product.extras && product.extras.length > 0;

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    tieneVariantes ? product.variants![0].id : null
  );
  const [selectedExtraIds, setSelectedExtraIds] = useState<number[]>([]);

  const toggleExtra = (id: number) => {
    setSelectedExtraIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedVariant = tieneVariantes
    ? product.variants!.find(v => v.id === selectedVariantId)
    : undefined;

  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const extrasTotal = tieneExtras
    ? product.extras!
        .filter(e => selectedExtraIds.includes(e.id))
        .reduce((sum, e) => sum + e.price, 0)
    : 0;

  const totalPrice = basePrice + extrasTotal;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-800 leading-tight">
              {product.name}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Personaliza tu pedido
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido / Opciones */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Variantes / Tamaño */}
          {tieneVariantes && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tamaño / Variante <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                {product.variants!.map(v => {
                  const isSelected = selectedVariantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${
                        isSelected
                          ? 'border-brand bg-brand/5 text-brand shadow-xs'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="font-mono font-bold">
                        S/ {v.price.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extras / Adicionales / Cremas */}
          {tieneExtras && (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Extras
                </label>
                <p className="text-[10px] text-slate-400">
                  Opcional — elige las que quieras
                </p>
              </div>
              <div className="space-y-2">
                {product.extras!.map(ex => {
                  const isSelected = selectedExtraIds.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => toggleExtra(ex.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all text-left ${
                        isSelected
                          ? 'border-brand bg-brand/5 text-slate-900 font-semibold'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-brand bg-brand text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                        <span>{ex.name}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-600">
                        {ex.price > 0 ? `+ S/ ${ex.price.toFixed(2)}` : 'S/ 0.00'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Botón agregar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => onConfirm(selectedVariantId, selectedExtraIds)}
            className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold flex items-center justify-between transition-all shadow-sm cursor-pointer"
          >
            <span>Agregar al pedido</span>
            <span className="font-mono font-extrabold text-base">
              S/ {totalPrice.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
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

