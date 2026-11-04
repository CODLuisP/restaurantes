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
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprobante</title></head>
    <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:90vh;color:#475569;font-size:14px">
      Generando comprobante...
    </body></html>`);
  win.document.close();
  return win;
}

/** Abre el ticket en una ventana INDEPENDIENTE (noopener) y la imprime. Mientras el diálogo de
 *  impresión está abierto, Chrome pausa todas las páginas vinculadas a esa ventana: con una ventana
 *  normal (window.open + document.write) eso congelaba Cobrar y el cobro quedaba "Emitiendo y
 *  registrando…" hasta cerrar el diálogo. Sin vínculo, el cobro sigue en segundo plano.
 *  Debe llamarse dentro del clic (si no, el navegador puede bloquear la ventana). */
export function imprimirReciboAparte(blocks: TicketBlock[], paper: PaperSize, data: TicketOrderData) {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(new Blob([renderReciboHtml(blocks, paper, data)], { type: 'text/html;charset=utf-8' }));
  window.open(url, '_blank', 'noopener,width=380,height=600');
  // La ventana ya cargó el HTML mucho antes; se libera la memoria del blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
