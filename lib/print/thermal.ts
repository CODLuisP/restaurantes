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
      var mm=Math.ceil(px*25.4/96)+2;
      var s=document.createElement('style');
      s.textContent='@page{size:${paperMm}mm '+mm+'mm;margin:0}';
      document.head.appendChild(s);
      window.print();window.close();
    }
  <\/script>`;
}

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
