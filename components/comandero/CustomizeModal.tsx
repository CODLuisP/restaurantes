'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import type { Product } from '@/types';

/** Modal de personalización de producto (variante requerida + extras opcionales) */
export default function CustomizeModal({
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
