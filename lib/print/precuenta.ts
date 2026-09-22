/** Pre-cuenta — mismo mecanismo de impresión que la comanda/cancelación (ventana nueva +
 *  document.write + window.print()). A diferencia de un comprobante real, no lleva serie ni
 *  correlativo: es solo el detalle que el mozo entrega al cliente antes de cobrar. */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n: number) => n.toFixed(2);

export interface PreCuentaData {
  businessName?: string;
  ruc?: string;
  direccion?: string;
  logoUrl?: string;
  mesa?: string;
  mozo?: string;
  items: { cantidad: number; nombre: string; precioUnitario: number }[];
}

export function imprimirPreCuenta(data: PreCuentaData, paper: '58mm' | '80mm' = '80mm') {
  if (typeof window === 'undefined' || data.items.length === 0) return;

  const widthMm = paper === '58mm' ? 58 : 80;
  const total = data.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const fechaHora = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });

  const filas = data.items.map(i => `
    <div style="display:flex;justify-content:space-between;padding:2px 0">
      <span>${i.cantidad}&nbsp;&nbsp;${esc(i.nombre)}</span>
      <span>S/. ${money(i.cantidad * i.precioUnitario)}</span>
    </div>`).join('');

  const html = `<!DOCTYPE html><html><head><title>Pre-cuenta</title><style>
    @page { size: ${widthMm}mm auto; margin: 0; }
    body { font-family: 'Courier New', monospace; width: ${widthMm}mm; margin: 0; padding: 8px 10px; color: #000; font-size: 12px; }
    .center { text-align: center; }
    .sep { border-top: 1px dashed #000; margin: 6px 0; }
    .bold { font-weight: bold; }
  </style></head><body>
    ${data.logoUrl ? `<div class="center"><img src="${esc(data.logoUrl)}" style="height:64px;object-fit:contain" /></div>` : ''}
    <div class="center bold" style="font-size:15px">${esc(data.businessName ?? '')}</div>
    ${data.ruc ? `<div class="center">RUC: ${esc(data.ruc)}</div>` : ''}
    ${data.direccion ? `<div class="center">${esc(data.direccion)}</div>` : ''}
    <div class="sep"></div>
    <div class="center bold" style="font-size:14px">PRE-CUENTA</div>
    <div class="center" style="font-size:10px">Documento no válido como comprobante de pago</div>
    <div class="sep"></div>
    <div>Fecha: ${esc(fechaHora)}</div>
    ${data.mesa ? `<div>Mesa: ${esc(data.mesa)}</div>` : ''}
    ${data.mozo ? `<div>Mozo: ${esc(data.mozo)}</div>` : ''}
    <div class="sep"></div>
    ${filas}
    <div class="sep"></div>
    <div style="display:flex;justify-content:space-between" class="bold"><span>TOTAL</span><span>S/. ${money(total)}</span></div>
    <script>window.onload=function(){window.print();window.close()}<\/script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
