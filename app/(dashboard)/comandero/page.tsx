'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, Autocomplete, Marker, useJsApiLoader } from '@react-google-maps/api';
import {
  Plus, Minus, ShoppingCart, Utensils, Send, Lock, ChefHat, BookOpen, Grid,
  ShoppingBag, Bike, Search, X, ClipboardList, Pencil, Trash2, Clock,
  Building2, ArrowLeft, MapPin,
  AlertCircle, Receipt, CalendarClock, Unlock, LayoutGrid, Link2, Unlink, Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useCarta, CARTA_CATEGORIES } from '@/context/CartaContext';
import { Modal, Input, Button } from '@/components/ui';
import { RestaurantTable, type UnitStatus } from '@/components/mesas/RestaurantTable';
import type { OrderItem, Product, MenuEntry, OrderType, Table, ActiveOrder } from '@/types';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const LIBRARIES: ('places')[] = ['places'];
const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 }; // Lima, Perú

/** Adapta un plato de la Carta al formato de producto que usa la comanda. */
function entryToProduct(e: MenuEntry): Product {
  return {
    id: e.id,
    name: e.name,
    price: e.price,
    category: e.category,
    image: e.image ?? '',
    status: e.available ? 'available' : 'out_of_stock',
    stock: e.available ? 999 : 0,
    sku: e.id.toUpperCase(),
    unit: 'Porción',
  };
}

/** Unidad del plano: mesa suelta o grupo de mesas unidas (mismo criterio que /mesas). */
interface Unit {
  key: string;
  groupId?: string;
  members: Table[];
  status: UnitStatus;
  capacidad: number;
  cuenta: number;
  label: string;
  primaryName: string;
  waiter?: string;
}
function buildUnits(pisoTables: Table[]): Unit[] {
  const units: Unit[] = [];
  const handled = new Set<string>();
  pisoTables.forEach(t => {
    if (t.groupId) {
      if (handled.has(t.groupId)) return;
      handled.add(t.groupId);
      const members = pisoTables.filter(m => m.groupId === t.groupId).sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
      const status: UnitStatus = members.some(m => m.status === 'ocupada') ? 'ocupada'
        : members.some(m => m.status === 'reservada') ? 'reservada' : 'disponible';
      units.push({
        key: t.groupId, groupId: t.groupId, members, status,
        capacidad: members.reduce((s, m) => s + m.capacidad, 0),
        cuenta: members.reduce((s, m) => s + m.cuenta, 0),
        label: members.map(m => m.name).join('+'),
        primaryName: members[0].name,
        waiter: members.find(m => m.waiter)?.waiter,
      });
    } else {
      units.push({ key: t.id, members: [t], status: t.status, capacidad: t.capacidad, cuenta: t.cuenta, label: t.name, primaryName: t.name, waiter: t.waiter });
    }
  });
  return units;
}

/** Qué pedido ya en curso se muestra en el panel de detalle. */
type DetailView = { kind: 'mesa'; tableName: string } | { kind: 'order'; orderId: string } | null;

const googleMapsUrl = (address: string) => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

export default function ComanderoPage() {
  const {
    pisos, tables, customers, searchQuery, triggerToast, isCajaOpen, setTables,
    sendOrderToKitchen, updateTableItemQty, removeTableItem,
    activeOrders, createOrder, addItemsToActiveOrder, updateActiveOrderItemQty, removeActiveOrderItem, cancelActiveOrder,
  } = useApp();
  const { carta } = useCarta();
  const { currentUser } = useAuth();
  const router = useRouter();
  const canTakeOrder = currentUser?.role === 'admin' || currentUser?.role === 'mozo';

  // Cargador de Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'restopro-google-maps',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  // Estados de navegación e interfaz
  const [activeTab, setActiveTab] = useState<'todas' | 'mesa' | 'llevar' | 'delivery'>('todas');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('mesa');
  /** Panel de detalle (a la derecha) de un pedido ya en curso: mesa ocupada o pedido llevar/delivery. */
  const [detailView, setDetailView] = useState<DetailView>(null);
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(CARTA_CATEGORIES[0]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('María Fe Mendoza');
  const [custName, setCustName]       = useState('');
  const [custPhone, setCustPhone]     = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Estados para Google Maps
  const [posicion, setPosicion] = useState<{ lat: number; lng: number } | null>(null);
  const [lastGeocoded, setLastGeocoded] = useState('');

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const getGeocoder = useCallback(() => {
    if (!geocoderRef.current && window.google) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    return geocoderRef.current;
  }, []);

  const geocodeAddress = useCallback((addressStr: string) => {
    const geocoder = getGeocoder();
    if (!geocoder || !addressStr.trim()) return;
    geocoder.geocode({ address: addressStr }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        setPosicion({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      }
    });
  }, [getGeocoder]);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const geocoder = getGeocoder();
    if (!geocoder) return;
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const address = results[0].formatted_address;
        setCustAddress(address);
        setLastGeocoded(address);
      }
    });
  }, [getGeocoder]);

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const addressStr = place.formatted_address ?? place.name ?? '';
    setPosicion({ lat, lng });
    setCustAddress(addressStr);
    setLastGeocoded(addressStr);
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !!editingOrderId) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosicion({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !!editingOrderId) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosicion({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const handleGeocodeManual = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!custAddress.trim()) {
      triggerToast('Ingresa una dirección primero', 'warning');
      return;
    }
    geocodeAddress(custAddress);
    setLastGeocoded(custAddress);
  };

  /* Preseleccionar mesa desde ?mesa= (llegada desde el plano de Mesas) */
  useEffect(() => {
    const mesa = new URLSearchParams(window.location.search).get('mesa');
    if (mesa) {
      setSelectedTable(mesa);
      setOrderType('mesa');
      setActiveTab('mesa');
      setIsCreatingNew(false);
    }
  }, []);

  // Geolocalizar dirección al cargar un pedido de delivery existente
  useEffect(() => {
    if (orderType === 'delivery' && custAddress && isLoaded && custAddress !== lastGeocoded) {
      if (editingOrderId) {
        geocodeAddress(custAddress);
        setLastGeocoded(custAddress);
      }
    }
  }, [custAddress, orderType, isLoaded, editingOrderId, geocodeAddress, lastGeocoded]);

  const menuProducts = carta.items.filter(i => i.available).map(entryToProduct);
  const CATEGORIES = [...CARTA_CATEGORIES].filter(cat => menuProducts.some(p => p.category === cat));

  const table = tables.find(t => t.name === selectedTable);
  const editingOrder = editingOrderId ? activeOrders.find(o => o.id === editingOrderId) ?? null : null;

  const existingItems =
    orderType === 'mesa' ? (table?.items ?? [])
    : editingOrder ? editingOrder.items
    : [];
  const existingTotal = existingItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

  const busyTables = tables.filter(t => t.status === 'ocupada' && (t.items?.length ?? 0) > 0);
  const inProgressCount = busyTables.length + activeOrders.length;

  const changeTab = (tab: 'todas' | 'mesa' | 'llevar' | 'delivery') => {
    setActiveTab(tab);
    setDetailView(null);
    setIsCreatingNew(false);
    setEditingOrderId(null);
    setCart([]);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setSelectedTable('');
    setPosicion(null);
    setLastGeocoded('');
    if (tab !== 'todas') {
      setOrderType(tab);
    }
  };

  /** Abre la pantalla dividida para tomar o editar la comanda de una mesa. */
  const editTableOrder = (tableName: string) => {
    setDetailView(null);
    setSelectedTable(tableName);
    setOrderType('mesa');
    setEditingOrderId(null);
    setCart([]);
    setActiveTab('mesa');
    setIsCreatingNew(false);
  };

  /** Abre la pantalla dividida para editar un pedido de llevar/delivery ya creado. */
  const editActiveOrder = (orderId: string) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;
    setDetailView(null);
    setOrderType(order.type);
    setEditingOrderId(order.id);
    setCustName(order.customer);
    setCustPhone(order.phone ?? '');
    setCustAddress(order.address ?? '');
    setCart([]);
    setActiveTab(order.type);
    setIsCreatingNew(false);
    setLastGeocoded(''); // Forzar geocodificación
  };

  /** Clic en una mesa: si ya tiene un pedido en curso, muestra el detalle; si está libre, abre directo la toma de pedido. */
  const handleTableCardClick = (tableName: string) => {
    const t = tables.find(tb => tb.name === tableName);
    if (t && t.status === 'ocupada') {
      setDetailView({ kind: 'mesa', tableName });
    } else {
      editTableOrder(tableName);
    }
  };

  /** Clic en un pedido de llevar/delivery ya creado: siempre muestra el detalle primero. */
  const handleOrderCardClick = (orderId: string) => {
    setDetailView({ kind: 'order', orderId });
  };

  const cancelTableOrder = (tableName: string) => {
    setTables(prev => prev.map(t =>
      t.name === tableName ? { ...t, status: 'disponible', items: [], cuenta: 0, waiter: undefined } : t
    ));
    triggerToast(`Pedido de ${tableName} cancelado. Mesa liberada.`, 'info');
    setDetailView(null);
  };

  const cancelOrderDetail = (orderId: string) => {
    cancelActiveOrder(orderId);
    setDetailView(null);
  };

  const startNewOrder = () => {
    setEditingOrderId(null);
    setCart([]);
    setCustName(''); setCustPhone(''); setCustAddress('');
    setPosicion(null);
    setLastGeocoded('');
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
         .filter(i => i.quantity > 0)
    );
  };

  const handleExistingQty = (productId: string, delta: number) => {
    if (orderType === 'mesa') updateTableItemQty(selectedTable, productId, delta);
    else if (editingOrderId) updateActiveOrderItemQty(editingOrderId, productId, delta);
  };
  const handleRemoveExisting = (productId: string) => {
    if (orderType === 'mesa') removeTableItem(selectedTable, productId);
    else if (editingOrderId) removeActiveOrderItem(editingOrderId, productId);
  };

  const onSend = () => {
    if (!isCajaOpen) { triggerToast('La caja está cerrada. No se pueden tomar pedidos.', 'error'); return; }
    if (cart.length === 0) { triggerToast('Agrega platos antes de enviar.', 'warning'); return; }
    if (orderType === 'delivery' && !custAddress.trim()) { triggerToast('Ingresa la dirección de entrega.', 'warning'); return; }

    if (orderType === 'mesa') {
      sendOrderToKitchen(selectedTable, cart, currentUser?.name);
    } else if (editingOrderId) {
      addItemsToActiveOrder(editingOrderId, cart, currentUser?.name);
    } else {
      createOrder(orderType, { customer: custName, phone: custPhone, address: custAddress }, cart, currentUser?.name);
    }
    setCart([]);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setIsCreatingNew(false);
    setEditingOrderId(null);
    setPosicion(null);
    setLastGeocoded('');
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const activeCategory = CATEGORIES.includes(selectedCategory) ? selectedCategory : (CATEGORIES[0] ?? '');

  const rawQuery = (search || searchQuery).trim();
  const query = rawQuery.toLowerCase();
  const isSearching = query.length > 0;
  const filteredProducts = menuProducts.filter(p => {
    if (isSearching) return p.name.toLowerCase().includes(query);
    return p.category === activeCategory;
  });

  const isEditingOrCreate =
    (activeTab === 'mesa' && !!selectedTable) ||
    (activeTab === 'llevar' && (isCreatingNew || !!editingOrderId)) ||
    (activeTab === 'delivery' && (isCreatingNew || !!editingOrderId));

  const TABS: { id: 'todas' | 'mesa' | 'llevar' | 'delivery'; label: string; icon: React.ReactNode }[] = [
    { id: 'todas',    label: 'Todas',      icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { id: 'mesa',     label: 'En mesa',    icon: <Grid className="h-3.5 w-3.5" /> },
    { id: 'llevar',   label: 'Para llevar', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
    { id: 'delivery', label: 'Delivery',    icon: <Bike className="h-3.5 w-3.5" /> },
  ];

  /* VISTA DIVIDIDA (SPLIT-SCREEN) PARA CREACIÓN / EDICIÓN */
  if (isEditingOrCreate) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 animate-section pb-20 lg:h-[calc(100vh-8.5rem)] overflow-y-auto lg:overflow-hidden">
        {/* Columna Izquierda: Catálogo y Buscador */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-full overflow-y-auto">
          {/* Header Superior del Pedido: Volver e Info */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4 shrink-0">
            <button
              onClick={() => {
                if (activeTab === 'mesa') {
                  setSelectedTable('');
                } else {
                  setIsCreatingNew(false);
                  setEditingOrderId(null);
                }
                setCart([]);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </button>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800">
                {editingOrderId
                  ? `Editando pedido · ${orderType === 'llevar' ? 'Para llevar' : 'Delivery'} · ${editingOrderId}`
                  : `Nuevo pedido · ${orderType === 'mesa' ? 'Mesa' : orderType === 'llevar' ? 'Para llevar' : 'Delivery'} · ${orderType === 'mesa' ? selectedTable : 'General'}`}
              </h4>
              <p className="text-[10px] text-slate-400">
                Selecciona los platos del catálogo para agregarlos a la comanda.
              </p>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative mb-4 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="input w-full pl-9 pr-9 py-2 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Categorías */}
          {!isSearching && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 shrink-0">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                    activeCategory === cat ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {isSearching && (
            <p className="text-[11px] text-slate-500 mb-4 shrink-0">
              {filteredProducts.length === 0
                ? <>Sin resultados para <strong>“{rawQuery}”</strong>.</>
                : <>{filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''} para <strong>“{rawQuery}”</strong> en toda la carta.</>}
            </p>
          )}

          {/* Grid de platos */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {menuProducts.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs text-slate-500">No hay platos disponibles en la Carta del Día.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className="card-lg hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden transition-all duration-200 flex flex-col group border border-slate-100/60"
                  >
                    <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300"><Utensils className="h-7 w-7" /></div>
                      )}
                    </div>
                    <div className="p-3 flex-grow flex flex-col justify-between">
                      <h5 className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{product.name}</h5>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-mono font-bold text-slate-700">S/. {product.price.toFixed(2)}</span>
                        <div className="bg-emerald-50 p-1.5 rounded-lg text-brand shrink-0"><Plus className="h-3 w-3 stroke-[3]" /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Pedido y Cliente */}
        <div className="w-full lg:w-96 shrink-0 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-full flex flex-col justify-between overflow-y-auto">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Título Pedido */}
            <div className="border-b border-slate-100 pb-3 mb-4 shrink-0 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-brand" /> Pedido
              </span>
              <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-lg font-bold text-[10px]">
                {orderType === 'mesa' ? 'Mesa' : orderType === 'llevar' ? 'Llevar' : 'Delivery'}
              </span>
            </div>

            {/* Datos del Cliente */}
            <div className="mb-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 shrink-0 space-y-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                {orderType === 'mesa' ? 'Comensal' : 'Datos del Cliente (Opcional)'}
              </span>

              {orderType === 'mesa' && (
                <div>
                  <select
                    value={selectedCustomer}
                    onChange={e => setSelectedCustomer(e.target.value)}
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200"
                  >
                    {customers.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                </div>
              )}

              {orderType === 'llevar' && (
                <div className="space-y-2">
                  <input
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    disabled={!!editingOrderId}
                    placeholder="Nombre del cliente"
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <input
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    disabled={!!editingOrderId}
                    placeholder="Teléfono"
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="space-y-2">
                  <input
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    disabled={!!editingOrderId}
                    placeholder="Nombre del cliente"
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <input
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    disabled={!!editingOrderId}
                    placeholder="Teléfono"
                    className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  
                  {/* Google Places Autocomplete */}
                  <div className="space-y-1">
                    {isLoaded ? (
                      <Autocomplete
                        onLoad={ac => { autocompleteRef.current = ac; }}
                        onPlaceChanged={handlePlaceChanged}
                        options={{ componentRestrictions: { country: 'pe' } }}
                      >
                        <input
                          type="text"
                          value={custAddress}
                          onChange={e => setCustAddress(e.target.value)}
                          disabled={!!editingOrderId}
                          placeholder="Dirección de entrega *"
                          className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      </Autocomplete>
                    ) : (
                      <input
                        type="text"
                        value={custAddress}
                        onChange={e => setCustAddress(e.target.value)}
                        disabled={!!editingOrderId}
                        placeholder="Dirección de entrega *"
                        className="input w-full px-3 py-1.5 text-xs bg-white border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* Manual Geocode Map Action button */}
                  {!editingOrderId && (
                    <button
                      onClick={handleGeocodeManual}
                      className="w-full py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] rounded-lg transition-colors font-bold flex items-center justify-center gap-1"
                    >
                      <MapPin className="h-3 w-3" /> Ubicar dirección en el mapa
                    </button>
                  )}

                  {/* Google Maps Container */}
                  {GOOGLE_MAPS_API_KEY && (
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mt-2 shrink-0 animate-section">
                      {!isLoaded ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                          Cargando mapa...
                        </div>
                      ) : loadError ? (
                        <div className="w-full h-full flex items-center justify-center text-rose-500 text-[10px] p-2 text-center">
                          Error al cargar Google Maps
                        </div>
                      ) : (
                        <GoogleMap
                          mapContainerClassName="w-full h-full"
                          center={posicion ?? DEFAULT_CENTER}
                          zoom={posicion ? 16 : 12}
                          onClick={handleMapClick}
                          options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false,
                            zoomControl: true,
                          }}
                        >
                          {posicion && (
                            <Marker
                              position={posicion}
                              draggable={!editingOrderId}
                              onDragEnd={handleMarkerDragEnd}
                            />
                          )}
                        </GoogleMap>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Listado de Platos */}
            <div className="flex-grow overflow-y-auto space-y-3 pr-1">
              {/* Platos Ya Enviados */}
              {existingItems.length > 0 && (
                <div className="space-y-1.5 animate-section">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                    Ya en servicio
                  </span>
                  {existingItems.map(item => (
                    <div key={item.product.id} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{item.product.name}</p>
                        <span className="text-[10px] font-mono text-slate-400">S/. {(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => handleExistingQty(item.product.id, -1)} className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"><Minus className="h-3 w-3" /></button>
                        <span className="text-[11px] font-bold font-mono text-slate-700 w-4 text-center">{item.quantity}</span>
                        <button onClick={() => handleExistingQty(item.product.id, 1)} className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"><Plus className="h-3 w-3" /></button>
                        <button onClick={() => handleRemoveExisting(item.product.id)} className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50" title="Quitar"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-dashed border-slate-200 my-2" />
                </div>
              )}

              {/* Platos Por Enviar */}
              {cart.length > 0 && (
                <div className="space-y-1.5 animate-section">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                    Por enviar ahora
                  </span>
                  {cart.map(item => (
                    <div key={item.product.id} className="bg-brand/5 border border-brand/10 rounded-xl px-3 py-2 flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-800 truncate">{item.product.name}</p>
                        <span className="text-[10px] font-mono text-brand font-bold">S/. {(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => handleUpdateQty(item.product.id, -1)} className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"><Minus className="h-3 w-3" /></button>
                        <span className="text-[11px] font-bold font-mono text-slate-800 w-4 text-center">{item.quantity}</span>
                        <button onClick={() => handleUpdateQty(item.product.id, 1)} className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {existingItems.length === 0 && cart.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <Utensils className="h-8 w-8 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-400">Agrega productos desde el catálogo</p>
                </div>
              )}
            </div>
          </div>

          {/* Totales y Botones */}
          <div className="border-t border-slate-100 pt-4 mt-4 shrink-0 space-y-3">
            <div className="space-y-1 text-xs text-slate-500">
              {orderType === 'mesa' ? (
                <>
                  <div className="flex justify-between font-mono"><span>Comanda nueva</span><span>S/. {cartTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between font-mono"><span>Ya en la mesa</span><span>S/. {existingTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between font-mono font-extrabold text-sm text-slate-800 border-t border-dashed border-slate-200 pt-2"><span>Total</span><span>S/. {(cartTotal + existingTotal).toFixed(2)}</span></div>
                </>
              ) : (
                <>
                  {editingOrderId && <div className="flex justify-between font-mono"><span>Ya en el pedido</span><span>S/. {existingTotal.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-mono font-extrabold text-sm text-slate-800"><span>{editingOrderId ? 'Nuevo en este envío' : 'Total'}</span><span>S/. {cartTotal.toFixed(2)}</span></div>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <button
                onClick={onSend}
                disabled={!isCajaOpen || cart.length === 0}
                className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" /> Enviar a Cocina
              </button>
              {cart.length > 0 && (
                <button
                  onClick={() => { setCart([]); triggerToast('Ítems nuevos descartados.', 'info'); }}
                  className="w-full text-xs font-bold text-rose-500 hover:bg-rose-50 py-1.5 rounded-lg transition-colors border border-dashed border-rose-200"
                >
                  Vaciar ítems nuevos
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* RENDERIZADO POR DEFECTO PARA LISTAS Y PLANO DE MESAS */
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Columna principal: listas y plano (se comprime cuando se abre el detalle) */}
      <div className={`flex-1 min-w-0 space-y-6 animate-section ${detailView ? 'pb-24 lg:pb-2 lg:h-[calc(100vh-8.5rem)] lg:overflow-y-auto lg:pr-1' : 'pb-24'}`}>
      {/* Header comandero */}
      <div className="card-lg p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-brand" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Comandero — Toma de Pedidos</h3>
              <p className="text-[11px] text-slate-500">
                Mozo: {currentUser?.name ?? '—'}. Elige el tipo de pedido y arma la comanda.
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1 rounded-xl max-w-lg">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={`py-2 text-[10px] sm:text-xs font-semibold rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                activeTab === t.id ? 'bg-white text-brand shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aviso caja cerrada */}
      {!isCajaOpen && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-700 animate-section">
          <Lock className="h-4 w-4 shrink-0" />
          La caja está cerrada. No podrás enviar comandas hasta que el cajero/administrador apertura la caja.
        </div>
      )}

      {/* ── TAB TODAS ── */}
      {activeTab === 'todas' && (
        <div className="space-y-6 animate-section">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-100 p-3 rounded-2xl text-center shadow-sm">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mesas Ocupadas</span>
              <p className="text-lg sm:text-xl font-bold text-slate-800">{busyTables.length}</p>
            </div>
            <div className="bg-white border border-slate-100 p-3 rounded-2xl text-center shadow-sm">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Para Llevar</span>
              <p className="text-lg sm:text-xl font-bold text-slate-800">{activeOrders.filter(o => o.type === 'llevar').length}</p>
            </div>
            <div className="bg-white border border-slate-100 p-3 rounded-2xl text-center shadow-sm">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Delivery</span>
              <p className="text-lg sm:text-xl font-bold text-slate-800">{activeOrders.filter(o => o.type === 'delivery').length}</p>
            </div>
          </div>

          {/* Listado principal */}
          {inProgressCount === 0 ? (
            <div className="card-lg p-12 text-center space-y-3 animate-section">
              <ClipboardList className="h-10 w-10 mx-auto text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700">Sin comandas activas</h4>
              <p className="text-xs text-slate-400">Todo el servicio está al día. Puedes abrir una mesa o crear un pedido nuevo.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sección mesas */}
              {busyTables.length > 0 && (
                <div className="space-y-3 animate-section">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Grid className="h-4 w-4 text-brand" /> Mesas Activas ({busyTables.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {busyTables.map(t => (
                      <div
                        key={t.id}
                        onClick={() => handleTableCardClick(t.name)}
                        className="card-lg p-4 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-rose-500 hover:-translate-y-0.5"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-sm font-bold text-slate-800">Mesa {t.name}</h5>
                            <p className="text-[11px] text-slate-400">Atendido por: {t.waiter || '—'}</p>
                          </div>
                          <span className="text-sm font-mono font-bold text-slate-800">S/. {t.cuenta.toFixed(2)}</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{t.items?.length ?? 0} platos pedidos</span>
                          <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase text-[9px]">Ocupada</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección llevar / delivery */}
              {activeOrders.length > 0 && (
                <div className="space-y-3 animate-section">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-brand" /> Para Llevar y Delivery ({activeOrders.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeOrders.map(o => (
                      <div
                        key={o.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('.google-maps-link')) return;
                          handleOrderCardClick(o.id);
                        }}
                        className={`card-lg p-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 border-l-4 ${
                          o.type === 'llevar' ? 'border-l-amber-500' : 'border-l-indigo-500'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h5 className="text-sm font-bold text-slate-800 truncate">{o.customer}</h5>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {o.createdAt} {o.waiter ? `· ${o.waiter}` : ''}
                            </p>
                          </div>
                          <span className="text-sm font-mono font-bold text-slate-800 shrink-0 font-bold font-mono">S/. {o.total.toFixed(2)}</span>
                        </div>

                        {o.phone && (
                          <p className="text-[11px] text-slate-600 mt-2">
                            <span className="font-semibold text-slate-400">Tel:</span> {o.phone}
                          </p>
                        )}

                        {o.type === 'delivery' && o.address && (
                          <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col gap-1">
                            <div><span className="font-semibold text-slate-400">Dirección:</span> {o.address}</div>
                            <a
                              href={googleMapsUrl(o.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="google-maps-link inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline self-start mt-0.5"
                            >
                              <MapPin className="h-3 w-3" /> Ver en Google Maps
                            </a>
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{o.itemsCount} platos pedidos</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            o.type === 'llevar' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {o.type === 'llevar' ? 'Llevar' : 'Delivery'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB MESA ── */}
      {activeTab === 'mesa' && (
        <div className="space-y-6 animate-section">
          <MesasPanel onTakeOrder={handleTableCardClick} />
        </div>
      )}

      {/* ── TAB PARA LLEVAR ── */}
      {activeTab === 'llevar' && (
        <div className="space-y-6 animate-section">
          <div className="flex justify-between items-center gap-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pedidos Para Llevar Activos ({activeOrders.filter(o => o.type === 'llevar').length})
            </h4>
            <button
              onClick={() => {
                setDetailView(null);
                setIsCreatingNew(true);
                setOrderType('llevar');
                setEditingOrderId(null);
                setCart([]);
                setCustName('');
                setCustPhone('');
              }}
              className="btn bg-brand text-white hover:bg-brand-hover py-2.5 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-brand/10 transition-all hover:scale-[1.01] shrink-0"
            >
              <Plus className="h-4 w-4" /> Nuevo Pedido Para Llevar
            </button>
          </div>

          {activeOrders.filter(o => o.type === 'llevar').length === 0 ? (
            <div className="card-lg p-12 text-center space-y-3 animate-section">
              <ShoppingBag className="h-10 w-10 mx-auto text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700">Sin pedidos para llevar</h4>
              <p className="text-xs text-slate-400">Haz clic en el botón de arriba para iniciar un pedido nuevo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-section">
              {activeOrders.filter(o => o.type === 'llevar').map(o => (
                <div
                  key={o.id}
                  onClick={() => handleOrderCardClick(o.id)}
                  className="card-lg p-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 border-l-4 border-l-amber-500"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-bold text-slate-800 truncate">{o.customer}</h5>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {o.createdAt} {o.waiter ? `· ${o.waiter}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-800 shrink-0 font-bold font-mono">S/. {o.total.toFixed(2)}</span>
                  </div>
                  {o.phone && (
                    <p className="text-[11px] text-slate-600 mt-2">
                      <span className="font-semibold text-slate-400">Tel:</span> {o.phone}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{o.itemsCount} platos pedidos</span>
                    <span className="text-brand font-bold text-xs">Ver / Editar</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB DELIVERY ── */}
      {activeTab === 'delivery' && (
        <div className="space-y-6 animate-section">
          <div className="flex justify-between items-center gap-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pedidos Delivery Activos ({activeOrders.filter(o => o.type === 'delivery').length})
            </h4>
            <button
              onClick={() => {
                setDetailView(null);
                setIsCreatingNew(true);
                setOrderType('delivery');
                setEditingOrderId(null);
                setCart([]);
                setCustName('');
                setCustPhone('');
                setCustAddress('');
              }}
              className="btn bg-brand text-white hover:bg-brand-hover py-2.5 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-brand/10 transition-all hover:scale-[1.01] shrink-0"
            >
              <Plus className="h-4 w-4" /> Nuevo Pedido Delivery
            </button>
          </div>

          {activeOrders.filter(o => o.type === 'delivery').length === 0 ? (
            <div className="card-lg p-12 text-center space-y-3 animate-section">
              <Bike className="h-10 w-10 mx-auto text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700">Sin pedidos delivery</h4>
              <p className="text-xs text-slate-400">Haz clic en el botón de arriba para iniciar un pedido nuevo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-section">
              {activeOrders.filter(o => o.type === 'delivery').map(o => (
                <div
                  key={o.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('.google-maps-link')) return;
                    handleOrderCardClick(o.id);
                  }}
                  className="card-lg p-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 border-l-4 border-l-indigo-500"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-bold text-slate-800 truncate">{o.customer}</h5>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {o.createdAt} {o.waiter ? `· ${o.waiter}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-800 shrink-0 font-bold font-mono">S/. {o.total.toFixed(2)}</span>
                  </div>
                  {o.phone && (
                    <p className="text-[11px] text-slate-600 mt-2">
                      <span className="font-semibold text-slate-400">Tel:</span> {o.phone}
                    </p>
                  )}
                  {o.address && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col gap-1">
                      <div><span className="font-semibold text-slate-400">Dirección:</span> {o.address}</div>
                      <a
                        href={googleMapsUrl(o.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="google-maps-link inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline self-start mt-0.5"
                      >
                        <MapPin className="h-3 w-3" /> Ver en Google Maps
                      </a>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{o.itemsCount} platos pedidos</span>
                    <span className="text-brand font-bold text-xs">Ver / Editar</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </div>

      {/* Panel de detalle de un pedido ya en curso (mesa ocupada o llevar/delivery) */}
      {detailView && (
        <OrderDetailDrawer
          view={detailView}
          onClose={() => setDetailView(null)}
          canEdit={canTakeOrder}
          onEditTable={editTableOrder}
          onEditOrder={editActiveOrder}
          onCancelTable={cancelTableOrder}
          onCancelOrder={cancelOrderDetail}
        />
      )}
    </div>
  );
}

/* ─── Panel de mesas: misma gestión que /mesas, pero toma el pedido en línea ─── */
function MesasPanel({ onTakeOrder }: { onTakeOrder: (name: string) => void }) {
  const {
    pisos, tables, addPiso, removePiso, addTable, removeTable,
    mergeTables, unmergeTable, setTables, triggerToast,
  } = useApp();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [showPisoModal, setShowPisoModal] = useState(false);
  const [pisoName, setPisoName] = useState('');
  const [tableModalPiso, setTableModalPiso] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableCapacidad, setTableCapacidad] = useState('4');

  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const canTakeOrder = currentUser?.role === 'admin' || currentUser?.role === 'mozo';
  const canCharge    = currentUser?.role === 'admin' || currentUser?.role === 'cajero';
  const canManage    = currentUser?.role === 'admin';

  /* ── Modales alta ── */
  const closePisoModal = () => { setShowPisoModal(false); setPisoName(''); };
  const submitPiso = () => { addPiso(pisoName); closePisoModal(); };

  const closeTableModal = () => { setTableModalPiso(null); setTableName(''); setTableCapacidad('4'); };
  const submitTable = () => {
    if (!tableModalPiso) return;
    const capacidad = parseInt(tableCapacidad, 10);
    if (!capacidad || capacidad <= 0) { triggerToast('Ingrese una capacidad válida.', 'warning'); return; }
    addTable(tableModalPiso, tableName, capacidad);
    closeTableModal();
  };

  /* ── Unir mesas ── */
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const doMerge = () => { mergeTables(selectedIds); setSelectedIds([]); };
  const exitMerge = () => { setMergeMode(false); setSelectedIds([]); };

  /* ── Reservar / liberar una unidad completa ── */
  const setUnitStatus = (unit: Unit, status: 'disponible' | 'reservada') => {
    const ids = unit.members.map(m => m.id);
    setTables(prev => prev.map(t =>
      ids.includes(t.id)
        ? { ...t, status, ...(status === 'disponible' ? { items: [], cuenta: 0, waiter: undefined } : {}) }
        : t
    ));
    triggerToast(status === 'reservada' ? `${unit.label} reservada.` : `${unit.label} liberada.`, 'info');
  };

  const statusBadge: Record<UnitStatus, string> = {
    disponible: 'bg-emerald-100 text-emerald-800',
    ocupada:    'bg-rose-100 text-rose-700',
    reservada:  'bg-amber-100 text-amber-800',
  };
  const statusBorder: Record<UnitStatus, string> = {
    disponible: 'border-emerald-500 bg-emerald-50/60',
    ocupada:    'border-rose-500 bg-rose-50/60',
    reservada:  'border-amber-500 bg-amber-50/60',
  };

  return (
    <div className="space-y-6 animate-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Distribución del Salón de Comensales</h3>
          <p className="text-xs text-slate-500">
            {pisos.length === 0
              ? 'Aún no has configurado tus salones y mesas. Agrega uno para empezar.'
              : mergeMode
                ? 'Selecciona dos o más mesas libres y únelas para atender un grupo grande.'
                : canTakeOrder
                  ? 'Elige una mesa libre para tomar el pedido; el consumo se acumula hasta el cobro.'
                  : 'Selecciona una mesa ocupada para cobrar el consumo del comensal.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pisos.length > 0 && !mergeMode && (
            <div className="hidden sm:flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Disponible</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Ocupada</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Reservada</span>
            </div>
          )}
          {canManage && pisos.length > 0 && (
            mergeMode ? (
              <Button size="sm" variant="secondary" icon={<Check className="h-3.5 w-3.5" />} onClick={exitMerge}>
                Listo
              </Button>
            ) : (
              <Button size="sm" variant="secondary" icon={<Link2 className="h-3.5 w-3.5" />} onClick={() => setMergeMode(true)}>
                Unir mesas
              </Button>
            )
          )}
          {canManage && (
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowPisoModal(true)}>
              Nuevo Salón
            </Button>
          )}
        </div>
      </div>

      {/* Barra de confirmación de unión */}
      {mergeMode && selectedIds.length > 0 && (
        <div className="sticky top-2 z-20 flex items-center justify-between gap-3 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-lg animate-section">
          <span className="text-xs font-bold flex items-center gap-2">
            <Link2 className="h-4 w-4" /> {selectedIds.length} mesa{selectedIds.length > 1 ? 's' : ''} seleccionada{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds([])}
              className="text-[11px] font-medium px-2 py-1 rounded-lg hover:bg-white/15 transition-colors flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
            <button onClick={doMerge} disabled={selectedIds.length < 2}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5" /> Unir mesas
            </button>
          </div>
        </div>
      )}

      {pisos.length === 0 ? (
        <div className="card-lg flex flex-col items-center justify-center text-center py-20 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
            <LayoutGrid className="h-7 w-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Gestiona tus salones y mesas</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Agrega un salón (por ejemplo &quot;Salón Principal&quot;, &quot;Piso 1&quot; o &quot;Terraza&quot;) y luego
            agrega las mesas dentro, identificándolas por número o letra. Puedes tener uno solo o varios.
          </p>
          {canManage ? (
            <Button className="mt-2" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowPisoModal(true)}>
              Agregar salón
            </Button>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">Pide a un administrador que configure los salones y mesas.</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {pisos.map(piso => {
            const pisoTables = tables.filter(t => t.pisoId === piso.id);
            const units = buildUnits(pisoTables);
            return (
              <div key={piso.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand" />
                    <h4 className="text-sm font-bold text-slate-800">{piso.name}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {pisoTables.length} {pisoTables.length === 1 ? 'mesa' : 'mesas'}
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTableModalPiso(piso.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-brand hover:underline">
                        <Plus className="h-3.5 w-3.5" /> Agregar mesa
                      </button>
                      {pisoTables.length === 0 && (
                        <button onClick={() => removePiso(piso.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          aria-label={`Eliminar ${piso.name}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {pisoTables.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">Este salón todavía no tiene mesas.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {units.map(unit => {
                      const isOcupada = unit.status === 'ocupada';
                      const isReservada = unit.status === 'reservada';
                      const isDisponible = unit.status === 'disponible';
                      const selectable = mergeMode && !unit.groupId && isDisponible;
                      const isSelected = unit.members.some(m => selectedIds.includes(m.id));
                      const merged = unit.members.length > 1;
                      const cardTakesOrder = !mergeMode && canTakeOrder;

                      return (
                        <div
                          key={unit.key}
                          onClick={
                            selectable ? () => toggleSelect(unit.members[0].id)
                            : cardTakesOrder ? () => onTakeOrder(unit.primaryName)
                            : undefined
                          }
                          className={`card-lg p-2.5 transition-all duration-200 relative border-2 flex flex-col ${statusBorder[unit.status]} ${
                            merged ? 'col-span-2' : ''
                          } ${
                            mergeMode
                              ? selectable
                                ? `cursor-pointer ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:ring-2 hover:ring-indigo-200'}`
                                : 'opacity-50'
                              : cardTakesOrder
                                ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-brand/30'
                                : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[9px] font-bold text-slate-400 font-mono uppercase truncate">
                              {merged ? 'Unida' : `Mesa ${unit.label}`}
                            </span>
                            <span className={`shrink-0 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusBadge[unit.status]}`}>
                              {unit.status}
                            </span>
                          </div>

                          {/* Forma de mesa */}
                          <div className="my-1">
                            <RestaurantTable
                              members={unit.members}
                              status={unit.status}
                              capacidad={unit.capacidad}
                              label={unit.label}
                              selected={isSelected}
                            />
                          </div>

                          <div className="text-center leading-tight">
                            <p className="text-[10px] text-slate-500">{unit.capacidad} pers.</p>
                            {isOcupada && unit.waiter && (
                              <p className="text-[9px] text-brand font-medium truncate">{unit.waiter}</p>
                            )}
                          </div>

                          <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Consumo:</span>
                            <span className="font-mono font-bold text-slate-800">S/.{unit.cuenta.toFixed(2)}</span>
                          </div>

                          {/* Acciones (ocultas en modo unir) */}
                          {!mergeMode && (
                            <div className="mt-1.5 space-y-1">
                              {canTakeOrder && !isOcupada && (
                                <button
                                  onClick={e => { e.stopPropagation(); onTakeOrder(unit.primaryName); }}
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-white bg-brand hover:bg-brand-hover py-1 rounded-lg transition-colors text-center leading-tight">
                                  <Utensils className="w-3 h-3" /> Tomar pedido
                                </button>
                              )}
                              {canTakeOrder && isOcupada && (
                                <button
                                  onClick={e => { e.stopPropagation(); onTakeOrder(unit.primaryName); }}
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-brand bg-brand/10 hover:bg-brand/20 py-1 rounded-lg transition-colors text-center leading-tight">
                                  <Utensils className="w-3 h-3" /> Agregar a comanda
                                </button>
                              )}
                              {canCharge && isOcupada && (
                                <button
                                  onClick={e => { e.stopPropagation(); router.push(`/cobrar?mesa=${encodeURIComponent(unit.primaryName)}`); }}
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-white bg-sky-700 hover:bg-sky-800 py-1 rounded-lg transition-colors text-center leading-tight">
                                  <Receipt className="w-3 h-3" /> Cobrar
                                </button>
                              )}
                              {isDisponible && (
                                <button
                                  onClick={e => { e.stopPropagation(); setUnitStatus(unit, 'reservada'); }}
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 py-1 rounded-lg transition-colors text-center leading-tight">
                                  <CalendarClock className="w-3 h-3" /> Reservar
                                </button>
                              )}
                              {isReservada && (
                                <button
                                  onClick={e => { e.stopPropagation(); setUnitStatus(unit, 'disponible'); }}
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1 rounded-lg transition-colors text-center leading-tight">
                                  <Unlock className="w-3 h-3" /> Liberar
                                </button>
                              )}
                              {canManage && merged && isDisponible && (
                                <button
                                  onClick={e => { e.stopPropagation(); unmergeTable(unit.groupId!); }}
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 py-1 rounded-lg transition-colors text-center leading-tight">
                                  <Unlink className="w-3 h-3" /> Separar mesas
                                </button>
                              )}
                              {canManage && !merged && isDisponible && (
                                <button
                                  onClick={e => { e.stopPropagation(); removeTable(unit.members[0].id); }}
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50 py-1 rounded-lg transition-colors text-center leading-tight">
                                  <Trash2 className="w-3 h-3" /> Eliminar mesa
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pisos.length > 0 && !mergeMode && (
        <div className="bg-emerald-500/10 border border-brand/10 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-brand shrink-0" />
          <p className="text-xs text-gray-700">
            <strong>Flujo:</strong> el mozo toma el pedido en una mesa → la comanda llega a Cocina → el cajero cobra desde &quot;Cobrar&quot; y libera la mesa.
          </p>
        </div>
      )}

      {/* Modal: nuevo salón */}
      <Modal
        open={showPisoModal}
        onClose={closePisoModal}
        title="Nuevo Salón"
        subtitle="Ej: Salón Principal, Piso 1, Terraza, Salón VIP..."
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={closePisoModal}>Cancelar</Button>
            <Button onClick={submitPiso}>Crear Salón</Button>
          </>
        }
      >
        <Input
          label="Nombre del salón"
          placeholder="Salón Principal"
          value={pisoName}
          onChange={e => setPisoName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitPiso(); }}
          autoFocus
        />
      </Modal>

      {/* Modal: nueva mesa */}
      <Modal
        open={tableModalPiso !== null}
        onClose={closeTableModal}
        title="Nueva Mesa"
        subtitle="Identifícala por número o letra (ej: 1, 2, A, B)."
        size="sm"
        fullHeight={false}
        footer={
          <>
            <Button variant="secondary" onClick={closeTableModal}>Cancelar</Button>
            <Button onClick={submitTable}>Agregar Mesa</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Número o letra"
            placeholder="1"
            value={tableName}
            onChange={e => setTableName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTable(); }}
            autoFocus
          />
          <Input
            label="Capacidad (personas)"
            type="number"
            min={1}
            value={tableCapacidad}
            onChange={e => setTableCapacidad(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTable(); }}
          />
        </div>
      </Modal>
    </div>
  );
}

/* ─── Panel de detalle (a la derecha) de un pedido ya en curso ─── */
function OrderDetailDrawer({
  view, onClose, canEdit, onEditTable, onEditOrder, onCancelTable, onCancelOrder,
}: {
  view: { kind: 'mesa'; tableName: string } | { kind: 'order'; orderId: string };
  onClose: () => void;
  canEdit: boolean;
  onEditTable: (tableName: string) => void;
  onEditOrder: (orderId: string) => void;
  onCancelTable: (tableName: string) => void;
  onCancelOrder: (orderId: string) => void;
}) {
  const { tables, activeOrders } = useApp();

  const table: Table | undefined = view.kind === 'mesa' ? tables.find(t => t.name === view.tableName) : undefined;
  const order: ActiveOrder | undefined = view.kind === 'order' ? activeOrders.find(o => o.id === view.orderId) : undefined;

  useEffect(() => {
    if ((view.kind === 'mesa' && !table) || (view.kind === 'order' && !order)) onClose();
  }, [view, table, order, onClose]);

  if ((view.kind === 'mesa' && !table) || (view.kind === 'order' && !order)) return null;

  const items = view.kind === 'mesa' ? (table?.items ?? []) : (order?.items ?? []);
  const total = view.kind === 'mesa' ? (table?.cuenta ?? 0) : (order?.total ?? 0);
  const itemsCount = items.reduce((a, i) => a + i.quantity, 0);

  const title = view.kind === 'mesa' ? `Mesa ${table!.name}` : `#${order!.id}`;
  const typeLabel = view.kind === 'mesa' ? 'En el local' : order!.type === 'llevar' ? 'Para llevar' : 'Delivery';
  const TypeIcon = view.kind === 'mesa' ? Building2 : order!.type === 'llevar' ? ShoppingBag : Bike;

  return (
    <div className="w-full lg:w-96 shrink-0 lg:-my-8 lg:-mr-8 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16">
      <div className="card-lg bg-white flex flex-col overflow-hidden h-full lg:rounded-none lg:border-r-0">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">{title}</h4>
            <p className="text-[11px] text-slate-500">
              {view.kind === 'mesa' ? 'Consumo en curso' : 'Pedido activo, pendiente de cobro'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Info del pedido */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <TypeIcon className="h-3.5 w-3.5 text-brand" /> {typeLabel}
            </span>
            {view.kind === 'mesa' && table?.waiter && (
              <p className="text-slate-500">Atendido por: <span className="text-slate-700 font-medium">{table.waiter}</span></p>
            )}
            {view.kind === 'order' && (
              <>
                <p className="text-slate-500">Cliente: <span className="text-slate-700 font-medium">{order!.customer}</span></p>
                {order!.phone && <p className="text-slate-500">Tel: <span className="text-slate-700 font-medium">{order!.phone}</span></p>}
                {order!.address && <p className="text-slate-500">Dirección: <span className="text-slate-700 font-medium">{order!.address}</span></p>}
                <p className="text-slate-500">Hora: <span className="text-slate-700 font-medium">{order!.createdAt}</span></p>
                {order!.waiter && <p className="text-slate-500">Mozo: <span className="text-slate-700 font-medium">{order!.waiter}</span></p>}
              </>
            )}
          </div>

          {/* Items */}
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-2">
              Ítems del pedido ({itemsCount})
            </span>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sin ítems registrados.</p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center gap-2 text-xs">
                    <span className="text-slate-700 truncate">{item.quantity}x {item.product.name}</span>
                    <span className="font-mono font-bold text-slate-800 shrink-0">S/. {(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">Total</span>
            <span className="font-mono font-extrabold text-sm text-slate-800">S/. {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Acciones */}
        {canEdit && (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0 space-y-2">
            <button
              onClick={() => (view.kind === 'mesa' ? onEditTable(view.tableName) : onEditOrder(view.orderId))}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-brand hover:bg-brand-hover py-2.5 rounded-xl transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar pedido
            </button>
            <button
              onClick={() => (view.kind === 'mesa' ? onCancelTable(view.tableName) : onCancelOrder(view.orderId))}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 py-2 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Cancelar pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
