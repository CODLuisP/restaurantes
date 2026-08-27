'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt, Lock, ShieldAlert, Search, X, Clock, MapPin, Phone, ClipboardList, CheckCircle2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import type { OrderType } from '@/types';
import { StatCard } from '@/components/ui';
import ChargePanel from '@/components/cobrar/ChargePanel';
import { money, TYPE_META, type Chargeable, type Filter } from '@/components/cobrar/types';

export default function CobrarPage() {
  const { tables, activeOrders, salesHistory, sucursalCajaAbierta: isCajaOpen } = useApp();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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
  ];

  const q = search.trim().toLowerCase();
  const visible = chargeables
    .filter(c => filter === 'todos' || c.kind === filter)
    .filter(c => !q || c.label.toLowerCase().includes(q) || (c.customer ?? '').toLowerCase().includes(q));

  const selected = selectedKey ? chargeables.find(c => c.key === selectedKey) ?? null : null;

  const counts = {
    todos: chargeables.length,
    mesa: chargeables.filter(c => c.kind === 'mesa').length,
    llevar: chargeables.filter(c => c.kind === 'llevar').length,
    delivery: chargeables.filter(c => c.kind === 'delivery').length,
  };
  const pendientes = chargeables.length;
  const completadas = salesHistory.length;
  const total = pendientes + completadas;

  return (
    <div className="space-y-6 animate-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand" /> Cobrar / Facturación
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Todas las comandas por cobrar — en mesa, para llevar y delivery — en un solo lugar.
          </p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-bold inline-flex items-center gap-1.5 w-max ${
          isCajaOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
        }`}>
          <Lock className="h-3.5 w-3.5" /> Caja {isCajaOpen ? 'Abierta' : 'Cerrada'}
        </span>
      </div>

      {!isCajaOpen && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 flex items-center gap-2.5">
          <Lock className="h-4 w-4 shrink-0" /> La caja está cerrada. Aperture la caja para poder cobrar.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<ClipboardList className="h-4 w-4" />} tone="brand"   label="Total comandas" value={`${total}`} />
        <StatCard icon={<Clock className="h-4 w-4" />}         tone="amber"   label="Pendientes de cobro" value={`${pendientes}`} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />}  tone="emerald" label="Completadas (cobradas)" value={`${completadas}`} />
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por mesa, cliente o código de pedido..."
          className="input w-full pl-9 pr-9 py-2.5 text-sm"
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
        ]).map(f => (
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista */}
        <div className="lg:col-span-7 space-y-3">
          {visible.length === 0 ? (
            <div className="card-lg p-10 text-center text-xs text-slate-400 italic">
              No hay comandas por cobrar {filter !== 'todos' ? `de tipo "${TYPE_META[filter as OrderType].label}"` : ''}.
              Las comandas que envían los mozos desde el Comandero aparecerán aquí.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visible.map(c => {
                const active = selectedKey === c.key;
                const meta = TYPE_META[c.kind];
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelectedKey(c.key)}
                    className={`card-lg p-4 text-left transition-all ${active ? 'ring-2 ring-brand border-brand' : 'hover:shadow-md'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${meta.badge}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {c.time && <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Clock className="h-3 w-3" /> {c.time}</span>}
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-2">{c.kind === 'mesa' ? c.label : c.customer}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{c.kind === 'mesa' ? `Mozo: ${c.waiter ?? '—'}` : c.ref}</p>
                    {c.kind === 'mesa' && c.pedidoEstado && c.pedidoEstado !== 'entregado' && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                        Esperando entrega
                      </span>
                    )}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">{c.itemsCount} items</span>
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
              <div className="text-center py-12 text-slate-400 space-y-2">
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
              onClosed={() => setSelectedKey(null)}
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

type SplitMode = 'full' | 'equal' | 'items';