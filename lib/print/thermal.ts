/** Estilos base para tickets en impresora térmica (pre-cuenta, comanda, cancelación).
 *
 *  Por qué así:
 *  - Ancho = área IMPRIMIBLE del cabezal (72mm en papel de 80mm, 48mm en 58mm), no el ancho del
 *    papel. Si el contenido se pasa, el navegador "ajusta a página" y reduce todo → letra chica y borrosa.
 *  - Fuente sans-serif en negrita: Courier New tiene trazos de ~1px que a 203dpi salen cortados/lavados.
 *  - Solo negro puro: los grises/opacidades se imprimen con tramado (puntos) y se ven difusos. */

export type ThermalPaper = '58mm' | '80mm';

const PRINTABLE_MM: Record<ThermalPaper, number> = { '58mm': 48, '80mm': 72 };

/** Script de impresión para tickets térmicos. Chrome ignora "@page { size: 80mm auto }" y cae a
 *  A4, así que se mide el contenido y se fija el tamaño exacto (ancho del rollo x alto del ticket)
 *  justo antes de imprimir.
 *  perPage=true: cada <div> hijo del body es un ticket aparte (salto de página entre ellos), así
 *  que el alto es el del más alto; si no, es el alto de todo el contenido. */
export function thermalPrintScript(paper: ThermalPaper = '80mm', perPage = false): string {
  const paperMm = paper === '58mm' ? 58 : 80;
  return `<script>
    window.onload=function(){
      var px=${perPage}
        ? Math.max.apply(null,[].map.call(document.querySelectorAll('body > div'),function(d){return d.offsetHeight}))+16
        : document.body.offsetHeight;
      var mm=Math.ceil(px*25.4/96)+2+2*${MARGEN_V_MM};
      var s=document.createElement('style');
      s.textContent='@page{size:${paperMm}mm '+mm+'mm;margin:${MARGEN_V_MM}mm 0}';
      document.head.appendChild(s);
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
  const paperMm = paper === '58mm' ? 58 : 80;
  const contentMm = PRINTABLE_MM[paper];
  return `
    @page { size: ${paperMm}mm auto; margin: ${MARGEN_V_MM}mm 0; }
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
