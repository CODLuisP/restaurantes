'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CartaDelDia, MenuEntry } from '@/types';

const STORAGE_KEY = 'restopro_carta_del_dia';

const defaultCarta: CartaDelDia = {
  date: new Date().toISOString().split('T')[0],
  active: true,
  items: [
    { id: 'mc1', name: 'Ceviche Clásico',         price: 39.50, category: 'Entradas',  description: 'Pescado fresco marinado en limón con ají limo, cebolla y choclo.',  available: true,  image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc2', name: 'Causa Rellena de Pollo',  price: 24.00, category: 'Entradas',  description: 'Papa amarilla condimentada rellena de pollo, palta y mayonesa.',     available: true,  image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc3', name: 'Lomo Saltado',             price: 45.00, category: 'Fondos',    description: 'Trozos de lomo fino salteados con cebolla, tomate y papas fritas.', available: true,  image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc4', name: 'Aji de Gallina',           price: 38.00, category: 'Fondos',    description: 'Pollo deshilachado en salsa de ají amarillo con arroz y papa.',     available: true,  image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc5', name: 'Arroz con Leche',          price: 12.00, category: 'Postres',   description: 'Postre tradicional cremoso con canela y leche evaporada.',           available: true,  image: '' },
    { id: 'mc6', name: 'Chicha Morada',            price: 8.00,  category: 'Bebidas',   description: 'Bebida tradicional de maíz morado con piña y canela.',              available: true,  image: '' },
    { id: 'mc7', name: 'Inca Kola 500ml',          price: 7.00,  category: 'Bebidas',   description: 'Bebida gaseosa peruana.',                                            available: false, image: '' },
  ],
};

interface CartaContextType {
  carta: CartaDelDia;
  setCarta: (carta: CartaDelDia) => void;
  addItem: (item: Omit<MenuEntry, 'id'>) => void;
  updateItem: (id: string, changes: Partial<MenuEntry>) => void;
  removeItem: (id: string) => void;
  toggleItem: (id: string) => void;
  toggleCartaActive: () => void;
}

const CartaContext = createContext<CartaContextType | null>(null);

export function CartaProvider({ children }: { children: React.ReactNode }) {
  const [carta, setCartaState] = useState<CartaDelDia>(defaultCarta);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCartaState(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = useCallback((next: CartaDelDia) => {
    setCartaState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const setCarta = useCallback((c: CartaDelDia) => persist(c), [persist]);

  const addItem = useCallback((item: Omit<MenuEntry, 'id'>) => {
    persist({ ...carta, items: [...carta.items, { ...item, id: `mc${Date.now()}` }] });
  }, [carta, persist]);

  const updateItem = useCallback((id: string, changes: Partial<MenuEntry>) => {
    persist({ ...carta, items: carta.items.map(i => i.id === id ? { ...i, ...changes } : i) });
  }, [carta, persist]);

  const removeItem = useCallback((id: string) => {
    persist({ ...carta, items: carta.items.filter(i => i.id !== id) });
  }, [carta, persist]);

  const toggleItem = useCallback((id: string) => {
    persist({ ...carta, items: carta.items.map(i => i.id === id ? { ...i, available: !i.available } : i) });
  }, [carta, persist]);

  const toggleCartaActive = useCallback(() => {
    persist({ ...carta, active: !carta.active });
  }, [carta, persist]);

  return (
    <CartaContext.Provider value={{ carta, setCarta, addItem, updateItem, removeItem, toggleItem, toggleCartaActive }}>
      {children}
    </CartaContext.Provider>
  );
}

export function useCarta() {
  const ctx = useContext(CartaContext);
  if (!ctx) throw new Error('useCarta must be used within CartaProvider');
  return ctx;
}
