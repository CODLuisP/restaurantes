/** Comanda de cocina — mismo mecanismo de impresión que QrTab/TicketEditor (ventana nueva +
 *  document.write + window.print()), usando la plantilla "cocina" configurada en
 *  /configuracion/tickets en vez de un formato fijo. */

import type { TicketBlock, PaperSize } from '@/components/configuracion/tickets/ticketData';
import { renderComandaHtml, type TicketOrderData } from './renderTicket';

export function imprimirComanda(blocks: TicketBlock[], paper: PaperSize, data: TicketOrderData) {
  if (typeof window === 'undefined' || data.items.length === 0) return;

  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return;

  win.document.write(renderComandaHtml(blocks, paper, data));
  win.document.close();
}

export interface CancelacionData {
  mesa: string;
  mozo?: string;
  nombre: string;
  cantidad: number;
}

/** Ticket de cancelación — se imprime cuando el mozo quita o reduce un plato ya enviado a cocina
 *  (con "Impresora en cocina" activo no hay pantalla que lo muestre desaparecer solo). */
export function imprimirCancelacion({ mesa, mozo, nombre, cantidad }: CancelacionData) {
  if (typeof window === 'undefined') return;

  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const win = window.open('', '_blank', 'width=380,height=500');
  if (!win) return;

  win.document.write(`<!DOCTYPE html><html><head><title>Cancelación</title><style>
    @page { size: 80mm auto; margin: 0; }
    body { font-family: 'Courier New', monospace; width: 80mm; margin: 0; padding: 8px 10px; color: #000; }
    h2 { text-align: center; margin: 0 0 10px; font-size: 22px; letter-spacing: 1px; color: #000;
         border: 3px solid #000; padding: 4px; }
    .item { font-size: 17px; font-weight: bold; text-align: center; padding: 6px 0 10px; }
    .meta { font-size: 12px; border-top: 1px dashed #000; padding-top: 6px; }
    .meta p { margin: 2px 0; }
  </style></head><body>
    <h2>CANCELADO</h2>
    <div class="item">${cantidad}x ${nombre}</div>
    <div class="meta">
      <p><strong>Mesa:</strong> ${mesa}</p>
      ${mozo ? `<p><strong>Mozo:</strong> ${mozo}</p>` : ''}
      <p><strong>Hora:</strong> ${hora}</p>
    </div>
    <script>window.onload=function(){window.print();window.close()}<\/script>
  </body></html>`);
  win.document.close();
}
