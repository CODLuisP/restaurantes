"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { Camera, Check, ImagePlus, Plus, X } from "lucide-react";
import { Toggle, Input, Select } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import type { CategoriaDto } from "@/types/categorias";
import type {
  ProductoDto,
  ProductoVarianteDto,
  CreateProductoVarianteDto,
  UpdateProductoVarianteDto,
  CreateProductoDto,
  UpdateProductoDto,
} from "@/types/productos";
import {
  getVariantes,
  createVariante,
  updateVariante,
  deleteVariante,
} from "@/lib/api/productos";
import {
  resizeImageToBlob,
  extractCloudflareImageId,
  subirImagenProducto,
  eliminarImagenProductoCloudflare,
} from "@/lib/uploadImagen";
import VariantRow from "./VariantRow";
import { emptyForm, type ProductForm } from "./types";

interface ProductFormModalProps {
  open: boolean;
  editingItem: ProductoDto | null;
  defaultCategoriaId?: number;
  categoriasOrdenadas: CategoriaDto[];
  isCollapsed: boolean;
  crearProducto: (
    dto: CreateProductoDto,
    precio?: number,
    disponible?: boolean,
  ) => Promise<ProductoDto | null>;
  editarProducto: (
    id: number,
    dto: UpdateProductoDto,
    precioSucursal?: { precio?: number; disponible?: boolean },
  ) => Promise<ProductoDto | null>;
  onClose: () => void;
}

/** Panel deslizante (crear/editar producto): imagen, datos básicos y variantes. */
export default function ProductFormModal({
  open,
  editingItem,
  defaultCategoriaId,
  categoriasOrdenadas,
  isCollapsed,
  crearProducto,
  editarProducto,
  onClose,
}: ProductFormModalProps) {
  const { data: session } = useSession();
  const { triggerToast } = useApp();

  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [guardando, setGuardando] = useState(false);
  const productImageRef = useRef<HTMLInputElement>(null);

  // Imagen del producto: se sube a Cloudflare recién al dar "Guardar", no al seleccionarla.
  // Así el usuario puede cambiarla/quitarla varias veces sin gastar subidas/borrados de sobra.
  const [pendingImageBlob, setPendingImageBlob] = useState<Blob | null>(null);
  const originalImagenUrlRef = useRef<string>("");

  const [variantes, setVariantes] = useState<ProductoVarianteDto[]>([]);
  const [pendingVariantes, setPendingVariantes] = useState<{ id: number; nombre: string; precio: number }[]>([]);
  const variantIdCounter = useRef(-1);
  const [variantForm, setVariantForm] = useState({ nombre: "", precio: "" });
  const [showVariantInput, setShowVariantInput] = useState(false);

  const isCreatingVariants = !editingItem;
  const allVariantes = isCreatingVariants ? pendingVariantes : variantes;

  const loadVariantes = async (productoId: number) => {
    const token = session?.accessToken;
    if (!token) return;
    try {
      const data = await getVariantes(token, productoId);
      setVariantes(data);
    } catch {
      setVariantes([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      setForm({
        nombre: editingItem.nombre,
        precio: editingItem.precio ?? 0,
        categoriaId: editingItem.categoriaId,
        descripcion: editingItem.descripcion ?? "",
        disponible: editingItem.disponible ?? true,
        imagenUrl: editingItem.imagenUrl ?? "",
      });
      originalImagenUrlRef.current = editingItem.imagenUrl ?? "";
      loadVariantes(editingItem.id);
    } else {
      setForm(emptyForm(defaultCategoriaId));
      originalImagenUrlRef.current = "";
      setVariantes([]);
    }
    setPendingImageBlob(null);
    setPendingVariantes([]);
    setShowVariantInput(false);
    setVariantForm({ nombre: "", precio: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingItem, defaultCategoriaId]);

  const handleProductImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = await resizeImageToBlob(file, 800, 800, 0.75);
      if (form.imagenUrl?.startsWith("blob:")) URL.revokeObjectURL(form.imagenUrl);
      const previewUrl = URL.createObjectURL(blob);
      setPendingImageBlob(blob);
      setForm((f) => ({ ...f, imagenUrl: previewUrl }));
    } catch {
      triggerToast("No se pudo procesar la imagen.", "error");
    }
    e.target.value = "";
  };

  const handleQuitarImagenProducto = () => {
    if (form.imagenUrl?.startsWith("blob:")) URL.revokeObjectURL(form.imagenUrl);
    setPendingImageBlob(null);
    setForm((f) => ({ ...f, imagenUrl: "" }));
  };

  const handleClose = () => {
    if (form.imagenUrl?.startsWith("blob:")) URL.revokeObjectURL(form.imagenUrl);
    setPendingImageBlob(null);
    onClose();
  };

  const handleCreateVariante = async () => {
    const nombre = variantForm.nombre.trim();
    const precio = parseFloat(variantForm.precio) || 0;
    if (!nombre) return;

    if (editingItem) {
      const token = session?.accessToken;
      if (!token) return;
      try {
        const dto: CreateProductoVarianteDto = { productoId: editingItem.id, nombre, precio };
        const created = await createVariante(token, editingItem.id, dto);
        setVariantes((prev) => [...prev, created]);
      } catch {
        triggerToast("Error al crear variante", "error");
      }
    } else {
      const newId = variantIdCounter.current--;
      setPendingVariantes((prev) => [...prev, { id: newId, nombre, precio }]);
    }
    setVariantForm({ nombre: "", precio: "" });
    setShowVariantInput(false);
  };

  const handleUpdateVariante = async (id: number, dto: UpdateProductoVarianteDto) => {
    if (isCreatingVariants) {
      setPendingVariantes((prev) =>
        prev.map((v) => (v.id === id ? { ...v, nombre: dto.nombre, precio: dto.precio } : v))
      );
      return;
    }
    const token = session?.accessToken;
    if (!token) return;
    try {
      const updated = await updateVariante(token, id, dto);
      setVariantes((prev) => prev.map((v) => (v.id === id ? updated : v)));
    } catch {
      triggerToast("Error al actualizar variante", "error");
    }
  };

  const handleDeleteVariante = async (id: number) => {
    if (isCreatingVariants) {
      setPendingVariantes((prev) => prev.filter((v) => v.id !== id));
      return;
    }
    const token = session?.accessToken;
    if (!token) return;
    try {
      await deleteVariante(token, id);
      setVariantes((prev) => prev.filter((v) => v.id !== id));
    } catch {
      triggerToast("Error al eliminar variante", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      triggerToast("Ingresa un nombre para el producto.", "warning");
      return;
    }
    if (!form.categoriaId) {
      triggerToast("Selecciona una categoría para el producto.", "warning");
      return;
    }

    setGuardando(true);

    // La imagen recién se sube a Cloudflare aquí, al confirmar guardado
    // (no al seleccionarla), para no subir/borrar de más si el usuario la cambia varias veces.
    // Esto es un detalle interno: de cara al usuario todo el proceso es un solo "Guardando...".
    let imagenUrl: string | undefined = form.imagenUrl || undefined;
    let imagenSubidaId: string | null = null;

    if (pendingImageBlob) {
      try {
        const subida = await subirImagenProducto(pendingImageBlob);
        imagenUrl = subida.url;
        imagenSubidaId = subida.imageId;
      } catch {
        setGuardando(false);
        triggerToast("No se pudo subir la imagen. Intenta nuevamente.", "error");
        return;
      }
    }

    // Si estamos editando y la imagen cambió (reemplazo o eliminación), la anterior
    // queda para borrarse de Cloudflare recién cuando el producto se guardó con éxito.
    const imagenOriginal = originalImagenUrlRef.current;
    const imagenCambio = !!editingItem && !!imagenOriginal && imagenOriginal !== imagenUrl;
    const eliminarImagenAnterior = () => {
      if (!imagenCambio) return;
      const idAnterior = extractCloudflareImageId(imagenOriginal);
      if (idAnterior) eliminarImagenProductoCloudflare(idAnterior);
    };

    if (editingItem) {
      const resultado = await editarProducto(
        editingItem.id,
        {
          categoriaId: form.categoriaId,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          imagenUrl,
        },
        {
          precio: form.precio,
          disponible: form.disponible,
        },
      );
      if (!resultado) {
        if (imagenSubidaId) eliminarImagenProductoCloudflare(imagenSubidaId);
        setGuardando(false);
        return;
      }
      eliminarImagenAnterior();
    } else {
      const creado = await crearProducto(
        {
          categoriaId: form.categoriaId,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          imagenUrl,
        },
        form.precio,
        form.disponible,
      );
      if (!creado) {
        if (imagenSubidaId) eliminarImagenProductoCloudflare(imagenSubidaId);
        setGuardando(false);
        return;
      }
      if (pendingVariantes.length > 0) {
        const token = session?.accessToken;
        if (token) {
          for (const v of pendingVariantes) {
            await createVariante(token, creado.id, {
              productoId: creado.id,
              nombre: v.nombre,
              precio: v.precio,
            }).catch(() => {});
          }
        }
        setPendingVariantes([]);
      }
    }

    if (form.imagenUrl?.startsWith("blob:")) URL.revokeObjectURL(form.imagenUrl);
    setPendingImageBlob(null);
    setGuardando(false);
    onClose();
  };

  if (!open) return null;

  // Solo mostramos "Cambiar imagen"/"Quitar imagen" cuando hay una imagen ya resuelta
  // (archivo recién elegido, o la que trae el producto al editar). Si se basara en
  // "form.imagenUrl tiene algo", el input de pegar URL desaparecería a la primera letra
  // que el usuario escriba, sin dejarlo terminar de pegar el link.
  const tieneImagenCargada =
    !!pendingImageBlob ||
    (!!originalImagenUrlRef.current && form.imagenUrl === originalImagenUrlRef.current);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {editingItem ? "Editar producto" : "Nuevo producto"}
            </h2>
            <p className="text-[11px] text-slate-500">
              Completa los datos que verá el cliente en la carta.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]"
        >
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Foto del plato
            </label>
            <button
              type="button"
              onClick={() => productImageRef.current?.click()}
              className="group/pimg relative w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-brand bg-slate-50 flex items-center justify-center transition-colors"
            >
              {form.imagenUrl ? (
                <>
                  <img
                    src={form.imagenUrl}
                    alt="Vista previa"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/pimg:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                    <Camera className="h-4 w-4" /> Cambiar foto
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-xs font-medium">
                    Sube una foto del plato
                  </span>
                  <span className="text-[10px]">JPG o PNG</span>
                </div>
              )}
            </button>
            <input
              ref={productImageRef}
              type="file"
              accept="image/*"
              onChange={handleProductImage}
              className="hidden"
            />
            {tieneImagenCargada ? (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => productImageRef.current?.click()}
                  className="text-[11px] font-medium text-brand hover:text-brand-hover"
                >
                  Cambiar imagen
                </button>
                <button
                  type="button"
                  onClick={handleQuitarImagenProducto}
                  className="text-[11px] font-medium text-rose-500 hover:text-rose-600"
                >
                  Quitar imagen
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="…o pega una URL de imagen"
                  value={form.imagenUrl}
                  onChange={(e) => {
                    setPendingImageBlob(null);
                    setForm((f) => ({ ...f, imagenUrl: e.target.value }));
                  }}
                />
                {form.imagenUrl && (
                  <button
                    type="button"
                    onClick={handleQuitarImagenProducto}
                    className="text-[11px] font-medium text-rose-500 hover:text-rose-600 shrink-0"
                  >
                    Quitar
                  </button>
                )}
              </div>
            )}
          </div>

          <Input
            label="Nombre del producto"
            placeholder="Ej: Ceviche Mixto"
            value={form.nombre}
            onChange={(e) =>
              setForm((f) => ({ ...f, nombre: e.target.value }))
            }
            required
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio (S/.)"
              type="number"
              min={0}
              step={0.5}
              value={form.precio}
              onFocus={(e) => e.target.select()}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  precio: parseFloat(e.target.value) || 0,
                }))
              }
            />
            <Select
              label="Categoría"
              error={
                !form.categoriaId ? "Selecciona una categoría" : undefined
              }
              value={form.categoriaId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  categoriaId: Number(e.target.value),
                }))
              }
            >
              <option value={0} disabled>
                Seleccionar categoría
              </option>
              {categoriasOrdenadas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Descripción
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) =>
                setForm((f) => ({ ...f, descripcion: e.target.value }))
              }
              rows={2}
              placeholder="Ingredientes y preparación..."
              className="input w-full px-3 py-2 resize-none"
            />
          </div>

          <div className="rounded-xl divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Disponible
                </p>
                <p className="text-[11px] text-slate-500">
                  Visible y disponible en la carta.
                </p>
              </div>
              <Toggle
                checked={form.disponible}
                onChange={(v) =>
                  setForm((f) => ({ ...f, disponible: v }))
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Variantes
              </span>
              {!showVariantInput && (
                <button
                  type="button"
                  onClick={() => setShowVariantInput(true)}
                  className="text-xs font-semibold text-brand hover:bg-brand/10 px-2 py-1 rounded-lg transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 inline mr-1" /> Agregar
                </button>
              )}
            </div>

            {showVariantInput && (
              <div className="flex items-center gap-2 p-3 rounded-xl">
                <input
                  value={variantForm.nombre}
                  onChange={(e) => setVariantForm((f) => ({ ...f, nombre: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateVariante(); } }}
                  placeholder="Nombre (ej: Mediano)"
                  className="input flex-1 py-2 px-1.5"
                  autoFocus
                />
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="S/."
                  value={variantForm.precio}
                  onChange={(e) => setVariantForm((f) => ({ ...f, precio: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  className="input w-28 py-2 px-1.5"
                />
                <button
                  type="button"
                  onClick={handleCreateVariante}
                  disabled={!variantForm.nombre.trim()}
                  className="px-3 py-2 text-xs font-semibold bg-brand text-white rounded-xl hover:bg-brand-hover disabled:opacity-50 shrink-0"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowVariantInput(false); setVariantForm({ nombre: "", precio: "" }); }}
                  className="px-2 py-2 text-xs text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {allVariantes.map((v) => (
              <VariantRow
                key={v.id}
                variante={v}
                onUpdate={(dto) => handleUpdateVariante(v.id, dto)}
                onDelete={() => handleDeleteVariante(v.id)}
              />
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={guardando}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!form.nombre.trim() || !form.categoriaId || guardando}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando
                ? "Guardando..."
                : editingItem
                  ? "Guardar cambios"
                  : "Agregar producto"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
