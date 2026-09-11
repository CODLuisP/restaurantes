'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Ban, CheckCircle2, ChevronDown, Divide, FileText, Loader2, MapPin, Pencil, Phone, Receipt, Search, Users, Wallet,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { PaymentMethod, DocType, CustomerDoc, ChargeInput, SalesHistory } from '@/types';
import {
  money, round2, onlyDigits, PAYMENTS, TYPE_META, ESTADO_PEDIDO_LABEL, type Chargeable, type SplitMode,
} from './types';
import { getSeriesFacturacion, type SeriesSucursal } from '@/lib/api/facturacion';
import { getClientes } from '@/lib/api/clientes';
import type { Cliente } from '@/types/clientes';
export default function ChargePanel({
  selected, isCajaOpen, cashier, onAddItems, onClosed,
}: {
  selected: Chargeable;
  isCajaOpen: boolean;
  cashier?: string;
  onAddItems: () => void;
  onClosed: () => void;
}) {
  const { chargeTable, chargeOrder, triggerToast, metodosPago, igvPorcentaje, impresoraCocina } = useApp();
  const { data: session } = useSession();

  /* ── Series y correlativos reales desde la API de facturación ── */
  const [series, setSeries] = useState<SeriesSucursal | null>(null);
  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;
    getSeriesFacturacion(token)
      .then(data => { if (data.length > 0) setSeries(data[0]); })
      .catch(() => { /* sin series no bloqueamos el cobro */ });
  }, [session?.accessToken]);

  /* Solo se ofrecen los métodos habilitados en /configuracion/metodos-pago. "Yape / Plin" es un
     solo botón en esta UI, así que basta con que cualquiera de los dos esté activo. */
  const visiblePayments = PAYMENTS.filter(p =>
    p.id === 'Efectivo' ? metodosPago.efectivo.enabled :
    p.id === 'Tarjeta' ? metodosPago.tarjeta.enabled :
    metodosPago.yape.enabled || metodosPago.plin.enabled
  );

  /* ── Cuentas separadas ── */
  const [splitMode, setSplitMode] = useState<SplitMode>('full');
  const [paidItemIds, setPaidItemIds] = useState<Set<string>>(new Set());
  const [pickItemIds, setPickItemIds] = useState<Set<string>>(new Set());

  /* Cuentas ya cobradas en esta sesión de división (se muestran en un desplegable para no
     ocupar espacio). Solo tiene sentido mientras la mesa sigue abierta con cuentas pendientes. */
  const [chargedAccounts, setChargedAccounts] = useState<{ sale: SalesHistory; itemLabels: string[] }[]>([]);
  const [showChargedAccounts, setShowChargedAccounts] = useState(false);

  /* ── Comprobante ── */
  const [docType, setDocType] = useState<DocType>('Boleta');
  const [docNumber, setDocNumber] = useState('');
  const [docName, setDocName] = useState('');
  const [consultandoDoc, setConsultandoDoc] = useState(false);

  /* ── Cliente del CRM ──
     Se carga una sola vez (en paralelo con las series, sin encadenar) y el buscador filtra en
     memoria: es instantáneo y no depende de la API externa de RENIEC/SUNAT. */
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<number | undefined>(undefined);
  const [clienteQuery, setClienteQuery] = useState('');
  const [showClienteResults, setShowClienteResults] = useState(false);

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;
    getClientes(token).then(setClientes).catch(() => { /* buscador queda vacío, no bloquea el cobro */ });
  }, [session?.accessToken]);

  const clienteMatches = useMemo(() => {
    const q = clienteQuery.trim().toLowerCase();
    if (!q) return [];
    return clientes
      .filter(c => c.nombre.toLowerCase().includes(q) || (c.numeroDocumento ?? '').includes(q))
      .slice(0, 8);
  }, [clientes, clienteQuery]);

  const selectCliente = (c: Cliente) => {
    setClienteId(c.id);
    setClienteQuery(c.nombre);
    setShowClienteResults(false);
    setDocName(c.nombre);
    if (c.numeroDocumento) {
      setDocType(c.numeroDocumento.length === 11 ? 'Factura' : 'Boleta');
      setDocNumber(c.numeroDocumento);
    }
  };

  const clearCliente = () => {
    setClienteId(undefined);
    setClienteQuery('');
  };

  /* Autocompleta el nombre/razón social por DNI o RUC apenas el número alcanza su longitud
     válida — sin botón, con su propio loading para que quede claro que está consultando.
     1) Primero busca en el CRM local (instantáneo, ya cargado en memoria, sin costo de API).
     2) Solo si no hay match local, cae a la API externa (RENIEC/SUNAT vía json.pe) — misma que
        usa Configuración → Datos del negocio. Se cancela si el número sigue cambiando antes de
        que la consulta anterior responda. */
  useEffect(() => {
    const digits = onlyDigits(docNumber);
    const isRuc = docType === 'Factura';
    const longitudValida = isRuc ? digits.length === 11 : digits.length === 8;
    if (docType === 'Nota de venta' || !longitudValida) return;

    const local = clientes.find(c => onlyDigits(c.numeroDocumento ?? '') === digits);
    if (local) {
      setClienteId(local.id);
      setClienteQuery(local.nombre);
      setDocName(local.nombre);
      return;
    }
    setClienteId(undefined);

    let cancelado = false;
    setConsultandoDoc(true);
    fetch(isRuc ? '/api/consultar-ruc' : '/api/consultar-dni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isRuc ? { ruc: digits } : { dni: digits }),
    })
      .then(res => res.json())
      .then(data => {
        if (cancelado) return;
        if (!data.success) { triggerToast(data.error || `${isRuc ? 'RUC' : 'DNI'} no encontrado.`, 'error'); return; }

        if (isRuc) {
          setDocName(data.data?.nombre_o_razon_social || '');
        } else {
          const { nombres, apellido_paterno, apellido_materno } = data.data ?? {};
          setDocName([nombres, apellido_paterno, apellido_materno].filter(Boolean).join(' ').trim());
        }
      })
      .catch(() => { if (!cancelado) triggerToast(`Error al consultar el ${isRuc ? 'RUC' : 'DNI'}.`, 'error'); })
      .finally(() => { if (!cancelado) setConsultandoDoc(false); });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docNumber, docType, clientes]);

  /* ── Pago ── */
  const [method, setMethod] = useState<PaymentMethod>('Efectivo');
  const [received, setReceived] = useState('');
  const [stage, setStage] = useState<'idle' | 'charging'>('idle');
  const submitting = stage !== 'idle';

  /* Si el método seleccionado se deshabilita (o carga la config después del primer render),
     cae al primero disponible en vez de dejar seleccionado un método que ya no se acepta. */
  useEffect(() => {
    if (visiblePayments.length > 0 && !visiblePayments.some(p => p.id === method)) {
      setMethod(visiblePayments[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePayments.map(p => p.id).join(',')]);

  const total = selected.total;
  const started = paidItemIds.size > 0; // ya se cobró alguna parte
  const splitLocked = started; // no cambiar de modo a mitad de un cobro dividido

  /* ── Cálculo del monto a cobrar según el modo ── */
  const unpaidItems = selected.items.filter(i => !paidItemIds.has(i.product.id));
  const pickedItems = unpaidItems.filter(i => pickItemIds.has(i.product.id));
  const itemsDue = round2(pickedItems.reduce((s, i) => s + i.product.price * i.quantity, 0));

  const amountDue = splitMode === 'full' ? total : itemsDue;

  const willCloseAfter =
    splitMode === 'full' ? true :
    unpaidItems.length > 0 && pickedItems.length === unpaidItems.length;

  const itemsCountForCharge =
    splitMode === 'items' ? pickedItems.reduce((s, i) => s + i.quantity, 0) :
    selected.itemsCount;

  const base = round2(amountDue / (1 + igvPorcentaje / 100));
  const igv = round2(amountDue - base);

  const receivedNum = received === '' ? null : Number(received);
  const change = method === 'Efectivo' && receivedNum != null ? round2(receivedNum - amountDue) : null;

  /* Mesas solo se pueden cobrar cuando cocina ya entregó todos los platos. Llevar/delivery no
     tienen esta restricción: se pueden cobrar (ej. pago anticipado) antes de que salgan. Con
     "Impresora en cocina" activo no hay KDS que marque "entregado" — el pedido se imprime y el
     cocinero avisa de viva voz, así que la mesa puede cobrarse de inmediato. */
  const esperandoEntrega = !impresoraCocina && selected.kind === 'mesa' && !!selected.pedidoEstado && selected.pedidoEstado !== 'entregado';

  /* ── Validación ── */
  const validate = (): string | null => {
    if (!isCajaOpen) return 'La caja está cerrada.';
    if (esperandoEntrega) return 'Aún no se puede cobrar: faltan platos por entregar en la mesa.';
    if (!visiblePayments.some(p => p.id === method)) return 'Selecciona un método de pago habilitado.';
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

    try {
      setStage('charging');
      const input: ChargeInput = {
        method,
        docType,
        cashier,
        customer: customerDoc?.name ?? selected.customer,
        customerDoc,
        clienteId,
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
      if (splitMode === 'items') {
        setPaidItemIds(prev => new Set([...prev, ...pickedItems.map(i => i.product.id)]));
        setPickItemIds(new Set());
        setChargedAccounts(prev => [
          ...prev,
          { sale, itemLabels: chargingItems.map(i => `${i.quantity}× ${i.product.name}`) },
        ]);
      }
      setReceived('');
      setDocNumber('');
      setDocName('');
      clearCliente();
    } finally {
      setStage('idle');
    }
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
    splitMode === 'items' ? selected.items.filter(i => paidItemIds.has(i.product.id)).reduce((s, i) => s + i.product.price * i.quantity, 0) : 0
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

      {/* Cuentas ya cobradas (desplegable) */}
      {chargedAccounts.length > 0 && (
        <div className="border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setShowChargedAccounts(v => !v)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-emerald-700"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Cuentas cobradas ({chargedAccounts.length})
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showChargedAccounts ? 'rotate-180' : ''}`} />
          </button>
          {showChargedAccounts && (
            <div className="mt-2 space-y-2">
              {chargedAccounts.map((acc, idx) => (
                <div key={acc.sale.id ?? idx} className="bg-emerald-50 rounded-lg px-3 py-2 text-[11px] space-y-1">
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Cuenta {idx + 1} · {acc.sale.docType ?? 'Sin comprob.'}</span>
                    <span className="font-mono">{money(acc.sale.total)}</span>
                  </div>
                  {acc.sale.comprobante && (
                    <p className="text-slate-500 font-mono text-[10px]">{acc.sale.comprobante}</p>
                  )}
                  {acc.sale.customerDoc?.number && (
                    <p className="text-slate-500">{acc.sale.customerDoc.type} {acc.sale.customerDoc.number} — {acc.sale.customerDoc.name}</p>
                  )}
                  <p className="text-slate-500">{acc.itemLabels.join(', ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cuentas separadas */}
      <div className="border-t border-slate-200 pt-3 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Divide className="h-3.5 w-3.5" /> Forma de cobro
        </p>
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
          {([
            { id: 'full' as const,  label: 'Pago único' },
            { id: 'items' as const, label: 'Dividir cuenta' },
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

        {splitMode === 'items' && (
          <div className="text-[11px] text-slate-500 flex justify-between bg-emerald-50 rounded-lg px-3 py-1.5">
            <span>Cuenta en curso</span>
            <span className="font-mono">Abonado {money(paidAmount)} · Falta {money(remaining)}</span>
          </div>
        )}
      </div>

      {/* Cliente (CRM) */}
      <div className="border-t border-slate-200 pt-3 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cliente</p>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              value={clienteQuery}
              onChange={e => { setClienteQuery(e.target.value); setClienteId(undefined); setShowClienteResults(true); }}
              onFocus={() => setShowClienteResults(true)}
              onBlur={() => setTimeout(() => setShowClienteResults(false), 150)}
              placeholder="Buscar cliente por nombre o documento..."
              className="input w-full pl-8 pr-16 py-2 text-xs"
            />
            {clienteId && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                CRM ✓
              </span>
            )}
          </div>
          {showClienteResults && clienteMatches.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {clienteMatches.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => selectCliente(c)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex justify-between items-center gap-2"
                >
                  <span className="font-semibold text-slate-700 truncate">{c.nombre}</span>
                  <span className="text-slate-400 font-mono text-[10px] shrink-0">{c.numeroDocumento ?? '—'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400">
          Opcional — vincula la venta al cliente para su historial y nivel en Clientes. Si escribes su DNI/RUC abajo y ya está en el CRM, se detecta solo.
        </p>
      </div>

      {/* Comprobante */}
      <div className="border-t border-slate-200 pt-3 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Comprobante</p>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { id: 'Boleta' as const,        label: 'Boleta',        icon: <Receipt className="h-3.5 w-3.5" />,  serie: series ? `${series.serieBoleta}-${String(series.correlativoBoleta).padStart(8,'0')}` : null },
            { id: 'Factura' as const,       label: 'Factura',       icon: <FileText className="h-3.5 w-3.5" />, serie: series ? `${series.serieFactura}-${String(series.correlativoFactura).padStart(8,'0')}` : null },
            { id: 'Nota de venta' as const, label: 'Sin comprob.',  icon: <Ban className="h-3.5 w-3.5" />,      serie: null },
          ]).map(d => (
            <button
              key={d.id}
              onClick={() => { setDocType(d.id); setDocNumber(''); setDocName(''); clearCliente(); }}
              className={`py-2 text-[10px] font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${
                docType === d.id ? 'bg-brand/10 border-brand text-brand' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {d.icon} {d.label}
              {d.serie && <span className="text-[8px] font-mono opacity-70">{d.serie}</span>}
            </button>
          ))}
        </div>

        {docType === 'Boleta' && (
          <div className="space-y-2">
            <div className="relative">
              <input
                value={docNumber}
                onChange={e => {
                  const digits = onlyDigits(e.target.value).slice(0, 8);
                  setDocNumber(digits);
                  if (digits === '') { setDocName(''); clearCliente(); }
                }}
                inputMode="numeric"
                placeholder="DNI (opcional)"
                className="input w-full pl-3 pr-8 py-2 text-xs"
              />
              {consultandoDoc && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
            </div>
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
            <div className="relative">
              <input
                value={docNumber}
                onChange={e => {
                  const digits = onlyDigits(e.target.value).slice(0, 11);
                  setDocNumber(digits);
                  if (digits === '') { setDocName(''); clearCliente(); }
                }}
                inputMode="numeric"
                placeholder="RUC (11 dígitos) *"
                className="input w-full pl-3 pr-8 py-2 text-xs"
              />
              {consultandoDoc && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
            </div>
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
        <div className="flex justify-between font-mono text-slate-500"><span>IGV ({igvPorcentaje}%)</span><span>{money(igv)}</span></div>
        <div className="flex justify-between font-mono font-bold text-base text-slate-800 pt-1">
          <span>{splitMode === 'full' ? 'Total' : 'A cobrar ahora'}</span><span>{money(amountDue)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div className="space-y-2 border-t border-slate-200 pt-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Método de pago</p>
        <div className="grid grid-cols-3 gap-1.5">
          {visiblePayments.map(p => (
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
        {visiblePayments.length === 0 && (
          <p className="text-[11px] text-rose-500">No hay métodos de pago habilitados — actívalos en Configuración → Métodos de pago.</p>
        )}

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
        disabled={!isCajaOpen || submitting || !!validationError}
        className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {stage === 'charging' ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> {docType !== 'Nota de venta' ? 'Emitiendo y registrando…' : 'Registrando cobro…'}</>
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