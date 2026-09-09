import { redirect } from 'next/navigation';

/** "Caja" ahora es un desplegable (Corte / Ventas del día) — /caja a secas redirige a Corte,
 *  la vista que antes vivía acá, por si queda algún enlace directo viejo. */
export default function CajaRedirectPage() {
  redirect('/caja/corte');
}
