import { redirect } from 'next/navigation';

/* Delivery se unificó dentro de "Pedidos" (para llevar + delivery). */
export default function DeliveryPage() {
  redirect('/pedidos');
}
