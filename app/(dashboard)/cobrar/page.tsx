'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt, Lock, ShieldAlert, Users, Coins, CreditCard, Smartphone, CheckCircle2,
  Grid, ShoppingBag, Bike, Search, X, Clock, MapPin, Phone, Pencil, ClipboardList,
  FileText, Ban, Divide, Loader2, Wallet,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import type { PaymentMethod, DocType, OrderItem, OrderType, CustomerDoc, ChargeInput } from '@/types';

const money = (n: number) => `S/. ${n.toFixed(2)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const onlyDigits = (s: string) => s.replace(/\D/g, '');

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

/** Mensajes de error del servicio de facturación electrónica. */
const EMIT_ERRORS: Record<string, string> = {
  ruc_invalido:           'El RUC ingresado no es válido (debe tener 11 dígitos).',
  razon_social_requerida: 'Falta la razón social para emitir la factura.',
  dni_invalido:           'El DNI debe tener 8 dígitos.',
  invalid_doc_type:       'Tipo de comprobante inválido.',
  provider_error:         'El servicio de facturación rechazó el comprobante.',
  provider_unreachable:   'No se pudo contactar al servicio de facturación.',
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
  const { tables, activeOrders, salesHistory, isCajaOpen } = useApp();
  const { currentUser } = useAuth();
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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

function ChargePanel({
  selected, isCajaOpen, cashier, onAddItems, onClosed,
}: {
  selected: Chargeable;
  isCajaOpen: boolean;
  cashier?: string;
  onAddItems: () => void;
  onClosed: () => void;
}) {
  const { chargeTable, chargeOrder, triggerToast } = useApp();

  /* ── Cuentas separadas ── */
  const [splitMode, setSplitMode] = useState<SplitMode>('full');
  const [equalParts, setEqualParts] = useState(2);
  const [paidEqual, setPaidEqual] = useState(0);
  const [paidItemIds, setPaidItemIds] = useState<Set<string>>(new Set());
  const [pickItemIds, setPickItemIds] = useState<Set<string>>(new Set());

  /* ── Comprobante ── */
  const [docType, setDocType] = useState<DocType>('Boleta');
  const [docNumber, setDocNumber] = useState('');
  const [docName, setDocName] = useState('');

  /* ── Pago ── */
  const [method, setMethod] = useState<PaymentMethod>('Efectivo');
  const [received, setReceived] = useState('');
  const [emitting, setEmitting] = useState(false);

  const total = selected.total;
  const started = paidEqual > 0 || paidItemIds.size > 0; // ya se cobró alguna parte
  const splitLocked = started; // no cambiar de modo a mitad de un cobro dividido

  /* ── Cálculo del monto a cobrar según el modo ── */
  const partAmount = round2(total / equalParts);
  const remainingParts = equalParts - paidEqual;
  const equalDue = remainingParts <= 1 ? round2(total - partAmount * (equalParts - 1)) : partAmount;

  const unpaidItems = selected.items.filter(i => !paidItemIds.has(i.product.id));
  const pickedItems = unpaidItems.filter(i => pickItemIds.has(i.product.id));
  const itemsDue = round2(pickedItems.reduce((s, i) => s + i.product.price * i.quantity, 0));

  const amountDue =
    splitMode === 'full'  ? total :
    splitMode === 'equal' ? equalDue :
    itemsDue;

  const willCloseAfter =
    splitMode === 'full'  ? true :
    splitMode === 'equal' ? remainingParts <= 1 :
    unpaidItems.length > 0 && pickedItems.length === unpaidItems.length;

  const itemsCountForCharge =
    splitMode === 'items' ? pickedItems.reduce((s, i) => s + i.quantity, 0) :
    splitMode === 'equal' ? Math.max(1, Math.round(selected.itemsCount / equalParts)) :
    selected.itemsCount;

  const base = round2(amountDue / 1.18);
  const igv = round2(amountDue - base);

  const receivedNum = received === '' ? null : Number(received);
  const change = method === 'Efectivo' && receivedNum != null ? round2(receivedNum - amountDue) : null;

  /* ── Validación ── */
  const validate = (): string | null => {
    if (!isCajaOpen) return 'La caja está cerrada.';
    if (amountDue <= 0) {
      return splitMode === 'items' ? 'Selecciona al menos un ítem para esta cuenta.' : 'Monto a cobrar inválido.';
    }
    if (docType === 'Factura') {
      if (onlyDigits(docNumber).length !== 11) return 'La factura requiere un RUC válido (11 dígitos).';
      if (!docName.trim()) return 'Ingresa la razón social para la factura.';
    }
    if (docType === 'Boleta' && docNumber && onlyDigits(docNumber).length !== 8) {
      return 'El DNI debe tener 8 dígitos (o déjalo vacío para cliente varios).';
    }
    if (method === 'Efectivo' && receivedNum != null && receivedNum < amountDue) {
      return 'El efectivo recibido es menor al monto a cobrar.';
    }
    return null;
  };
  const validationError = validate();

  /* ── Cobro ── */
  const doCharge = async () => {
    const err = validate();
    if (err) { triggerToast(err, 'warning'); return; }

    const customerDoc: CustomerDoc | undefined =
      docType === 'Factura'
        ? { type: 'RUC', number: onlyDigits(docNumber), name: docName.trim() }
        : docType === 'Boleta' && onlyDigits(docNumber).length === 8
          ? { type: 'DNI', number: onlyDigits(docNumber), name: docName.trim() || 'Cliente' }
          : undefined;

    const chargingItems = splitMode === 'items' ? pickedItems : selected.items;

    /* Emisión electrónica ante SUNAT (solo boleta/factura). */
    if (docType !== 'Nota de venta') {
      setEmitting(true);
      try {
        const res = await fetch('/api/emitir-comprobante', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docType,
            total: amountDue,
            customer: customerDoc,
            items: chargingItems.map(i => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          triggerToast(EMIT_ERRORS[data?.error] ?? 'No se pudo emitir el comprobante.', 'error');
          setEmitting(false);
          return;
        }
      } catch {
        triggerToast('No se pudo conectar con el servicio de facturación electrónica.', 'error');
        setEmitting(false);
        return;
      }
      setEmitting(false);
    }

    const input: ChargeInput = {
      method,
      docType,
      cashier,
      customer: customerDoc?.name ?? selected.customer,
      customerDoc,
      received: method === 'Efectivo' && receivedNum != null ? receivedNum : undefined,
      amount: amountDue,
      itemsCount: itemsCountForCharge,
      closeAfter: willCloseAfter,
    };

    const sale = selected.kind === 'mesa'
      ? chargeTable(selected.ref, input)
      : chargeOrder(selected.ref, input);
    if (!sale) return;

    if (sale.change != null && sale.change > 0) {
      triggerToast(`Vuelto a entregar: ${money(sale.change)}`, 'info');
    }

    if (willCloseAfter) {
      onClosed();
      return;
    }

    /* Cuenta parcial: registrar avance y limpiar el formulario para la siguiente. */
    if (splitMode === 'equal') setPaidEqual(p => p + 1);
    if (splitMode === 'items') {
      setPaidItemIds(prev => new Set([...prev, ...pickedItems.map(i => i.product.id)]));
      setPickItemIds(new Set());
    }
    setReceived('');
    setDocNumber('');
    setDocName('');
  };

  const toggleItem = (id: string) =>
    setPickItemIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const changeSplitMode = (m: SplitMode) => {
    if (splitLocked) return;
    setSplitMode(m);
    setPickItemIds(new Set());
  };

  const paidAmount = round2(
    splitMode === 'equal' ? paidEqual * partAmount :
    splitMode === 'items' ? selected.items.filter(i => paidItemIds.has(i.product.id)).reduce((s, i) => s + i.product.price * i.quantity, 0) :
    0
  );
  const remaining = round2(total - paidAmount);

  const quickCash = [amountDue, 20, 50, 100, 200];

  return (
    <div className="card-lg p-5 space-y-4 sticky top-20">
      {/* Encabezado */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${TYPE_META[selected.kind].badge}`}>
            {TYPE_META[selected.kind].icon} {TYPE_META[selected.kind].label}
          </span>
          <h4 className="text-sm font-bold text-slate-800">{selected.kind === 'mesa' ? selected.label : selected.ref}</h4>
        </div>
        {selected.kind === 'mesa' && !started && (
          <button onClick={onAddItems} className="text-[11px] font-medium text-brand hover:underline inline-flex items-center gap-1">
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

      {/* Detalle de ítems (con selección en modo "por ítems") */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto border-t border-slate-200 pt-3">
        {selected.items.map(i => {
          const isPaid = paidItemIds.has(i.product.id);
          const selectable = splitMode === 'items' && !isPaid;
          const picked = pickItemIds.has(i.product.id);
          return (
            <button
              key={i.product.id}
              type="button"
              disabled={!selectable}
              onClick={() => selectable && toggleItem(i.product.id)}
              className={`w-full flex justify-between items-center text-xs rounded-lg px-2 py-1 transition-colors ${
                selectable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
              } ${picked ? 'bg-brand/5 ring-1 ring-brand/30' : ''} ${isPaid ? 'opacity-40 line-through' : ''}`}
            >
              <span className="text-slate-600 flex items-center gap-1.5">
                {splitMode === 'items' && !isPaid && (
                  <span className={`h-3 w-3 rounded border ${picked ? 'bg-brand border-brand' : 'border-slate-300'} inline-flex items-center justify-center`}>
                    {picked && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                  </span>
                )}
                {i.quantity}× {i.product.name}{isPaid && ' (pagado)'}
              </span>
              <span className="font-mono text-slate-700">{money(i.product.price * i.quantity)}</span>
            </button>
          );
        })}
      </div>

      {/* Cuentas separadas */}
      <div className="border-t border-slate-200 pt-3 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Divide className="h-3.5 w-3.5" /> Forma de cobro
        </p>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
          {([
            { id: 'full' as const,  label: 'Pago único' },
            { id: 'equal' as const, label: 'Partes iguales' },
            { id: 'items' as const, label: 'Por ítems' },
          ]).map(m => (
            <button
              key={m.id}
              onClick={() => changeSplitMode(m.id)}
              disabled={splitLocked && splitMode !== m.id}
              className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                splitMode === m.id ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-800 disabled:opacity-40'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {splitMode === 'equal' && (
          <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <label className="text-[11px] text-slate-600">Dividir entre</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={20}
                value={equalParts}
                disabled={splitLocked}
                onChange={e => setEqualParts(Math.max(2, Math.min(20, parseInt(e.target.value, 10) || 2)))}
                className="input w-16 px-2 py-1 text-xs text-center disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-600">personas</span>
            </div>
          </div>
        )}

        {(splitMode === 'equal' || splitMode === 'items') && (
          <div className="text-[11px] text-slate-500 flex justify-between bg-emerald-50 rounded-lg px-3 py-1.5">
            <span>{splitMode === 'equal' ? `Parte ${Math.min(paidEqual + 1, equalParts)} de ${equalParts}` : 'Cuenta en curso'}</span>
            <span className="font-mono">Abonado {money(paidAmount)} · Falta {money(remaining)}</span>
          </div>
        )}
      </div>

      {/* Comprobante */}
      <div className="border-t border-slate-200 pt-3 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Comprobante</p>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { id: 'Boleta' as const,       label: 'Boleta',        icon: <Receipt className="h-3.5 w-3.5" /> },
            { id: 'Factura' as const,      label: 'Factura',       icon: <FileText className="h-3.5 w-3.5" /> },
            { id: 'Nota de venta' as const, label: 'Sin comprob.', icon: <Ban className="h-3.5 w-3.5" /> },
          ]).map(d => (
            <button
              key={d.id}
              onClick={() => setDocType(d.id)}
              className={`py-2 text-[10px] font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${
                docType === d.id ? 'bg-brand/10 border-brand text-brand' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {d.icon} {d.label}
            </button>
          ))}
        </div>

        {docType === 'Boleta' && (
          <div className="space-y-2">
            <input
              value={docNumber}
              onChange={e => setDocNumber(onlyDigits(e.target.value).slice(0, 8))}
              inputMode="numeric"
              placeholder="DNI (opcional)"
              className="input w-full px-3 py-2 text-xs"
            />
            <input
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="Nombre del cliente (opcional)"
              className="input w-full px-3 py-2 text-xs"
            />
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Users className="h-3 w-3" /> Sin DNI se emite como <strong>&nbsp;Cliente varios</strong> (público general).
            </p>
          </div>
        )}

        {docType === 'Factura' && (
          <div className="space-y-2">
            <input
              value={docNumber}
              onChange={e => setDocNumber(onlyDigits(e.target.value).slice(0, 11))}
              inputMode="numeric"
              placeholder="RUC (11 dígitos) *"
              className="input w-full px-3 py-2 text-xs"
            />
            <input
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="Razón social *"
              className="input w-full px-3 py-2 text-xs"
            />
          </div>
        )}

        {docType === 'Nota de venta' && (
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <Ban className="h-3.5 w-3.5 shrink-0" /> No se emitirá boleta ni factura electrónica (venta interna).
          </p>
        )}
      </div>

      {/* Totales de la cuenta a cobrar */}
      <div className="space-y-1 text-xs border-t border-slate-200 pt-3">
        <div className="flex justify-between font-mono text-slate-500"><span>Op. gravada</span><span>{money(base)}</span></div>
        <div className="flex justify-between font-mono text-slate-500"><span>IGV (18%)</span><span>{money(igv)}</span></div>
        <div className="flex justify-between font-mono font-bold text-base text-slate-800 pt-1">
          <span>{splitMode === 'full' ? 'Total' : 'A cobrar ahora'}</span><span>{money(amountDue)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div className="space-y-2 border-t border-slate-200 pt-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Método de pago</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PAYMENTS.map(p => (
            <button
              key={p.id}
              onClick={() => setMethod(p.id)}
              className={`py-2 text-[10px] font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${
                method === p.id ? 'bg-brand/10 border-brand text-brand' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* Efectivo → vuelto */}
        {method === 'Efectivo' && (
          <div className="space-y-2 bg-slate-50 rounded-xl p-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> ¿Con cuánto paga?
            </label>
            <input
              value={received}
              onChange={e => setReceived(onlyDigits(e.target.value.replace('.', '')) ? e.target.value.replace(/[^\d.]/g, '') : '')}
              inputMode="decimal"
              placeholder={money(amountDue)}
              className="input w-full px-3 py-2 text-sm font-mono"
            />
            <div className="flex flex-wrap gap-1.5">
              {quickCash.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => setReceived(String(round2(v)))}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-brand hover:text-brand transition-colors"
                >
                  {idx === 0 ? 'Exacto' : money(v)}
                </button>
              ))}
            </div>
            {receivedNum != null && (
              <div className={`flex justify-between items-center text-sm font-bold px-1 ${change != null && change >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                <span className="text-[11px] uppercase tracking-wide">Vuelto</span>
                <span className="font-mono">{change != null ? money(Math.max(0, change)) : money(0)}</span>
              </div>
            )}
            {receivedNum != null && change != null && change < 0 && (
              <p className="text-[10px] text-rose-600">Falta {money(Math.abs(change))} para cubrir el monto.</p>
            )}
          </div>
        )}
      </div>

      {/* Botón cobrar */}
      <button
        onClick={doCharge}
        disabled={!isCajaOpen || emitting || !!validationError}
        className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {emitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Emitiendo comprobante…</>
        ) : (
          <><CheckCircle2 className="h-4 w-4" /> Cobrar {money(amountDue)}{docType !== 'Nota de venta' ? ` · ${docType}` : ''}</>
        )}
      </button>

      {validationError && isCajaOpen && (
        <p className="text-[10px] text-rose-500 text-center -mt-1">{validationError}</p>
      )}

      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        {docType === 'Nota de venta'
          ? 'Se registra la venta en caja sin emitir comprobante electrónico.'
          : 'Al cobrar se emite el comprobante ante SUNAT, se registra en caja y se cierra la cuenta.'}
      </p>
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
