import type { TicketBlock, FontSize, Align, PaperSize } from '@/components/configuracion/tickets/ticketData';
import { SEP_CHAR } from '@/components/configuracion/tickets/ticketData';

/** Datos reales de un pedido para imprimir la comanda con la plantilla configurada en
 *  /configuracion/tickets — análogo al SAMPLE que usa el editor, pero con la info real. */
export interface TicketOrderData {
  businessName?: string;
  logoUrl?: string;
  orderNumber?: number | string;
  fecha?: string;
  hora?: string;
  mesa?: string;
  mozo?: string;
  clienteName?: string;
  items: { cantidad: number; nombre: string; precio?: number }[];
}

const SIZE_PX: Record<FontSize, string> = { small: '9px', normal: '12px', large: '16px', xlarge: '22px' };
const ALIGN_CSS: Record<Align, string> = { left: 'left', center: 'center', right: 'right' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
      if (data.businessName) {
        inner = `<div style="text-align:center;line-height:1.2">
          ${block.showName ? `<div style="font-size:${block.compactName ? '13px' : '17px'};font-weight:900">${esc(data.businessName)}</div>` : ''}
        </div>`;
      }
      break;

    case 'texto':
      inner = `<div style="text-align:${align};font-size:${size};font-weight:${weight};text-transform:${transform};white-space:pre-wrap">${esc(block.text ?? '')}</div>`;
      break;

    case 'separador':
      inner = `<div style="text-align:center;overflow:hidden;white-space:nowrap;opacity:.8">${SEP_CHAR[block.sepStyle ?? 'guiones'].repeat(48)}</div>`;
      break;

    case 'datos-pedido': {
      const rows: string[] = [];
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
      if (block.showClientName && data.clienteName) rows.push(`<div><b>Cliente:</b> ${esc(data.clienteName)}</div>`);
      inner = rows.length ? `<div style="font-size:${size}">${rows.join('')}</div>` : '';
      break;
    }

    case 'productos': {
      const rows = data.items.map(it => `
        <div style="display:flex;justify-content:space-between;font-weight:600;padding:2px 0">
          <span>${it.cantidad}&nbsp;&nbsp;${esc(it.nombre)}</span>
          ${block.showPrices && it.precio != null ? `<span>S/. ${it.precio.toFixed(2)}</span>` : ''}
        </div>`).join('');
      inner = `<div style="font-size:${SIZE_PX[block.size ?? 'normal']}">
        <div style="display:flex;justify-content:space-between;font-weight:bold;border-bottom:1px solid rgba(0,0,0,.3);padding-bottom:2px;margin-bottom:4px">
          <span>Cant. Producto</span>${block.showPrices ? '<span>Total</span>' : ''}
        </div>${rows}</div>`;
      break;
    }

    // 'totales', 'pago', 'qr': no aplican a una comanda (aún no se cobra ni se emite comprobante).
    default:
      inner = '';
  }

  if (!inner) return '';
  return `<div>${spacer(block.spaceTop)}${inner}${spacer(block.spaceBottom)}</div>`;
}

/** Arma el HTML completo (con la misma hoja de estilos que el mecanismo de impresión ya usado en
 *  QrTab/TicketEditor: ventana nueva + document.write + window.print()) a partir de la plantilla
 *  "cocina" configurada en /configuracion/tickets y los datos reales del pedido. */
export function renderComandaHtml(blocks: TicketBlock[], paper: PaperSize, data: TicketOrderData): string {
  const widthMm = paper === '58mm' ? 58 : 80;
  const body = blocks.map(b => renderBlock(b, data)).join('');

  return `<!DOCTYPE html><html><head><title>Comanda</title><style>
    @page { size: ${widthMm}mm auto; margin: 0; }
    body { font-family: 'Courier New', monospace; width: ${widthMm}mm; margin: 0; padding: 8px 10px; color: #000; }
  </style></head><body>
    ${body}
    <script>window.onload=function(){window.print();window.close()}<\/script>
  </body></html>`;
}
