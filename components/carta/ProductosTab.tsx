"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, Eye, Upload, FolderPlus, Plus, Star, Store, Utensils,
  Package, LayoutGrid, CheckCircle2, X,
} from "lucide-react";
import { Toggle, Modal, Button, Input } from "@/components/ui";
import { useCarta } from "@/context/CartaContext";
import { useSidebar } from "@/context/SidebarContext";
import { useApp } from "@/context/AppContext";
import { useSucursalSelector } from "@/hooks/useSucursalSelector";
import { useProductos } from "@/hooks/productos/useProductos";
import { useCategorias } from "@/hooks/categorias/useCategorias";
import type { ProfileTab } from "@/components/menu/ProfileHeader";
import type { ProductoDto } from "@/types/productos";
import MenuHeaderSection from "./productos/MenuHeaderSection";
import StatChip from "./productos/StatChip";
import CategorySection from "./productos/CategorySection";
import ProductFormModal from "./productos/ProductFormModal";
import { CATEGORY_ICON_BG, FEATURED_STORAGE_KEY } from "./productos/types";

interface ProductosTabProps {
  onGoToImportar?: () => void;
  onGoToBanners?: () => void;
}

export default function ProductosTab({
  onGoToImportar,
  onGoToBanners,
}: ProductosTabProps) {
  const { token, isSuperAdmin, sucursales, sId: resolvedSucursalId, selectSucursal } = useSucursalSelector();

  const {
    productos,
    loading: loadingProductos,
    crearProducto,
    editarProducto,
    toggleDisponible,
    eliminarProducto,
  } = useProductos(resolvedSucursalId);

  const {
    categorias,
    loading: loadingCategorias,
    crearCategoria,
    eliminarCategoria,
  } = useCategorias();

  const { carta, toggleCartaActive } = useCarta();
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
          localStorage.setItem(FEATURED_STORAGE_KEY, JSON.stringify([...cleaned]));
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
  const [editingItem, setEditingItem] = useState<ProductoDto | null>(null);
  const [defaultCategoriaId, setDefaultCategoriaId] = useState<number | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
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

  const openAdd = (categoriaId?: number) => {
    setEditingItem(null);
    setDefaultCategoriaId(categoriaId);
    setShowForm(true);
  };

  const openEdit = (item: ProductoDto) => {
    setEditingItem(item);
    setDefaultCategoriaId(undefined);
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

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

  const handleDeleteCategory = async (categoryName: string, itemCount: number) => {
    if (itemCount > 0) {
      triggerToast("No se puede eliminar: la categoría tiene productos.", "error");
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
            onClick={() => window.open(`/menu?sucursalId=${resolvedSucursalId ?? 1}`, "_blank")}
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
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white shrink-0"
            title={carta.active ? "Carta visible para clientes" : "Carta oculta"}
          >
            <Toggle checked={carta.active} onChange={toggleCartaActive} />
            <span className={`text-xs font-semibold whitespace-nowrap ${carta.active ? "text-brand" : "text-slate-400"}`}>
              {carta.active ? "Carta activa" : "Carta oculta"}
            </span>
          </div>
          <button onClick={() => openAdd()} className="btn-primary">
            <Plus className="h-3.5 w-3.5" /> Agregar Producto
          </button>
        </div>
      </div>

      <MenuHeaderSection
        sucursalId={resolvedSucursalId}
        isSuperAdmin={isSuperAdmin}
        sucursales={sucursales}
        onSucursalChange={selectSucursal}
        onGoToBanners={onGoToBanners}
        catTabs={catTabs}
        activeTab={effectiveCat}
        onTabChange={setCatTab}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatChip icon={<Package className="h-4 w-4" />} tone="brand" label="Platos" value={stats.total} />
        <StatChip icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" label="Disponibles" value={stats.available} />
        <StatChip icon={<Star className="h-4 w-4" />} tone="amber" label="Destacados" value={stats.featured} />
        <StatChip icon={<LayoutGrid className="h-4 w-4" />} tone="violet" label="Categorías" value={stats.categories} />
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
          <h4 className="text-sm font-bold text-slate-800">Tu carta está vacía</h4>
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
              onMenuToggle={() => setOpenMenuFor((m) => (m === category ? null : category))}
              onDeleteCategory={() => handleDeleteCategory(category, items.length)}
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
        onClose={() => { setShowNewCategory(false); setNewCategoryName(""); }}
        title="Nueva categoría"
        subtitle="Crea una categoría para organizar tus productos"
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
              Crear categoría
            </Button>
          </>
        }
      >
        <Input
          label="Nombre de la categoría"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreateCategory(); }}
          placeholder="Ej: Combos familiares"
          autoFocus
        />
      </Modal>

      <ProductFormModal
        open={showForm}
        editingItem={editingItem}
        defaultCategoriaId={defaultCategoriaId}
        categoriasOrdenadas={categoriasOrdenadas}
        isCollapsed={isCollapsed}
        crearProducto={crearProducto}
        editarProducto={editarProducto}
        onClose={closeForm}
      />

      <Modal
        open={deleteConfirm !== null}
        onClose={() => { setDeleteConfirm(null); setDeleteTargetName(""); }}
        title="Eliminar producto"
        subtitle={`¿Estás seguro de eliminar "${deleteTargetName}"? Esta acción no se puede deshacer.`}
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDeleteConfirm(null); setDeleteTargetName(""); }}>
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
