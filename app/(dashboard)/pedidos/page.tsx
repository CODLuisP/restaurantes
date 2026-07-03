import { redirect } from 'next/navigation';

/* Los pedidos (llevar/delivery) se cobran ahora en "Cobrar", junto con las mesas. */
export default function PedidosPage() {
  redirect('/cobrar');
}
