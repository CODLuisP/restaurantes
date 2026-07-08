import { DoorOpen } from 'lucide-react';

export default function PaginaBienvenidaTab() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
      <DoorOpen className="w-8 h-8 mx-auto mb-3 text-slate-300" />
      <p className="text-sm font-semibold text-slate-700">Página de bienvenida</p>
      <p className="text-xs text-slate-500 mt-1">
        Personaliza la pantalla inicial que ven los clientes al escanear el QR. Esta sección estará disponible próximamente.
      </p>
    </div>
  );
}
