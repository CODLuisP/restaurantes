'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CartaDelDia, MenuEntry } from '@/types';

/* v2: se reestructuró la carta (categorías unificadas + fotos) */
export const CARTA_STORAGE_KEY = 'restopro_carta_del_dia_v2';
const STORAGE_KEY = CARTA_STORAGE_KEY;

/** Categorías oficiales, compartidas entre Carta, Comandero y menú público. */
export const CARTA_CATEGORIES: string[] = ['Entradas', 'Platos de fondo', 'Bebidas', 'Postres', 'Promociones'];

const defaultCarta: CartaDelDia = {
  date: new Date().toISOString().split('T')[0],
  active: true,
  items: [
    { id: 'mc1',  name: 'Ceviche Clásico Carretillero',   price: 39.50, category: 'Entradas',        description: 'Pescado fresco marinado en limón con ají limo, cebolla y choclo.',  available: true,  featured: true,  image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc2',  name: 'Causa Rellena de Pollo',          price: 24.00, category: 'Entradas',        description: 'Papa amarilla condimentada rellena de pollo, palta y mayonesa.',     available: true,  image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc3',  name: 'Anticuchos de Corazón (2 palos)', price: 28.50, category: 'Entradas',        description: 'Brochetas de corazón de res a la parrilla con papa y ají.',          available: true,  image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc4',  name: 'Lomo Saltado con Papas',          price: 45.00, category: 'Platos de fondo', description: 'Trozos de lomo fino salteados con cebolla, tomate y papas fritas.',  available: true,  featured: true,  image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc5',  name: 'Ají de Gallina de la Abuela',     price: 34.00, category: 'Platos de fondo', description: 'Pollo deshilachado en salsa de ají amarillo con arroz y papa.',      available: true,  featured: true,  image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc6',  name: 'Arroz con Mariscos Meloso',       price: 42.00, category: 'Platos de fondo', description: 'Arroz meloso con mariscos frescos y culantro.',                      available: true,  featured: true,  image: 'https://images.unsplash.com/photo-1534080391025-09795117f05b?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc7',  name: 'Chicha Morada (Jarra 1L)',        price: 18.00, category: 'Bebidas',         description: 'Bebida tradicional de maíz morado con piña y canela.',               available: true,  image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc8',  name: 'Inca Kola Personal',              price: 7.50,  category: 'Bebidas',         description: 'Bebida gaseosa peruana en botella de vidrio.',                       available: true,  image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc9',  name: 'Suspiro a la Limeña',             price: 16.00, category: 'Postres',         description: 'Manjar blanco coronado con merengue al oporto.',                     available: true,  featured: true,  image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc10', name: 'Tres Leches de Lúcuma',           price: 15.00, category: 'Postres',         description: 'Bizcocho bañado en tres leches con lúcuma.',                         available: true,  image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=400' },
    { id: 'mc11', name: 'Súper Combo Marino (2 pers.)',    price: 78.00, category: 'Promociones',     description: 'Ceviche + arroz con mariscos + jarra de chicha para compartir.',     available: true,  featured: true,  image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400' },
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
