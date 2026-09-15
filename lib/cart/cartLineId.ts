/** Id de línea de carrito: cada combinación distinta de variante/extras de un mismo producto es
 *  una línea propia del pedido (ej. "Chicha helada" y "Chicha al tiempo", o "Ceviche + crema" y
 *  "Ceviche" a secas, no deben mezclar cantidades). Compartido entre el menú público y el
 *  Comandero, que arman el carrito de formas distintas pero envían al mismo backend (productoId +
 *  varianteId/extraIds opcionales). */
export function cartLineId(productId: number | string, varianteId?: number | null, extraIds?: number[] | null): string {
  let id = String(productId);
  if (varianteId) id += `:v${varianteId}`;
  if (extraIds && extraIds.length > 0) id += `:e${[...extraIds].sort((a, b) => a - b).join(',')}`;
  return id;
}

/** Inverso de `cartLineId` — para armar el payload real hacia el backend. */
export function parseCartLineId(lineId: string): { productoId: number; varianteId?: number; extraIds?: number[] } {
  const [pid, ...rest] = lineId.split(':');
  const vPart = rest.find(p => p.startsWith('v'));
  const ePart = rest.find(p => p.startsWith('e'));
  return {
    productoId: Number(pid),
    varianteId: vPart ? Number(vPart.slice(1)) : undefined,
    extraIds: ePart ? ePart.slice(1).split(',').map(Number) : undefined,
  };
}
