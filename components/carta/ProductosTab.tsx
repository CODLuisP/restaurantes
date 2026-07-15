"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Eye,
  Upload,
  FolderPlus,
  Plus,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Image as ImageIcon,
  Store,
  Pencil,
  Trash2,
  Check,
  X,
  Utensils,
  Camera,
  MapPin,
  FileText,
  Package,
  LayoutGrid,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCarta } from "@/context/CartaContext";
import { useBanners } from "@/context/BannersContext";
import { useBusiness } from "@/context/BusinessContext";
import { useSidebar } from "@/context/SidebarContext";
import { useApp } from "@/context/AppContext";
import { useRedesSociales } from "@/context/RedesSocialesContext";
import { useHorarios } from "@/context/HorariosContext";
import { useProductos } from "@/hooks/productos/useProductos";
import { useCategorias } from "@/hooks/categorias/useCategorias";
import { Toggle, Modal, Button, Input, Select } from "@/components/ui";
import {
  ProfileHeader,
  type ProfileTab,
} from "@/components/menu/ProfileHeader";
import {
  buildSocialLinks,
  SocialLinksRow,
} from "@/components/menu/SocialLinksRow";
import { BusinessInfoSection } from "@/components/menu/BusinessInfoSection";
import type {
  ProductoDto,
  ProductoVarianteDto,
  CreateProductoVarianteDto,
  UpdateProductoVarianteDto,
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

const CATEGORY_ICON_BG: Record<string, string> = {
  Entradas: "bg-emerald-100 text-emerald-700",
  "Platos de fondo": "bg-slate-200 text-slate-700",
  Bebidas: "bg-blue-100 text-blue-700",
  Postres: "bg-pink-100 text-pink-700",
  Promociones: "bg-purple-100 text-purple-700",
};

const STAT_TONES: Record<string, string> = {
  brand: "bg-brand/10 text-brand",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
};

const FEATURED_STORAGE_KEY = "restopro_productos_destacados";

interface ProductForm {
  nombre: string;
  precio: number;
  categoriaId: number;
  descripcion: string;
  disponible: boolean;
  imagenUrl: string;
}

const emptyForm = (defaultCategoriaId?: number): ProductForm => ({
  nombre: "",
  precio: 0,
  categoriaId: defaultCategoriaId ?? 0,
  descripcion: "",
  disponible: true,
  imagenUrl: "",
});

interface ProductosTabProps {
  onGoToImportar?: () => void;
  onGoToBanners?: () => void;
}

export default function ProductosTab({
  onGoToImportar,
  onGoToBanners,
}: ProductosTabProps) {
  const { data: session } = useSession();
  const sucursalId = session?.user?.sucursalId ?? undefined;

  const {
    productos,
    loading: loadingProductos,
    crearProducto,
    editarProducto,
    toggleDisponible,
    eliminarProducto,
  } = useProductos(sucursalId);

  const {
    categorias,
    loading: loadingCategorias,
    crearCategoria,
    eliminarCategoria,
  } = useCategorias();

  const { carta, toggleCartaActive } = useCarta();
  const { banners } = useBanners();
  const activeBanners = banners.filter((b) => b.active);
  const { business, updateBusiness } = useBusiness();
  const { redes } = useRedesSociales();
  const socialLinks = buildSocialLinks(redes);
  const { horarios } = useHorarios();
  const { isCollapsed } = useSidebar();
  const { triggerToast } = useApp();

  const [featuredIds, setFeaturedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FEATURED_STORAGE_KEY);
      if (stored) setFeaturedIds(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  useEffect(() => {
    if (productos.length === 0) return;
    const existingIds = new Set(productos.map((p) => p.id));
    setFeaturedIds((prev) => {
      const cleaned = new Set([...prev].filter((id) => existingIds.has(id)));
      if (cleaned.size !== prev.size) {
        try {
          localStorage.setItem(
            FEATURED_STORAGE_KEY,
            JSON.stringify([...cleaned]),
          );
        } catch {}
      }
      return cleaned;
    });
  }, [productos]);

  const persistFeatured = (ids: Set<number>) => {
    setFeaturedIds(ids);
    try {
      localStorage.setItem(FEATURED_STORAGE_KEY, JSON.stringify([...ids]));
    } catch {}
  };

  const toggleFeatured = (id: number) => {
    const next = new Set(featuredIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistFeatured(next);
  };

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const productImageRef = useRef<HTMLInputElement>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [businessForm, setBusinessForm] = useState(business);

  // Imagen del producto: se sube a Cloudflare recién al dar "Guardar", no al seleccionarla.
  // Así el usuario puede cambiarla/quitarla varias veces sin gastar subidas/borrados de sobra.
  const [pendingImageBlob, setPendingImageBlob] = useState<Blob | null>(null);
  const [guardando, setGuardando] = useState(false);
  const originalImagenUrlRef = useRef<string>("");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateBusiness({ logo: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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

  const openBusinessForm = () => {
    setBusinessForm(business);
    setShowBusinessForm(true);
  };
  const submitBusinessForm = () => {
    updateBusiness(businessForm);
    setShowBusinessForm(false);
    triggerToast("Información del negocio actualizada.", "success");
  };

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [catTab, setCatTab] = useState("todos");

  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => a.orden - b.orden),
    [categorias],
  );

  const allCategoryNames = useMemo(() => {
    return Array.from(
      new Set(productos.map((p) => p.categoriaNombre).filter(Boolean)),
    );
  }, [productos]);

  const getCategoriaIdByName = (nombre: string): number | undefined =>
    categorias.find((c) => c.nombre === nombre)?.id;

  const [variantes, setVariantes] = useState<ProductoVarianteDto[]>([]);
  const [pendingVariantes, setPendingVariantes] = useState<{ id: number; nombre: string; precio: number }[]>([]);
  const variantIdCounter = useRef(-1);
  const [variantForm, setVariantForm] = useState({ nombre: "", precio: "" });
  const [showVariantInput, setShowVariantInput] = useState(false);

  const isCreatingVariants = !editingId;
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

  const handleCreateVariante = async () => {
    const nombre = variantForm.nombre.trim();
    const precio = parseFloat(variantForm.precio) || 0;
    if (!nombre) return;

    if (editingId) {
      const token = session?.accessToken;
      if (!token) return;
      try {
        const dto: CreateProductoVarianteDto = { productoId: editingId, nombre, precio };
        const created = await createVariante(token, editingId, dto);
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

  const openAdd = (categoriaId?: number) => {
    if (form.imagenUrl?.startsWith("blob:")) URL.revokeObjectURL(form.imagenUrl);
    setEditingId(null);
    setForm(emptyForm(categoriaId));
    setPendingImageBlob(null);
    originalImagenUrlRef.current = "";
    setVariantes([]);
    setPendingVariantes([]);
    setShowForm(true);
  };

  const openEdit = (item: ProductoDto) => {
    if (form.imagenUrl?.startsWith("blob:")) URL.revokeObjectURL(form.imagenUrl);
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      precio: item.precio ?? 0,
      categoriaId: item.categoriaId,
      descripcion: item.descripcion ?? "",
      disponible: item.disponible ?? true,
      imagenUrl: item.imagenUrl ?? "",
    });
    setPendingImageBlob(null);
    originalImagenUrlRef.current = item.imagenUrl ?? "";
    setShowForm(true);
    setShowVariantInput(false);
    setVariantForm({ nombre: "", precio: "" });
    setPendingVariantes([]);
    loadVariantes(item.id);
  };

  const closeForm = () => {
    if (form.imagenUrl?.startsWith("blob:")) URL.revokeObjectURL(form.imagenUrl);
    setPendingImageBlob(null);
    setShowForm(false);
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
    const imagenCambio = !!editingId && !!imagenOriginal && imagenOriginal !== imagenUrl;
    const eliminarImagenAnterior = () => {
      if (!imagenCambio) return;
      const idAnterior = extractCloudflareImageId(imagenOriginal);
      if (idAnterior) eliminarImagenProductoCloudflare(idAnterior);
    };

    if (editingId) {
      const resultado = await editarProducto(
        editingId,
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
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteConfirm(id);
    setDeleteTargetName(name);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await eliminarProducto(deleteConfirm);
    setDeleteConfirm(null);
    setDeleteTargetName("");
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categorias.some((c) => c.nombre.toLowerCase() === name.toLowerCase())) {
      triggerToast("Ya existe una categoría con ese nombre.", "warning");
      return;
    }
    await crearCategoria({
      nombre: name,
      orden: categorias.length + 1,
    });
    setNewCategoryName("");
    setShowNewCategory(false);
  };

  const handleDeleteCategory = async (
    categoryName: string,
    itemCount: number,
  ) => {
    if (itemCount > 0) {
      triggerToast(
        "No se puede eliminar: la categoría tiene productos.",
        "error",
      );
      setOpenMenuFor(null);
      return;
    }
    const cat = categorias.find((c) => c.nombre === categoryName);
    if (!cat) {
      setOpenMenuFor(null);
      return;
    }
    await eliminarCategoria(cat.id);
    setOpenMenuFor(null);
  };

  const isSearching = search.trim().length > 0;
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (i) =>
        i.nombre.toLowerCase().includes(q) ||
        i.categoriaNombre.toLowerCase().includes(q),
    );
  }, [search, productos]);

  const featuredItems = filteredItems.filter((i) => featuredIds.has(i.id));

  const groupedCategories = allCategoryNames
    .map((categoryName) => ({
      category: categoryName,
      items: filteredItems.filter((i) => i.categoriaNombre === categoryName),
    }))
    .filter((g) => !isSearching || g.items.length > 0);

  const toggleSection = (key: string) =>
    setCollapsed((s) => ({ ...s, [key]: !s[key] }));

  const stats = {
    total: productos.length,
    available: productos.filter((i) => i.disponible).length,
    featured: featuredItems.length,
    categories: allCategoryNames.filter((c) =>
      productos.some((i) => i.categoriaNombre === c),
    ).length,
  };

  const isLoading = loadingProductos || loadingCategorias;
  const noProducts = !isLoading && productos.length === 0;

  const catTabs: ProfileTab[] = [
    { id: "todos", label: "Todos", count: filteredItems.length },
    ...(featuredItems.length > 0
      ? [{ id: "destacados", label: "Destacados", count: featuredItems.length }]
      : []),
    ...groupedCategories
      .filter((g) => g.items.length > 0)
      .map((g) => ({
        id: g.category,
        label: g.category,
        count: g.items.length,
      })),
  ];
  const activeCat = catTabs.some((t) => t.id === catTab) ? catTab : "todos";
  const effectiveCat = isSearching ? "todos" : activeCat;
  const showFeaturedSection =
    featuredItems.length > 0 &&
    (effectiveCat === "todos" || effectiveCat === "destacados");
  const visibleGroups =
    effectiveCat === "todos"
      ? groupedCategories
      : effectiveCat === "destacados"
        ? []
        : groupedCategories.filter((g) => g.category === effectiveCat);

  const cover = (
    <>
      {activeBanners.length > 0 ? (
        <>
          {(() => {
            const current = activeBanners[bannerIndex % activeBanners.length];
            return current.image ? (
              <img
                src={current.image}
                alt={current.title || "Banner"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-linear-to-br ${current.gradient ?? "from-slate-900 to-slate-700"}`}
              />
            );
          })()}
          <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
          <span className="absolute top-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 text-white/80 backdrop-blur-sm">
            {(bannerIndex % activeBanners.length) + 1} / {activeBanners.length}
          </span>
          {activeBanners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setBannerIndex(
                    (i) =>
                      (i - 1 + activeBanners.length) % activeBanners.length,
                  )
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="Banner anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setBannerIndex((i) => (i + 1) % activeBanners.length)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="Siguiente banner"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {activeBanners.map((b, i) => (
                  <span
                    key={b.id}
                    className={`h-1.5 rounded-full transition-all ${i === bannerIndex % activeBanners.length ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={onGoToBanners}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/50 hover:text-white/70 transition-colors"
        >
          <ImageIcon className="h-6 w-6" />
          <span className="text-xs font-medium">
            Aún no tienes banners activos — agrega uno
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={onGoToBanners}
        className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/90 text-slate-700 hover:bg-white transition-colors shadow-sm"
      >
        <ImageIcon className="h-3.5 w-3.5" /> Banners
      </button>
    </>
  );

  const headerSubtitle = (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1 truncate">
        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
        {business.address || (
          <span className="text-slate-400 italic">
            Agrega la dirección del negocio
          </span>
        )}
      </p>
      <p className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
        <FileText className="h-3 w-3 shrink-0" />
        {business.ruc ? `RUC ${business.ruc}` : "Agrega el RUC"}
      </p>
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-3">
      {socialLinks.length > 0 && <SocialLinksRow links={socialLinks} />}
      <BusinessInfoSection
        tipoNegocio={horarios.tipoNegocio}
        descripcionCompleta={horarios.descripcionCompleta}
        schedule={horarios.schedule}
        numeroPedidos={horarios.numeroPedidos}
        direccion={
          business.mostrarDireccionEnMenu ? business.ubicacionDireccion : ""
        }
      />
    </div>
  );

  const cartaToggle = (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white shrink-0"
      title={carta.active ? "Carta visible para clientes" : "Carta oculta"}
    >
      <Toggle checked={carta.active} onChange={toggleCartaActive} />
      <span
        className={`text-xs font-semibold whitespace-nowrap ${carta.active ? "text-brand" : "text-slate-400"}`}
      >
        {carta.active ? "Carta activa" : "Carta oculta"}
      </span>
    </div>
  );

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-center gap-3 pb-5">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-linear-to-br from-brand to-brand-hover p-2.5 rounded-xl shadow-sm">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              Menú del negocio
            </h3>
            <p className="text-[11px] text-slate-500">
              {stats.total} {stats.total === 1 ? "plato" : "platos"} ·{" "}
              {stats.available} disponibles
            </p>
          </div>
        </div>

        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar platos o categorías..."
            className="input w-full pl-9 pr-9 py-2.5"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Limpiar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.open("/menu", "_blank")}
            className="btn-secondary"
            title="Ver la carta como la ve el cliente"
          >
            <Eye className="h-3.5 w-3.5" />{" "}
            <span className="hidden sm:inline">Vista Previa</span>
          </button>
          <button
            onClick={() => setShowNewCategory(true)}
            className="btn-secondary"
            title="Nueva categoría"
          >
            <FolderPlus className="h-3.5 w-3.5" />{" "}
            <span className="hidden lg:inline">Nueva Categoría</span>
          </button>
          {cartaToggle}
          <button onClick={() => openAdd()} className="btn-primary">
            <Plus className="h-3.5 w-3.5" /> Agregar Producto
          </button>
        </div>
      </div>

      <div className="mb-6">
        <ProfileHeader
          cover={cover}
          logo={business.logo}
          avatarEditable
          onAvatarClick={() => logoInputRef.current?.click()}
          name={business.name || "Configura el nombre de tu negocio"}
          nameMuted={!business.name}
          nameEditable
          onNameClick={openBusinessForm}
          subtitle={headerSubtitle}
          headerActions={headerActions}
          tabs={catTabs}
          activeTab={effectiveCat}
          onTabChange={setCatTab}
        />
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatChip
          icon={<Package className="h-4 w-4" />}
          tone="brand"
          label="Platos"
          value={stats.total}
        />
        <StatChip
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="emerald"
          label="Disponibles"
          value={stats.available}
        />
        <StatChip
          icon={<Star className="h-4 w-4" />}
          tone="amber"
          label="Destacados"
          value={stats.featured}
        />
        <StatChip
          icon={<LayoutGrid className="h-4 w-4" />}
          tone="violet"
          label="Categorías"
          value={stats.categories}
        />
      </div>

      {isSearching && (
        <p className="text-[11px] text-slate-500 mb-4">
          {filteredItems.length === 0 ? (
            <>
              Sin resultados para{" "}
              <strong className="text-slate-700">"{search}"</strong>.
            </>
          ) : (
            <>
              {filteredItems.length} resultado
              {filteredItems.length !== 1 ? "s" : ""} para{" "}
              <strong className="text-slate-700">"{search}"</strong>.
            </>
          )}
        </p>
      )}

      {isLoading ? (
        <div className="card-lg flex flex-col items-center justify-center text-center py-16 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center animate-pulse">
            <Store className="h-7 w-7" />
          </div>
          <p className="text-sm text-slate-500">Cargando menú...</p>
        </div>
      ) : noProducts ? (
        <div className="card-lg flex flex-col items-center justify-center text-center py-16 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
            <Utensils className="h-7 w-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            Tu carta está vacía
          </h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Agrega tu primer plato para empezar a construir el menú digital.
            También puedes importarlos desde una lista.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={onGoToImportar} className="btn-secondary">
              <Upload className="h-3.5 w-3.5" /> Importar
            </button>
            <button onClick={() => openAdd()} className="btn-primary">
              <Plus className="h-3.5 w-3.5" /> Agregar producto
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {showFeaturedSection && (
            <CategorySection
              sectionKey="destacados"
              title="Destacados"
              items={featuredItems}
              collapsed={!!collapsed.destacados}
              onToggle={() => toggleSection("destacados")}
              highlight
              icon={<Star className="h-4 w-4 text-white fill-white" />}
              iconBg="bg-gradient-to-br from-amber-400 to-fuchsia-500"
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleFeatured={toggleFeatured}
              onToggleAvailable={toggleDisponible}
              featuredIds={featuredIds}
            />
          )}

          {visibleGroups.map(({ category, items }) => (
            <CategorySection
              key={category}
              sectionKey={category}
              title={category}
              items={items}
              collapsed={!!collapsed[category]}
              onToggle={() => toggleSection(category)}
              icon={<Utensils className="h-4 w-4" />}
              iconBg={CATEGORY_ICON_BG[category] ?? "bg-gray-100 text-gray-600"}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleFeatured={toggleFeatured}
              onToggleAvailable={toggleDisponible}
              featuredIds={featuredIds}
              menuOpen={openMenuFor === category}
              onMenuToggle={() =>
                setOpenMenuFor((m) => (m === category ? null : category))
              }
              onDeleteCategory={() =>
                handleDeleteCategory(category, items.length)
              }
              onAdd={() => {
                const catId = getCategoriaIdByName(category);
                openAdd(catId);
              }}
            />
          ))}

          {isSearching && groupedCategories.length === 0 && (
            <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
              <Search className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                No se encontraron platos con ese término.
              </p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={showNewCategory}
        onClose={() => {
          setShowNewCategory(false);
          setNewCategoryName("");
        }}
        title="Nueva categoría"
        subtitle="Crea una categoría para organizar tus productos"
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowNewCategory(false);
                setNewCategoryName("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim()}
            >
              Crear categoría
            </Button>
          </>
        }
      >
        <Input
          label="Nombre de la categoría"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreateCategory();
          }}
          placeholder="Ej: Combos familiares"
          autoFocus
        />
      </Modal>

      <Modal
        open={showBusinessForm}
        onClose={() => setShowBusinessForm(false)}
        title="Información del negocio"
        subtitle="Se muestra en la tarjeta sobre el banner de tu carta."
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowBusinessForm(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitBusinessForm}
              disabled={!businessForm.name.trim()}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre del negocio"
            value={businessForm.name}
            onChange={(e) =>
              setBusinessForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="Ej: RestoPro Perú"
            autoFocus
          />
          <Input
            label="RUC"
            value={businessForm.ruc}
            onChange={(e) =>
              setBusinessForm((f) => ({
                ...f,
                ruc: e.target.value.replace(/\D/g, "").slice(0, 11),
              }))
            }
            placeholder="20123456789"
            inputMode="numeric"
          />
          <Input
            label="Dirección"
            value={businessForm.address}
            onChange={(e) =>
              setBusinessForm((f) => ({ ...f, address: e.target.value }))
            }
            placeholder="Ej: Av. Larco 345, Miraflores"
          />
        </div>
      </Modal>

      {showForm &&
        createPortal(
          <div
            className={`fixed inset-y-0 right-0 left-0 ${isCollapsed ? "md:left-16" : "md:left-64"} z-40 flex items-stretch justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm`}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {editingId ? "Editar producto" : "Nuevo producto"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Completa los datos que verá el cliente en la carta.
                  </p>
                </div>
                <button
                  onClick={closeForm}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={handleSubmit}
                className="p-6 space-y-4 flex-1 flex flex-col overflow-y-auto"
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
                  {form.imagenUrl ? (
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
                    <Input
                      placeholder="…o pega una URL de imagen"
                      value={form.imagenUrl}
                      onChange={(e) => {
                        setPendingImageBlob(null);
                        setForm((f) => ({ ...f, imagenUrl: e.target.value }));
                      }}
                    />
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

                <div className="flex gap-2 pt-2 mt-auto">
                  <button
                    type="button"
                    onClick={closeForm}
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
                      : editingId
                        ? "Guardar cambios"
                        : "Agregar producto"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <Modal
        open={deleteConfirm !== null}
        onClose={() => {
          setDeleteConfirm(null);
          setDeleteTargetName("");
        }}
        title="Eliminar producto"
        subtitle={`¿Estás seguro de eliminar "${deleteTargetName}"? Esta acción no se puede deshacer.`}
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteConfirm(null);
                setDeleteTargetName("");
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Eliminar
            </Button>
          </>
        }
      />
    </div>
  );
}

function StatChip({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <div
        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${STAT_TONES[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide truncate mt-1">
          {label}
        </p>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  sectionKey: string;
  title: string;
  items: ProductoDto[];
  collapsed: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconBg: string;
  highlight?: boolean;
  onEdit: (item: ProductoDto) => void;
  onDelete: (id: number, name: string) => void;
  onToggleFeatured: (id: number) => void;
  onToggleAvailable: (id: number, disponible: boolean) => void;
  featuredIds: Set<number>;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
  onDeleteCategory?: () => void;
  onAdd?: () => void;
}

function CategorySection({
  title,
  items,
  collapsed,
  onToggle,
  icon,
  iconBg,
  highlight,
  onEdit,
  onDelete,
  onToggleFeatured,
  onToggleAvailable,
  featuredIds,
  menuOpen,
  onMenuToggle,
  onDeleteCategory,
  onAdd,
}: CategorySectionProps) {
  const availableCount = items.filter((i) => i.disponible).length;
  return (
    <div
      className={`rounded-2xl border overflow-visible transition-shadow hover:shadow-card ${highlight ? "border-amber-200 bg-linear-to-r from-amber-50 via-white to-purple-50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="h-4 w-4 text-slate-300 shrink-0 cursor-grab" />
        <span
          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-col flex-1 min-w-0 text-left"
        >
          <span className="text-sm font-bold text-slate-800 truncate">
            {title}
          </span>
          <span className="text-[10px] text-slate-400">
            {items.length}{" "}
            {highlight ? "destacados" : items.length === 1 ? "plato" : "platos"}
            {!highlight &&
              items.length > 0 &&
              ` · ${availableCount} disponibles`}
          </span>
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-brand hover:bg-brand/10 px-2 py-1 rounded-lg transition-colors shrink-0"
            title="Agregar producto a esta categoría"
          >
            <Plus className="h-3.5 w-3.5" /> Producto
          </button>
        )}
        {onMenuToggle && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onMenuToggle}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-dropdown py-1 z-10">
                <button
                  type="button"
                  onClick={onDeleteCategory}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Eliminar categoría
                </button>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Sin productos en esta categoría todavía.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id, item.nombre)}
                  onToggleFeatured={() => onToggleFeatured(item.id)}
                  onToggleAvailable={() =>
                    onToggleAvailable(item.id, !item.disponible)
                  }
                  isFeatured={featuredIds.has(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  item,
  onEdit,
  onDelete,
  onToggleFeatured,
  onToggleAvailable,
  isFeatured,
}: {
  item: ProductoDto;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
  onToggleAvailable: () => void;
  isFeatured: boolean;
}) {
  const disponible = item.disponible ?? true;
  return (
    <div className="group card overflow-hidden flex flex-col transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
        {item.imagenUrl ? (
          <img
            src={item.imagenUrl}
            alt={item.nombre}
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${!disponible ? "grayscale" : ""}`}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300">
            <Utensils className="h-8 w-8" />
          </div>
        )}

        {!disponible && (
          <div className="absolute inset-0 bg-white/40 flex items-start justify-start p-2">
            <span className="text-[9px] bg-slate-800/90 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Agotado
            </span>
          </div>
        )}

        {isFeatured && disponible && (
          <button
            onClick={onToggleFeatured}
            className="absolute top-2 left-2 h-6 w-6 bg-amber-400 text-white rounded-full font-bold flex items-center justify-center shadow-sm hover:bg-amber-500 transition-colors"
            title="Quitar de destacados"
          >
            <Star className="h-3 w-3 fill-white" />
          </button>
        )}

        <span className="absolute top-2 right-2 text-[11px] bg-white text-slate-800 px-2 py-0.5 rounded-full font-mono font-bold shadow-sm">
          S/. {(item.precio ?? 0).toFixed(2)}
        </span>

        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="h-7 w-7 rounded-lg bg-white/95 text-slate-600 hover:text-brand flex items-center justify-center shadow-sm"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleFeatured}
            className={`h-7 w-7 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
              isFeatured
                ? "bg-amber-400 text-white hover:bg-amber-500"
                : "bg-white/95 text-slate-600 hover:text-amber-500"
            }`}
            title={isFeatured ? "Quitar de destacados" : "Destacar"}
          >
            <Star className={`w-3.5 h-3.5 ${isFeatured ? "fill-white" : ""}`} />
          </button>
          <button
            onClick={onDelete}
            className="h-7 w-7 rounded-lg bg-white/95 text-slate-600 hover:text-red-600 flex items-center justify-center shadow-sm transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h5 className="text-sm font-bold text-slate-800 leading-tight line-clamp-1">
          {item.nombre}
        </h5>
        {item.descripcion && (
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 flex-1">
            {item.descripcion}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
          <span
            className={`text-[10px] font-bold uppercase tracking-wide ${disponible ? "text-emerald-600" : "text-slate-400"}`}
          >
            {disponible ? "Disponible" : "Agotado"}
          </span>
          <Toggle checked={disponible} onChange={() => onToggleAvailable()} />
        </div>
      </div>
    </div>
  );
}

function VariantRow({
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
