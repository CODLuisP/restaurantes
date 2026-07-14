'use client';

import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Eye, Upload, FolderPlus, Plus, Star, ChevronDown, ChevronLeft, ChevronRight,
  GripVertical, MoreVertical, Image as ImageIcon, Store, Pencil, Trash2, Check, X,
  Utensils, Camera, MapPin, FileText, Package, LayoutGrid, CheckCircle2, ImagePlus,
} from 'lucide-react';
import { useCarta, CARTA_CATEGORIES } from '@/context/CartaContext';
import { useBanners } from '@/context/BannersContext';
import { useBusiness } from '@/context/BusinessContext';
import { useSidebar } from '@/context/SidebarContext';
import { useApp } from '@/context/AppContext';
import { useRedesSociales } from '@/context/RedesSocialesContext';
import { useHorarios } from '@/context/HorariosContext';
import { Toggle, Modal, Button, Input } from '@/components/ui';
import { ProfileHeader, type ProfileTab } from '@/components/menu/ProfileHeader';
import { buildSocialLinks, SocialLinksRow } from '@/components/menu/SocialLinksRow';
import { BusinessInfoSection } from '@/components/menu/BusinessInfoSection';
import type { MenuEntry } from '@/types';

const CATEGORY_ICON_BG: Record<string, string> = {
  'Entradas':        'bg-emerald-100 text-emerald-700',
  'Platos de fondo': 'bg-slate-200 text-slate-700',
  'Bebidas':         'bg-blue-100 text-blue-700',
  'Postres':         'bg-pink-100 text-pink-700',
  'Promociones':     'bg-purple-100 text-purple-700',
};

const STAT_TONES: Record<string, string> = {
  brand:   'bg-brand/10 text-brand',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber:   'bg-amber-50 text-amber-600',
  violet:  'bg-violet-50 text-violet-600',
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
  const { business, updateBusiness } = useBusiness();
  const { redes } = useRedesSociales();
  const socialLinks = buildSocialLinks(redes);
  const { horarios } = useHorarios();
  const { isCollapsed } = useSidebar();
  const { triggerToast } = useApp();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const productImageRef = useRef<HTMLInputElement>(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [businessForm, setBusinessForm] = useState(business);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateBusiness({ logo: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleProductImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, image: reader.result as string }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const openBusinessForm = () => { setBusinessForm(business); setShowBusinessForm(true); };
  const submitBusinessForm = () => {
    updateBusiness(businessForm);
    setShowBusinessForm(false);
    triggerToast('Información del negocio actualizada.', 'success');
  };

  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [catTab, setCatTab] = useState('todos');

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

  const isSearching = search.trim().length > 0;
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return carta.items;
    return carta.items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [search, carta.items]);

  const featuredItems = filteredItems.filter(i => i.featured);

  const groupedCategories = allCategories
    .map(category => ({ category, items: filteredItems.filter(i => i.category === category) }))
    .filter(g => !isSearching || g.items.length > 0);

  const toggleSection = (key: string) => setCollapsed(s => ({ ...s, [key]: !s[key] }));

  /* Resumen del menú */
  const stats = {
    total: carta.items.length,
    available: carta.items.filter(i => i.available).length,
    featured: carta.items.filter(i => i.featured).length,
    categories: allCategories.filter(c => carta.items.some(i => i.category === c)).length,
  };

  const noProducts = carta.items.length === 0;

  /* Pestañas de categoría (estilo perfil) */
  const catTabs: ProfileTab[] = [
    { id: 'todos', label: 'Todos', count: filteredItems.length },
    ...(featuredItems.length > 0 ? [{ id: 'destacados', label: 'Destacados', count: featuredItems.length }] : []),
    ...groupedCategories.filter(g => g.items.length > 0).map(g => ({ id: g.category, label: g.category, count: g.items.length })),
  ];
  const activeCat = catTabs.some(t => t.id === catTab) ? catTab : 'todos';
  const effectiveCat = isSearching ? 'todos' : activeCat;
  const showFeaturedSection = featuredItems.length > 0 && (effectiveCat === 'todos' || effectiveCat === 'destacados');
  const visibleGroups = effectiveCat === 'todos' ? groupedCategories
    : effectiveCat === 'destacados' ? []
    : groupedCategories.filter(g => g.category === effectiveCat);

  /* Portada (carrusel de banners con controles de admin) */
  const cover = (
    <>
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <span className="absolute top-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 text-white/80 backdrop-blur-sm">
            {(bannerIndex % activeBanners.length) + 1} / {activeBanners.length}
          </span>
          {activeBanners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setBannerIndex(i => (i - 1 + activeBanners.length) % activeBanners.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="Banner anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setBannerIndex(i => (i + 1) % activeBanners.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="Siguiente banner"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {activeBanners.map((b, i) => (
                  <span key={b.id} className={`h-1.5 rounded-full transition-all ${i === bannerIndex % activeBanners.length ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
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
        {business.address || <span className="text-slate-400 italic">Agrega la dirección del negocio</span>}
      </p>
      <p className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
        <FileText className="h-3 w-3 shrink-0" />
        {business.ruc ? `RUC ${business.ruc}` : 'Agrega el RUC'}
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
        direccion={business.mostrarDireccionEnMenu ? business.ubicacionDireccion : ''}
      />
    </div>
  );

  const cartaToggle = (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white shrink-0"
      title={carta.active ? 'Carta visible para clientes' : 'Carta oculta'}
    >
      <Toggle checked={carta.active} onChange={toggleCartaActive} />
      <span className={`text-xs font-semibold whitespace-nowrap ${carta.active ? 'text-brand' : 'text-slate-400'}`}>
        {carta.active ? 'Carta activa' : 'Carta oculta'}
      </span>
    </div>
  );

  return (
    <div className="space-y-0">

      {/* ── Encabezado + acciones ── */}
      <div className="flex flex-wrap items-center gap-3 pb-5">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-gradient-to-br from-brand to-brand-hover p-2.5 rounded-xl shadow-sm">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">Menú del negocio</h3>
            <p className="text-[11px] text-slate-500">
              {stats.total} {stats.total === 1 ? 'plato' : 'platos'} · {stats.available} disponibles
            </p>
          </div>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar platos o categorías..."
            className="input w-full pl-9 pr-9 py-2.5"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Limpiar">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => window.open('/menu', '_blank')} className="btn-secondary" title="Ver la carta como la ve el cliente">
            <Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Vista Previa</span>
          </button>
          <button onClick={onGoToImportar} className="btn-secondary" title="Importar productos">
            <Upload className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Importar</span>
          </button>
          <button onClick={() => setShowNewCategory(true)} className="btn-secondary" title="Nueva categoría">
            <FolderPlus className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Nueva Categoría</span>
          </button>
          {cartaToggle}
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-3.5 w-3.5" /> Agregar Producto
          </button>
        </div>
      </div>

      {/* ── Cabecera estilo perfil ── */}
      <div className="mb-6">
        <ProfileHeader
          cover={cover}
          logo={business.logo}
          avatarEditable
          onAvatarClick={() => logoInputRef.current?.click()}
          name={business.name || 'Configura el nombre de tu negocio'}
          nameMuted={!business.name}
          nameEditable
          onNameClick={openBusinessForm}
          subtitle={headerSubtitle}
          headerActions={headerActions}
          tabs={catTabs}
          activeTab={effectiveCat}
          onTabChange={setCatTab}
        />
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
      </div>

      {/* ── Resumen del menú ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatChip icon={<Package className="h-4 w-4" />}      tone="brand"   label="Platos"      value={stats.total} />
        <StatChip icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" label="Disponibles" value={stats.available} />
        <StatChip icon={<Star className="h-4 w-4" />}         tone="amber"   label="Destacados"  value={stats.featured} />
        <StatChip icon={<LayoutGrid className="h-4 w-4" />}   tone="violet"  label="Categorías"  value={stats.categories} />
      </div>

      {/* ── Feedback de búsqueda ── */}
      {isSearching && (
        <p className="text-[11px] text-slate-500 mb-4">
          {filteredItems.length === 0
            ? <>Sin resultados para <strong className="text-slate-700">“{search}”</strong>.</>
            : <>{filteredItems.length} resultado{filteredItems.length !== 1 ? 's' : ''} para <strong className="text-slate-700">“{search}”</strong>.</>}
        </p>
      )}

      {/* ── Estado vacío global ── */}
      {noProducts ? (
        <div className="card-lg flex flex-col items-center justify-center text-center py-16 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
            <Utensils className="h-7 w-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Tu carta está vacía</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Agrega tu primer plato para empezar a construir el menú digital. También puedes importarlos desde una lista.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={onGoToImportar} className="btn-secondary"><Upload className="h-3.5 w-3.5" /> Importar</button>
            <button onClick={openAdd} className="btn-primary"><Plus className="h-3.5 w-3.5" /> Agregar producto</button>
          </div>
        </div>
      ) : (
        /* ── Lista de categorías ── */
        <div className="space-y-3">
          {showFeaturedSection && (
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

          {visibleGroups.map(({ category, items }) => (
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
              onAdd={openAdd}
            />
          ))}

          {isSearching && groupedCategories.length === 0 && (
            <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
              <Search className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No se encontraron platos con ese término.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal nueva categoría ── */}
      <Modal
        open={showNewCategory}
        onClose={() => { setShowNewCategory(false); setNewCategoryName(''); }}
        title="Nueva categoría"
        subtitle="Crea una categoría para organizar tus productos"
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>Cancelar</Button>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>Crear categoría</Button>
          </>
        }
      >
        <Input
          label="Nombre de la categoría"
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory(); }}
          placeholder="Ej: Combos familiares"
          autoFocus
        />
      </Modal>

      {/* ── Modal datos del negocio ── */}
      <Modal
        open={showBusinessForm}
        onClose={() => setShowBusinessForm(false)}
        title="Información del negocio"
        subtitle="Se muestra en la tarjeta sobre el banner de tu carta."
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBusinessForm(false)}>Cancelar</Button>
            <Button onClick={submitBusinessForm} disabled={!businessForm.name.trim()}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre del negocio"
            value={businessForm.name}
            onChange={e => setBusinessForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: RestoPro Perú"
            autoFocus
          />
          <Input
            label="RUC"
            value={businessForm.ruc}
            onChange={e => setBusinessForm(f => ({ ...f, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
            placeholder="20123456789"
            inputMode="numeric"
          />
          <Input
            label="Dirección"
            value={businessForm.address}
            onChange={e => setBusinessForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Ej: Av. Larco 345, Miraflores"
          />
        </div>
      </Modal>

      {/* ── Modal form producto ── */}
      {showForm && createPortal(
        <div className={`fixed inset-y-0 right-0 left-0 ${isCollapsed ? 'md:left-16' : 'md:left-64'} z-40 flex items-stretch justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm`}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800">{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>
                <p className="text-[11px] text-slate-500">Completa los datos que verá el cliente en la carta.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 flex flex-col overflow-y-auto">
              {/* Imagen: preview + subir */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Foto del plato</label>
                <button
                  type="button"
                  onClick={() => productImageRef.current?.click()}
                  className="group/pimg relative w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-brand bg-slate-50 flex items-center justify-center transition-colors"
                >
                  {form.image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.image} alt="Vista previa" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/pimg:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                        <Camera className="h-4 w-4" /> Cambiar foto
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-slate-400">
                      <ImagePlus className="h-7 w-7" />
                      <span className="text-xs font-medium">Sube una foto del plato</span>
                      <span className="text-[10px]">JPG o PNG</span>
                    </div>
                  )}
                </button>
                <input ref={productImageRef} type="file" accept="image/*" onChange={handleProductImage} className="hidden" />
                <div className="flex items-center gap-2">
                  <input
                    value={form.image?.startsWith('data:') ? '' : form.image}
                    onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                    placeholder="…o pega una URL de imagen"
                    className="input flex-1 px-3 py-2 text-xs"
                  />
                  {form.image && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, image: '' }))} className="text-[11px] font-medium text-rose-500 hover:text-rose-600 shrink-0">
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Nombre del producto *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Ceviche Mixto"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-slate-50"
                  required
                  autoFocus
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

              {/* Opciones como toggles */}
              <div className="rounded-xl border border-slate-150 divide-y divide-slate-100">
                <div className="flex items-center justify-between gap-4 px-3.5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Disponible</p>
                    <p className="text-[11px] text-slate-500">Visible y pedible en la carta.</p>
                  </div>
                  <Toggle checked={form.available} onChange={v => setForm(f => ({ ...f, available: v }))} />
                </div>
                <div className="flex items-center justify-between gap-4 px-3.5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Destacado</p>
                    <p className="text-[11px] text-slate-500">Aparece en la sección Destacados.</p>
                  </div>
                  <Toggle checked={!!form.featured} onChange={v => setForm(f => ({ ...f, featured: v }))} />
                </div>
              </div>

              <div className="flex gap-2 pt-2 mt-auto">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-all shadow-sm">
                  {editingId ? 'Guardar cambios' : 'Agregar producto'}
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

/* ─── Chip de estadística ─── */
function StatChip({ icon, tone, label, value }: { icon: React.ReactNode; tone: string; label: string; value: number }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${STAT_TONES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide truncate mt-1">{label}</p>
      </div>
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
  onAdd?: () => void;
}

function CategorySection({
  title, items, collapsed, onToggle, icon, iconBg, highlight,
  onEdit, onDelete, onToggleAvailable, deleteConfirmId,
  menuOpen, onMenuToggle, onDeleteCategory, onAdd,
}: CategorySectionProps) {
  const availableCount = items.filter(i => i.available).length;
  return (
    <div className={`rounded-2xl border overflow-visible transition-shadow hover:shadow-card ${highlight ? 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-purple-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="h-4 w-4 text-slate-300 shrink-0 cursor-grab" />
        <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </span>
        <button type="button" onClick={onToggle} className="flex flex-col flex-1 min-w-0 text-left">
          <span className="text-sm font-bold text-slate-800 truncate">{title}</span>
          <span className="text-[10px] text-slate-400">
            {items.length} {highlight ? 'destacados' : items.length === 1 ? 'plato' : 'platos'}
            {!highlight && items.length > 0 && ` · ${availableCount} disponibles`}
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
    <div className="group card overflow-hidden flex flex-col transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${!item.available ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300">
            <Utensils className="h-8 w-8" />
          </div>
        )}

        {/* Overlay de agotado */}
        {!item.available && (
          <div className="absolute inset-0 bg-white/40 flex items-start justify-start p-2">
            <span className="text-[9px] bg-slate-800/90 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Agotado
            </span>
          </div>
        )}

        {item.featured && item.available && (
          <span className="absolute top-2 left-2 h-6 w-6 bg-amber-400 text-white rounded-full font-bold flex items-center justify-center shadow-sm" title="Destacado">
            <Star className="h-3 w-3 fill-white" />
          </span>
        )}

        <span className="absolute top-2 right-2 text-[11px] bg-white text-slate-800 px-2 py-0.5 rounded-full font-mono font-bold shadow-sm">
          S/. {item.price.toFixed(2)}
        </span>

        {/* Acciones al hover */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="h-7 w-7 rounded-lg bg-white/95 text-slate-600 hover:text-brand flex items-center justify-center shadow-sm" title="Editar">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className={`h-7 w-7 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
              confirmingDelete ? 'bg-red-500 text-white' : 'bg-white/95 text-slate-600 hover:text-red-600'
            }`}
            title={confirmingDelete ? 'Clic de nuevo para confirmar' : 'Eliminar'}
          >
            {confirmingDelete ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h5 className="text-sm font-bold text-slate-800 leading-tight line-clamp-1">{item.name}</h5>
        {item.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 flex-1">{item.description}</p>}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
          <span className={`text-[10px] font-bold uppercase tracking-wide ${item.available ? 'text-emerald-600' : 'text-slate-400'}`}>
            {item.available ? 'Disponible' : 'Agotado'}
          </span>
          <Toggle checked={item.available} onChange={() => onToggleAvailable()} />
        </div>
      </div>
    </div>
  );
}
