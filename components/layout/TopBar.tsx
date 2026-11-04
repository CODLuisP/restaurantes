'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, Menu, LogOut, ChevronRight, Calendar } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth, ROLE_LABELS } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const CARTA_TAB_NAMES: Record<string, string> = {
  carta: 'Listado',
  importar: 'Importar',
  banners: 'Banners',
  qr: 'QR y Link',
  redes: 'Redes Sociales',
  horarios: 'Horarios',
  cierres: 'Cierres Programados',
};

function getBreadcrumbs(pathname: string, searchParams: URLSearchParams): BreadcrumbItem[] {
  // Always starts with Sistema linking to dashboard
  const base: BreadcrumbItem[] = [{ label: 'Sistema', href: '/dashboard' }];

  if (pathname === '/dashboard') {
    base.push({ label: 'Dashboard' });
    return base;
  }

  if (pathname.startsWith('/carta')) {
    base.push({ label: 'Productos', href: '/carta?tab=carta' });
    const tab = searchParams.get('tab') || 'carta';
    const tabLabel = CARTA_TAB_NAMES[tab] || 'Listado';
    base.push({ label: tabLabel });
    return base;
  }

  if (pathname.startsWith('/caja/')) {
    base.push({ label: 'Caja', href: '/caja' });
    if (pathname === '/caja/corte') {
      base.push({ label: 'Corte' });
    } else if (pathname === '/caja/ventas-dia') {
      base.push({ label: 'Ventas del día' });
    } else {
      const rest = pathname.replace('/caja/', '');
      base.push({ label: rest });
    }
    return base;
  }

  if (pathname.startsWith('/configuracion/')) {
    base.push({ label: 'Configuración', href: '/configuracion/negocio' });
    const sub = pathname.replace('/configuracion/', '');
    if (sub === 'negocio') base.push({ label: 'Negocio' });
    else if (sub === 'metodos-pago') base.push({ label: 'Métodos de pago' });
    else if (sub === 'metodos-entrega') base.push({ label: 'Métodos de entrega' });
    else if (sub === 'tickets') base.push({ label: 'Tickets' });
    else base.push({ label: sub });
    return base;
  }

  // General mappings
  const DIRECT_NAMES: Record<string, string> = {
    '/comandero': 'Comandero',
    '/cobrar': 'Cobrar / Facturación',
    '/pedidos': 'Pedidos',
    '/cocina': 'Cocina',
    '/despachar': 'Por despachar',
    '/caja': 'Caja',
    '/gastos': 'Gastos',
    '/comprobantes': 'Comprobantes',
    '/clientes': 'Clientes',
    '/usuarios': 'Personal',
    '/sucursales': 'Sucursales',
    '/facturacion': 'SUNAT',
    '/reportes': 'Reportes',
    '/configuracion': 'Configuración',
    '/delivery': 'Delivery',
    '/ui-components': 'Componentes UI',
  };

  const name = DIRECT_NAMES[pathname] || (pathname.slice(1) ? pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2) : '');
  if (name) {
    base.push({ label: name });
  }

  return base;
}

function formatCurrentDate(): string {
  const now = new Date();
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const diaSemana = dias[now.getDay()];
  const dia = now.getDate();
  const mes = meses[now.getMonth()];
  const anio = now.getFullYear();
  return `${diaSemana}, ${dia} de ${mes} del ${anio}`;
}

export default function TopBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { toggleOpen, isCollapsed, toggleCollapsed } = useSidebar();
  const { sucursalLogo, empresa } = useApp();
  const displayLogo = sucursalLogo || empresa?.logoUrl;

  const [dateStr, setDateStr] = useState('');
  useEffect(() => {
    setDateStr(formatCurrentDate());
  }, []);

  const roleLabel = currentUser ? ROLE_LABELS[currentUser.role] : '';
  const breadcrumbs = getBreadcrumbs(pathname, searchParams);

  return (
    <header className="sticky top-0 right-0 z-10 w-full h-16 bg-white border-b border-border-card px-4 md:px-6 flex items-center justify-between transition-colors duration-300">
      {/* Left: toggle + breadcrumb + date */}
      <div className="flex items-center gap-2 md:gap-3 flex-wrap min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={toggleOpen}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Desktop sidebar collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors shrink-0"
          title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs md:text-sm font-medium leading-none">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 stroke-2" />
                )}
                {isLast || !crumb.href ? (
                  <span className="text-slate-800 font-semibold">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Date */}
        {dateStr && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 ml-2 font-normal">
            <Calendar className="w-3.5 h-3.5 text-slate-400 stroke-[1.8]" />
            <span>{dateStr}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 shrink-0">
        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(v => !v)}
            className="flex items-center gap-2 hover:bg-slate-200/60 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center border border-white/20 text-xs shadow-inner overflow-hidden shrink-0">
              {displayLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayLogo}
                  alt="Logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-semibold tracking-tight">WB</span>
              )}
            </div>
            <div className="text-left hidden lg:block select-none leading-tight">
              <p className="text-xs font-semibold text-slate-800">WB</p>
              <p className="text-[11px] text-brand font-sans font-medium tracking-normal capitalize">
                {roleLabel ? (roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1).toLowerCase()) : 'Administrador'}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-400">Usuario conectado</p>
                <p className="text-xs font-bold text-slate-800 truncate">{currentUser?.email ?? '—'}</p>
                <p className="text-[10px] text-brand font-medium mt-0.5">{roleLabel}</p>
              </div>
              <Link
                href="/configuracion/negocio"
                onClick={() => setShowProfileMenu(false)}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors block font-medium"
              >
                Configuración del Negocio
              </Link>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => { setShowProfileMenu(false); logout(); }}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 font-medium"
              >
                <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
