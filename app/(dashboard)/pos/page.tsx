'use client';

import { useState } from 'react';
import { Plus, Minus, ShoppingCart, Utensils, DollarSign, Printer } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { OrderItem } from '@/types';

export default function PosPage() {
  const { products, tables, customers, searchQuery, handleCheckOut, triggerToast } = useApp();

  const [selectedCategory, setSelectedCategory] = useState('Entradas');
  const [activeOrderItems, setActiveOrderItems] = useState<OrderItem[]>([]);
  const [selectedPosTable, setSelectedPosTable] = useState('Mesa 2');
  const [selectedPosCustomer, setSelectedPosCustomer] = useState('María Fe Mendoza');

  const CATEGORIES = ['Entradas', 'Platos de fondo', 'Bebidas', 'Postres', 'Promociones'];

  const handleAddToOrder = (product: (typeof products)[0]) => {
    if (product.status === 'out_of_stock') {
      triggerToast(`Lo sentimos, "${product.name}" no tiene stock asignado.`, 'error');
      return;
    }
    setActiveOrderItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    triggerToast(`"${product.name}" añadido al pedido.`, 'success');
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setActiveOrderItems(prev =>
      prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
         .filter(i => i.quantity > 0)
    );
  };

  const onCheckOut = (method: 'Efectivo' | 'Yape / Plin' | 'Tarjeta') => {
    handleCheckOut(activeOrderItems, method, selectedPosTable);
    if (activeOrderItems.length > 0) setActiveOrderItems([]);
  };

  const orderTotal = activeOrderItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const filteredProducts = products
    .filter(p => p.category === selectedCategory)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-section">
      {/* Left: Products */}
      <div className="lg:col-span-8 space-y-6">
        {/* Config bar */}
        <div className="bg-slate-200 p-4 rounded-2xl border border-slate-300/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Asignar Mesa:</span>
            <select
              value={selectedPosTable}
              onChange={e => setSelectedPosTable(e.target.value)}
              className="bg-slate-100 text-xs text-slate-850 px-3 py-1.5 rounded-xl border border-slate-300 font-medium focus:outline-none"
            >
              {tables.map(t => (
                <option key={t.id} value={t.name}>{t.name} (Cap. {t.capacidad})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Asignar Cliente:</span>
            <select
              value={selectedPosCustomer}
              onChange={e => setSelectedPosCustomer(e.target.value)}
              className="bg-slate-100 text-xs text-slate-850 px-3 py-1.5 rounded-xl border border-slate-300 font-medium focus:outline-none"
            >
              {customers.map(c => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-[#007542] text-white shadow-md'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const isLowStock = product.stock > 0 && product.stock <= 12;
            const isOut = product.status === 'out_of_stock' || product.stock === 0;
            return (
              <div
                key={product.id}
                onClick={() => handleAddToOrder(product)}
                className={`bg-slate-200 rounded-2xl border border-slate-300/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden transition-all duration-200 flex flex-col group ${isOut ? 'opacity-65 cursor-not-allowed' : ''}`}
              >
                <div className="relative h-32 w-full bg-slate-300 overflow-hidden">
                  <img src={product.image} alt={product.name} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute top-2 left-2">
                    {isOut ? (
                      <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">Agotado</span>
                    ) : isLowStock ? (
                      <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">Bajo Stock ({product.stock})</span>
                    ) : (
                      <span className="text-[9px] bg-[#007542]/80 text-white px-2 py-0.5 rounded-full font-bold font-mono">Stock {product.stock}</span>
                    )}
                  </div>
                </div>
                <div className="p-3 flex-grow flex flex-col justify-between">
                  <h5 className="text-xs font-bold text-slate-800 leading-tight">{product.name}</h5>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-300">
                    <span className="text-xs font-mono font-bold text-slate-850">S/. {product.price.toFixed(2)}</span>
                    <div className="bg-emerald-50 p-1.5 rounded-lg text-[#007542] shrink-0">
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="lg:col-span-4 bg-slate-200 rounded-2xl border border-slate-300 shadow-sm p-5 flex flex-col justify-between h-[calc(100vh-140px)] sticky top-20">
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-300">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[#007542]" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Resumen de Pedido</h4>
              </div>
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                {activeOrderItems.length} items
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 my-3 text-[10px] text-slate-500 bg-slate-100 p-2 rounded-xl">
              <div>
                <p>MESA EN TURNO:</p>
                <p className="font-bold text-slate-700">{selectedPosTable}</p>
              </div>
              <div>
                <p>COMENSAL CRM:</p>
                <p className="font-bold text-slate-700 truncate">{selectedPosCustomer}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
            {activeOrderItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-450 space-y-2">
                <Utensils className="h-8 w-8 stroke-[1.5]" />
                <p className="text-xs font-medium text-slate-500">Carrito vacío, añade platos.</p>
              </div>
            ) : (
              activeOrderItems.map(item => (
                <div key={item.product.id} className="bg-slate-100 p-2.5 rounded-xl flex justify-between gap-2.5">
                  <div className="flex-grow">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{item.product.name}</p>
                    <span className="text-[10px] font-mono text-slate-500">S/. {item.product.price.toFixed(2)} c/u</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleUpdateQty(item.product.id, -1)} className="p-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-400">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold font-mono text-slate-800">{item.quantity}</span>
                    <button onClick={() => handleUpdateQty(item.product.id, 1)} className="p-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-400">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totals & Payment */}
        <div className="border-t border-slate-300 pt-3.5 mt-3 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between font-mono">
              <span>Subtotal (Base)</span>
              <span>S/. {(orderTotal / 1.18).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>IGV (18% Perú Corp)</span>
              <span>S/. {(orderTotal * 0.18 / 1.18).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-mono font-bold text-sm text-slate-800 border-t border-dashed border-slate-300 pt-1.5">
              <span>Total (S/.)</span>
              <span>S/. {orderTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onCheckOut('Yape / Plin')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 rounded-xl transition-all shadow-xs">
              Yape / Plin (QR)
            </button>
            <button onClick={() => onCheckOut('Tarjeta')} className="bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold py-2 rounded-xl transition-all shadow-xs">
              Tarjeta (POS)
            </button>
            <button onClick={() => onCheckOut('Efectivo')} className="bg-[#007542] hover:bg-[#1E8C45] col-span-2 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
              <DollarSign className="h-4 w-4" /> Cobrar Completo (Efectivo)
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeOrderItems.length === 0) { triggerToast('No hay elementos para pre-cuenta.', 'warning'); return; }
                triggerToast('Precuenta impresa en cocina.', 'info');
              }}
              className="flex-1 bg-slate-100 hover:bg-slate-300 text-slate-705 text-[10px] font-medium py-1.5 rounded-lg border border-slate-300 flex items-center justify-center gap-1.5"
            >
              <Printer className="h-3 w-3" /> Imprimir Pre-cuenta
            </button>
            <button
              onClick={() => { setActiveOrderItems([]); triggerToast('Orden del carrito cancelada.', 'info'); }}
              className="p-1 px-3 bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-medium rounded-lg"
            >
              Wipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
