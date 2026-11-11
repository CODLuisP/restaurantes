"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { Camera, Check, Equal, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Toggle, Input, Select } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import type { CategoriaDto } from "@/types/categorias";
import type {
  ProductoDto,
  ProductoExtraDto,
  CreateProductoExtraDto,
  UpdateProductoExtraDto,
  CreateProductoDto,
  UpdateProductoDto,
} from "@/types/productos";
import {
  getVariantes,
  createVariante,
  updateVariante,
  deleteVariante,
  getExtras,
  createExtra,
  updateExtra,
  deleteExtra,
} from "@/lib/api/productos";
import {
  resizeImageToBlob,
  extractCloudflareImageId,
  subirImagenProducto,
  eliminarImagenProductoCloudflare,
} from "@/lib/uploadImagen";
import ExtraRow from "./ExtraRow";
import { emptyForm, type ProductForm } from "./types";

interface DraftVariante {
  /** ID positivo = variante existente en BD; ID negativo = variante nueva en borrador. */
  id: number;
  nombre: string;
  precio: string;
  disponible: boolean;
}

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
  /** Crea una categoría sin salir del formulario (valida duplicados). */
  crearCategoria: (nombre: string) => Promise<CategoriaDto | null>;
  onClose: () => void;
}

/** Valor del <option> que, al elegirse, abre la creación de categoría en línea. */
const NUEVA_CATEGORIA_OPTION = -1;

/** Panel deslizante (crear/editar producto): imagen, datos básicos y variantes. */
export default function ProductFormModal({
  open,
  editingItem,
  defaultCategoriaId,
  categoriasOrdenadas,
  crearProducto,
  editarProducto,
  crearCategoria,
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

  // Tipo de producto: "simple" (un único precio) o "variantes" (lista de variantes con su precio).
  const [tipoProducto, setTipoProducto] = useState<"simple" | "variantes">("simple");
  const [variantesDraft, setVariantesDraft] = useState<DraftVariante[]>([]);
  const [originalVarianteIds, setOriginalVarianteIds] = useState<number[]>([]);
  const variantIdCounter = useRef(-1);

  const [extrasDraft, setExtrasDraft] = useState<{ id: number; nombre: string; precio: number; disponible: boolean }[]>([]);
  const [originalExtraIds, setOriginalExtraIds] = useState<number[]>([]);
  const extraIdCounter = useRef(-1);
  const [extraForm, setExtraForm] = useState({ nombre: "", precio: "" });
  const [showExtraInput, setShowExtraInput] = useState(false);

  const allExtras = extrasDraft;

  // Creación de categoría en línea: evita tener que cerrar el formulario para crearla.
  const [showNewCategoria, setShowNewCategoria] = useState(false);
  const [newCategoriaNombre, setNewCategoriaNombre] = useState("");
  const [creandoCategoria, setCreandoCategoria] = useState(false);

  const cancelarNuevaCategoria = () => {
    setShowNewCategoria(false);
    setNewCategoriaNombre("");
  };

  const handleCrearCategoria = async () => {
    if (!newCategoriaNombre.trim() || creandoCategoria) return;
    setCreandoCategoria(true);
    const creada = await crearCategoria(newCategoriaNombre);
    setCreandoCategoria(false);
    if (!creada) return;
    setForm((f) => ({ ...f, categoriaId: creada.id }));
    cancelarNuevaCategoria();
  };

  const crearVariantesIniciales = (): DraftVariante[] => [
    { id: variantIdCounter.current--, nombre: "Pequeña", precio: "0", disponible: true },
    { id: variantIdCounter.current--, nombre: "Mediana", precio: "0", disponible: true },
  ];

  const loadVariantes = async (productoId: number) => {
    const token = session?.accessToken;
    if (!token) return;
    try {
      const data = await getVariantes(token, productoId);
      setOriginalVarianteIds(data.map((v) => v.id));
      if (data.length > 0) {
        setTipoProducto("variantes");
        setVariantesDraft(
          data.map((v) => ({
            id: v.id,
            nombre: v.nombre,
            precio: String(v.precio),
            disponible: v.disponible ?? true,
          })),
        );
      } else {
        setTipoProducto("simple");
        setVariantesDraft([]);
      }
    } catch {
      setOriginalVarianteIds([]);
      setVariantesDraft([]);
    }
  };

  const loadExtras = async (productoId: number) => {
    const token = session?.accessToken;
    if (!token) return;
    try {
      const data = await getExtras(token, productoId);
      setOriginalExtraIds(data.map((e) => e.id));
      setExtrasDraft(
        data.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          precio: e.precio,
          disponible: e.disponible ?? true,
        })),
      );
    } catch {
      setOriginalExtraIds([]);
      setExtrasDraft([]);
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
      if (editingItem.variantes && editingItem.variantes.length > 0) {
        setTipoProducto("variantes");
        setOriginalVarianteIds(editingItem.variantes.map((v) => v.id));
        setVariantesDraft(
          editingItem.variantes.map((v) => ({
            id: v.id,
            nombre: v.nombre,
            precio: String(v.precio),
            disponible: v.disponible ?? true,
          })),
        );
      } else {
        setTipoProducto("simple");
        setOriginalVarianteIds([]);
        setVariantesDraft([]);
      }
      if (editingItem.extras && editingItem.extras.length > 0) {
        setOriginalExtraIds(editingItem.extras.map((e) => e.id));
        setExtrasDraft(
          editingItem.extras.map((e) => ({
            id: e.id,
            nombre: e.nombre,
            precio: e.precio,
            disponible: e.disponible ?? true,
          })),
        );
      } else {
        setOriginalExtraIds([]);
        setExtrasDraft([]);
      }
      loadVariantes(editingItem.id);
      loadExtras(editingItem.id);
    } else {
      setForm(emptyForm(defaultCategoriaId));
      originalImagenUrlRef.current = "";
      setTipoProducto("simple");
      setOriginalVarianteIds([]);
      setVariantesDraft([]);
      setOriginalExtraIds([]);
      setExtrasDraft([]);
    }
    setPendingImageBlob(null);
    setShowExtraInput(false);
    setExtraForm({ nombre: "", precio: "" });
    setShowNewCategoria(false);
    setNewCategoriaNombre("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingItem, defaultCategoriaId]);

  const handleSelectTipoProducto = (tipo: "simple" | "variantes") => {
    setTipoProducto(tipo);
    if (tipo === "variantes" && variantesDraft.length === 0) {
      setVariantesDraft(crearVariantesIniciales());
    }
  };

  const handleAddVarianteRow = () => {
    setVariantesDraft((prev) => [
      ...prev,
      { id: variantIdCounter.current--, nombre: "", precio: "0", disponible: true },
    ]);
  };

  const handleChangeVariante = (id: number, field: "nombre" | "precio", value: string) => {
    setVariantesDraft((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    );
  };

  const handleRemoveVarianteRow = (id: number) => {
    setVariantesDraft((prev) => prev.filter((v) => v.id !== id));
  };

  const procesarArchivoImagen = async (file: File) => {
    try {
      const blob = await resizeImageToBlob(file, 800, 800, 0.75);
      setForm((f) => {
        if (f.imagenUrl?.startsWith("blob:")) URL.revokeObjectURL(f.imagenUrl);
        return { ...f, imagenUrl: URL.createObjectURL(blob) };
      });
      setPendingImageBlob(blob);
    } catch {
      triggerToast("No se pudo procesar la imagen.", "error");
    }
  };

  const handleProductImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await procesarArchivoImagen(file);
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

  /* Escape cierra el formulario (salvo mientras guarda, o si está creando una categoría en línea:
     ahí Escape solo cancela esa creación). */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !guardando && !showNewCategoria) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guardando, showNewCategoria, form.imagenUrl]);

  /* Permite pegar una imagen desde el portapapeles con Ctrl + V mientras el modal está abierto. */
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      if (guardando) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            procesarArchivoImagen(file);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guardando]);

  const handleCreateExtra = () => {
    const nombre = extraForm.nombre.trim();
    const precio = parseFloat(extraForm.precio) || 0;
    if (!nombre) return;

    const newId = extraIdCounter.current--;
    setExtrasDraft((prev) => [...prev, { id: newId, nombre, precio, disponible: true }]);
    setExtraForm({ nombre: "", precio: "" });
    setShowExtraInput(false);
  };

  const handleUpdateExtra = (id: number, dto: UpdateProductoExtraDto) => {
    setExtrasDraft((prev) =>
      prev.map((e) => (e.id === id ? { ...e, nombre: dto.nombre, precio: dto.precio, disponible: dto.disponible } : e)),
    );
  };

  const handleDeleteExtra = (id: number) => {
    setExtrasDraft((prev) => prev.filter((e) => e.id !== id));
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

    if (tipoProducto === "simple") {
      if (!(form.precio > 0)) {
        triggerToast("Ingresa un precio mayor a S/ 0.00.", "warning");
        return;
      }
    } else {
      if (variantesDraft.length === 0) {
        triggerToast("Agrega al menos una variante para el producto.", "warning");
        return;
      }
      const varianteInvalida = variantesDraft.some(
        (v) => !v.nombre.trim() || !(parseFloat(v.precio) > 0),
      );
      if (varianteInvalida) {
        triggerToast("Completa el nombre y un precio mayor a S/ 0.00 en cada variante.", "warning");
        return;
      }
    }

    const precioGuardar =
      tipoProducto === "simple"
        ? form.precio
        : Math.min(...variantesDraft.map((v) => parseFloat(v.precio) || 0));

    setGuardando(true);

    // La imagen recién se sube a Cloudflare aquí, al confirmar guardado
    // (no al seleccionarla), para no subir/borrar de más si el usuario la cambia varias veces.
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

    const token = session?.accessToken;
    const extrasParaGuardar =
      showExtraInput && extraForm.nombre.trim()
        ? [
            ...extrasDraft,
            {
              id: extraIdCounter.current--,
              nombre: extraForm.nombre.trim(),
              precio: parseFloat(extraForm.precio) || 0,
              disponible: true,
            },
          ]
        : extrasDraft;

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
          precio: precioGuardar,
          disponible: form.disponible,
        },
      );
      if (!resultado) {
        if (imagenSubidaId) eliminarImagenProductoCloudflare(imagenSubidaId);
        setGuardando(false);
        return;
      }
      eliminarImagenAnterior();

      if (token) {
        let variantesFallidas = 0;
        if (tipoProducto === "simple") {
          for (const oldId of originalVarianteIds) {
            await deleteVariante(token, oldId).catch(() => { variantesFallidas++; });
          }
          resultado.variantes = [];
        } else {
          const currentIds = new Set(variantesDraft.filter((v) => v.id > 0).map((v) => v.id));
          for (const oldId of originalVarianteIds) {
            if (!currentIds.has(oldId)) {
              await deleteVariante(token, oldId).catch(() => { variantesFallidas++; });
            }
          }
          const nuevasVariantes = [];
          for (const v of variantesDraft) {
            const nombre = v.nombre.trim();
            const precio = parseFloat(v.precio) || 0;
            if (v.id > 0) {
              const upd = await updateVariante(token, v.id, {
                nombre,
                precio,
                disponible: v.disponible,
              }).catch(() => {
                variantesFallidas++;
                return null;
              });
              if (upd) nuevasVariantes.push(upd);
            } else {
              const created = await createVariante(token, editingItem.id, {
                productoId: editingItem.id,
                nombre,
                precio,
              }).catch(() => {
                variantesFallidas++;
                return null;
              });
              if (created) nuevasVariantes.push(created);
            }
          }
          resultado.variantes = nuevasVariantes;
        }

        let extrasFallidos = 0;
        const currentExtraIds = new Set(extrasParaGuardar.filter((e) => e.id > 0).map((e) => e.id));
        for (const oldId of originalExtraIds) {
          if (!currentExtraIds.has(oldId)) {
            await deleteExtra(token, oldId).catch(() => { extrasFallidos++; });
          }
        }
        const nuevosExtras: ProductoExtraDto[] = [];
        for (const e of extrasParaGuardar) {
          const nombre = e.nombre.trim();
          const precio = e.precio;
          if (e.id > 0) {
            const upd = await updateExtra(token, e.id, {
              nombre,
              precio,
              disponible: e.disponible,
            }).catch(() => {
              extrasFallidos++;
              return null;
            });
            if (upd) nuevosExtras.push(upd);
          } else {
            const created = await createExtra(token, editingItem.id, {
              productoId: editingItem.id,
              nombre,
              precio,
            }).catch(() => {
              extrasFallidos++;
              return null;
            });
            if (created) nuevosExtras.push(created);
          }
        }
        resultado.extras = nuevosExtras;

        if (variantesFallidas > 0 || extrasFallidos > 0) {
          triggerToast("El producto se actualizó, pero hubo un problema al sincronizar algunas variantes o extras.", "warning");
        }
      }
    } else {
      const creado = await crearProducto(
        {
          categoriaId: form.categoriaId,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          imagenUrl,
        },
        precioGuardar,
        form.disponible,
      );
      if (!creado) {
        if (imagenSubidaId) eliminarImagenProductoCloudflare(imagenSubidaId);
        setGuardando(false);
        return;
      }
      // Variantes y extras se crean uno a uno; si alguno falla se avisa.
      let variantesFallidas = 0;
      let extrasFallidos = 0;
      if (token) {
        if (tipoProducto === "variantes") {
          const variantesCreadas = [];
          for (const v of variantesDraft) {
            const created = await createVariante(token, creado.id, {
              productoId: creado.id,
              nombre: v.nombre.trim(),
              precio: parseFloat(v.precio) || 0,
            }).catch(() => {
              variantesFallidas++;
              return null;
            });
            if (created) variantesCreadas.push(created);
          }
          creado.variantes = variantesCreadas;
        }
        const extrasCreados: ProductoExtraDto[] = [];
        for (const e of extrasParaGuardar) {
          const created = await createExtra(token, creado.id, {
            productoId: creado.id,
            nombre: e.nombre.trim(),
            precio: e.precio,
          }).catch(() => {
            extrasFallidos++;
            return null;
          });
          if (created) extrasCreados.push(created);
        }
        creado.extras = extrasCreados;
      }
      setVariantesDraft([]);
      setExtrasDraft([]);
      if (variantesFallidas > 0 || extrasFallidos > 0) {
        const partes = [
          variantesFallidas > 0 ? `${variantesFallidas} variante${variantesFallidas === 1 ? "" : "s"}` : "",
          extrasFallidos > 0 ? `${extrasFallidos} extra${extrasFallidos === 1 ? "" : "s"}` : "",
        ].filter(Boolean).join(" y ");
        triggerToast(`El producto se creó, pero no se pudieron guardar ${partes}. Ábrelo con "Editar" para agregarlos.`, "warning");
      }
    }

    if (form.imagenUrl?.startsWith("blob:")) URL.revokeObjectURL(form.imagenUrl);
    setPendingImageBlob(null);
    setGuardando(false);
    onClose();
  };

  if (!open) return null;

  const tieneImagenCargada = !!form.imagenUrl;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-white shadow-2xl w-full max-w-xl h-full flex flex-col overflow-hidden animate-slide-in-right">
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
          className="p-6 space-y-4 flex-1 flex flex-col overflow-y-auto"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => productImageRef.current?.click()}
                className="group/pimg relative w-34 h-34 rounded-2xl overflow-hidden border-2 border-dashed border-brand/40 hover:border-brand bg-brand/5 flex items-center justify-center transition-colors cursor-pointer"
              >
                {form.imagenUrl ? (
                  <>
                    <img
                      src={form.imagenUrl}
                      alt="Vista previa"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/pimg:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                      <Camera className="h-4 w-4" /> Cambiar
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-brand">
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs font-semibold">
                      Subir foto
                    </span>
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
              {tieneImagenCargada && (
                <button
                  type="button"
                  onClick={handleQuitarImagenProducto}
                  className="text-[11px] font-medium text-rose-500 hover:text-rose-600 cursor-pointer"
                >
                  Quitar foto
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
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

              {showNewCategoria ? (
                <div className="w-full space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Nueva categoría
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={newCategoriaNombre}
                      onChange={(e) => setNewCategoriaNombre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleCrearCategoria(); }
                        if (e.key === "Escape") { e.preventDefault(); cancelarNuevaCategoria(); }
                      }}
                      placeholder="Ej: Ceviches"
                      className="input flex-1 min-w-0 py-2 px-3"
                      disabled={creandoCategoria}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCrearCategoria}
                      disabled={!newCategoriaNombre.trim() || creandoCategoria}
                      className="px-2.5 py-2 bg-brand text-white rounded-xl hover:bg-brand-hover disabled:opacity-50 shrink-0"
                      title="Crear categoría"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelarNuevaCategoria}
                      disabled={creandoCategoria}
                      className="px-1.5 py-2 text-slate-400 hover:text-slate-600 shrink-0"
                      title="Cancelar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {creandoCategoria ? "Creando categoría..." : "Se seleccionará automáticamente al crearla."}
                  </p>
                </div>
              ) : (
                <Select
                  label="Categoría"
                  error={
                    !form.categoriaId ? "Selecciona o crea una categoría" : undefined
                  }
                  value={form.categoriaId}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value === NUEVA_CATEGORIA_OPTION) {
                      setShowNewCategoria(true);
                      return;
                    }
                    setForm((f) => ({ ...f, categoriaId: value }));
                  }}
                >
                  <option value={0} disabled>
                    {categoriasOrdenadas.length === 0 ? "Sin categorías aún" : "Seleccionar categoría"}
                  </option>
                  {categoriasOrdenadas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                  <option value={NUEVA_CATEGORIA_OPTION}>+ Crear nueva categoría</option>
                </Select>
              )}
            </div>
          </div>

          {/* Tipo de Producto: Precio Simple vs Con Variantes */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tipo de Producto
              </label>
              <div className="grid grid-cols-2 p-1 rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => handleSelectTipoProducto("simple")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    tipoProducto === "simple"
                      ? "bg-brand text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Precio Simple
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTipoProducto("variantes")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    tipoProducto === "variantes"
                      ? "bg-brand text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Con Variantes
                </button>
              </div>
            </div>

            {tipoProducto === "simple" ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Precio <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="0.00"
                  value={form.precio || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      precio: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="input w-full py-2.5 px-3"
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                {variantesDraft.length > 0 && (
                  <div className="flex items-center gap-3 px-3">
                    <span className="w-4 shrink-0" />
                    <span className="flex-1 text-xs font-semibold text-slate-400">
                      Nombre
                    </span>
                    <span className="w-36 text-xs font-semibold text-slate-400">
                      Precio <span className="text-slate-400">*</span>
                    </span>
                    <span className="w-7 shrink-0" />
                  </div>
                )}

                {variantesDraft.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white"
                  >
                    <Equal className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      value={v.nombre}
                      onChange={(e) => handleChangeVariante(v.id, "nombre", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                      placeholder="Ej: Pequeña"
                      className="input flex-1 min-w-0 py-2 px-3"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="0"
                      value={v.precio}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleChangeVariante(v.id, "precio", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                      className="input w-36 py-2 px-3"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveVarianteRow(v.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors shrink-0 cursor-pointer"
                      title="Eliminar variante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddVarianteRow}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-brand hover:bg-brand/5 hover:border-brand/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Agregar variante
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Descripción
            </label>
            <div className="relative">
              <textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value.slice(0, 150) }))
                }
                rows={2}
                placeholder="Ingredientes y preparación..."
                className="input w-full px-3 pt-2 pb-4 resize-none"
                maxLength={150}
              />
              <span className="absolute bottom-1.5 right-2.5 text-[10px] pointer-events-none text-slate-400">
                {form.descripcion.length} / 150
              </span>
            </div>
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
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Extras
                </span>
                <p className="text-[10px] text-slate-400">
                  Personalizaciones opcionales que se pueden elegir varias a la vez al agregar el plato (ej. "Crema huancaína").
                </p>
              </div>
              {!showExtraInput && (
                <button
                  type="button"
                  onClick={() => setShowExtraInput(true)}
                  className="text-xs font-semibold text-brand hover:bg-brand/10 px-2 py-1 rounded-lg transition-colors shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 inline mr-1" /> Agregar
                </button>
              )}
            </div>

            {showExtraInput && (
              <div className="flex items-center gap-2 p-3 rounded-xl">
                <input
                  value={extraForm.nombre}
                  onChange={(e) => setExtraForm((f) => ({ ...f, nombre: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateExtra(); } }}
                  placeholder="Nombre (ej: Crema huancaína)"
                  className="input flex-1 py-2 px-1.5"
                  autoFocus
                />
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="S/."
                  value={extraForm.precio}
                  onChange={(e) => setExtraForm((f) => ({ ...f, precio: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  className="input w-28 py-2 px-1.5"
                />
                <button
                  type="button"
                  onClick={handleCreateExtra}
                  disabled={!extraForm.nombre.trim()}
                  className="px-3 py-2 text-xs font-semibold bg-brand text-white rounded-xl hover:bg-brand-hover disabled:opacity-50 shrink-0"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExtraInput(false); setExtraForm({ nombre: "", precio: "" }); }}
                  className="px-2 py-2 text-xs text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {allExtras.map((e) => (
              <ExtraRow
                key={e.id}
                extra={e}
                onUpdate={(dto) => handleUpdateExtra(e.id, dto)}
                onDelete={() => handleDeleteExtra(e.id)}
              />
            ))}
          </div>

          <div className="flex gap-2 pt-4 mt-auto border-t border-slate-100">
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
