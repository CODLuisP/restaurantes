'use client';

import { useState, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Bike, ClipboardList, Grid, ShoppingBag } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useProductosCatalogo } from '@/hooks/comandero/useProductosCatalogo';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsLoader';
import { useDeliveryGeocoding } from '@/hooks/comandero/useDeliveryGeocoding';
import MenuCatalog from '@/components/comandero/MenuCatalog';
import OrderPanel from '@/components/comandero/OrderPanel';
import OrdersListView from '@/components/comandero/OrdersListView';
import { GOOGLE_MAPS_API_KEY, type DetailView } from '@/components/comandero/types';
import type { OrderItem, Product, OrderType } from '@/types';

type TabId = 'todas' | 'mesa' | 'llevar' | 'delivery';

export default function ComanderoPage() {
  const {
    tables, searchQuery, triggerToast, sucursalCajaAbierta: isCajaOpen,
    sendOrderToKitchen, updateTableItemQty, removeTableItem, cancelTableOrder: cancelTableOrderBackend,
    confirmarPedidoCliente,
    activeOrders, activeOrdersLoading, createOrder, addItemsToActiveOrder, updateActiveOrderItemQty,
    removeActiveOrderItem, cancelActiveOrder, confirmarActiveOrder,
  } = useApp();
  const { currentUser } = useAuth();
  const canTakeOrder = currentUser?.role === 'admin' || currentUser?.role === 'mozo';

  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  /* Navegación e interfaz */
  const [activeTab, setActiveTab] = useState<TabId>('todas');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('mesa');
  /** Panel de detalle (a la derecha) de un pedido ya en curso: mesa ocupada o pedido llevar/delivery. */
  const [detailView, setDetailView] = useState<DetailView>(null);
  /** true mientras se envía la comanda a cocina (evita doble envío y bloquea la UI). */
  const [sending, setSending] = useState(false);

  const { products: menuProducts, categories, productsLoading } = useProductosCatalogo(orderType, triggerToast);

  /* Borrador del pedido en edición */
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [custName, setCustName]       = useState('');
  const [custPhone, setCustPhone]     = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const geo = useDeliveryGeocoding({
    custAddress,
    setCustAddress,
    isEditingExisting: !!editingOrderId,
    triggerToast,
  });

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

  /* Geolocalizar la dirección al abrir un pedido de delivery existente */
  useEffect(() => {
    if (orderType === 'delivery' && custAddress && isLoaded && custAddress !== geo.lastGeocoded) {
      if (editingOrderId) {
        geo.geocodeAddress(custAddress);
        geo.setLastGeocoded(custAddress);
      }
    }
  }, [custAddress, orderType, isLoaded, editingOrderId, geo]);

  const table = tables.find(t => t.name === selectedTable);
  const editingOrder = editingOrderId ? activeOrders.find(o => o.id === editingOrderId) ?? null : null;

  const existingItems =
    orderType === 'mesa' ? (table?.items ?? [])
    : editingOrder ? editingOrder.items
    : [];

  /** Limpia el borrador del pedido (ítems y datos del cliente). */
  const resetDraft = () => {
    setCart([]);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    geo.resetGeocoding();
  };

  const changeTab = (tab: TabId) => {
    setActiveTab(tab);
    setDetailView(null);
    setIsCreatingNew(false);
    setEditingOrderId(null);
    setSelectedTable('');
    resetDraft();
    if (tab !== 'todas') setOrderType(tab);
  };

  /** Abre la pantalla dividida para tomar o editar la comanda de una mesa. */
  const editTableOrder = (tableName: string) => {
    const t = tables.find(tb => tb.name === tableName);
    setDetailView(null);
    setSelectedTable(tableName);
    setOrderType('mesa');
    setEditingOrderId(null);
    setCart([]);
    setCustName(t?.nombreCliente ?? '');
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
    geo.setLastGeocoded(''); // Forzar geocodificación
  };

  /** Clic en una mesa: si ya tiene un pedido en curso, muestra el detalle; si está libre, abre directo la toma de pedido. */
  const handleTableCardClick = (tableName: string) => {
    const t = tables.find(tb => tb.name === tableName);
    if (t && t.status === 'ocupada') setDetailView({ kind: 'mesa', tableName });
    else editTableOrder(tableName);
  };

  /** Clic en un pedido de llevar/delivery ya creado: siempre muestra el detalle primero. */
  const handleOrderCardClick = (orderId: string) => setDetailView({ kind: 'order', orderId });

  /* Cancelar/confirmar: el propio Drawer muestra el loading y recién cierra cuando el
     backend confirma — así el mozo ve que está procesando en vez de que "no pase nada". */
  const cancelTableOrder = (tableName: string) => cancelTableOrderBackend(tableName);
  const confirmTableOrder = (tableName: string) => confirmarPedidoCliente(tableName);
  const cancelOrderDetail = (orderId: string) => cancelActiveOrder(orderId);
  const confirmOrderDetail = (orderId: string) => confirmarActiveOrder(orderId);

  /** Arranca un pedido nuevo de llevar/delivery desde la vista de listas. */
  const startNewOrder = (type: OrderType) => {
    setDetailView(null);
    setIsCreatingNew(true);
    setOrderType(type);
    setEditingOrderId(null);
    resetDraft();
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

  const onSend = async () => {
    if (sending) return;
    if (!isCajaOpen) { triggerToast('La caja está cerrada. No se pueden tomar pedidos.', 'error'); return; }
    if (cart.length === 0) { triggerToast('Agrega platos antes de enviar.', 'warning'); return; }
    if (orderType === 'delivery' && !custAddress.trim()) { triggerToast('Ingresa la dirección de entrega.', 'warning'); return; }

    setSending(true);
    try {
      let success: boolean;
      if (orderType === 'mesa') {
        success = await sendOrderToKitchen(selectedTable, custName, cart);
      } else if (editingOrderId) {
        success = await addItemsToActiveOrder(editingOrderId, cart);
      } else {
        success = !!(await createOrder(orderType, { customer: custName, phone: custPhone, address: custAddress }, cart));
      }
      // Si falló, se queda en el editor con el carrito intacto para que el mozo pueda reintentar.
      if (!success) return;

      resetDraft();
      setIsCreatingNew(false);
      setEditingOrderId(null);
      if (orderType === 'mesa') setSelectedTable(''); // vuelve al plano de mesas
    } finally {
      setSending(false);
    }
  };

  /** Vuelve de la pantalla dividida a la lista de pedidos. */
  const handleBackFromEditor = () => {
    if (activeTab === 'mesa') setSelectedTable('');
    else {
      setIsCreatingNew(false);
      setEditingOrderId(null);
    }
    setCart([]);
  };

  const existingTotal = existingItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const busyTables = tables.filter(t => t.status === 'ocupada' && (t.items?.length ?? 0) > 0);
  const inProgressCount = busyTables.length + activeOrders.length;

  const cartTotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const activeCategory = categories.includes(selectedCategory) ? selectedCategory : (categories[0] ?? '');

  const rawQuery = (search || searchQuery).trim();
  const query = rawQuery.toLowerCase();
  const isSearching = query.length > 0;
  const filteredProducts = menuProducts.filter(p =>
    isSearching ? p.name.toLowerCase().includes(query) : p.category === activeCategory
  );

  const isEditingOrCreate =
    (activeTab === 'mesa' && !!selectedTable) ||
    (activeTab === 'llevar' && (isCreatingNew || !!editingOrderId)) ||
    (activeTab === 'delivery' && (isCreatingNew || !!editingOrderId));

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'todas',    label: 'Todas',       icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { id: 'mesa',     label: 'En mesa',     icon: <Grid className="h-3.5 w-3.5" /> },
    { id: 'llevar',   label: 'Para llevar', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
    { id: 'delivery', label: 'Delivery',    icon: <Bike className="h-3.5 w-3.5" /> },
  ];

  /* ── VISTA DIVIDIDA (SPLIT-SCREEN) PARA CREACIÓN / EDICIÓN ── */
  if (isEditingOrCreate) {
    if (productsLoading) {
      return (
        <div className="card-lg flex items-center justify-center py-20 text-xs text-slate-400 gap-2 animate-section">
          <Spinner size="sm" /> Cargando carta de productos...
        </div>
      );
    }
    return (
      <div className="flex flex-col lg:flex-row gap-6 animate-section pb-20 lg:h-[calc(100vh-8.5rem)] overflow-y-auto lg:overflow-hidden">
        <MenuCatalog
          orderType={orderType}
          selectedTable={selectedTable}
          editingOrderId={editingOrderId}
          search={search}
          setSearch={setSearch}
          isSearching={isSearching}
          rawQuery={rawQuery}
          hasMenuProducts={menuProducts.length > 0}
          categories={categories}
          activeCategory={activeCategory}
          setSelectedCategory={setSelectedCategory}
          filteredProducts={filteredProducts}
          onAddToCart={handleAddToCart}
          onBack={handleBackFromEditor}
        />

        <OrderPanel
          orderType={orderType}
          custName={custName}
          setCustName={setCustName}
          custPhone={custPhone}
          setCustPhone={setCustPhone}
          custAddress={custAddress}
          setCustAddress={setCustAddress}
          editingOrderId={editingOrderId}
          isLoaded={isLoaded}
          posicion={geo.posicion}
          autocompleteRef={geo.autocompleteRef}
          onPlaceChanged={geo.handlePlaceChanged}
          onGeocodeManual={geo.handleGeocodeManual}
          onMapClick={geo.handleMapClick}
          onMarkerDragEnd={geo.handleMarkerDragEnd}
          existingItems={existingItems}
          existingTotal={existingTotal}
          onExistingQty={handleExistingQty}
          onRemoveExisting={handleRemoveExisting}
          cart={cart}
          onUpdateQty={handleUpdateQty}
          cartTotal={cartTotal}
          isCajaOpen={isCajaOpen}
          onSend={onSend}
          sending={sending}
          onClearCart={() => { setCart([]); triggerToast('Ítems nuevos descartados.', 'info'); }}
        />
      </div>
    );
  }

  return (
    <OrdersListView
      tabs={TABS}
      activeTab={activeTab}
      setActiveTab={changeTab}
      tables={tables}
      activeOrders={activeOrders}
      activeOrdersLoading={activeOrdersLoading}
      detailView={detailView}
      setDetailView={setDetailView}
      isCajaOpen={isCajaOpen}
      canEdit={canTakeOrder}
      busyTables={busyTables}
      inProgressCount={inProgressCount}
      mozoName={currentUser?.name}
      onTableCardClick={handleTableCardClick}
      onOrderCardClick={handleOrderCardClick}
      onStartNewOrder={startNewOrder}
      onEditTable={editTableOrder}
      onEditOrder={editActiveOrder}
      onCancelTable={cancelTableOrder}
      onCancelOrder={cancelOrderDetail}
      onConfirmTable={confirmTableOrder}
      onConfirmOrder={confirmOrderDetail}
    />
  );
}
