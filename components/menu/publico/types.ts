import type { Product } from '@/types';
import type {
  ProductoMenuPublicoDto, CategoriaMenuPublicoDto, BannerPublicoDto,
} from '@/lib/api/publico';

export type ProductoMenu = ProductoMenuPublicoDto;
export type CategoriaMenu = CategoriaMenuPublicoDto;
export type BannerPublico = BannerPublicoDto;

export const CATEGORY_ICON_BG: Record<string, string> = {
  Entradas: 'bg-emerald-100 text-emerald-700',
  'Platos de fondo': 'bg-slate-200 text-slate-700',
  Bebidas: 'bg-blue-100 text-blue-700',
  Postres: 'bg-pink-100 text-pink-700',
  Promociones: 'bg-purple-100 text-purple-700',
};

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
export const LIBRARIES: ('places' | 'geometry')[] = ['places'];

/** Adapta un plato del menú público al formato de producto que usa el carrito. */
export function productoToCartItem(p: ProductoMenu): Product {
  return {
    id: String(p.id),
    name: p.nombre,
    price: p.precio,
    category: p.categoriaNombre,
    image: p.imagenUrl ?? '',
    status: 'available' as const,
    stock: 99,
    sku: '',
    unit: 'unidades',
  };
}
