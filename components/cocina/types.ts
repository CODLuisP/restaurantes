import type { PedidoDto } from '@/lib/api/pedidos';

/** Encabezado del ticket: "Mesa 5", "Para llevar — Juan" o "Delivery — María". */
export function pedidoLabel(p: PedidoDto): string {
  if (p.sesionTipo === 'local') return p.mesaNumero ? `Mesa ${p.mesaNumero}` : 'Mesa';
  const canal = p.sesionTipo === 'delivery' ? 'Delivery' : 'Para llevar';
  return p.nombreCliente?.trim() ? `${canal} — ${p.nombreCliente.trim()}` : canal;
}

export function pedidoMinutos(p: PedidoDto): number {
  return Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 60000));
}
