'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Eye, Upload, FolderPlus, Plus, Star, ChevronDown, ChevronLeft, ChevronRight,
  GripVertical, MoreVertical, Image as ImageIcon, Store, Pencil, Trash2, Check, X,
  Download, Printer, QrCode, Utensils,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useCarta, CARTA_CATEGORIES } from '@/context/CartaContext';
import { useBanners } from '@/context/BannersContext';
import { useSidebar } from '@/context/SidebarContext';
import { useApp } from '@/context/AppContext';
import { Toggle, Modal, Button } from '@/components/ui';
import type { MenuEntry } from '@/types';

const CATEGORY_ICON_BG: Record<string, string> = {
  'Entradas':        'bg-emerald-100 text-emerald-700',
  'Platos de fondo': 'bg-slate-200 text-slate-700',
  'Bebidas':         'bg-blue-100 text-blue-700',
  'Postres':         'bg-pink-100 text-pink-700',
  'Promociones':     'bg-purple-100 text-purple-700',
};

const emptyForm = (): Omit<MenuEntry, 'id'> => ({
  name: '', price: 0, category: 'Platos de fondo', description: '', available: true, image: '', featured: false,
});

interface ProductosTabProps {
  onGoToImportar?: () => void;
  onGoToBanners?: () => void;
}

export default function ProductosTab({ onGoToImportar, onGoToBanners }: ProductosTabProps) {
  const { carta, addItem, updateItem, removeItem, toggleItem, toggleCartaActive } = useCarta();
  const { banners } = useBanners();
  const activeBanners = banners.filter(b => b.active);
  const { isCollapsed } = useSidebar();
  const { triggerToast } = useApp();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);

  const allCategories = useMemo(() => {
    const present = carta.items.map(i => i.category);
    return Array.from(new Set([...CARTA_CATEGORIES, ...extraCategories, ...present]));
  }, [extraCategories, carta.items]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };

  const openEdit = (item: MenuEntry) => {
    setEditingId(item.id);
    setForm({
      name: item.name, price: item.price, category: item.category, description: item.description,
      available: item.available, image: item.image ?? '', featured: item.featured ?? false,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) updateItem(editingId, form);
    else addItem(form);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) { removeItem(id); setDeleteConfirm(null); }
    else setDeleteConfirm(id);
  };

  const handleCreateCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (allCategories.some(c => c.toLowerCase() === name.toLowerCase())) {
      triggerToast('Ya existe una categoría con ese nombre.', 'warning');
      return;
    }
    setExtraCategories(prev => [...prev, name]);
    triggerToast(`Categoría "${name}" creada.`, 'success');
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  const handleDeleteCategory = (category: string, itemCount: number) => {
    if (itemCount > 0) {
      triggerToast('No se puede eliminar: la categoría tiene productos.', 'error');
      setOpenMenuFor(null);
      return;
    }
    if (!extraCategories.includes(category)) {
      triggerToast('Las categorías predeterminadas no se pueden eliminar.', 'warning');
      setOpenMenuFor(null);
      return;
    }
    setExtraCategories(prev => prev.filter(c => c !== category));
    triggerToast(`Categoría "${category}" eliminada.`, 'info');
    setOpenMenuFor(null);
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return carta.items;
    return carta.items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [search, carta.items]);

  const featuredItems = filteredItems.filter(i => i.featured);

  const groupedCategories = allCategories
    .map(category => ({ category, items: filteredItems.filter(i => i.category === category) }))
    .filter(g => !search.trim() || g.items.length > 0);

  const toggleSection = (key: string) => setCollapsed(s => ({ ...s, [key]: !s[key] }));

  return (
    <div className="space-y-0">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 pb-5">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-brand p-2 rounded-xl">
            <Store className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Menú</h3>
        </div>

        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar productos o categorías..."
            className="input w-full pl-9 pr-3 py-2"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => window.open('/menu', '_blank')} className="btn-secondary">
            <Eye className="h-3.5 w-3.5" /> Vista Previa
          </button>
          <button onClick={onGoToImportar} className="btn-secondary">
            <Upload className="h-3.5 w-3.5" /> Importar
          </button>
          <button onClick={() => setShowNewCategory(true)} className="btn-secondary">
            <FolderPlus className="h-3.5 w-3.5" /> Nueva Categoría
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-3.5 w-3.5" /> Agregar Producto
          </button>
        </div>
      </div>

      {/* ── Banner carousel + tarjeta de negocio ── */}
      <div className="relative mb-10">
        <div className="relative rounded-2xl overflow-hidden h-44 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {activeBanners.length > 0 ? (
            <>
              {(() => {
                const current = activeBanners[bannerIndex % activeBanners.length];
                return current.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.image} alt={current.title || 'Banner'} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${current.gradient ?? 'from-slate-900 to-slate-700'}`} />
                );
              })()}
              <div className="absolute inset-0 bg-black/10" />
              <span className="absolute top-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 text-white/80">
                {(bannerIndex % activeBanners.length) + 1} / {activeBanners.length}
              </span>
              {activeBanners.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setBannerIndex(i => (i - 1 + activeBanners.length) % activeBanners.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    aria-label="Banner anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerIndex(i => (i + 1) % activeBanners.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    aria-label="Siguiente banner"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {activeBanners.map((b, i) => (
                      <span
                        key={b.id}
                        className={`h-1.5 rounded-full transition-all ${i === bannerIndex % activeBanners.length ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
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
              <span className="text-xs font-medium">Aún no tienes banners activos — agrega uno</span>
            </button>
          )}
          <button
            type="button"
            onClick={onGoToBanners}
            className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/90 text-slate-700 hover:bg-white transition-colors"
          >
            <ImageIcon className="h-3.5 w-3.5" /> Banners
          </button>
        </div>

        <div className="absolute -bottom-8 left-4 flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">RestoPro Perú</p>
            <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
              Gestión gastronómica inteligente para tu restaurante.
            </p>
          </div>
          <div className="pl-3 ml-1 border-l border-slate-200 shrink-0" title={carta.active ? 'Carta activa' : 'Carta inactiva'}>
            <Toggle checked={carta.active} onChange={toggleCartaActive} />
          </div>
        </div>
      </div>

      {/* ── Lista de categorías ── */}
      <div className="space-y-3">
        {featuredItems.length > 0 && (
          <CategorySection
            sectionKey="destacados"
            title="Destacados"
            items={featuredItems}
            collapsed={!!collapsed.destacados}
            onToggle={() => toggleSection('destacados')}
            highlight
            icon={<Star className="h-4 w-4 text-white fill-white" />}
            iconBg="bg-gradient-to-br from-amber-400 to-fuchsia-500"
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleAvailable={toggleItem}
            deleteConfirmId={deleteConfirm}
          />
        )}

        {groupedCategories.map(({ category, items }) => (
          <CategorySection
            key={category}
            sectionKey={category}
            title={category}
            items={items}
            collapsed={!!collapsed[category]}
            onToggle={() => toggleSection(category)}
            icon={<Utensils className="h-4 w-4" />}
            iconBg={CATEGORY_ICON_BG[category] ?? 'bg-gray-100 text-gray-600'}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleAvailable={toggleItem}
            deleteConfirmId={deleteConfirm}
            menuOpen={openMenuFor === category}
            onMenuToggle={() => setOpenMenuFor(m => (m === category ? null : category))}
            onDeleteCategory={() => handleDeleteCategory(category, items.length)}
          />
        ))}
      </div>

      {/* ── QR único ── */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-brand" />
          <h4 className="text-base font-bold text-slate-800">Código QR de la Carta</h4>
          <span className="text-xs text-slate-400 ml-1">Imprímelo y ponlo en las mesas — todos los clientes ven la misma carta.</span>
        </div>
        <QrSection />
      </div>

      {/* ── Modal nueva categoría ── */}
      <Modal
        open={showNewCategory}
        onClose={() => { setShowNewCategory(false); setNewCategoryName(''); }}
        title="Nueva categoría"
        subtitle="Crea una categoría para organizar tus productos"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>Cancelar</Button>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>Crear categoría</Button>
          </>
        }
      >
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Nombre de la categoría
          </label>
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Ej: Combos familiares"
            className="input w-full px-3 py-2"
            autoFocus
          />
        </div>
      </Modal>

      {/* ── Modal form producto ── */}
      {showForm && createPortal(
        <div className={`fixed inset-y-0 right-0 left-0 ${isCollapsed ? 'md:left-16' : 'md:left-64'} z-40 flex items-stretch justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm`}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 flex flex-col overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Nombre del producto *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Ceviche Mixto"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Precio (S/.)</label>
                  <input
                    type="number" min={0} step={0.5}
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-brand bg-slate-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Categoría</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                  >
                    {allCategories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Ingredientes y preparación..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">URL de imagen (opcional)</label>
                <input
                  value={form.image}
                  onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                  className="accent-brand w-4 h-4"
                />
                <span className="text-sm text-slate-700">Disponible desde el inicio</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
                  className="accent-brand w-4 h-4"
                />
                <span className="text-sm text-slate-700">Destacado (aparece en la sección Destacados)</span>
              </label>
              <div className="flex gap-2 pt-2 mt-auto">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-all">
                  {editingId ? 'Guardar Cambios' : 'Agregar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ─── Sección de categoría colapsable ─── */
interface CategorySectionProps {
  sectionKey: string;
  title: string;
  items: MenuEntry[];
  collapsed: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconBg: string;
  highlight?: boolean;
  onEdit: (item: MenuEntry) => void;
  onDelete: (id: string) => void;
  onToggleAvailable: (id: string) => void;
  deleteConfirmId: string | null;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
  onDeleteCategory?: () => void;
}

function CategorySection({
  title, items, collapsed, onToggle, icon, iconBg, highlight,
  onEdit, onDelete, onToggleAvailable, deleteConfirmId,
  menuOpen, onMenuToggle, onDeleteCategory,
}: CategorySectionProps) {
  return (
    <div className={`rounded-xl border overflow-visible ${highlight ? 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-purple-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="h-4 w-4 text-slate-300 shrink-0 cursor-grab" />
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </span>
        <button type="button" onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <span className="text-sm font-bold text-slate-800 truncate">{title}</span>
        </button>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${highlight ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
          {items.length} {highlight ? 'destacados' : 'productos'}
        </span>
        {onMenuToggle && (
          <div className="relative shrink-0">
            <button type="button" onClick={onMenuToggle} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
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
        <button type="button" onClick={onToggle} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0">
          <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Sin productos en esta categoría todavía.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map(item => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id)}
                  onToggleAvailable={() => onToggleAvailable(item.id)}
                  confirmingDelete={deleteConfirmId === item.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Tarjeta de producto ─── */
function ProductCard({
  item, onEdit, onDelete, onToggleAvailable, confirmingDelete,
}: {
  item: MenuEntry;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailable: () => void;
  confirmingDelete: boolean;
}) {
  return (
    <div className={`card-lg overflow-hidden flex flex-col group transition-all hover:shadow-md ${!item.available ? 'opacity-60' : ''}`}>
      <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300">
            <Utensils className="h-8 w-8" />
          </div>
        )}
        {!item.available && (
          <span className="absolute top-2 left-2 text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">
            No disponible
          </span>
        )}
        {item.featured && (
          <span className="absolute top-2 left-2 text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-white" />
          </span>
        )}
        <span className="absolute top-2 right-2 text-[10px] bg-white/90 text-brand px-2 py-0.5 rounded-full font-mono font-bold shadow-sm">
          S/. {item.price.toFixed(2)}
        </span>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h5 className="text-sm font-bold text-slate-800 leading-tight">{item.name}</h5>
        {item.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 flex-1">{item.description}</p>}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
          <button
            onClick={onToggleAvailable}
            title={item.available ? 'Marcar no disponible' : 'Marcar disponible'}
            className="text-[11px] font-medium text-slate-500 hover:text-brand transition-colors"
          >
            {item.available ? 'Activo' : 'Inactivo'}
          </button>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className={`p-1.5 rounded-lg transition-colors ${
                confirmingDelete ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
              }`}
              title={confirmingDelete ? 'Clic de nuevo para confirmar' : 'Eliminar'}
            >
              {confirmingDelete ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── QR section ─── */
function QrSection() {
  const [url, setUrl] = useState('/menu');
  useEffect(() => { setUrl(`${window.location.origin}/menu`); }, []);
  const canvasId = 'qr-canvas-carta';

  const handleDownload = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'QR-Menu-Digital.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'width=400,height=520');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html>
        <head><title>QR Menú Digital</title>
        <style>
          body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff}
          img{width:240px;height:240px}
          h2{font-size:20px;margin:14px 0 4px;color:#005e34;font-weight:800}
          p{font-size:12px;color:#888;margin:0}
          .url{font-size:9px;color:#bbb;margin-top:10px;word-break:break-all;max-width:240px;text-align:center}
        </style></head>
        <body>
          <img src="${dataUrl}" alt="QR Menú" />
          <h2>Menú Digital</h2>
          <p>Escanea para ver el menú</p>
          <div class="url">${url}</div>
          <script>window.onload=function(){window.print();window.close()}<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-sm mx-auto">
      <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-inner">
        <QRCodeCanvas
          id={canvasId}
          value={url}
          size={200}
          bgColor="#ffffff"
          fgColor="#005e34"
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-slate-800">Menú Digital</p>
        <p className="text-xs text-slate-500 mt-1">Los clientes escanean este QR para ver el menú en su celular.</p>
        <p className="text-[10px] text-slate-400 font-mono mt-2">{url}</p>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar PNG
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>
    </div>
  );
}
