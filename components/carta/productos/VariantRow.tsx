import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Toggle } from "@/components/ui";
import type { UpdateProductoVarianteDto } from "@/types/productos";

export default function VariantRow({
  variante,
  onUpdate,
  onDelete,
}: {
  variante: { id: number; nombre: string; precio: number; disponible?: boolean };
  onUpdate: (dto: UpdateProductoVarianteDto) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(variante.nombre);
  const [precio, setPrecio] = useState(String(variante.precio));
  const [disponible, setDisponible] = useState(variante.disponible ?? true);

  const handleSave = () => {
    onUpdate({
      nombre: nombre.trim(),
      precio: parseFloat(precio) || 0,
      disponible,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setNombre(variante.nombre);
    setPrecio(String(variante.precio));
    setDisponible(variante.disponible ?? true);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50">
      {editing ? (
        <>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="input flex-1 py-1.5 px-1.5"
            autoFocus
          />
          <input
            type="number"
            min={0}
            step={0.5}
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="input w-24 py-1.5 px-1.5"
          />
          <Toggle checked={disponible} onChange={setDisponible} />
          <button
            type="button"
            onClick={handleSave}
            className="p-1.5 text-brand hover:bg-brand/10 rounded-lg"
            title="Guardar"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            title="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-xs text-slate-500 truncate tracking-wider">
            {variante.nombre}
          </span>
          <span className="text-xs text-slate-500 font-mono shrink-0">
            S/. {variante.precio.toFixed(2)}
          </span>
          <span
            className={`text-[10px] font-semibold shrink-0 ${variante.disponible ? "text-emerald-600" : "text-slate-400"}`}
          >
            {variante.disponible ? "Activo" : "Inactivo"}
          </span>
          <button
            type="button"
            onClick={() => {
              setNombre(variante.nombre);
              setPrecio(String(variante.precio));
              setDisponible(variante.disponible ?? true);
              setEditing(true);
            }}
            className="p-1.5 text-slate-400 hover:text-brand rounded-lg"
            title="Editar variante"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
            title="Eliminar variante"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
