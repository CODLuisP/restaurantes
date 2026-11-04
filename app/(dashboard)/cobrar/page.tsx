'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Receipt, Lock, ShieldAlert, Search, X, Clock, MapPin, Phone, ClipboardList, CheckCircle2, Loader2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import type { OrderType } from '@/types';
import ChargePanel from '@/components/cobrar/ChargePanel';
import { money, TYPE_META, type Chargeable, type Filter } from '@/components/cobrar/types';
import { getVentas } from '@/lib/api/ventas';
import { toFechaParam } from '@/lib/api/reportes';

export default function CobrarPage() {
  const { tables, activeOrders, sucursalCajaAbierta: isCajaOpen, metodosEntrega, cobrosEnCurso, impresoraCocina } = useApp();
  const { currentUser } = useAuth();
  const { data: authSession } = useSession();
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  /* "Completadas" son las ventas reales del backend cobradas hoy — no el historial mock del
     prototipo, que nunca se conectó y se quedaba mostrando datos de ejemplo aunque la base esté vacía. */
  const [completadasHoy, setCompletadasHoy] = useState(0);

  const refreshCompletadas = useCallback(() => {
    const token = authSession?.accessToken;
    const sucursalId = authSession?.user?.sucursalId ?? undefined;
    if (!token) return;
    const hoy = toFechaParam(new Date());
    getVentas(token, { sucursalId, fechaInicio: hoy, fechaFin: hoy })
      .then(ventas => setCompletadasHoy(ventas.length))
      .catch(() => {});
  }, [authSession]);

  /* También al terminar cada cobro en segundo plano (la cola se achica). */
  useEffect(() => { refreshCompletadas(); }, [refreshCompletadas, cobrosEnCurso.length]);

  const canCharge = currentUser?.role === 'admin' || currentUser?.role === 'cajero';

  /* Llegó desde el botón "Cobrar" del plano de mesas (?mesa=): abre esa cuenta directo. */
  useEffect(() => {
    const mesa = new URLSearchParams(window.location.search).get('mesa');
    if (!mesa) return;
    const match = tables.find(t => t.name === mesa && t.status === 'ocupada');
    if (match) { setSelectedKey(`mesa-${match.id}`); setFilter('mesa'); }
  }, [tables]);

  if (!canCharge) {
    return (
      <div className="card-lg max-w-md mx-auto my-16 p-8 text-center space-y-3 animate-section">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Acceso restringido</h3>
        <p className="text-xs text-slate-500">Solo el <strong>cajero</strong> o el <strong>administrador</strong> pueden cobrar y facturar.</p>
      </div>
    );
  }

  /* Unifica mesas ocupadas + pedidos para llevar/delivery en una sola lista */
  const chargeables: Chargeable[] = [
    ...tables
      .filter(t => t.status === 'ocupada' && t.cuenta > 0)
      .map(t => ({
        key: `mesa-${t.id}`, kind: 'mesa' as const, ref: t.name, label: t.name,
        sesionMesaId: t.sesionMesaId,
        waiter: t.waiter, items: t.items ?? [], total: t.cuenta,
        itemsCount: (t.items ?? []).reduce((s, i) => s + i.quantity, 0),
        pedidoEstado: t.pedidoEstado,
      })),
    ...activeOrders.map(o => ({
      key: `${o.type}-${o.id}`, kind: o.type, ref: o.id, label: o.id,
      sesionMesaId: o.sesionMesaId,
      customer: o.customer, phone: o.phone, address: o.address, waiter: o.waiter,
      items: o.items, total: o.total, itemsCount: o.itemsCount, time: o.createdAt,
      pedidoEstado: o.pedidoEstado,
    })),
  ].filter(c => !cobrosEnCurso.includes(c.key)); // las que se están cobrando en segundo plano ya no se ofrecen

  /* Búsqueda sin tildes ni mayúsculas sobre lo que se ve en la tarjeta: "Mesa 1" (el nombre interno
     es solo "1"), mozo, cliente y N° de pedido ("#123" o "123"). */
  const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const q = normalizar(search);
  const coincide = (c: Chargeable) => {
    if (!q) return true;
    const texto = normalizar([
      c.kind === 'mesa' ? `Mesa ${c.label}` : '', c.label, c.customer ?? '', c.waiter ?? '',
      `#${c.ref}`, `Pedido #${c.ref}`, c.phone ?? '',
    ].join(' '));
    return q.split(/\s+/).every(palabra => texto.includes(palabra));
  };
  const visible = chargeables
    .filter(c => filter === 'todos' || c.kind === filter)
    .filter(coincide);

  const selected = selectedKey ? chargeables.find(c => c.key === selectedKey) ?? null : null;

  const counts = {
    todos: chargeables.length,
    mesa: chargeables.filter(c => c.kind === 'mesa').length,
    llevar: chargeables.filter(c => c.kind === 'llevar').length,
    delivery: chargeables.filter(c => c.kind === 'delivery').length,
  };
  const pendientes = chargeables.length;
  const completadas = completadasHoy;
  const total = pendientes + completadas;

  return (
    <div className="space-y-3 animate-section">
      {/* Header: título, indicadores y estado de caja en una sola fila */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Receipt className="h-5 w-5 text-brand" /> Cobrar / Facturación
          {/* Cobros que se están registrando en segundo plano (API/SUNAT): se ve que siguen en curso */}
          {cobrosEnCurso.length > 0 && (
            <span className="ml-1 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-sky-50 border border-sky-200 text-sky-700 inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {cobrosEnCurso.length === 1 ? 'Registrando cobro…' : `Registrando ${cobrosEnCurso.length} cobros…`}
            </span>
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {([
            { icon: <ClipboardList className="h-3.5 w-3.5" />, tone: 'bg-brand/10 text-brand',        label: 'Total',       value: total },
            { icon: <Clock className="h-3.5 w-3.5" />,         tone: 'bg-amber-50 text-amber-600',    label: 'Pendientes',  value: pendientes },
            { icon: <CheckCircle2 className="h-3.5 w-3.5" />,  tone: 'bg-emerald-50 text-emerald-600', label: 'Cobradas hoy', value: completadas },
          ]).map(s => (
            <div key={s.label} className="card px-2.5 py-1.5 flex items-center gap-2">
              <span className={`w-6 h-6 rounded-md flex items-center justify-center ${s.tone}`}>{s.icon}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{s.label}</span>
              <span className="text-sm font-mono font-bold text-slate-800">{s.value}</span>
            </div>
          ))}
          <span className={`text-xs px-3 py-1.5 rounded-full font-bold inline-flex items-center gap-1.5 w-max ${
            isCajaOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
          }`}>
            <Lock className="h-3.5 w-3.5" /> Caja {isCajaOpen ? 'Abierta' : 'Cerrada'}
          </span>
        </div>
      </div>

      {!isCajaOpen && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-xs text-rose-700 flex items-center gap-2.5">
          <Lock className="h-4 w-4 shrink-0" /> La caja está cerrada. Aperture la caja para poder cobrar.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columna izquierda: buscador + filtros + lista */}
        <div className="lg:col-span-7 space-y-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por mesa, cliente o código de pedido..."
              className="input w-full pl-9 pr-9 py-2 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Limpiar">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por tipo */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { id: 'todos' as const,    label: `Todos (${counts.todos})` },
              { id: 'mesa' as const,     label: `En mesa (${counts.mesa})` },
              { id: 'llevar' as const,   label: `Para llevar (${counts.llevar})` },
              { id: 'delivery' as const, label: `Delivery (${counts.delivery})` },
            ])
              // Canales desactivados en Métodos de entrega no se muestran (salvo que aún tengan algo por cobrar).
              .filter(f => f.id === 'todos' || metodosEntrega[f.id].enabled || counts[f.id] > 0)
              .map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f.id ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista */}
          {visible.length === 0 ? (
            <div className="card-lg p-8 text-center text-xs text-slate-400 italic">
              {q
                ? `Ninguna comanda coincide con "${search.trim()}".`
                : <>No hay comandas por cobrar {filter !== 'todos' ? `de tipo "${TYPE_META[filter as OrderType].label}"` : ''}.
                  Las comandas que envían los mozos desde el Comandero aparecerán aquí.</>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visible.map(c => {
                const active = selectedKey === c.key;
                const meta = TYPE_META[c.kind];
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelectedKey(c.key)}
                    className={`card-lg p-3 text-left transition-all ${active ? 'ring-2 ring-brand border-brand' : 'hover:shadow-md'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${meta.badge}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {c.time && <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Clock className="h-3 w-3" /> {c.time}</span>}
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-1.5">{c.kind === 'mesa' ? `Mesa ${c.label}` : c.customer}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{c.kind === 'mesa' ? `Mozo: ${c.waiter ?? '—'}` : `Pedido #${c.ref}`}</p>
                    {!impresoraCocina && c.kind === 'mesa' && c.pedidoEstado && c.pedidoEstado !== 'entregado' && (
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                        Esperando entrega
                      </span>
                    )}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">{c.itemsCount} {c.itemsCount === 1 ? 'ítem' : 'ítems'}</span>
                      <span className="font-mono font-bold text-slate-800">{money(c.total)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel de detalle / cobro */}
        <div className="lg:col-span-5">
          {!selected ? (
            <div className="card-lg p-5 sticky top-20">
              <div className="text-center py-8 text-slate-400 space-y-2">
                <Receipt className="h-8 w-8 mx-auto stroke-[1.5]" />
                <p className="text-xs">Selecciona una comanda para ver el detalle y cobrar.</p>
              </div>
            </div>
          ) : (
            <ChargePanel
              key={selected.key}
              selected={selected}
              isCajaOpen={isCajaOpen}
              cashier={currentUser?.name}
              onAddItems={() => router.push(`/comandero?mesa=${encodeURIComponent(selected.ref)}`)}
              onClosed={() => { setSelectedKey(null); refreshCompletadas(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Panel de cobro: comprobante, vuelto y cuentas separadas
   ══════════════════════════════════════════════════════════════ */

type SplitMode = 'full' | 'items';
