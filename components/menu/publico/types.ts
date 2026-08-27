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

export { cartLineId, parseCartLineId } from '@/lib/cart/cartLineId';
import { cartLineId } from '@/lib/cart/cartLineId';

/** Adapta un plato del menú público (y, si eligió una, su variante) al producto que usa el carrito. */
export function productoToCartItem(p: ProductoMenu, varianteId?: number | null): Product {
  const variante = varianteId ? p.variantes?.find(v => v.id === varianteId) : undefined;
  return {
    id: cartLineId(p.id, varianteId),
    name: variante ? `${p.nombre} (${variante.nombre})` : p.nombre,
    price: variante ? variante.precio : p.precio,
    category: p.categoriaNombre,
    image: p.imagenUrl ?? '',
    status: 'available' as const,
    stock: 99,
    sku: '',
    unit: 'unidades',
  };
}
