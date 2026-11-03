/** Ticket de cliente al cobrar — mismo mecanismo de impresión que la comanda (ventana nueva +
 *  document.write + window.print()), usando la plantilla "cliente" configurada en
 *  /configuracion/tickets y el tamaño de papel definido en Impresión. */

import type { TicketBlock, PaperSize } from '@/components/configuracion/tickets/ticketData';
import { renderReciboHtml, type TicketOrderData } from './renderTicket';

export function imprimirReciboCliente(blocks: TicketBlock[], paper: PaperSize, data: TicketOrderData) {
  if (typeof window === 'undefined') return;

  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return;

  win.document.write(renderReciboHtml(blocks, paper, data));
  win.document.close();
}
