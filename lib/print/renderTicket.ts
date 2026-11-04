import type { TicketBlock, FontSize, Align, PaperSize } from '@/components/configuracion/tickets/ticketData';
import { SEP_CHAR, COMPROBANTE_COLOR } from '@/components/configuracion/tickets/ticketData';
import { thermalCss, thermalPrintScript } from './thermal';
import { montoEnLetras } from './montoEnLetras';

/** Datos reales de un pedido para imprimir la comanda con la plantilla configurada en
 *  /configuracion/tickets — análogo al SAMPLE que usa el editor, pero con la info real. */
export interface TicketOrderData {
  businessName?: string;
  businessAddress?: string;
  logoUrl?: string;
  orderNumber?: number | string;
  fecha?: string;
  hora?: string;
  mesa?: string;
  mozo?: string;
  clienteName?: string;
  clientePhone?: string;
  clienteAddress?: string;
  deliveryTime?: string;
  items: { cantidad: number; nombre: string; precio?: number; codigo?: string; extras?: string[]; notas?: string }[];
  /** Formato de comprobante electrónico (bloques "comprobante-cabecera", "totales-comprobante", etc.). */
  ruc?: string;
  docLabel?: string;
  docNumber?: string;
  clienteDoc?: string;
  igv?: number;
  igvPorcentaje?: number;
  pagos?: { metodo: string; monto: number }[];
  /** Solo aplican al ticket de cliente (bloques "totales"/"pago"/"qr") — una comanda de cocina no
   *  los trae porque aún no se cobró ni se emitió comprobante. */
  subtotal?: number;
  total?: number;
  paymentMethod?: string;
  /** Data URL (PNG) de un QR ya renderizado por el caller — este módulo arma HTML plano, sin React,
   *  así que no puede generar el QR por su cuenta. */
  qrDataUrl?: string;
  currency?: string;
}

const SIZE_PX: Record<FontSize, string> = { small: '9px', normal: '12px', large: '16px', xlarge: '22px' };
const ALIGN_CSS: Record<Align, string> = { left: 'left', center: 'center', right: 'right' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const tabRow = (label: string, value: string) =>
  `<div style="display:flex;gap:6px"><b style="width:52px;flex:none">${label}</b><span style="min-width:0;word-break:break-word">${esc(value)}</span></div>`;

/* thermalCss fuerza color negro en todo (*) con !important: las barras de color necesitan la clase
   .bar para que renderReciboHtml las pase a blanco con más especificidad. */
const bar = (html: string) =>
  `<div class="bar" style="background:${COMPROBANTE_COLOR};font-weight:bold;padding:3px 4px">${html}</div>`;

function spacer(lines: number): string {
  return lines > 0 ? `<div style="height:${lines * 0.9}em"></div>` : '';
}

/** Renderiza UN bloque de la plantilla con datos reales. Los bloques que no aplican antes de
 *  cobrar (totales, pago, qr) se omiten — una comanda de cocina no lleva precios ni comprobante. */
function renderBlock(block: TicketBlock, data: TicketOrderData): string {
  if (!block.visible) return '';

  const align = ALIGN_CSS[block.align ?? 'left'];
  const size = SIZE_PX[block.size ?? 'normal'];
  const weight = block.bold ? 'bold' : 'normal';
  const transform = block.upper ? 'uppercase' : 'none';

  let inner = '';
  switch (block.type) {
    case 'imagen':
      if (data.logoUrl) {
        const h = block.imgSize === 'grande' ? 96 : block.imgSize === 'chico' ? 48 : 64;
        inner = `<div style="text-align:center"><img src="${esc(data.logoUrl)}" style="height:${h}px;object-fit:contain" /></div>`;
      }
      break;

    case 'negocio':
      if (data.businessName || (block.showAddress && data.businessAddress)) {
        inner = `<div style="text-align:center;line-height:1.2">
          ${block.showName && data.businessName ? `<div style="font-size:${block.compactName ? '13px' : '17px'};font-weight:900">${esc(data.businessName)}</div>` : ''}
          ${block.showAddress && data.businessAddress ? `<div style="font-size:9px">${block.fiscalAddress ? 'Dir. Fiscal: ' : ''}${esc(data.businessAddress)}</div>` : ''}
        </div>`;
      }
      break;

    case 'texto':
      inner = `<div style="text-align:${align};font-size:${size};font-weight:${weight};text-transform:${transform};white-space:pre-wrap">${esc(block.text ?? '')}</div>`;
      break;

    case 'separador':
      inner = `<div style="text-align:center;overflow:hidden;white-space:nowrap">${SEP_CHAR[block.sepStyle ?? 'guiones'].repeat(48)}</div>`;
      break;

    case 'datos-pedido': {
      const rows: string[] = [];
      if (block.tabular) {
        if (block.showFecha && data.fecha) rows.push(tabRow('Fecha:', `${data.fecha}${data.hora ? ` ${data.hora}` : ''}`));
        inner = rows.length ? `<div style="font-size:${size}">${rows.join('')}</div>` : '';
        break;
      }
      if (block.showFecha && data.fecha) rows.push(`<div style="display:flex;justify-content:space-between"><span>Fecha:</span><span>${esc(data.fecha)}${data.hora ? `, ${esc(data.hora)}` : ''}</span></div>`);
      if (block.showHora && !block.showFecha && data.hora) rows.push(`<div style="display:flex;justify-content:space-between"><span>Hora:</span><span>${esc(data.hora)}</span></div>`);
      if (block.showMozo && data.mozo) rows.push(`<div><b>Mozo:</b> ${esc(data.mozo)}</div>`);
      inner = rows.length ? `<div style="font-size:${size}">${rows.join('')}</div>` : '';
      break;
    }

    case 'numero-pedido':
      if (data.orderNumber != null || data.mesa) {
        const label = data.mesa ? `Mesa ${data.mesa}` : `Pedido #${data.orderNumber}`;
        inner = `<div style="text-align:${align};font-size:${SIZE_PX[block.size ?? 'xlarge']};font-weight:bold">${esc(label)}</div>`;
      }
      break;

    case 'cliente': {
      const rows: string[] = [];
      if (block.tabular) {
        if (block.showClientName) rows.push(tabRow('Cliente:', data.clienteName || 'Clientes varios'));
        if (block.showClientDoc) rows.push(tabRow('Doc.:', data.clienteDoc || '0'));
        inner = rows.length ? `<div style="font-size:${size}">${rows.join('')}</div>` : '';
        break;
      }
      if (block.showClientName && data.clienteName) rows.push(`<div><b>Cliente:</b> ${esc(data.clienteName)}</div>`);
      if (block.showClientPhone && data.clientePhone) rows.push(`<div>Tel: ${esc(data.clientePhone)}</div>`);
      if (block.showClientAddress && data.clienteAddress) rows.push(`<div>Dir: ${esc(data.clienteAddress)}</div>`);
      if (block.showDeliveryTime && data.deliveryTime) rows.push(`<div>Hora de entrega: ${esc(data.deliveryTime)}</div>`);
      inner = rows.length ? `<div style="font-size:${size}">${rows.join('')}</div>` : '';
      break;
    }

    case 'productos': {
      const rows = data.items.map(it => `
        <div style="display:flex;justify-content:space-between;gap:6px;font-weight:bold;padding:2px 0">
          <span style="flex:1;min-width:0;word-break:break-word">${it.cantidad}&nbsp;&nbsp;${esc(it.nombre)}</span>
          ${block.showPrices && it.precio != null ? `<span style="white-space:nowrap">S/. ${it.precio.toFixed(2)}</span>` : ''}
        </div>
        ${it.extras?.length ? `<div style="padding-left:1.6em;font-size:0.9em;word-break:break-word">+ ${esc(it.extras.join(', '))}</div>` : ''}
        ${it.notas ? `<div style="padding-left:1.6em;font-size:0.9em;font-weight:bold;word-break:break-word">NOTA: ${esc(it.notas)}</div>` : ''}`).join('');
      inner = `<div style="font-size:${SIZE_PX[block.size ?? 'normal']}">
        <div style="display:flex;justify-content:space-between;font-weight:bold;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:4px">
          <span>Cant. Producto</span>${block.showPrices ? '<span>Total</span>' : ''}
        </div>${rows}</div>`;
      break;
    }

    case 'totales': {
      const currency = data.currency ?? 'S/';
      const money = (n: number) => `${currency} ${n.toFixed(2)}`;
      const rows: string[] = [];
      if (block.showSubtotal && data.subtotal != null) {
        rows.push(`<div style="display:flex;justify-content:space-between">
          <span>Subtotal</span><span>${money(data.subtotal)}</span></div>`);
      }
      if (data.total != null) {
        rows.push(`<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1.25em;margin-top:2px">
          <span>TOTAL</span><span>${money(data.total)}</span></div>`);
      }
      inner = rows.length ? `<div style="font-size:${size}">${rows.join('')}</div>` : '';
      break;
    }

    case 'pago':
      if (data.paymentMethod) {
        inner = `<div style="text-align:${align};font-size:${size};font-weight:${weight}">Pagado — ${esc(data.paymentMethod)}</div>`;
      }
      break;

    case 'qr':
      if (data.qrDataUrl) {
        inner = `<div style="text-align:center"><img src="${esc(data.qrDataUrl)}" style="width:96px;height:96px" /></div>`;
      }
      break;

    case 'comprobante-cabecera':
      inner = `<div style="text-align:center">
        ${data.ruc ? `<div style="font-size:15px;font-weight:bold;padding:2px 0">RUC: ${esc(data.ruc)}</div>` : ''}
        ${bar(`<div style="text-align:center;font-size:14px">${esc(data.docLabel ?? 'COMPROBANTE')}</div>`)}
        ${data.docNumber ? `<div style="font-size:14px;font-weight:bold;padding:3px 0">N° ${esc(data.docNumber)}</div>` : ''}
      </div>`;
      break;

    case 'detalle-comprobante': {
      const money = (n: number) => n.toFixed(2);
      const rows = data.items.map((it, i) => {
        const total = (it.precio ?? 0) * it.cantidad;
        return `<tr>
          <td>${i + 1}</td><td>${esc(it.codigo ?? '')}</td><td>${it.cantidad.toFixed(2)}</td>
          <td style="word-break:break-word">${esc(it.nombre)}</td>
          <td style="text-align:right">${money(it.precio ?? 0)}</td><td style="text-align:right">${money(total)}</td>
        </tr>`;
      }).join('');
      inner = `<table style="width:100%;border-collapse:collapse;font-size:${SIZE_PX[block.size ?? 'small']}">
        <thead><tr class="bar" style="background:${COMPROBANTE_COLOR}">
          <th style="text-align:left;padding:2px">#</th><th style="text-align:left">Cod</th><th style="text-align:left">Cant</th>
          <th style="text-align:left">Desc</th><th style="text-align:right">P.Vent</th><th style="text-align:right;padding-right:2px">Total</th>
        </tr></thead><tbody>${rows}</tbody></table>`;
      break;
    }

    case 'totales-comprobante': {
      if (data.total == null) break;
      const currency = data.currency ?? 'S/';
      const money = (n: number) => `${currency} ${n.toFixed(2)}`;
      const line = (label: string, value: string) =>
        `<div style="display:flex;justify-content:space-between"><span>${label}</span><span>${value}</span></div>`;
      inner = `<div style="font-size:${size}">
        ${line('Op. Gravadas', money(data.subtotal ?? 0))}
        ${line('Op. Exoneradas', money(0))}
        ${line('Op. Inafectas', money(0))}
        ${line(`I.G.V. (${data.igvPorcentaje ?? 18}%)`, money(data.igv ?? 0))}
        <div style="margin-top:4px">${bar(`<div style="display:flex;justify-content:space-between;font-size:14px"><span>IMPORTE TOTAL</span><span>${money(data.total)}</span></div>`)}</div>
        <div style="font-weight:bold;padding-top:4px">${esc(montoEnLetras(data.total))}</div>
      </div>`;
      break;
    }

    case 'forma-pago': {
      if (!data.pagos?.length) break;
      const currency = data.currency ?? 'S/';
      const line = (label: string, value: string) =>
        `<div style="display:flex;justify-content:space-between"><span>${label}</span><span>${value}</span></div>`;
      inner = `<div style="font-size:${size}">
        <div style="font-weight:bold;padding-bottom:2px">FORMA DE PAGO</div>
        ${line('Tipo', 'Contado')}
        ${data.pagos.map(p => line(esc(p.metodo), `${currency} ${p.monto.toFixed(2)}`)).join('')}
      </div>`;
      break;
    }

    default:
      inner = '';
  }

  if (!inner) return '';
  return `<div>${spacer(block.spaceTop)}${inner}${spacer(block.spaceBottom)}</div>`;
}

/** Arma el HTML completo (con la misma hoja de estilos que el mecanismo de impresión ya usado en
 *  QrTab/TicketEditor: ventana nueva + document.write + window.print()) a partir de la plantilla
 *  "cocina" configurada en /configuracion/tickets y los datos reales del pedido.
 *
 *  Un ticket físico POR ÍTEM del pedido (no uno solo con todos los platos listados adentro) — así
 *  cada plato se puede repartir/pegar por separado en cocina. Se arma como una sola página HTML con
 *  un salto de página entre cada ticket, para que salgan todos de un solo trabajo de impresión. */
export function renderComandaHtml(blocks: TicketBlock[], paper: PaperSize, data: TicketOrderData): string {
  const tickets = data.items.length > 0 ? data.items : [null];
  const pages = tickets.map((item, i) => {
    const ticketData: TicketOrderData = item ? { ...data, items: [item] } : data;
    const body = blocks.map(b => renderBlock(b, ticketData)).join('');
    const breakStyle = i < tickets.length - 1 ? 'page-break-after:always' : '';
    return `<div style="${breakStyle}">${body}</div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><title>Comanda</title><style>
    ${thermalCss(paper)}
  </style></head><body>
    ${pages}
    ${thermalPrintScript(paper, true)}
  </body></html>`;
}

/** Arma el HTML del ticket de cliente (el que se imprime al cobrar en /cobrar), con la plantilla
 *  "cliente" configurada en /configuracion/tickets — a diferencia de la comanda, es UNA sola
 *  página con todos los productos listados (es el comprobante que se lleva el cliente, no algo
 *  para repartir por separado en cocina). */
export function renderReciboHtml(blocks: TicketBlock[], paper: PaperSize, data: TicketOrderData): string {
  const body = blocks.map(b => renderBlock(b, data)).join('');

  return `<!DOCTYPE html><html><head><title>Comprobante</title><style>
    ${thermalCss(paper)}
    .bar, .bar * { color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style></head><body>
    ${body}
    ${thermalPrintScript(paper)}
  </body></html>`;
}
