/** Estilos base para tickets en impresora térmica (pre-cuenta, comanda, cancelación).
 *
 *  Por qué así:
 *  - Ancho = área IMPRIMIBLE del cabezal (72mm en papel de 80mm, 48mm en 58mm), no el ancho del
 *    papel. Si el contenido se pasa, el navegador "ajusta a página" y reduce todo → letra chica y borrosa.
 *  - Fuente sans-serif en negrita: Courier New tiene trazos de ~1px que a 203dpi salen cortados/lavados.
 *  - Solo negro puro: los grises/opacidades se imprimen con tramado (puntos) y se ven difusos. */

export type ThermalPaper = '58mm' | '80mm';

const PRINTABLE_MM: Record<ThermalPaper, number> = { '58mm': 48, '80mm': 72 };

/** Script de impresión para tickets térmicos: imprime al cargar y cierra la ventana al terminar.
 *  NO se fija el alto de la página: la impresora térmica ya tiene su propio papel (ej. RP58 con
 *  58 x 210 mm) y si la página CSS es más corta, Chrome la encaja CENTRADA en ese papel → quedaba
 *  mucho blanco arriba y abajo. Sin tamaño fijo, el ticket arranca arriba de la hoja de la impresora.
 *  (Los parámetros se conservan por compatibilidad con quienes lo llaman.) */
export function thermalPrintScript(_paper: ThermalPaper = '80mm', _perPage = false): string {
  return `<script>
    window.onload=function(){
      /* La ventana se cierra cuando termina la impresión (imprimir o cancelar). En una ventana
         independiente (noopener) Chrome no bloquea en print(): un close() inmediato cancelaba el diálogo. */
      window.onafterprint=function(){window.close()};
      window.print();
    }
  <\/script>`;
}

/** Margen superior/inferior REAL de la página (no 0): ver SIN_ENCABEZADOS_CHROME. */
const MARGEN_V_MM = 4;

/** Con una impresora física Chrome respeta el margen mínimo del cabezal aunque pidamos margin: 0,
 *  y en ese espacio imprime sus propios encabezados (fecha/hora, título, "about:blank", "1/1").
 *  Desde Chrome 131, si la página define sus propias cajas de margen (@top-*, @bottom-*), Chrome
 *  NO imprime los suyos en ese borde: se definen todas vacías y el ticket sale limpio. Ojo: con
 *  margin: 0 esas cajas miden 0 y Chrome igual usa el margen físico de la impresora para sus textos;
 *  por eso la página lleva un margen real arriba/abajo (MARGEN_V_MM) donde viven las cajas. */
const SIN_ENCABEZADOS_CHROME = `@page {
      @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; }
      @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; }
    }`;

export function thermalCss(paper: ThermalPaper = '80mm', baseFontPx = 13): string {
  const contentMm = PRINTABLE_MM[paper];
  return `
    @page { margin: ${MARGEN_V_MM}mm 0; }
    ${SIN_ENCABEZADOS_CHROME}
    * { box-sizing: border-box; color: #000 !important; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      width: ${contentMm}mm;
      margin: 0 auto;
      padding: 0;
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
