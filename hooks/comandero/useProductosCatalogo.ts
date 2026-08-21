'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { OrderType, Product, Toast } from '@/types';
import { getProductos } from '@/lib/api/productos';
import type { ProductoDto } from '@/types/productos';

/** Catálogo real de productos (backend) para armar comandas en el Comandero. */
export function useProductosCatalogo(orderType: OrderType, triggerToast: (message: string, type?: Toast['type']) => void) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;
  const sucursalId = authSession?.user?.sucursalId ?? undefined;

  const [productos, setProductos] = useState<ProductoDto[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    if (!token) { setProductsLoading(false); return; }
    let cancelled = false;
    setProductsLoading(true);
    getProductos(token, { sucursalId, soloDisponibles: true })
      .then(data => { if (!cancelled) setProductos(data); })
      .catch(() => { if (!cancelled) triggerToast('No se pudo cargar la carta de productos.', 'error'); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [token, sucursalId, triggerToast]);

  /* Delivery cobra su propio precio si está fijado; el resto usa el precio normal de la sucursal. */
  const products: Product[] = useMemo(() => productos.map(p => ({
    id: String(p.id),
    name: p.nombre,
    price: (orderType === 'delivery' ? p.precioDelivery : undefined) ?? p.precio ?? 0,
    category: p.categoriaNombre,
    image: p.imagenUrl ?? '',
    status: p.disponible === false ? 'out_of_stock' : 'available',
    stock: p.cantidadActual ?? 999,
    sku: String(p.id),
    unit: p.unidad ?? 'Porción',
  })), [productos, orderType]);

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category))).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  return { products, categories, productsLoading };
}
