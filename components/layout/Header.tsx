'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, ChevronDown, Command } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const SECTION_NAMES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/pos':           'Punto de Venta',
  '/pedidos':       'Pedidos',
  '/mesas':         'Mesas',
  '/cocina':        'Cocina',
  '/productos':     'Productos',
  '/categorias':    'Categorías',
  '/inventario':    'Inventario',
  '/clientes':      'Clientes',
  '/delivery':      'Delivery',
  '/caja':          'Caja',
  '/reportes':      'Reportes',
  '/configuracion': 'Configuración',
  '/ui-components': 'Componentes de Marca UI/UX',
};

const NOTIFICATIONS = [
  { id: 1, text: 'Stock crítico: "Arroz con Mariscos" menor a 5 porciones.', type: 'danger', time: 'Hace 5 min' },
  { id: 2, text: 'Mesa 4 ha solicitado pre-cuenta.', type: 'info', time: 'Hace 8 min' },
  { id: 3, text: 'Pedido para delivery #1402 de Carlos R. listo para despacho.', type: 'success', time: 'Hace 12 min' },
];

export default function Header() {
  const pathname = usePathname();
  const { searchQuery, setSearchQuery, triggerToast } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const sectionName = SECTION_NAMES[pathname] ?? pathname.slice(1);

  return (
    <header className="sticky top-0 right-0 z-10 w-full h-16 bg-surface-header border-b border-border-card px-6 flex items-center justify-between transition-colors duration-300">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="text-xs bg-slate-200 text-slate-600 font-mono px-2 py-1 rounded">RESTOPRO</span>
        <span className="text-slate-300">/</span>
        <h2 className="text-md font-semibold text-slate-800 capitalize tracking-tight font-sans">
          {sectionName}
        </h2>
      </div>

      {/* Global Search */}
      <div className="w-1/3 max-w-md relative hidden md:block">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={`Buscar en ${sectionName}...`}
          className="w-full pl-9 pr-8 py-1.5 rounded-full text-xs bg-white text-slate-700 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-all font-sans"
        />
        <div className="absolute right-3.5 top-2.5 hidden lg:flex items-center gap-0.5 text-[9px] font-mono text-slate-400 border border-slate-200 bg-white px-1 rounded shadow-xs leading-none">
          <Command className="h-2 w-2" />
          <span>F</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-1 rounded-lg font-bold uppercase tracking-wider font-mono">
          Modo ECO-LIGHT Activo
        </span>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(v => !v); setShowProfileMenu(false); }}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors relative"
          >
            <Bell className="h-4 w-4 stroke-[2]" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 pulse-active" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <span className="text-xs font-semibold text-slate-800">Notificaciones del Sistema</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">3 de Hoy</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {NOTIFICATIONS.map(notif => (
                  <div key={notif.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex gap-2 items-start">
                      <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                        notif.type === 'danger' ? 'bg-rose-500' : notif.type === 'success' ? 'bg-emerald-500' : 'bg-sky-500'
                      }`} />
                      <div>
                        <p className="text-xs text-slate-700 leading-snug">{notif.text}</p>
                        <span className="text-[9px] text-slate-400 font-mono">{notif.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => { setShowNotifications(false); triggerToast('Notificaciones marcadas como leídas', 'success'); }}
                  className="text-[11px] text-brand hover:underline font-medium"
                >
                  Marcar todas como leídas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfileMenu(v => !v); setShowNotifications(false); }}
            className="flex items-center gap-2 hover:bg-slate-200/60 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center border border-white/20 text-xs shadow-inner">
              LC
            </div>
            <div className="text-left hidden lg:block select-none leading-none">
              <p className="text-xs font-semibold text-slate-800">Admin Luis Castrejón</p>
              <p className="text-[9px] text-brand font-mono mt-0.5 tracking-wider">ADMINISTRADOR</p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-400">Usuario conectado</p>
                <p className="text-xs font-bold text-slate-800 truncate">lcastrejonc18_2@unc.edu.pe</p>
              </div>
              <button
                onClick={() => { setShowProfileMenu(false); triggerToast('Perfil no disponible en modo maqueta.', 'info'); }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Mi Perfil (RestoPro ID)
              </button>
              <button
                onClick={() => { setShowProfileMenu(false); triggerToast('Manual de operaciones descargado.', 'success'); }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Documentación del POS
              </button>
              <div className="border-t border-slate-100 my-1" />
              <p className="px-4 py-1.5 text-[9px] font-mono text-slate-400">Licencia: Gold SaaS Premium</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
