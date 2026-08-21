'use client';

import { Minus, Plus, Utensils } from 'lucide-react';
import type { ProductoMenu } from './types';

export default function PublicProductCard({
  item,
  quantity = 0,
  onAdd,
  onUpdateQty,
  selectedVariantId,
  onSelectVariant,
}: {
  item: ProductoMenu;
  quantity?: number;
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
  selectedVariantId?: number | null;
  onSelectVariant?: (variantId: number | null) => void;
}) {
  const precioEfectivo = item.variantes?.find(v => v.id === selectedVariantId)?.precio ?? item.precio;
  const tieneVariantes = item.variantes && item.variantes.length > 0;
  return (
    <div className="group rounded-xl border border-slate-100 bg-white overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="relative aspect-16/10 w-full bg-slate-100 overflow-hidden">
        {item.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imagenUrl}
            alt={item.nombre}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300">
            <Utensils className="h-8 w-8" />
          </div>
        )}
        <span className="absolute top-2 right-2 text-[11px] bg-white text-slate-800 px-2 py-0.5 rounded-full font-mono font-bold shadow-sm animate-section">
          S/. {precioEfectivo.toFixed(2)}
        </span>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h5 className="text-sm font-bold text-slate-800 leading-tight line-clamp-1">
            {item.nombre}
          </h5>
          {item.descripcion && (
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {item.descripcion}
            </p>
          )}
          {tieneVariantes && (
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                onClick={() => onSelectVariant?.(null)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${!selectedVariantId ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Normal
              </button>
              {item.variantes.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelectVariant?.(v.id)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${selectedVariantId === v.id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {v.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botón / Selector de cantidad */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
          {quantity === 0 ? (
            <button
              onClick={onAdd}
              className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar
            </button>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
              <button
                onClick={() => onUpdateQty(-1)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-650 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Disminuir cantidad"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-bold text-slate-800 font-mono">
                {quantity}
              </span>
              <button
                onClick={() => onUpdateQty(1)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-650 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
