"use client";

import { Utensils } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { getCloudflareVariant } from "@/lib/uploadImagen";
import type { ProductoDto } from "@/types/productos";

const soles = (n: number) => `S/ ${n.toFixed(2)}`;

/** Fila de lectura: nombre a la izquierda, precio a la derecha y "Agotado" si no está disponible. */
function FilaOpcion({ nombre, precio, disponible, prefijo }: {
  nombre: string; precio: number; disponible?: boolean; prefijo?: string;
}) {
  const agotado = disponible === false;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-200 bg-white">
      <span className={`text-xs font-medium truncate ${agotado ? "text-slate-400 line-through" : "text-slate-800"}`}>
        {nombre}
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {agotado && (
          <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">Agotado</span>
        )}
        <span className="text-xs font-mono font-bold text-slate-700">{prefijo}{soles(precio)}</span>
      </span>
    </div>
  );
}

/** Ficha de solo lectura de un producto (variantes, extras, descripción) para roles que no editan la carta. */
export default function ProductDetailModal({ item, onClose }: { item: ProductoDto | null; onClose: () => void }) {
  const variantes = item?.variantes ?? [];
  const extras = item?.extras ?? [];
  const disponible = item?.disponible ?? true;

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item?.nombre ?? ""}
      subtitle="Consulta del producto (solo lectura)"
      size="sm"
      fullHeight={false}
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      {item && (
        <div className="space-y-4">
          <div className="relative aspect-16/10 w-full rounded-2xl bg-slate-100 overflow-hidden">
            {item.imagenUrl ? (
              <img
                src={getCloudflareVariant(item.imagenUrl, "thumbnail")}
                alt={item.nombre}
                referrerPolicy="no-referrer"
                className={`h-full w-full object-cover ${!disponible ? "grayscale" : ""}`}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-300">
                <Utensils className="h-10 w-10" />
              </div>
            )}
            {!disponible && (
              <span className="absolute top-2 left-2 text-[9px] bg-slate-800/90 text-white px-2 py-0.5 rounded-full font-bold uppercase">
                Agotado
              </span>
            )}
          </div>

          {item.descripcion && <p className="text-xs text-slate-500 leading-relaxed">{item.descripcion}</p>}

          <section className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {variantes.length > 0 ? "Variantes" : "Precio"}
            </h4>
            {variantes.length > 0
              ? variantes.map((v) => <FilaOpcion key={v.id} nombre={v.nombre} precio={v.precio} disponible={v.disponible} />)
              : <FilaOpcion nombre="Precio único" precio={item.precio ?? 0} />}
          </section>

          {extras.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Extras</h4>
              {extras.map((e) => <FilaOpcion key={e.id} nombre={e.nombre} precio={e.precio} disponible={e.disponible} prefijo="+ " />)}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
