'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt, Lock, ShieldAlert, Users, Coins, CreditCard, Smartphone, CheckCircle2,
  Grid, ShoppingBag, Bike, Search, X, Clock, MapPin, Phone, Pencil, ClipboardList,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import type { PaymentMethod, DocType, OrderItem, OrderType } from '@/types';

const money = (n: number) => `S/. ${n.toFixed(2)}`;

const PAYMENTS: { id: PaymentMethod; label: string; icon: React.ReactNode; cls: string }[] = [
  { id: 'Efectivo',    label: 'Efectivo',    icon: <Coins className="h-4 w-4" />,      cls: 'bg-brand hover:bg-brand-hover' },
  { id: 'Yape / Plin', label: 'Yape / Plin', icon: <Smartphone className="h-4 w-4" />, cls: 'bg-emerald-600 hover:bg-emerald-700' },
  { id: 'Tarjeta',     label: 'Tarjeta',     icon: <CreditCard className="h-4 w-4" />, cls: 'bg-sky-700 hover:bg-sky-800' },
];

const TYPE_META: Record<OrderType, { label: string; icon: React.ReactNode; badge: string }> = {
  mesa:     { label: 'En mesa',     icon: <Grid className="h-3 w-3" />,        badge: 'bg-emerald-100 text-emerald-700' },
  llevar:   { label: 'Para llevar', icon: <ShoppingBag className="h-3 w-3" />, badge: 'bg-amber-100 text-amber-700' },
  delivery: { label: 'Delivery',    icon: <Bike className="h-3 w-3" />,        badge: 'bg-violet-100 text-violet-700' },
};

/** Elemento cobrable unificado (mesa ocupada o pedido para llevar/delivery). */
interface Chargeable {
  key: string;
  kind: OrderType;
  ref: string;            // nombre de mesa o id de pedido
  label: string;
  customer?: string;
  phone?: string;
  address?: string;
  waiter?: string;
  items: OrderItem[];
  total: number;
  itemsCount: number;
  time?: string;
}

type Filter = 'todos' | OrderType;

export default function CobrarPage() {
  const { tables, activeOrders, salesHistory, chargeTable, chargeOrder, isCajaOpen } = useApp();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocType>('Boleta');

  const canCharge = currentUser?.role === 'admin' || currentUser?.role === 'cajero';

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
        waiter: t.waiter, items: t.items ?? [], total: t.cuenta,
        itemsCount: (t.items ?? []).reduce((s, i) => s + i.quantity, 0),
      })),
    ...activeOrders.map(o => ({
      key: `${o.type}-${o.id}`, kind: o.type, ref: o.id, label: o.id,
      customer: o.customer, phone: o.phone, address: o.address, waiter: o.waiter,
      items: o.items, total: o.total, itemsCount: o.itemsCount, time: o.createdAt,
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

  const base = selected ? selected.total / 1.18 : 0;
  const igv = selected ? selected.total - base : 0;

  const handleCharge = (method: PaymentMethod) => {
    if (!selected) return;
    const sale = selected.kind === 'mesa'
      ? chargeTable(selected.ref, method, docType, currentUser?.name, selected.customer)
      : chargeOrder(selected.ref, method, docType, currentUser?.name);
    if (sale) setSelectedKey(null);
  };

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
          <div className="card-lg p-5 space-y-4 sticky top-20">
            {!selected ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Receipt className="h-8 w-8 mx-auto stroke-[1.5]" />
                <p className="text-xs">Selecciona una comanda para ver el detalle y cobrar.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${TYPE_META[selected.kind].badge}`}>
                      {TYPE_META[selected.kind].icon} {TYPE_META[selected.kind].label}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800">{selected.kind === 'mesa' ? selected.label : selected.ref}</h4>
                  </div>
                  {selected.kind === 'mesa' && (
                    <button
                      onClick={() => router.push(`/pos?mesa=${encodeURIComponent(selected.ref)}`)}
                      className="text-[11px] font-medium text-brand hover:underline inline-flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Agregar platos
                    </button>
                  )}
                </div>

                {/* Cliente / mozo */}
                <div className="text-xs text-slate-600 space-y-1">
                  {selected.customer && <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" /> {selected.customer}</p>}
                  {selected.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {selected.phone}</p>}
                  {selected.address && <p className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5" /> {selected.address}</p>}
                  <p className="text-[10px] text-slate-400">Mozo: {selected.waiter ?? '—'}</p>
                </div>

                {/* Detalle */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto border-t border-slate-200 pt-3">
                  {selected.items.map(i => (
                    <div key={i.product.id} className="flex justify-between text-xs">
                      <span className="text-slate-600">{i.quantity}× {i.product.name}</span>
                      <span className="font-mono text-slate-700">{money(i.product.price * i.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Totales */}
                <div className="space-y-1 text-xs border-t border-slate-200 pt-3">
                  <div className="flex justify-between font-mono text-slate-500"><span>Op. gravada</span><span>{money(base)}</span></div>
                  <div className="flex justify-between font-mono text-slate-500"><span>IGV (18%)</span><span>{money(igv)}</span></div>
                  <div className="flex justify-between font-mono font-bold text-base text-slate-800 pt-1"><span>Total</span><span>{money(selected.total)}</span></div>
                </div>

                {/* Comprobante */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Comprobante</label>
                  <select value={docType} onChange={e => setDocType(e.target.value as DocType)} className="input w-full px-3 py-2">
                    <option value="Boleta">Boleta</option>
                    <option value="Factura">Factura</option>
                  </select>
                </div>

                {/* Pago */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Método de pago</p>
                  {PAYMENTS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleCharge(p.id)}
                      disabled={!isCajaOpen}
                      className={`${p.cls} w-full text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed`}
                    >
                      {p.icon} Cobrar con {p.label} · {money(selected.total)}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Al cobrar se emite el comprobante, se registra en caja y se cierra la comanda.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stat card ─────────────────────────────────────────────── */
const TONES: Record<string, string> = {
  brand:   'bg-brand/10 text-brand',
  amber:   'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

function StatCard({ icon, tone, label, value }: { icon: React.ReactNode; tone: string; label: string; value: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TONES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide truncate">{label}</p>
        <p className="text-lg font-mono font-bold text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}
