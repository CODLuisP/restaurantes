'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Grid,
  ChefHat,
  UtensilsCrossed,
  Tags,
  Archive,
  Users,
  Truck,
  Coins,
  TrendingUp,
  Settings,
  Boxes,
  Store,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/pos',           label: 'Punto de Venta',  icon: ShoppingBag,    badge: 'Tablet' },
  { href: '/pedidos',       label: 'Pedidos',          icon: ClipboardList,  badge: '12' },
  { href: '/mesas',         label: 'Mesas',            icon: Grid,           badge: 'Plano' },
  { href: '/cocina',        label: 'Cocina',           icon: ChefHat,        badge: 'Pantalla' },
  { href: '/productos',     label: 'Productos',        icon: UtensilsCrossed },
  { href: '/categorias',    label: 'Categorías',       icon: Tags },
  { href: '/inventario',    label: 'Inventario',       icon: Archive,        badge: '3 Alertas' },
  { href: '/clientes',      label: 'Clientes',         icon: Users },
  { href: '/delivery',      label: 'Delivery',         icon: Truck },
  { href: '/caja',          label: 'Caja',             icon: Coins,          badge: 'S/. Abierta' },
  { href: '/reportes',      label: 'Reportes',         icon: TrendingUp },
  { href: '/configuracion', label: 'Configuración',    icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gradient-to-b from-[#094127] to-[#08683d] text-white flex flex-col h-screen fixed top-0 left-0 z-20 border-r border-white/5 select-none">
      {/* Brand */}
      <div className="p-5 border-b border-[#1E8C45] flex items-center gap-3">
        <div className="bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-center">
          <Store className="h-6 w-6 text-[#58BB43] stroke-[2]" />
        </div>
        <div>
          <h1 className="font-sans font-bold text-lg tracking-tight leading-none text-white">RestoPro</h1>
          <span className="text-[10px] text-white/60 font-mono tracking-widest uppercase">Peru SaaS POS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 px-3 mb-2">
          MENÚ RESTAURANTE
        </div>

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm backdrop-blur-sm'
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#58BB43] rounded-r-full" />
              )}
              <Icon
                className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-[#58BB43]' : 'text-white/60'
                }`}
              />
              <span className="flex-grow text-left">{item.label}</span>
              {'badge' in item && item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive ? 'bg-white/15 text-white' : 'bg-black/20 text-[#58BB43] font-medium'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Playground */}
        <div className="border-t border-[#1E8C45]/40 my-4 pt-4">
          <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 px-3 mb-2">
            PLAYGROUND
          </div>
          <Link
            href="/ui-components"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
              pathname === '/ui-components'
                ? 'bg-[#1E8C45] text-white shadow-md'
                : 'text-white/80 hover:bg-white/5 hover:text-white'
            }`}
          >
            {pathname === '/ui-components' && (
              <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#58BB43] rounded-r-full" />
            )}
            <Boxes
              className={`h-4 w-4 shrink-0 ${
                pathname === '/ui-components' ? 'text-[#58BB43]' : 'text-white/60'
              }`}
            />
            <span className="flex-grow text-left">Componentes UI</span>
            <span className="text-[9px] bg-[#58BB43] text-[#007542] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
              Nuevo
            </span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1E8C45] bg-[#005e34]/30">
        <div className="flex items-center gap-2">
          <div className="flex flex-col w-1 h-8 rounded-full overflow-hidden">
            <div className="bg-[#D91B5C] h-1/3" />
            <div className="bg-white h-1/3" />
            <div className="bg-[#D91B5C] h-1/3" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-white/95">RestoPro Perú</p>
            <p className="text-[10px] text-white/50">RUC: 20123456789</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
