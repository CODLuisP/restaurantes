import { Upload } from 'lucide-react';

export default function ImportarTab() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
      <Upload className="w-8 h-8 mx-auto mb-3 text-slate-300" />
      <p className="text-sm font-semibold text-slate-700">Importar productos</p>
      <p className="text-xs text-slate-500 mt-1">
        Sube tu carta desde un Excel o CSV. Esta sección estará disponible próximamente.
      </p>
    </div>
  );
}
