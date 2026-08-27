import { ChevronDown, GripVertical, MoreVertical, Plus } from "lucide-react";
import type { ProductoDto } from "@/types/productos";
import ProductCard from "./ProductCard";

interface CategorySectionProps {
  sectionKey: string;
  title: string;
  items: ProductoDto[];
  collapsed: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconBg: string;
  highlight?: boolean;
  onEdit: (item: ProductoDto) => void;
  onDelete: (id: number, name: string) => void;
  onToggleFeatured: (id: number) => void;
  onToggleAvailable: (id: number, disponible: boolean) => void;
  featuredIds: Set<number>;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
  onDeleteCategory?: () => void;
  onAdd?: () => void;
}

export default function CategorySection({
  title,
  items,
  collapsed,
  onToggle,
  icon,
  iconBg,
  highlight,
  onEdit,
  onDelete,
  onToggleFeatured,
  onToggleAvailable,
  featuredIds,
  menuOpen,
  onMenuToggle,
  onDeleteCategory,
  onAdd,
}: CategorySectionProps) {
  const availableCount = items.filter((i) => i.disponible).length;
  return (
    <div
      className={`rounded-2xl border overflow-visible transition-shadow hover:shadow-card ${highlight ? "border-amber-200 bg-linear-to-r from-amber-50 via-white to-purple-50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="h-4 w-4 text-slate-300 shrink-0 cursor-grab" />
        <span
          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-col flex-1 min-w-0 text-left"
        >
          <span className="text-sm font-bold text-slate-800 truncate">
            {title}
          </span>
          <span className="text-[10px] text-slate-400">
            {items.length}{" "}
            {highlight ? "destacados" : items.length === 1 ? "plato" : "platos"}
            {!highlight &&
              items.length > 0 &&
              ` · ${availableCount} disponibles`}
          </span>
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-brand hover:bg-brand/10 px-2 py-1 rounded-lg transition-colors shrink-0"
            title="Agregar producto a esta categoría"
          >
            <Plus className="h-3.5 w-3.5" /> Producto
          </button>
        )}
        {onMenuToggle && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onMenuToggle}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-dropdown py-1 z-10">
                <button
                  type="button"
                  onClick={onDeleteCategory}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Eliminar categoría
                </button>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Sin productos en esta categoría todavía.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id, item.nombre)}
                  onToggleFeatured={() => onToggleFeatured(item.id)}
                  onToggleAvailable={() =>
                    onToggleAvailable(item.id, !item.disponible)
                  }
                  isFeatured={featuredIds.has(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
