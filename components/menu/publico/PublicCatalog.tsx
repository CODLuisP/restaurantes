'use client';

import { useMemo, useState } from 'react';
import { Star, Utensils } from 'lucide-react';
import type { Product } from '@/types';
import ProductCard from '@/components/comandero/ProductCard';
import CustomizeModal from '@/components/comandero/CustomizeModal';
import { productoMenuToProduct, type ProductoMenu } from './types';

export interface GrupoCatalogo {
  id: string;
  titulo: string;
  items: ProductoMenu[];
  destacado?: boolean;
}

/** Grilla de la carta pública — mismas tarjetas y modal de personalización que el catálogo del
 *  Comandero, agrupada por categoría. */
export default function PublicCatalog({
  grupos,
  onAdd,
  disabled = false,
}: {
  grupos: GrupoCatalogo[];
  onAdd: (producto: ProductoMenu, varianteId?: number | null, extraIds?: number[]) => void;
  disabled?: boolean;
}) {
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const porId = useMemo(() => {
    const map = new Map<string, ProductoMenu>();
    grupos.forEach(g => g.items.forEach(i => map.set(String(i.id), i)));
    return map;
  }, [grupos]);

  const agregar = (product: Product, varianteId?: number | null, extraIds?: number[]) => {
    const original = porId.get(product.id);
    if (original) onAdd(original, varianteId, extraIds);
  };

  if (grupos.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center bg-white">
        <Utensils className="h-6 w-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No se encontraron platos que coincidan con la búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grupos.map(g => (
        <section key={g.id}>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            {g.destacado && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />}
            {g.titulo}
            <span className="text-[10px] font-semibold text-slate-400 normal-case">({g.items.length})</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {g.items.map(item => (
              <ProductCard
                key={`${g.id}-${item.id}`}
                product={productoMenuToProduct(item)}
                onOpenModal={setModalProduct}
                onAddToCart={agregar}
                disabled={disabled}
              />
            ))}
          </div>
        </section>
      ))}

      {modalProduct && (
        <CustomizeModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onConfirm={(varianteId, extraIds) => {
            agregar(modalProduct, varianteId, extraIds);
            setModalProduct(null);
          }}
        />
      )}
    </div>
  );
}
