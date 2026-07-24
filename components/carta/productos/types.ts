export interface ProductForm {
  nombre: string;
  precio: number;
  categoriaId: number;
  descripcion: string;
  disponible: boolean;
  imagenUrl: string;
}

export const emptyForm = (defaultCategoriaId?: number): ProductForm => ({
  nombre: "",
  precio: 0,
  categoriaId: defaultCategoriaId ?? 0,
  descripcion: "",
  disponible: true,
  imagenUrl: "",
});

export const CATEGORY_ICON_BG: Record<string, string> = {
  Entradas: "bg-emerald-100 text-emerald-700",
  "Platos de fondo": "bg-slate-200 text-slate-700",
  Bebidas: "bg-blue-100 text-blue-700",
  Postres: "bg-pink-100 text-pink-700",
  Promociones: "bg-purple-100 text-purple-700",
};

export const STAT_TONES: Record<string, string> = {
  brand: "bg-brand/10 text-brand",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
};

export const FEATURED_STORAGE_KEY = "restopro_productos_destacados";
