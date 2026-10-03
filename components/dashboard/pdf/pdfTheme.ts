/**
 * Paleta y medidas del PDF del dashboard — tomadas de app/design-tokens.css.
 *
 * Pensadas para imprimir: bloques de color sólidos, texto nunca más claro que
 * slate-600 (#475569) sobre blanco, y líneas finas pero visibles. Así el reporte
 * no sale "descolorido" en impresoras láser o en modo ahorro de tinta.
 */

export type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const PDF_COLORS = {
  brand: hex('#007542'),
  brandDark: hex('#094127'),
  brandHover: hex('#1E8C45'),
  brandAccent: hex('#58BB43'),
  /** brand al 10% sobre blanco — mismo tono que bg-brand/10 del Tip Comercial. */
  brandTint: hex('#E6F1EC'),
  brandTintBorder: hex('#B3D6C6'),

  /** Bloques de KPI — mismo verde que las cabeceras de los paneles — y sus textos secundarios. */
  kpiTile: hex('#007542'),
  kpiLabel: hex('#D1EBDD'),

  textPrimary: hex('#1e293b'),
  textSecondary: hex('#475569'),

  border: hex('#CBD5E1'),
  borderSubtle: hex('#E2E8F0'),
  white: hex('#FFFFFF'),

  /** Métodos de pago en la misma familia de verdes de la marca, del más oscuro al más claro. */
  efectivo: hex('#007542'),
  yape: hex('#58BB43'),
  plin: hex('#3AA346'),
  tarjeta: hex('#8FC7A6'),
  otro: hex('#64748B'),
  danger: hex('#E11D48'),
} as const;

export const PDF_LAYOUT = {
  /** A4 vertical, en milímetros. */
  pageWidth: 210,
  pageHeight: 297,
  margin: 10,
  footerHeight: 8,
  gap: 3,
} as const;

export const PDF_FONT = {
  family: 'helvetica',
  /** Tamaños en pt — nada por debajo de 6 para que se lea impreso. */
  panelTitle: 7.5,
  body: 7.5,
  small: 7,
  kpiValue: 15,
} as const;

export const METODO_COLOR: Record<string, RGB> = {
  efectivo: PDF_COLORS.efectivo,
  tarjeta: PDF_COLORS.tarjeta,
  yape: PDF_COLORS.yape,
  plin: PDF_COLORS.plin,
  otro: PDF_COLORS.otro,
};
