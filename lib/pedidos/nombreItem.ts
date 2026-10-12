/** Campos que comparten los ítems de pedido, venta y comprobante del backend. */
interface ItemConNombre {
  productoNombre?: string | null;
  varianteNombre?: string | null;
  comboNombre?: string | null;
  /** Solo los ítems de pedido los traen hoy; venta/comprobante los mostrarán cuando el backend los incluya. */
  extras?: { nombre: string }[] | null;
}

/** "Producto (Variante) + Extra1, Extra2" — el mismo texto en Comandero, Despachar, Cobrar,
 *  ventas e impresiones, para que nadie pierda de vista un extra que ya se está cobrando.
 *  `conExtras: false` cuando la vista ya los dibuja aparte (KDS). */
export function nombreItemPedido(item: ItemConNombre, { conExtras = true }: { conExtras?: boolean } = {}): string {
  const base = item.productoNombre
    ? (item.varianteNombre ? `${item.productoNombre} (${item.varianteNombre})` : item.productoNombre)
    : item.comboNombre ?? item.varianteNombre ?? 'Producto';
  const extras = conExtras && item.extras?.length ? ` + ${item.extras.map(e => e.nombre).join(', ')}` : '';
  return base + extras;
}
