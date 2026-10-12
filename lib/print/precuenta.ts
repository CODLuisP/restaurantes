/** Pre-cuenta — mismo mecanismo de impresión que la comanda/cancelación (ventana nueva +
 *  document.write + window.print()). A diferencia de un comprobante real, no lleva serie ni
 *  correlativo: es solo el detalle que el mozo entrega al cliente antes de cobrar. */

import { thermalCss } from './thermal';

const esc =(s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  const total = data.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const fechaHora = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });

  const filas = data.items.map(i => `
    <div class="row" style="padding:2px 0">
      <span class="name">${i.cantidad}&nbsp;&nbsp;${esc(i.nombre)}</span>
      <span class="amount">S/. ${money(i.cantidad * i.precioUnitario)}</span>
    </div>`).join('');

  const html = `<!DOCTYPE html><html><head><title>Pre-cuenta</title><style>
    ${thermalCss(paper, paper === '58mm' ? 12 : 13)}
    .center { text-align: center; }
    .sep { border-top: 2px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 6px; }
    .row .name { flex: 1; min-width: 0; word-break: break-word; }
    .row .amount { white-space: nowrap; }
  </style></head><body>
    ${data.logoUrl ? `<div class="center"><img src="${esc(data.logoUrl)}" style="height:64px;object-fit:contain" /></div>` : ''}
    <div class="center" style="font-size:17px">${esc(data.businessName ?? '')}</div>
    ${data.ruc ? `<div class="center">RUC: ${esc(data.ruc)}</div>` : ''}
    ${data.direccion ? `<div class="center">${esc(data.direccion)}</div>` : ''}
    <div class="sep"></div>
    <div class="center" style="font-size:16px">PRE-CUENTA</div>
    <div class="center" style="font-size:11px">Documento no válido como comprobante de pago</div>
    <div class="sep"></div>
    <div>Fecha: ${esc(fechaHora)}</div>
    ${data.mesa ? `<div>Mesa: ${esc(data.mesa)}</div>` : ''}
    ${data.mozo ? `<div>Mozo: ${esc(data.mozo)}</div>` : ''}
    <div class="sep"></div>
    ${filas}
    <div class="sep"></div>
    <div class="row" style="font-size:16px"><span>TOTAL</span><span class="amount">S/. ${money(total)}</span></div>
    <script>window.onload=function(){window.print();window.close()}<\/script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
