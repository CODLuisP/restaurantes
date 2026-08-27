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
  "Platos de fondo": "bg-emerald-100 text-emerald-700",
  Bebidas: "bg-emerald-100 text-emerald-700",
  Postres: "bg-emerald-100 text-emerald-700",
  Promociones: "bg-emerald-100 text-emerald-700",
};

export const STAT_TONES: Record<string, string> = {
  brand: "bg-emerald-50 text-emerald-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-emerald-50 text-emerald-600",
  violet: "bg-emerald-50 text-emerald-600",
};

export const FEATURED_STORAGE_KEY = "restopro_productos_destacados";
