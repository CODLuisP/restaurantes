import { Pencil, Star, Trash2, Utensils } from "lucide-react";
import { Toggle } from "@/components/ui";
import type { ProductoDto } from "@/types/productos";

export default function ProductCard({
  item,
  onEdit,
  onDelete,
  onToggleFeatured,
  onToggleAvailable,
  isFeatured,
}: {
  item: ProductoDto;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
  onToggleAvailable: () => void;
  isFeatured: boolean;
}) {
  const disponible = item.disponible ?? true;
  return (
    <div className="group card overflow-hidden flex flex-col transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
        {item.imagenUrl ? (
          <img
            src={item.imagenUrl}
            alt={item.nombre}
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${!disponible ? "grayscale" : ""}`}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300">
            <Utensils className="h-8 w-8" />
          </div>
        )}

        {!disponible && (
          <div className="absolute inset-0 bg-white/40 flex items-start justify-start p-2">
            <span className="text-[9px] bg-slate-800/90 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Agotado
            </span>
          </div>
        )}

        {isFeatured && disponible && (
          <button
            onClick={onToggleFeatured}
            className="absolute top-2 left-2 h-6 w-6 bg-amber-400 text-white rounded-full font-bold flex items-center justify-center shadow-sm hover:bg-amber-500 transition-colors"
            title="Quitar de destacados"
          >
            <Star className="h-3 w-3 fill-white" />
          </button>
        )}

        <span className="absolute top-2 right-2 text-[11px] bg-white text-slate-800 px-2 py-0.5 rounded-full font-mono font-bold shadow-sm">
          S/. {(item.precio ?? 0).toFixed(2)}
        </span>

        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="h-7 w-7 rounded-lg bg-white/95 text-slate-600 hover:text-brand flex items-center justify-center shadow-sm"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleFeatured}
            className={`h-7 w-7 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
              isFeatured
                ? "bg-amber-400 text-white hover:bg-amber-500"
                : "bg-white/95 text-slate-600 hover:text-amber-500"
            }`}
            title={isFeatured ? "Quitar de destacados" : "Destacar"}
          >
            <Star className={`w-3.5 h-3.5 ${isFeatured ? "fill-white" : ""}`} />
          </button>
          <button
            onClick={onDelete}
            className="h-7 w-7 rounded-lg bg-white/95 text-slate-600 hover:text-red-600 flex items-center justify-center shadow-sm transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h5 className="text-sm font-bold text-slate-800 leading-tight line-clamp-1">
          {item.nombre}
        </h5>
        {item.descripcion && (
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 flex-1">
            {item.descripcion}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
          <span
            className={`text-[10px] font-bold uppercase tracking-wide ${disponible ? "text-emerald-600" : "text-slate-400"}`}
          >
            {disponible ? "Disponible" : "Agotado"}
          </span>
          <Toggle checked={disponible} onChange={() => onToggleAvailable()} />
        </div>
      </div>
    </div>
  );
}
