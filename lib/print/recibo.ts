/** Ticket de cliente al cobrar — mismo mecanismo de impresión que la comanda (ventana nueva +
 *  document.write + window.print()), usando la plantilla "cliente" configurada en
 *  /configuracion/tickets y el tamaño de papel definido en Impresión. */

import type { TicketBlock, PaperSize } from '@/components/configuracion/tickets/ticketData';
import { renderReciboHtml, type TicketOrderData } from './renderTicket';

/** Abre la ventana de impresión YA, dentro del clic (así el navegador no la bloquea y el cajero la
 *  ve al instante), con un aviso mientras se registra el cobro y se emite el comprobante. */
export function abrirVentanaImpresion(): Window | null {
  if (typeof window === 'undefined') return null;
  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return null;
  win.document.write(`<!DOCTYPE html><html><head><title>Comprobante</title></head>
    <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:90vh;color:#475569;font-size:14px">
      Generando comprobante...
    </body></html>`);
  win.document.close();
  return win;
}

/** Escribe el ticket en la ventana ya abierta (o abre una nueva si no se pasó ninguna). */
export function imprimirReciboCliente(blocks: TicketBlock[], paper: PaperSize, data: TicketOrderData, ventana?: Window | null) {
  if (typeof window === 'undefined') return;

  const win = ventana && !ventana.closed ? ventana : window.open('', '_blank', 'width=380,height=600');
  if (!win) return;

  win.document.open();
  win.document.write(renderReciboHtml(blocks, paper, data));
  win.document.close();
}
