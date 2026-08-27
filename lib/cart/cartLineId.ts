/** Id de línea de carrito: cada variante de un mismo producto es una línea propia del pedido
 *  (ej. "Chicha helada" y "Chicha al tiempo" no deben mezclar cantidades). Compartido entre el
 *  menú público y el Comandero, que arman el carrito de formas distintas pero envían al mismo
 *  backend (productoId + varianteId opcional). */
export function cartLineId(productId: number | string, varianteId?: number | null): string {
  return varianteId ? `${productId}:v${varianteId}` : String(productId);
}

/** Inverso de `cartLineId` — para armar el payload real hacia el backend. */
export function parseCartLineId(lineId: string): { productoId: number; varianteId?: number } {
  const [pid, vid] = lineId.split(':v');
  return { productoId: Number(pid), varianteId: vid ? Number(vid) : undefined };
}
