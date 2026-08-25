'use client';

import { useState } from 'react';
import {
  Ban, CheckCircle2, Divide, FileText, Loader2, MapPin, Pencil, Phone, Receipt, Users, Wallet,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { PaymentMethod, DocType, CustomerDoc, ChargeInput } from '@/types';
import {
  money, round2, onlyDigits, PAYMENTS, TYPE_META, EMIT_ERRORS, ESTADO_PEDIDO_LABEL, type Chargeable, type SplitMode,
} from './types';
export default function ChargePanel({
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

  /* Mesas solo se pueden cobrar cuando cocina ya entregó todos los platos. Llevar/delivery no
     tienen esta restricción: se pueden cobrar (ej. pago anticipado) antes de que salgan. */
  const esperandoEntrega = selected.kind === 'mesa' && !!selected.pedidoEstado && selected.pedidoEstado !== 'entregado';

  /* ── Validación ── */
  const validate = (): string | null => {
    if (!isCajaOpen) return 'La caja está cerrada.';
    if (esperandoEntrega) return 'Aún no se puede cobrar: faltan platos por entregar en la mesa.';
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
    if (splitMode === 'equal') {
      return 'Partes iguales aún no está disponible — usa Pago único o Por ítems.';
    }
    if (!selected.sesionMesaId) {
      return 'Esta cuenta no tiene una sesión activa en el sistema; no se puede cobrar.';
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
      chargeItems: chargingItems.map(i => ({ pedidoItemId: Number(i.product.id), cantidad: i.quantity })),
    };

    const sale = selected.kind === 'mesa'
      ? await chargeTable(selected.ref, input)
      : await chargeOrder(selected.ref, input);
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

      {esperandoEntrega && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 text-xs font-bold">
          <Loader2 className="h-4 w-4 shrink-0" />
          {ESTADO_PEDIDO_LABEL[selected.pedidoEstado!] ?? 'Pedido en curso'} — no se puede cobrar hasta que se entreguen todos los platos.
        </div>
      )}

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