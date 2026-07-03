'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, Utensils, Send, Lock, ChefHat, BookOpen, Grid, ShoppingBag, Bike, Search, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useCarta, CARTA_CATEGORIES } from '@/context/CartaContext';
import type { OrderItem, Product, MenuEntry, OrderType } from '@/types';

const ORDER_TYPES: { id: OrderType; label: string; icon: React.ReactNode }[] = [
  { id: 'mesa',     label: 'En mesa',    icon: <Grid className="h-3.5 w-3.5" /> },
  { id: 'llevar',   label: 'Para llevar', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  { id: 'delivery', label: 'Delivery',    icon: <Bike className="h-3.5 w-3.5" /> },
];

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

export default function PosPage() {
  const { tables, customers, searchQuery, sendOrderToKitchen, createOrder, triggerToast, isCajaOpen } = useApp();
  const { carta } = useCarta();
  const { currentUser } = useAuth();

  const [orderType, setOrderType] = useState<OrderType>('mesa');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(CARTA_CATEGORIES[0]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState('Mesa 2');
  const [selectedCustomer, setSelectedCustomer] = useState('María Fe Mendoza');
  /* Datos para llevar / delivery */
  const [custName, setCustName]       = useState('');
  const [custPhone, setCustPhone]     = useState('');
  const [custAddress, setCustAddress] = useState('');

  /* Preseleccionar mesa desde ?mesa= (llegada desde el plano de Mesas) */
  useEffect(() => {
    const mesa = new URLSearchParams(window.location.search).get('mesa');
    if (mesa) { setSelectedTable(mesa); setOrderType('mesa'); }
  }, []);

  /* Solo los platos disponibles de la Carta del Día se pueden pedir */
  const menuProducts = carta.items.filter(i => i.available).map(entryToProduct);
  const CATEGORIES = [...CARTA_CATEGORIES].filter(cat => menuProducts.some(p => p.category === cat));

  const table = tables.find(t => t.name === selectedTable);
  const existingItems = orderType === 'mesa' ? (table?.items ?? []) : [];
  const existingTotal = existingItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

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

  const onSend = () => {
    if (!isCajaOpen) {
      triggerToast('La caja está cerrada. No se pueden tomar pedidos.', 'error');
      return;
    }
    if (cart.length === 0) {
      triggerToast('Agrega platos antes de enviar.', 'warning');
      return;
    }
    if (orderType === 'delivery' && !custAddress.trim()) {
      triggerToast('Ingresa la dirección de entrega para el delivery.', 'warning');
      return;
    }

    if (orderType === 'mesa') {
      sendOrderToKitchen(selectedTable, cart, currentUser?.name);
    } else {
      createOrder(
        orderType,
        { customer: custName, phone: custPhone, address: custAddress },
        cart,
        currentUser?.name
      );
      setCustName(''); setCustPhone(''); setCustAddress('');
    }
    setCart([]);
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const activeCategory = CATEGORIES.includes(selectedCategory) ? selectedCategory : (CATEGORIES[0] ?? '');

  /* Búsqueda: la caja local del comandero manda; si no, la global del TopBar */
  const rawQuery = (search || searchQuery).trim();
  const query = rawQuery.toLowerCase();
  const isSearching = query.length > 0;
  const filteredProducts = menuProducts.filter(p => {
    if (isSearching) return p.name.toLowerCase().includes(query);   // busca en TODAS las categorías
    return p.category === activeCategory;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-section">
      {/* Left: Products */}
      <div className="lg:col-span-8 space-y-6">
        {/* Header comandero */}
        <div className="card-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-brand" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Comandero — Toma de Pedidos</h3>
              <p className="text-[11px] text-slate-500">
                Mozo: {currentUser?.name ?? '—'}. Elige el tipo de pedido y envíalo a cocina.
              </p>
            </div>
          </div>

          {/* Tipo de pedido */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
            {ORDER_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setOrderType(t.id)}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  orderType === t.id ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Datos según tipo */}
          {orderType === 'mesa' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 shrink-0">Mesa:</span>
              <select
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
                className="input px-3 py-1.5 font-medium w-full"
              >
                {tables.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.name} · {t.status}{t.cuenta > 0 ? ` (S/. ${t.cuenta.toFixed(2)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {orderType === 'llevar' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={custName} onChange={e => setCustName(e.target.value)}
                placeholder="Nombre del cliente (opcional)"
                className="input px-3 py-2 w-full" />
              <input value={custPhone} onChange={e => setCustPhone(e.target.value)}
                placeholder="Teléfono (opcional)"
                className="input px-3 py-2 w-full" />
            </div>
          )}
          {orderType === 'delivery' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={custName} onChange={e => setCustName(e.target.value)}
                placeholder="Nombre del cliente"
                className="input px-3 py-2 w-full" />
              <input value={custPhone} onChange={e => setCustPhone(e.target.value)}
                placeholder="Teléfono"
                className="input px-3 py-2 w-full" />
              <input value={custAddress} onChange={e => setCustAddress(e.target.value)}
                placeholder="Dirección de entrega *"
                className="input px-3 py-2 w-full sm:col-span-2" />
            </div>
          )}
        </div>

        {/* Aviso de caja cerrada */}
        {!isCajaOpen && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-700">
            <Lock className="h-4 w-4 shrink-0" />
            La caja está cerrada. No podrás enviar comandas hasta que el cajero/administrador apertura la caja.
          </div>
        )}

        {/* Buscador de platos */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar plato por nombre en toda la carta..."
            className="input w-full pl-9 pr-9 py-2.5 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category tabs (ocultas mientras se busca) */}
        {!isSearching && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  activeCategory === cat
                    ? 'bg-brand text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-border-card'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Resultado de búsqueda */}
        {isSearching && (
          <p className="text-xs text-slate-500">
            {filteredProducts.length === 0
              ? <>Sin resultados para <strong>“{rawQuery}”</strong>.</>
              : <>{filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''} para <strong>“{rawQuery}”</strong> en toda la carta.</>}
          </p>
        )}

        {/* Sin platos disponibles en la carta */}
        {menuProducts.length === 0 && (
          <div className="card-lg p-10 text-center space-y-2">
            <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
            <p className="text-xs text-slate-500">
              No hay platos disponibles en la <strong>Carta del Día</strong>. Actívalos o agrégalos desde la sección Carta del Día.
            </p>
          </div>
        )}

        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            return (
              <div
                key={product.id}
                onClick={() => handleAddToCart(product)}
                className="card-lg hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden transition-all duration-200 flex flex-col group"
              >
                <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <Utensils className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-3 flex-grow flex flex-col justify-between">
                  <h5 className="text-xs font-bold text-slate-800 leading-tight">{product.name}</h5>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-200">
                    <span className="text-xs font-mono font-bold text-slate-800">S/. {product.price.toFixed(2)}</span>
                    <div className="bg-emerald-50 p-1.5 rounded-lg text-brand shrink-0">
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Comanda */}
      <div className="lg:col-span-4 card-lg p-5 flex flex-col justify-between h-[calc(100vh-140px)] sticky top-20">
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-brand" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Comanda Nueva</h4>
              </div>
              <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">
                {cart.length} items
              </span>
            </div>
            <div className="my-3 text-[10px] text-slate-500 bg-slate-100 p-2.5 rounded-xl">
              {orderType === 'mesa' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p>MESA:</p>
                    <p className="font-bold text-slate-700">{selectedTable}</p>
                  </div>
                  <div>
                    <p>COMENSAL:</p>
                    <select
                      value={selectedCustomer}
                      onChange={e => setSelectedCustomer(e.target.value)}
                      className="bg-transparent font-bold text-slate-700 truncate w-full outline-none"
                    >
                      {customers.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <p className="font-bold text-brand uppercase tracking-wide">
                    {orderType === 'llevar' ? 'Pedido para llevar' : 'Pedido delivery'}
                  </p>
                  <p className="text-slate-700 font-medium">{custName.trim() || 'Cliente sin nombre'}</p>
                  {orderType === 'delivery' && (
                    <p className="text-slate-500">{custAddress.trim() || 'Falta la dirección de entrega'}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
            {/* Ya pedido (acumulado en la mesa) */}
            {existingItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Ya pedido en {selectedTable}</p>
                {existingItems.map(item => (
                  <div key={item.product.id} className="flex justify-between text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5">
                    <span>{item.quantity}× {item.product.name}</span>
                    <span className="font-mono">S/. {(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-slate-200 my-2" />
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Por enviar ahora</p>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-450 space-y-2">
                <Utensils className="h-8 w-8 stroke-[1.5]" />
                <p className="text-xs font-medium text-slate-500">Agrega platos para armar la comanda.</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="bg-slate-100 p-2.5 rounded-xl flex justify-between gap-2.5">
                  <div className="flex-grow">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{item.product.name}</p>
                    <span className="text-[10px] font-mono text-slate-500">S/. {item.product.price.toFixed(2)} c/u</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleUpdateQty(item.product.id, -1)} className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold font-mono text-slate-800">{item.quantity}</span>
                    <button onClick={() => handleUpdateQty(item.product.id, 1)} className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totales & enviar */}
        <div className="border-t border-slate-200 pt-3.5 mt-3 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-600">
            {orderType === 'mesa' ? (
              <>
                <div className="flex justify-between font-mono">
                  <span>Comanda nueva</span>
                  <span>S/. {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Ya en la mesa</span>
                  <span>S/. {existingTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono font-bold text-sm text-slate-800 border-t border-dashed border-slate-200 pt-1.5">
                  <span>Cuenta total mesa</span>
                  <span>S/. {(cartTotal + existingTotal).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between font-mono font-bold text-sm text-slate-800">
                <span>Total del pedido</span>
                <span>S/. {cartTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          <button
            onClick={onSend}
            disabled={!isCajaOpen || cart.length === 0}
            className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" /> Enviar a Cocina
          </button>
          <button
            onClick={() => { setCart([]); triggerToast('Comanda en curso cancelada.', 'info'); }}
            className="btn-danger w-full justify-center"
          >
            Vaciar comanda
          </button>
          <p className="text-[10px] text-slate-400 text-center">
            El cobro lo realiza el cajero desde <strong>Cobrar / Facturación</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
