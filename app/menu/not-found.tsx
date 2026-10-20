import type { Metadata } from 'next';
import { UtensilsCrossed } from 'lucide-react';

export const metadata: Metadata = { title: 'Carta no encontrada' };

/** Se muestra cuando se entra por un subdominio que no pertenece a ninguna empresa. */
export default function CartaNoEncontrada() {
  return (
    <main className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">No encontramos esta carta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Revisa que la dirección esté bien escrita o pide al restaurante su enlace actualizado.
        </p>
      </div>
    </main>
  );
}
