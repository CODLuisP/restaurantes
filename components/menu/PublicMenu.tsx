'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Utensils, Store, MapPin, FileText, ChevronLeft, ChevronRight,
  ChevronDown, Star, Clock, Plus, Minus, ShoppingCart, Search, X, Upload, Camera, Send, CheckCircle2, Check,
} from 'lucide-react';
import { CARTA_STORAGE_KEY, CARTA_CATEGORIES } from '@/context/CartaContext';
import { BANNERS_STORAGE_KEY, DEFAULT_BANNERS, type Banner } from '@/context/BannersContext';
import { BUSINESS_STORAGE_KEY, type BusinessInfo } from '@/context/BusinessContext';
import { REDES_SOCIALES_STORAGE_KEY, DEFAULT_REDES_SOCIALES, type RedesSocialesState } from '@/context/RedesSocialesContext';
import { HORARIOS_STORAGE_KEY, DEFAULT_HORARIOS, type HorariosState } from '@/context/HorariosContext';
import { buildSocialLinks, SocialLinksRow } from '@/components/menu/SocialLinksRow';
import { BusinessInfoSection } from '@/components/menu/BusinessInfoSection';
import { ProfileHeader, type ProfileTab } from '@/components/menu/ProfileHeader';
import type { CartaDelDia, MenuEntry, OrderItem, ActiveOrder, KitchenOrder, Table } from '@/types';
import { Modal, Button, Input, Select } from '@/components/ui';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const CATEGORY_ICON_BG: Record<string, string> = {
  'Entradas':        'bg-emerald-100 text-emerald-700',
  'Platos de fondo': 'bg-slate-200 text-slate-700',
  'Bebidas':         'bg-blue-100 text-blue-700',
  'Postres':         'bg-pink-100 text-pink-700',
  'Promociones':     'bg-purple-100 text-purple-700',
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const LIBRARIES: ('places' | 'geometry')[] = ['places'];

function entryToProduct(e: MenuEntry): any {
  return {
    id: e.id,
    name: e.name,
    price: e.price,
    category: e.category,
    image: e.image ?? '',
    status: 'available',
    stock: 99,
    sku: '',
    unit: 'unidades',
  };
}

/** Vista pública de la carta con autoservicio para clientes. */
export default function PublicMenu({ mesaLabel }: { mesaLabel?: string }) {
  const [carta, setCarta] = useState<CartaDelDia | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [redes, setRedes] = useState<RedesSocialesState>(DEFAULT_REDES_SOCIALES);
  const [horarios, setHorarios] = useState<HorariosState>(DEFAULT_HORARIOS);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('todos');
  const [time, setTime] = useState('');

  // Estados del Buscador y del Carrito
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState('');

  // Estados del Formulario de Pedido (Checkout)
  const [orderType, setOrderType] = useState<'mesa' | 'llevar' | 'delivery'>(mesaLabel ? 'mesa' : 'llevar');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [tableNum, setTableNum] = useState(mesaLabel ? mesaLabel.replace(/Mesa /i, '') : '');
  const [docType, setDocType] = useState<'Boleta' | 'Factura' | 'Nota de venta'>('Nota de venta');
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Yape / Plin'>('Efectivo');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
  const [formError, setFormError] = useState('');

  // Referencias para Google Maps
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { isLoaded } = useJsApiLoader({
    id: 'restopro-google-maps-public',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const addressStr = place.formatted_address ?? place.name ?? '';
    setCustAddress(addressStr);
  };

  /* Carga (y refresco cada 5s) desde localStorage: carta, banners e info del negocio. */
  useEffect(() => {
    const load = () => {
      try {
        const c = localStorage.getItem(CARTA_STORAGE_KEY);
        if (c) setCarta(JSON.parse(c));
        const b = localStorage.getItem(BANNERS_STORAGE_KEY);
        setBanners(b ? JSON.parse(b) : DEFAULT_BANNERS);
        const biz = localStorage.getItem(BUSINESS_STORAGE_KEY);
        if (biz) setBusiness(JSON.parse(biz));
        const rs = localStorage.getItem(REDES_SOCIALES_STORAGE_KEY);
        if (rs) setRedes({ ...DEFAULT_REDES_SOCIALES, ...JSON.parse(rs) });
        const hs = localStorage.getItem(HORARIOS_STORAGE_KEY);
        if (hs) {
          const parsed = JSON.parse(hs);
          setHorarios({ ...DEFAULT_HORARIOS, ...parsed, schedule: { ...DEFAULT_HORARIOS.schedule, ...(parsed.schedule ?? {}) } });
        }
      } catch {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }));
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  const activeBanners = banners.filter(b => b.active);

  const allCategories = useMemo(() => {
    const present = carta?.items.map(i => i.category) ?? [];
    return Array.from(new Set([...CARTA_CATEGORIES, ...present]));
  }, [carta]);

  const availableItems = useMemo(() => {
    return carta?.items.filter(i => i.available) ?? [];
  }, [carta]);

  // Filtrado de productos basado en el buscador
  const searchedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableItems;
    return availableItems.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }, [search, availableItems]);

  if (!carta || !carta.active) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
          <Utensils className="w-8 h-8 text-brand" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Carta no disponible</h2>
        <p className="text-sm text-gray-500">Por el momento la carta digital no está activa. Por favor consulte a su mozo.</p>
      </div>
    );
  }

  const featuredItems = searchedItems.filter(i => i.featured);
  const groupedCategories = allCategories
    .map(category => ({ category, items: searchedItems.filter(i => i.category === category) }))
    .filter(g => g.items.length > 0);

  const toggle = (key: string) => setCollapsed(s => ({ ...s, [key]: !s[key] }));
  const bizName = business?.name?.trim() || 'Carta del Día';

  /* Pestañas: Todos + Destacados + cada categoría con platos */
  const tabs: ProfileTab[] = [
    { id: 'todos', label: 'Carta', count: searchedItems.length },
    ...(featuredItems.length > 0 ? [{ id: 'destacados', label: 'Destacados', count: featuredItems.length }] : []),
    ...groupedCategories.map(g => ({ id: g.category, label: g.category, count: g.items.length })),
  ];
  const tab = tabs.some(t => t.id === activeTab) ? activeTab : 'todos';

  const showFeatured = featuredItems.length > 0 && (tab === 'todos' || tab === 'destacados');
  const visibleGroups = tab === 'todos' ? groupedCategories
    : tab === 'destacados' ? []
    : groupedCategories.filter(g => g.category === tab);

  const addToCart = (product: MenuEntry) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product: entryToProduct(product), quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmOrder = () => {
    setFormError('');
    if (!custName.trim()) {
      setFormError('Por favor ingresa tu nombre.');
      return;
    }
    if (!custPhone.trim()) {
      setFormError('Por favor ingresa tu número telefónico.');
      return;
    }
    if (orderType === 'delivery' && !custAddress.trim()) {
      setFormError('Por favor ingresa una dirección de entrega.');
      return;
    }
    if (orderType === 'mesa' && !tableNum.trim()) {
      setFormError('Por favor ingresa tu número de mesa.');
      return;
    }
    if (docType === 'Factura') {
      if (ruc.trim().length !== 11) {
        setFormError('El RUC debe tener 11 dígitos.');
        return;
      }
      if (!razonSocial.trim()) {
        setFormError('Por favor ingresa la Razón Social.');
        return;
      }
    }
    if (paymentMethod === 'Yape / Plin' && !paymentScreenshot) {
      setFormError('Por favor adjunta la captura del pago de Yape o Plin.');
      return;
    }

    try {
      const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const orderId = `${orderType === 'mesa' ? 'MS' : orderType === 'llevar' ? 'PL' : 'DL'}-${Math.floor(200 + Math.random() * 800)}`;

      if (orderType === 'mesa') {
        // Cargar mesas
        const storedTables = localStorage.getItem('restopro.tables');
        const tablesList: Table[] = storedTables ? JSON.parse(storedTables) : [];
        
        // Encontrar mesa
        const targetTableName = `Mesa ${tableNum}`;
        const tableIndex = tablesList.findIndex(t => t.name.toLowerCase() === targetTableName.toLowerCase() || t.name === tableNum);
        
        if (tableIndex !== -1) {
          const currentTable = tablesList[tableIndex];
          const mergedItems = [...(currentTable.items ?? [])];
          
          cart.forEach(cartItem => {
            const idx = mergedItems.findIndex(mi => mi.product.id === cartItem.product.id);
            if (idx !== -1) {
              mergedItems[idx].quantity += cartItem.quantity;
            } else {
              mergedItems.push(cartItem);
            }
          });

          const cuenta = mergedItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
          tablesList[tableIndex] = {
            ...currentTable,
            status: 'ocupada',
            items: mergedItems,
            cuenta,
            waiter: 'Autoservicio',
          };
          
          localStorage.setItem('restopro.tables', JSON.stringify(tablesList));
        } else {
          // Si no existe, lo agregamos como comanda activa general para no perder el pedido
          const storedActive = localStorage.getItem('restopro.activeOrders');
          const activeList: ActiveOrder[] = storedActive ? JSON.parse(storedActive) : [];
          
          const newOrder: ActiveOrder = {
            id: orderId,
            type: 'llevar',
            customer: `${custName.trim()} (Mesa ${tableNum})`,
            phone: custPhone,
            items: cart,
            total: cartTotal,
            itemsCount: cartCount,
            waiter: 'Autoservicio',
            createdAt: now,
            docType,
            ruc: docType === 'Factura' ? ruc : undefined,
            razonSocial: docType === 'Factura' ? razonSocial : undefined,
            paymentMethod,
            paymentScreenshot: paymentMethod === 'Yape / Plin' ? paymentScreenshot : undefined,
          };
          
          activeList.push(newOrder);
          localStorage.setItem('restopro.activeOrders', JSON.stringify(activeList));
        }

        // Crear comanda de cocina
        const storedKitchen = localStorage.getItem('restopro.kitchenOrders');
        const kitchenList: KitchenOrder[] = storedKitchen ? JSON.parse(storedKitchen) : [];
        const newKo: KitchenOrder = {
          id: `ko${Math.floor(200 + Math.random() * 800)}`,
          table: `Mesa ${tableNum} (Autoservicio)`,
          items: cart.map(i => ({ name: i.product.name, quantity: i.quantity })),
          status: 'pendiente',
          time: now,
          elapsed: 0,
          waiter: 'Autoservicio',
        };
        kitchenList.push(newKo);
        localStorage.setItem('restopro.kitchenOrders', JSON.stringify(kitchenList));

      } else {
        // Llevar o Delivery
        const storedActive = localStorage.getItem('restopro.activeOrders');
        const activeList: ActiveOrder[] = storedActive ? JSON.parse(storedActive) : [];

        const newOrder: ActiveOrder = {
          id: orderId,
          type: orderType === 'delivery' ? 'delivery' : 'llevar',
          customer: custName.trim(),
          phone: custPhone,
          address: orderType === 'delivery' ? custAddress : undefined,
          items: cart,
          total: cartTotal,
          itemsCount: cartCount,
          waiter: 'Autoservicio',
          createdAt: now,
          docType,
          ruc: docType === 'Factura' ? ruc : undefined,
          razonSocial: docType === 'Factura' ? razonSocial : undefined,
          paymentMethod,
          paymentScreenshot: paymentMethod === 'Yape / Plin' ? paymentScreenshot : undefined,
        };

        activeList.push(newOrder);
        localStorage.setItem('restopro.activeOrders', JSON.stringify(activeList));

        // Crear comanda de cocina
        const storedKitchen = localStorage.getItem('restopro.kitchenOrders');
        const kitchenList: KitchenOrder[] = storedKitchen ? JSON.parse(storedKitchen) : [];
        const newKo: KitchenOrder = {
          id: `ko${Math.floor(200 + Math.random() * 800)}`,
          table: orderType === 'delivery' ? `Delivery · ${orderId}` : `Llevar · ${orderId}`,
          items: cart.map(i => ({ name: i.product.name, quantity: i.quantity })),
          status: 'pendiente',
          time: now,
          elapsed: 0,
          waiter: 'Autoservicio',
        };
        kitchenList.push(newKo);
        localStorage.setItem('restopro.kitchenOrders', JSON.stringify(kitchenList));
      }

      // Desencadenar eventos manuales de sincronización para que otras pestañas reaccionen
      window.dispatchEvent(new Event('storage'));

      setLastPlacedOrderId(orderId);
      setIsOrderSuccess(true);
      setCart([]);
      setShowCheckout(false);
      
      // Limpiar campos
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setCustAddress('');
      setRuc('');
      setRazonSocial('');
      setPaymentScreenshot('');
      setPaymentMethod('Efectivo');
      setDocType('Nota de venta');
    } catch (e) {
      setFormError('Hubo un error al procesar el pedido. Inténtalo de nuevo.');
    }
  };

  /* Portada (carrusel de banners) */
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
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
        <div className="absolute inset-0 flex items-center justify-center text-white/40">
          <Utensils className="h-8 w-8" />
        </div>
      )}

      {/* Mesa + hora */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {mesaLabel && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-slate-700 inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-brand" /> {mesaLabel}
          </span>
        )}
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-black/40 text-white/80 inline-flex items-center gap-1 backdrop-blur-sm">
          <Clock className="h-3 w-3" /> {time}
        </span>
      </div>
    </>
  );

  const subtitle = (
    <div className="space-y-0.5">
      {business?.address && (
        <p className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0 text-slate-400" /> {business.address}</p>
      )}
      {business?.ruc && (
        <p className="flex items-center gap-1 font-mono text-[11px] text-slate-400"><FileText className="h-3 w-3 shrink-0" /> RUC {business.ruc}</p>
      )}
      {!business?.address && !business?.ruc && <p>Restaurante · Carta del Día</p>}
    </div>
  );

  const socialLinks = buildSocialLinks(redes);
  const headerActions = (
    <div className="flex items-center gap-3">
      {socialLinks.length > 0 && <SocialLinksRow links={socialLinks} />}
      <BusinessInfoSection
        tipoNegocio={horarios.tipoNegocio}
        descripcionCompleta={horarios.descripcionCompleta}
        schedule={horarios.schedule}
        numeroPedidos={horarios.numeroPedidos}
        direccion={business && business.mostrarDireccionEnMenu ? business.ubicacionDireccion : ''}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] selection:bg-brand selection:text-white pb-20 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-0 pb-6">

        <ProfileHeader
          cover={cover}
          logo={business?.logo}
          name={bizName}
          subtitle={subtitle}
          headerActions={headerActions}
          tabs={tabs}
          activeTab={tab}
          onTabChange={setActiveTab}
          coverFullBleed
        />

        {/* ── Buscador de Platos ── */}
        <div className="relative mt-6 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por plato, bebida o ingrediente..."
            className="input w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 focus:border-brand"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650" aria-label="Limpiar">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Platos ── */}
        <div className="space-y-3 mt-6">
          {showFeatured && (
            <PublicCategory
              title="Destacados"
              items={featuredItems}
              cart={cart}
              onAdd={addToCart}
              onUpdateQty={updateCartQty}
              collapsed={!!collapsed.destacados}
              onToggle={() => toggle('destacados')}
              highlight
              icon={<Star className="h-4 w-4 text-white fill-white" />}
              iconBg="bg-gradient-to-br from-amber-400 to-fuchsia-500"
            />
          )}

          {visibleGroups.map(({ category, items }) => (
            <PublicCategory
              key={category}
              title={category}
              items={items}
              cart={cart}
              onAdd={addToCart}
              onUpdateQty={updateCartQty}
              collapsed={!!collapsed[category]}
              onToggle={() => toggle(category)}
              icon={<Utensils className="h-4 w-4" />}
              iconBg={CATEGORY_ICON_BG[category] ?? 'bg-gray-100 text-gray-600'}
            />
          ))}

          {!showFeatured && visibleGroups.length === 0 && (
            <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center bg-white">
              <Utensils className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-450">No se encontraron platos que coincidan con la búsqueda.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 pb-4 text-center">
          <p className="text-[10px] text-gray-400 font-medium">Los precios incluyen IGV{business?.name ? ` • ${business.name}` : ''}</p>
          <p className="text-[10px] text-gray-300 font-bold mt-1">Carta digital actualizada en tiempo real</p>
        </div>
      </div>

      {/* ── Botón Flotante del Carrito ── */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCheckout(true)}
          className="fixed bottom-6 right-6 bg-brand hover:bg-brand-hover text-white px-5 py-4 rounded-full shadow-xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 z-45 font-bold cursor-pointer"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-brand font-mono leading-none">
              {cartCount}
            </span>
          </div>
          <span className="text-sm">Ver Pedido</span>
          <span className="pl-2 border-l border-white/20 text-sm font-mono font-bold">S/. {cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* ── Modal de Checkout / Confirmación de Pedido ── */}
      <Modal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        title="Completa tu Pedido"
        subtitle="Ingresa tus datos para procesar el pedido e iniciar la preparación"
        size="md"
        fullHeight={true}
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1 py-3" onClick={() => setShowCheckout(false)}>Atrás</Button>
            <Button className="flex-1 py-3" onClick={handleConfirmOrder}>Confirmar y Enviar</Button>
          </div>
        }
      >
        <div className="space-y-5 pb-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl animate-section">
              {formError}
            </div>
          )}

          {/* Resumen de Compra */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resumen del pedido</span>
            <div className="max-h-32 overflow-y-auto divide-y divide-slate-150 pr-1">
              {cart.map(i => (
                <div key={i.product.id} className="py-2 flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-semibold">{i.quantity}x {i.product.name}</span>
                  <span className="font-mono font-bold text-slate-800">S/. {(i.product.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center font-bold text-slate-800 text-sm">
              <span>Total</span>
              <span className="font-mono font-extrabold text-brand">S/. {cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Tipo de Pedido */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">¿Cómo deseas recibir tu pedido?</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setOrderType('mesa'); setFormError(''); }}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                  orderType === 'mesa'
                    ? 'border-brand bg-brand/5 text-brand font-bold'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Comer Aquí
              </button>
              <button
                type="button"
                onClick={() => { setOrderType('llevar'); setFormError(''); }}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                  orderType === 'llevar'
                    ? 'border-brand bg-brand/5 text-brand font-bold'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Llevar / Recoger
              </button>
              <button
                type="button"
                onClick={() => { setOrderType('delivery'); setFormError(''); }}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                  orderType === 'delivery'
                    ? 'border-brand bg-brand/5 text-brand font-bold'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Delivery
              </button>
            </div>
          </div>

          {/* Campos del cliente */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre completo *"
                placeholder="Ej. María Fe Mendoza"
                value={custName}
                onChange={e => setCustName(e.target.value)}
                required
              />
              <Input
                label="Teléfono / Celular *"
                placeholder="Ej. 987654321"
                value={custPhone}
                onChange={e => setCustPhone(e.target.value.replace(/\D/g, ''))}
                inputMode="tel"
                required
              />
            </div>

            <Input
              label="Correo electrónico (Opcional)"
              placeholder="Ej. maria@correo.com"
              value={custEmail}
              onChange={e => setCustEmail(e.target.value)}
              type="email"
            />

            {/* Si es Mesa */}
            {orderType === 'mesa' && (
              <Input
                label="Número de Mesa / Ubicación *"
                placeholder="Ej. 5"
                value={tableNum}
                onChange={e => setTableNum(e.target.value)}
                disabled={!!mesaLabel}
                required
              />
            )}

            {/* Si es Delivery */}
            {orderType === 'delivery' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650 block">Dirección de entrega *</label>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={auto => (autocompleteRef.current = auto)}
                    onPlaceChanged={handlePlaceChanged}
                    options={{ componentRestrictions: { country: 'pe' } }}
                  >
                    <input
                      value={custAddress}
                      onChange={e => setCustAddress(e.target.value)}
                      placeholder="Dirección, calle, número, distrito..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-white"
                      required
                    />
                  </Autocomplete>
                ) : (
                  <input
                    value={custAddress}
                    onChange={e => setCustAddress(e.target.value)}
                    placeholder="Dirección, calle, número, distrito..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand bg-white"
                    required
                  />
                )}
              </div>
            )}
          </div>

          {/* Comprobante */}
          <div className="space-y-3">
            <Select
              label="Tipo de Comprobante"
              value={docType}
              onChange={e => setDocType(e.target.value as any)}
            >
              <option value="Nota de venta">Nota de Venta (Venta interna)</option>
              <option value="Boleta">Boleta de Venta</option>
              <option value="Factura">Factura</option>
            </Select>

            {docType === 'Factura' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl animate-section">
                <Input
                  label="RUC (11 dígitos) *"
                  placeholder="20123456789"
                  value={ruc}
                  onChange={e => setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  inputMode="numeric"
                  required
                />
                <Input
                  label="Razón Social *"
                  placeholder="Ej. Inversiones SAC"
                  value={razonSocial}
                  onChange={e => setRazonSocial(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-3">
            <Select
              label="Método de Pago"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as any)}
            >
              <option value="Efectivo">{orderType === 'delivery' ? 'Pago Contra entrega (Efectivo)' : 'Pagar en Caja / Mostrador'}</option>
              <option value="Tarjeta">Pago con Tarjeta</option>
              <option value="Yape / Plin">Yape / Plin (Pago anticipado)</option>
            </Select>

            {paymentMethod === 'Yape / Plin' && (
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-150 rounded-xl space-y-3.5 animate-section">
                <div className="text-xs text-indigo-950 space-y-1">
                  <p className="font-bold">Instrucciones de pago anticipado:</p>
                  <p>1. Transfiere el total de <span className="font-bold text-brand">S/. {cartTotal.toFixed(2)}</span> a cualquiera de nuestras cuentas:</p>
                  <p className="pl-3 font-mono font-semibold text-slate-800">· Yape / Plin: <span className="text-indigo-650 font-extrabold text-sm">987 654 321</span> (RestoPro Perú)</p>
                  <p>2. Sube la captura de pantalla de la transferencia como comprobante aquí abajo.</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-indigo-700 block">Comprobante de pago *</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => document.getElementById('screenshot-upload')?.click()}
                      className="btn-secondary py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> Subir Captura
                    </button>
                    <input
                      id="screenshot-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                    {paymentScreenshot && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 animate-section">
                        <Check className="h-3 w-3 shrink-0" /> Captura lista
                      </span>
                    )}
                  </div>
                  {paymentScreenshot && (
                    <div className="mt-2 relative w-20 h-28 rounded-lg overflow-hidden border border-slate-200 animate-section">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={paymentScreenshot} alt="Captura de Pago" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPaymentScreenshot('')}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer animate-section"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Modal de Pedido Exitoso ── */}
      <Modal
        open={isOrderSuccess}
        onClose={() => setIsOrderSuccess(false)}
        title=""
        size="sm"
        fullHeight={false}
        footer={
          <Button className="w-full py-2.5 font-bold" onClick={() => setIsOrderSuccess(false)}>
            Entendido, gracias
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
          <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-650 flex items-center justify-center animate-section">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h4 className="text-base font-extrabold text-slate-800 animate-section">¡Pedido Enviado a la Cocina!</h4>
          <p className="text-xs text-slate-500 max-w-xs animate-section">
            Tu pedido <strong className="text-slate-800 font-mono font-bold">#{lastPlacedOrderId}</strong> ha sido recibido correctamente y se encuentra en preparación.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-505 mt-2 space-y-1 w-full max-w-xs animate-section">
            <p>Tipo de entrega: <strong className="text-slate-700 font-bold uppercase">{orderType === 'mesa' ? 'Mesa' : orderType === 'llevar' ? 'Llevar' : 'Delivery'}</strong></p>
            <p>Método de pago: <strong className="text-slate-700 font-bold">{paymentMethod}</strong></p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Sección de categoría interactiva ─── */
function PublicCategory({
  title, items, cart, onAdd, onUpdateQty, collapsed, onToggle, icon, iconBg, highlight,
}: {
  title: string;
  items: MenuEntry[];
  cart: OrderItem[];
  onAdd: (item: MenuEntry) => void;
  onUpdateQty: (productId: string, delta: number) => void;
  collapsed: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border overflow-hidden ${highlight ? 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-purple-50' : 'border-slate-200 bg-white'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer">
        <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</span>
        <span className="text-sm font-bold text-slate-800 truncate flex-1">{title}</span>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${highlight ? 'bg-amber-100 text-amber-700 animate-pulse-slow' : 'bg-slate-100 text-slate-600'}`}>
          {items.length} {highlight ? 'destacados' : 'platos'}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-section">
            {items.map(item => {
              const cartItem = cart.find(ci => ci.product.id === item.id);
              const qty = cartItem ? cartItem.quantity : 0;
              return (
                <PublicProductCard
                  key={item.id}
                  item={item}
                  quantity={qty}
                  onAdd={() => onAdd(item)}
                  onUpdateQty={(delta) => onUpdateQty(item.id, delta)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tarjeta de plato interactiva ─── */
function PublicProductCard({
  item, quantity = 0, onAdd, onUpdateQty,
}: {
  item: MenuEntry;
  quantity?: number;
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
}) {
  return (
    <div className="group rounded-xl border border-slate-100 bg-white overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300">
            <Utensils className="h-8 w-8" />
          </div>
        )}
        {item.featured && (
          <span className="absolute top-2 left-2 h-6 w-6 bg-amber-400 text-white rounded-full font-bold flex items-center justify-center shadow-sm">
            <Star className="h-3 w-3 fill-white" />
          </span>
        )}
        <span className="absolute top-2 right-2 text-[11px] bg-white text-slate-800 px-2 py-0.5 rounded-full font-mono font-bold shadow-sm animate-section">
          S/. {item.price.toFixed(2)}
        </span>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h5 className="text-sm font-bold text-slate-800 leading-tight line-clamp-1">{item.name}</h5>
          {item.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.description}</p>}
        </div>

        {/* Botón / Selector de cantidad */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
          {quantity === 0 ? (
            <button
              onClick={onAdd}
              className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar
            </button>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
              <button
                onClick={() => onUpdateQty(-1)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-650 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Disminuir cantidad"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-bold text-slate-800 font-mono">{quantity}</span>
              <button
                onClick={() => onUpdateQty(1)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-650 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
