/** Estilos base para tickets en impresora térmica (pre-cuenta, comanda, cancelación).
 *
 *  Por qué así:
 *  - Ancho = área IMPRIMIBLE del cabezal (72mm en papel de 80mm, 48mm en 58mm), no el ancho del
 *    papel. Si el contenido se pasa, el navegador "ajusta a página" y reduce todo → letra chica y borrosa.
 *  - Fuente sans-serif en negrita: Courier New tiene trazos de ~1px que a 203dpi salen cortados/lavados.
 *  - Solo negro puro: los grises/opacidades se imprimen con tramado (puntos) y se ven difusos. */

export type ThermalPaper = '58mm' | '80mm';

const PRINTABLE_MM: Record<ThermalPaper, number> = { '58mm': 48, '80mm': 72 };

export function thermalCss(paper: ThermalPaper = '80mm', baseFontPx = 13): string {
  const paperMm = paper === '58mm' ? 58 : 80;
  const contentMm = PRINTABLE_MM[paper];
  return `
    @page { size: ${paperMm}mm auto; margin: 0; }
    * { box-sizing: border-box; color: #000 !important; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      width: ${contentMm}mm;
      margin: 0 auto;
      padding: 2mm 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${baseFontPx}px;
      font-weight: bold;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    img { max-width: 100%; }
  `;
}
