'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Grid,
  ChefHat,
  Users,
  Coins,
  TrendingUp,
  Settings,
  Boxes,
  Store,
  BookOpen,
  ShieldCheck,
  Receipt,
  BellRing,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import type { Role } from '@/types';

type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  /** Roles con acceso. Si se omite, visible para todos. */
  roles?: Role[];
};

const menuItems: MenuItem[] = [
  { href: '/dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/mesas',         label: 'Mesas',            icon: Grid },
  { href: '/comandero',     label: 'Comandero',        icon: ShoppingBag,     roles: ['admin', 'mozo'] },
  { href: '/cobrar',        label: 'Cobrar',           icon: Receipt,         roles: ['admin', 'cajero'] },
  { href: '/cocina',        label: 'Cocina',           icon: ChefHat },
  { href: '/despachar',     label: 'Por despachar',    icon: BellRing,        roles: ['admin', 'mozo'] },
  { href: '/caja',          label: 'Caja',             icon: Coins,           roles: ['admin', 'cajero'] },
  { href: '/carta',         label: 'Menú Digital',     icon: BookOpen },
  { href: '/clientes',      label: 'Clientes',         icon: Users,           roles: ['admin', 'cajero'] },
  { href: '/usuarios',      label: 'Personal',         icon: ShieldCheck,     roles: ['admin'] },
  { href: '/reportes',      label: 'Reportes',         icon: TrendingUp,      roles: ['admin', 'cajero'] },
];

type ConfigSubItem = {
  href: string;
  label: string;
  badge?: 'PRO' | 'NEW';
};

const configSubItems: ConfigSubItem[] = [
  { href: '/configuracion/negocio',              label: 'Información del negocio' },
  { href: '/configuracion/campos-personalizados', label: 'Campos personalizados', badge: 'PRO' },
  { href: '/configuracion/metodos-pago',         label: 'Métodos de pago' },
  { href: '/configuracion/metodos-entrega',      label: 'Métodos de entrega' },
  { href: '/configuracion/zonas-entrega',        label: 'Zonas de entrega' },
  { href: '/configuracion/tickets',              label: 'Tickets', badge: 'NEW' },
  { href: '/configuracion/tracking',             label: 'Tracking' },
  { href: '/configuracion/dominio',              label: 'Dominio personalizado', badge: 'PRO' },
  { href: '/configuracion/plan',                 label: 'Mi plan' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, closeOpen, isCollapsed, toggleCollapsed } = useSidebar();
  const { currentUser } = useAuth();
  const { kitchenOrders } = useApp();
  const isConfigRoute = pathname.startsWith('/configuracion');
  const [isConfigOpen, setIsConfigOpen] = useState(isConfigRoute);
  const canSeeConfig = currentUser?.role === 'admin';

  /* Comandas listas por despachar (todas para admin, propias para el mozo) */
  const readyCount = kitchenOrders.filter(
    o => o.status === 'listo' && (currentUser?.role === 'admin' || o.waiter === currentUser?.name)
  ).length;

  const visibleItems = menuItems.filter(
    item => !item.roles || (currentUser && item.roles.includes(currentUser.role))
  );

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          bg-gradient-to-br from-brand-dark to-brand-medium text-white flex flex-col h-screen
          fixed top-0 left-0 z-20 border-r border-white/5 select-none
          transition-all duration-300 overflow-hidden
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="relative h-16 px-4 border-b border-[#306342] flex items-center gap-3 overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/33.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
          <div className="absolute inset-0 bg-brand-dark/60 pointer-events-none" />
          <div className="relative bg-white/10 p-2 rounded-xl border border-white/20 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5 text-brand-accent stroke-[2]" />
          </div>
          {!isCollapsed && (
            <div className="relative overflow-hidden">
              <h1 className="font-sans font-bold text-base tracking-tight leading-none text-white truncate">RestoPro</h1>
              <span className="text-[10px] text-white/60 font-mono tracking-widest uppercase">Peru SaaS POS</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isDispatch = item.href === '/despachar';
            const badge = isDispatch ? (readyCount || undefined) : item.badge;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeOpen}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm backdrop-blur-sm'
                    : 'text-white/80 hover:bg-white/5 hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand-accent rounded-r-full" />
                )}
                <span className="relative shrink-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-brand-accent' : 'text-white/60'
                    }`}
                  />
                  {/* Punto rojo cuando el sidebar está colapsado */}
                  {isDispatch && !!badge && isCollapsed && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-brand-dark" />
                  )}
                </span>
                {!isCollapsed && (
                  <>
                    <span className="grow text-left truncate">{item.label}</span>
                    {badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ${
                        isDispatch
                          ? 'bg-rose-500 text-white font-bold animate-pulse'
                          : isActive ? 'bg-white/15 text-white' : 'bg-black/20 text-brand-accent font-medium'
                      }`}>
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}

          {/* Configuración (acordeón) */}
          {canSeeConfig && (
            <div>
              <button
                type="button"
                onClick={() => (isCollapsed ? toggleCollapsed() : setIsConfigOpen(v => !v))}
                title={isCollapsed ? 'Configuración' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isConfigRoute
                    ? 'bg-white/10 text-white shadow-sm backdrop-blur-sm'
                    : 'text-white/80 hover:bg-white/5 hover:text-white'
                }`}
              >
                {isConfigRoute && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand-accent rounded-r-full" />
                )}
                <Settings
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isConfigRoute ? 'text-brand-accent' : 'text-white/60'
                  }`}
                />
                {!isCollapsed && (
                  <>
                    <span className="grow text-left truncate">Configuración</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform duration-200 ${
                        isConfigOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </>
                )}
              </button>

              {!isCollapsed && isConfigOpen && (
                <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                  {configSubItems.map(sub => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={closeOpen}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                          isSubActive
                            ? 'bg-white/10 text-white'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        {sub.badge === 'PRO' && (
                          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent">
                            PRO
                          </span>
                        )}
                        {sub.badge === 'NEW' && (
                          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            NEW
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Playground */}
          <div className={`border-t border-brand-hover/40 my-3 pt-3 ${isCollapsed ? 'mx-0' : ''}`}>
            {!isCollapsed && (
              <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 px-3 mb-2">
                PLAYGROUND
              </div>
            )}
            <Link
              href="/ui-components"
              onClick={closeOpen}
              title={isCollapsed ? 'Componentes UI' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                pathname === '/ui-components'
                  ? 'bg-brand-hover text-white shadow-md'
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              {pathname === '/ui-components' && (
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand-accent rounded-r-full" />
              )}
              <Boxes
                className={`h-4 w-4 shrink-0 ${
                  pathname === '/ui-components' ? 'text-brand-accent' : 'text-white/60'
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="grow text-left">Componentes UI</span>
                  <span className="text-[9px] bg-brand-accent text-brand px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
                    Nuevo
                  </span>
                </>
              )}
            </Link>
          </div>
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="px-4 py-3 border-t border-brand-hover bg-brand-deeper/30 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex flex-col w-1 h-8 rounded-full overflow-hidden shrink-0">
                <div className="bg-[#D91B5C] h-1/3" />
                <div className="bg-white h-1/3" />
                <div className="bg-[#D91B5C] h-1/3" />
              </div>
              <div className="text-xs min-w-0">
                <p className="font-semibold text-white/95 truncate">RestoPro Perú</p>
                <p className="text-[10px] text-white/50 truncate">RUC: 20123456789</p>
              </div>
            </div>
          </div>
        )}

      </aside>
    </>
  );
}
