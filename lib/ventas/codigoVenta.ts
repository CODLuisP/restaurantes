/** Código visible de una venta interna (nota de venta): el correlativo de ticket de la sucursal,
 *  el mismo en Dashboard, Ventas del día, PDF y Excel. El `id` es solo técnico. */
export function codigoVenta(v: { id: number; correlativoTicket?: number | null }): string {
  return `N.Venta #${v.correlativoTicket ?? v.id}`;
}
