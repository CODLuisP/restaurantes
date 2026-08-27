'use client';

import {
  Bike, ChefHat, Clock, ClipboardList, Grid, Lock, MapPin, Pencil, Plus, Receipt,
  ShoppingBag, Trash2, Utensils,
} from 'lucide-react';
import { Spinner } from '@/components/ui';
import type { ActiveOrder, OrderType, Table } from '@/types';
import MesasPanel from './MesasPanel';
import OrderDetailDrawer from './OrderDetailDrawer';
import { googleMapsUrl, type DetailView } from './types';

type TabId = 'todas' | 'mesa' | 'llevar' | 'delivery';

interface OrdersListViewProps {
  tabs: { id: TabId; label: string; icon: React.ReactNode }[];
  activeTab: TabId;
  /** Cambia de pestaña y limpia el borrador en curso. */
  setActiveTab: (t: TabId) => void;
  tables: Table[];
  activeOrders: ActiveOrder[];
  activeOrdersLoading: boolean;
  detailView: DetailView;
  setDetailView: (v: DetailView) => void;
  isCajaOpen: boolean;
  canEdit: boolean;
  busyTables: Table[];
  inProgressCount: number;
  onTableCardClick: (tableName: string) => void;
  onOrderCardClick: (orderId: string) => void;
  onStartNewOrder: (type: OrderType) => void;
  mozoName?: string;
  onEditTable: (tableName: string) => void;
  onEditOrder: (orderId: string) => void;
  onCancelTable: (tableName: string) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onConfirmTable: (tableName: string) => Promise<void>;
  onConfirmOrder: (orderId: string) => Promise<void>;
}

/** Vista principal del comandero: pestañas con mesas ocupadas y pedidos para llevar / delivery. */
export default function OrdersListView({
  tabs, activeTab, setActiveTab, tables, activeOrders, activeOrdersLoading, detailView, setDetailView,
  isCajaOpen, canEdit, busyTables, inProgressCount, onTableCardClick, onOrderCardClick, onStartNewOrder, mozoName,
  onEditTable, onEditOrder, onCancelTable, onCancelOrder, onConfirmTable, onConfirmOrder,
}: OrdersListViewProps) {
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
                Mozo: {mozoName ?? '—'}. Elige el tipo de pedido y arma la comanda.
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1 rounded-xl max-w-lg">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
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

      {activeOrdersLoading && activeTab !== 'mesa' && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 animate-section">
          <Spinner size="xs" /> Cargando pedidos para llevar / delivery...
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
                        onClick={() => onTableCardClick(t.name)}
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
                          onOrderCardClick(o.id);
                        }}
                        className={`card-lg p-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 border-l-4 relative ${
                          o.type === 'llevar' ? 'border-l-amber-500' : 'border-l-indigo-500'
                        } ${o.pedidoEstado === 'pendiente_confirmacion' ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                      >
                        {o.pedidoEstado === 'pendiente_confirmacion' && (
                          <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                            Por Confirmar
                          </span>
                        )}
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
          <MesasPanel onTakeOrder={onTableCardClick} />
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
              onClick={() => onStartNewOrder('llevar')}
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
                  onClick={() => onOrderCardClick(o.id)}
                  className={`card-lg p-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 border-l-4 border-l-amber-500 relative ${
                    o.pedidoEstado === 'pendiente_confirmacion' ? 'ring-2 ring-amber-400 animate-pulse' : ''
                  }`}
                >
                  {o.pedidoEstado === 'pendiente_confirmacion' && (
                    <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                      Por Confirmar
                    </span>
                  )}
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
              onClick={() => onStartNewOrder('delivery')}
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
                    onOrderCardClick(o.id);
                  }}
                  className={`card-lg p-4 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 border-l-4 border-l-indigo-500 relative ${
                    o.pedidoEstado === 'pendiente_confirmacion' ? 'ring-2 ring-amber-400 animate-pulse' : ''
                  }`}
                >
                  {o.pedidoEstado === 'pendiente_confirmacion' && (
                    <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                      Por Confirmar
                    </span>
                  )}
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
          canEdit={canEdit}
          onEditTable={onEditTable}
          onEditOrder={onEditOrder}
          onCancelTable={onCancelTable}
          onCancelOrder={onCancelOrder}
          onConfirmTable={onConfirmTable}
          onConfirmOrder={onConfirmOrder}
        />
      )}
    </div>
  );
}

