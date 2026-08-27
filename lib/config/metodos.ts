/** Formas de `Configuracion.metodosPagoJson` / `metodosEntregaJson` — compartidas entre las
 *  pantallas de Configuración (que las editan) y los módulos operativos (Cobrar, Comandero,
 *  menú público) que deben respetarlas en vez de mostrar siempre todas las opciones. */

export interface MetodosPago {
  efectivo: { enabled: boolean };
  tarjeta: { enabled: boolean };
  yape: { enabled: boolean; qrImage: string; holderName: string; phone: string };
  plin: { enabled: boolean; qrImage: string; holderName: string; phone: string };
  transferencia: { enabled: boolean; bankName: string; accountNumber: string; cci: string };
}

/** Método de pago con QR propio del negocio (Yape, Plin). */
export type QrPaymentMethod = MetodosPago['yape'];

export interface MetodosEntrega {
  mesa: { enabled: boolean };
  llevar: { enabled: boolean };
  delivery: { enabled: boolean };
}

export const DEFAULT_METODOS_PAGO: MetodosPago = {
  efectivo: { enabled: true },
  tarjeta: { enabled: true },
  yape: { enabled: false, qrImage: '', holderName: '', phone: '' },
  plin: { enabled: false, qrImage: '', holderName: '', phone: '' },
  transferencia: { enabled: false, bankName: '', accountNumber: '', cci: '' },
};

export const DEFAULT_METODOS_ENTREGA: MetodosEntrega = {
  mesa: { enabled: true },
  llevar: { enabled: true },
  delivery: { enabled: false },
};

export function parseMetodosPago(json?: string | null): MetodosPago {
  if (!json) return DEFAULT_METODOS_PAGO;
  try { return { ...DEFAULT_METODOS_PAGO, ...JSON.parse(json) }; } catch { return DEFAULT_METODOS_PAGO; }
}

export function parseMetodosEntrega(json?: string | null): MetodosEntrega {
  if (!json) return DEFAULT_METODOS_ENTREGA;
  try { return { ...DEFAULT_METODOS_ENTREGA, ...JSON.parse(json) }; } catch { return DEFAULT_METODOS_ENTREGA; }
}
