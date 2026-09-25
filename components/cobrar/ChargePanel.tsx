'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Ban, CheckCircle2, ChevronDown, Divide, FileText, Loader2, MapPin, Pencil, Phone, Receipt, Search, Users, Wallet, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { PaymentMethod, DocType, CustomerDoc, ChargeInput, SalesHistory, PaymentLine } from '@/types';
import {
  money, round2, onlyDigits, PAYMENTS, TYPE_META, ESTADO_PEDIDO_LABEL, type Chargeable, type SplitMode,
} from './types';
import { getSeriesFacturacion, type SeriesSucursal } from '@/lib/api/facturacion';
import { getSucursalById } from '@/lib/api/sucursales';
import { getMiEmpresa } from '@/lib/api/empresas';
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

    let cancelado = false;
    const MAX_INTENTOS = 3;

    const cargarSeries = async () => {
      for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
        try {
          const data = await getSeriesFacturacion(token);
          if (cancelado) return;
          if (data.length > 0) setSeries(data[0]);
          return;
        } catch {
          if (cancelado || intento === MAX_INTENTOS) return;
          // Reintento silencioso: un hipo transitorio del proveedor de facturación
          // no debe dejar el cobro sin serie-correlativo visible.
          await new Promise(r => setTimeout(r, 600 * intento));
        }
      }
    };

    cargarSeries();
    return () => { cancelado = true; };
  }, [session?.accessToken]);

  /* ── ¿La sucursal ya está sincronizada con la API de facturación? ──
     Si no lo está, el backend rechaza la emisión (AsegurarSucursalSincronizadaAsync) y la venta
     queda "Pendiente" para siempre sin que el cajero se entere. Mientras no esté sincronizada,
     solo se ofrece "Sin comprob." — null mientras carga o si no aplica, para no bloquear de más
     por un hipo de red (se asume sincronizada hasta confirmar lo contrario). */
  const [sucursalSincronizada, setSucursalSincronizada] = useState<boolean | null>(null);
  useEffect(() => {
    const token = session?.accessToken;
    const sucursalId = session?.user?.sucursalId;
    if (!token || !sucursalId) return;
    let cancelado = false;
    getSucursalById(token, sucursalId)
      .then(s => { if (!cancelado) setSucursalSincronizada(s.sincronizadoFacturacion); })
      .catch(() => { if (!cancelado) setSucursalSincronizada(null); });
    return () => { cancelado = true; };
  }, [session?.accessToken, session?.user?.sucursalId]);

  /* Interruptor general de la empresa (Configuración → Datos del negocio → "usar facturación
     electrónica"). Es el único paso que necesita el negocio para dejar de emitir boletas/facturas
     sin tocar Ideatec ni resincronizar nada — apagarlo/prenderlo no afecta sucursalSincronizada. */
  const [usarFacturacionElectronica, setUsarFacturacionElectronica] = useState<boolean | null>(null);
  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;
    let cancelado = false;
    getMiEmpresa(token)
      .then(e => { if (!cancelado) setUsarFacturacionElectronica(e.usarFacturacionElectronica); })
      .catch(() => { if (!cancelado) setUsarFacturacionElectronica(null); });
    return () => { cancelado = true; };
  }, [session?.accessToken]);

  const comprobantesElectronicosDisponibles = sucursalSincronizada !== false && usarFacturacionElectronica !== false;

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

  /* Factura exige RUC (11 dígitos) y Boleta exige DNI (8 dígitos): el buscador del CRM solo
     debe ofrecer clientes cuyo documento calce con el tipo de comprobante activo. */
  const clienteMatches = useMemo(() => {
    const q = clienteQuery.trim().toLowerCase();
    if (!q) return [];
    const docLen = docType === 'Factura' ? 11 : 8;
    return clientes
      .filter(c => onlyDigits(c.numeroDocumento ?? '').length === docLen)
      .filter(c => c.nombre.toLowerCase().includes(q) || (c.numeroDocumento ?? '').includes(q))
      .slice(0, 8);
  }, [clientes, clienteQuery, docType]);

  /* Handler único del campo fusionado DNI/RUC + nombre: acepta tanto dígitos como texto libre
     (nombre a buscar). Si lo tipeado son solo dígitos, se limita a la longitud del documento
     activo (8 DNI / 11 RUC) igual que antes; si el documento queda incompleto, se limpia el
     nombre resuelto para no dejar un nombre "pegado" a un número que ya no es ese. */
  const handlePersonInput = (raw: string) => {
    const maxLen = docType === 'Factura' ? 11 : 8;
    const digitsOnly = onlyDigits(raw);
    const isNumericQuery = raw !== '' && digitsOnly === raw;
    const displayValue = isNumericQuery ? digitsOnly.slice(0, maxLen) : raw;

    setClienteQuery(displayValue);
    setShowClienteResults(true);

    const digits = digitsOnly.slice(0, maxLen);
    setDocNumber(digits);
    if (digits.length !== maxLen) {
      setDocName('');
      setClienteId(undefined);
    }
  };

  const selectCliente = (c: Cliente) => {
    setClienteId(c.id);
    setShowClienteResults(false);
    setDocName(c.nombre);
    if (c.numeroDocumento) {
      setDocType(c.numeroDocumento.length === 11 ? 'Factura' : 'Boleta');
      setDocNumber(c.numeroDocumento);
      setClienteQuery(c.numeroDocumento);
    } else {
      setDocNumber('');
      setClienteQuery('');
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
      setDocName(local.nombre);
      setShowClienteResults(false);
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
        setShowClienteResults(false);
      })
      .catch(() => { if (!cancelado) triggerToast(`Error al consultar el ${isRuc ? 'RUC' : 'DNI'}.`, 'error'); })
      .finally(() => { if (!cancelado) setConsultandoDoc(false); });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docNumber, docType, clientes]);

  /* ── Pago combinado ──
     1 línea (caso normal): su monto es implícito = amountDue, no se muestra el campo.
     2+ líneas: cada una tiene su propio monto editable, salvo la última, que siempre se
     autocompleta con lo que falta para cuadrar el total — así el cajero solo llena las
     primeras N-1 líneas y la última se ajusta sola (incluso si edita una anterior después). */
  interface PagoLinea {
    method: PaymentMethod;
    amount: string;
    received: string; // solo si method === 'Efectivo'
    numeroOperacion: string;
    entidadBancaria: string;
    observacion: string;
  }
  const blankLine = (m: PaymentMethod): PagoLinea =>
    ({ method: m, amount: '', received: '', numeroOperacion: '', entidadBancaria: '', observacion: '' });
  const [payments, setPayments] = useState<PagoLinea[]>([blankLine('Efectivo')]);

  const updateLineMethod = (idx: number, m: PaymentMethod) =>
    setPayments(prev => prev.map((p, i) => (i === idx ? { ...blankLine(m), amount: p.amount } : p)));

  const updateLineField = (idx: number, field: 'numeroOperacion' | 'entidadBancaria' | 'observacion' | 'received', value: string) =>
    setPayments(prev => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));

  const updateLineAmount = (idx: number, raw: string) => {
    const value = raw.replace(/[^\d.]/g, '');
    setPayments(prev => {
      const next = prev.map((p, i) => (i === idx ? { ...p, amount: value } : p));
      const lastIdx = next.length - 1;
      if (idx !== lastIdx) {
        const sumOtras = next.slice(0, lastIdx).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        next[lastIdx] = { ...next[lastIdx], amount: String(Math.max(0, round2(amountDue - sumOtras))) };
      }
      return next;
    });
  };

  const addPaymentLine = () => {
    const usados = new Set(payments.map(p => p.method));
    const siguienteMetodo = visiblePayments.find(p => !usados.has(p.id))?.id;
    if (!siguienteMetodo) return;
    setPayments(prev => {
      const base = prev.length === 1 ? [{ ...prev[0], amount: String(amountDue) }] : prev;
      const sumaActual = base.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const restante = Math.max(0, round2(amountDue - sumaActual));
      return [...base, { ...blankLine(siguienteMetodo), amount: String(restante) }];
    });
  };

  const removePaymentLine = (idx: number) => {
    setPayments(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 1) {
        const lastIdx = next.length - 1;
        const sumOtras = next.slice(0, lastIdx).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        next[lastIdx] = { ...next[lastIdx], amount: String(Math.max(0, round2(amountDue - sumOtras))) };
      }
      return next;
    });
  };

  const [stage, setStage] = useState<'idle' | 'charging'>('idle');
  const submitting = stage !== 'idle';

  /* Si algún método usado se deshabilita (o carga la config después del primer render), vuelve a
     una sola línea con el primero disponible en vez de dejar seleccionado algo que ya no se acepta. */
  useEffect(() => {
    if (visiblePayments.length > 0 && payments.some(p => !visiblePayments.some(vp => vp.id === p.method))) {
      setPayments([blankLine(visiblePayments[0].id)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePayments.map(p => p.id).join(',')]);

  /* Sucursal no sincronizada: fuerza "Sin comprob." — no tiene sentido dejar Boleta/Factura
     seleccionada si el backend la va a rechazar en silencio al emitir. */
  useEffect(() => {
    if (!comprobantesElectronicosDisponibles && docType !== 'Nota de venta') {
      setDocType('Nota de venta');
      setDocNumber('');
      setDocName('');
      clearCliente();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comprobantesElectronicosDisponibles]);

  const total = selected.total;
  const started = paidItemIds.size > 0; // ya se cobró alguna parte
  const splitLocked = started; // no cambiar de modo a mitad de un cobro dividido

  /* ── Cálculo del monto a cobrar según el modo ── */
  const unpaidItems = selected.items.filter(i => !paidItemIds.has(i.product.id));
  const pickedItems = unpaidItems.filter(i => pickItemIds.has(i.product.id));
  const itemsDue = round2(pickedItems.reduce((s, i) => s + i.product.price * i.quantity, 0));

  const amountDue = splitMode === 'full' ? total : itemsDue;

  const lineAmount = (idx: number) => payments.length === 1 ? amountDue : round2(Number(payments[idx].amount) || 0);
  const paymentsTotal = round2(payments.reduce((s, _, i) => s + lineAmount(i), 0));
  const pagoPendiente = round2(amountDue - paymentsTotal);

  const willCloseAfter =
    splitMode === 'full' ? true :
    unpaidItems.length > 0 && pickedItems.length === unpaidItems.length;

  const itemsCountForCharge =
    splitMode === 'items' ? pickedItems.reduce((s, i) => s + i.quantity, 0) :
    selected.itemsCount;

  const base = round2(amountDue / (1 + igvPorcentaje / 100));
  const igv = round2(amountDue - base);

  /* Mesas solo se pueden cobrar cuando cocina ya entregó todos los platos. Llevar/delivery no
     tienen esta restricción: se pueden cobrar (ej. pago anticipado) antes de que salgan. Con
     "Impresora en cocina" activo no hay KDS que marque "entregado" — el pedido se imprime y el
     cocinero avisa de viva voz, así que la mesa puede cobrarse de inmediato. */
  const esperandoEntrega = !impresoraCocina && selected.kind === 'mesa' && !!selected.pedidoEstado && selected.pedidoEstado !== 'entregado';

  /* ── Validación ── */
  const validate = (): string | null => {
    if (!isCajaOpen) return 'La caja está cerrada.';
    if (esperandoEntrega) return 'Aún no se puede cobrar: faltan platos por entregar en la mesa.';
    if (!payments.every(p => visiblePayments.some(vp => vp.id === p.method))) return 'Selecciona un método de pago habilitado.';
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
    if (payments.length > 1 && payments.some((_, i) => lineAmount(i) <= 0)) {
      return 'Cada método de pago debe tener un monto mayor a S/. 0 — quita las líneas en 0.';
    }
    if (Math.abs(pagoPendiente) > 0.009) return 'Los montos de los métodos de pago deben sumar el total a cobrar.';
    // Con 1 sola línea, el efectivo puede ser mayor al total (hay vuelto) y se pide cuánto entregó.
    // Con varias líneas, el monto de la línea YA es lo que pagó en efectivo — no hay vuelto que calcular.
    if (payments.length === 1) {
      for (let i = 0; i < payments.length; i++) {
        if (payments[i].method !== 'Efectivo') continue;
        const rec = payments[i].received === '' ? null : Number(payments[i].received);
        if (rec == null) return 'Ingresa el monto recibido en efectivo.';
        if (rec < lineAmount(i)) return 'El efectivo recibido es menor al monto de esa línea.';
      }
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

    const paymentLines: PaymentLine[] = payments.map((p, i) => ({
      method: p.method,
      amount: lineAmount(i),
      received: p.method === 'Efectivo' && p.received !== '' ? Number(p.received) : undefined,
      numeroOperacion: p.method !== 'Efectivo' && p.numeroOperacion.trim() ? p.numeroOperacion.trim() : undefined,
      entidadBancaria: p.method !== 'Efectivo' && p.entidadBancaria.trim() ? p.entidadBancaria.trim() : undefined,
      observacion: p.method !== 'Efectivo' && p.observacion.trim() ? p.observacion.trim() : undefined,
    }));

    try {
      setStage('charging');
      const input: ChargeInput = {
        payments: paymentLines,
        docType,
        cashier,
        customer: customerDoc?.name ?? selected.customer,
        customerDoc,
        clienteId,
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
      setPayments([blankLine(payments[0].method)]);
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

      {/* Comprobante */}
      <div className="border-t border-slate-200 pt-3 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Comprobante</p>
        <div className={`grid gap-1.5 ${comprobantesElectronicosDisponibles ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {([
            { id: 'Boleta' as const,        label: 'Boleta',        icon: <Receipt className="h-3.5 w-3.5" />,  serie: series ? `${series.serieBoleta}-${String(series.correlativoBoleta).padStart(8,'0')}` : null },
            { id: 'Factura' as const,       label: 'Factura',       icon: <FileText className="h-3.5 w-3.5" />, serie: series ? `${series.serieFactura}-${String(series.correlativoFactura).padStart(8,'0')}` : null },
            { id: 'Nota de venta' as const, label: 'Sin comprob.',  icon: <Ban className="h-3.5 w-3.5" />,      serie: null },
          ])
            .filter(d => comprobantesElectronicosDisponibles || d.id === 'Nota de venta')
            .map(d => (
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
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                value={clienteQuery}
                onChange={e => handlePersonInput(e.target.value)}
                onFocus={() => setShowClienteResults(true)}
                onBlur={() => setTimeout(() => setShowClienteResults(false), 150)}
                placeholder="DNI o nombre del cliente (opcional)"
                className="input w-full pl-8 pr-16 py-2 text-xs"
              />
              {consultandoDoc && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 absolute right-8 top-1/2 -translate-y-1/2" />
              )}
              {clienteId && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  CRM ✓
                </span>
              )}
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
            <input
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="Nombre del cliente (opcional)"
              className="input w-full px-3 py-2 text-xs"
            />
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Users className="h-3 w-3" /> Sin DNI se emite como <strong>&nbsp;Cliente varios</strong> (público general). Escribe el DNI o busca por nombre — primero en tu CRM local, y si no está, en RENIEC.
            </p>
          </div>
        )}

        {docType === 'Factura' && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                value={clienteQuery}
                onChange={e => handlePersonInput(e.target.value)}
                onFocus={() => setShowClienteResults(true)}
                onBlur={() => setTimeout(() => setShowClienteResults(false), 150)}
                placeholder="RUC (11 dígitos) o razón social *"
                className="input w-full pl-8 pr-16 py-2 text-xs"
              />
              {consultandoDoc && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 absolute right-8 top-1/2 -translate-y-1/2" />
              )}
              {clienteId && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  CRM ✓
                </span>
              )}
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
            <input
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="Razón social *"
              className="input w-full px-3 py-2 text-xs"
            />
          </div>
        )}

        {docType === 'Nota de venta' && comprobantesElectronicosDisponibles && (
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <Ban className="h-3.5 w-3.5 shrink-0" /> No se emitirá boleta ni factura electrónica (venta interna).
          </p>
        )}
      </div>

      {/* Totales de la cuenta a cobrar — nota de venta no desglosa IGV, es venta interna sin comprobante */}
      <div className="space-y-1 text-xs border-t border-slate-200 pt-3">
        {docType !== 'Nota de venta' && (
          <>
            <div className="flex justify-between font-mono text-slate-500"><span>Op. gravada</span><span>{money(base)}</span></div>
            <div className="flex justify-between font-mono text-slate-500"><span>IGV ({igvPorcentaje}%)</span><span>{money(igv)}</span></div>
          </>
        )}
        <div className="flex justify-between font-mono font-bold text-base text-slate-800 pt-1">
          <span>{splitMode === 'full' ? 'Total' : 'A cobrar ahora'}</span><span>{money(amountDue)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div className="space-y-2 border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Método de pago</p>
          {payments.length > 1 && (
            <span className={`text-[10px] font-bold ${Math.abs(pagoPendiente) < 0.01 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {Math.abs(pagoPendiente) < 0.01
                ? 'Cuadrado'
                : pagoPendiente > 0 ? `Falta ${money(pagoPendiente)}` : `Sobra ${money(Math.abs(pagoPendiente))}`}
            </span>
          )}
        </div>

        {payments.map((p, idx) => {
          const isLast = idx === payments.length - 1;
          const amount = lineAmount(idx);
          const receivedNum = p.received === '' ? null : Number(p.received);
          const change = p.method === 'Efectivo' && receivedNum != null ? round2(receivedNum - amount) : null;
          const usadoEnOtraLinea = new Set(payments.filter((_, i) => i !== idx).map(pp => pp.method));
          const quickCashLinea = [amount, 20, 50, 100, 200];

          return (
            <div key={idx} className="space-y-2 bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {visiblePayments.map(vp => (
                    <button
                      key={vp.id}
                      type="button"
                      disabled={usadoEnOtraLinea.has(vp.id)}
                      onClick={() => updateLineMethod(idx, vp.id)}
                      className={`py-2 text-[10px] font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${
                        p.method === vp.id
                          ? 'bg-brand/10 border-brand text-brand'
                          : 'border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent'
                      }`}
                    >
                      {vp.icon} {vp.label}
                    </button>
                  ))}
                </div>
                {payments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePaymentLine(idx)}
                    className="text-slate-400 hover:text-rose-500 p-1.5 shrink-0"
                    aria-label="Quitar este método de pago"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {payments.length > 1 && (
                <div className="space-y-1">
                  <input
                    value={p.amount}
                    onChange={e => updateLineAmount(idx, e.target.value)}
                    inputMode="decimal"
                    placeholder="Monto de esta línea"
                    className="input w-full px-3 py-2 text-sm font-mono"
                  />
                  {isLast && (
                    <p className="text-[10px] text-slate-400 px-1">Se autocompletó con el restante — puedes ajustarlo.</p>
                  )}
                </div>
              )}

              {p.method === 'Efectivo' ? (
                payments.length === 1 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5" /> ¿Con cuánto paga?
                    </label>
                    <input
                      value={p.received}
                      onChange={e => updateLineField(idx, 'received', onlyDigits(e.target.value.replace('.', '')) ? e.target.value.replace(/[^\d.]/g, '') : '')}
                      inputMode="decimal"
                      placeholder={money(amount)}
                      className="input w-full px-3 py-2 text-sm font-mono"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {quickCashLinea.map((v, i2) => (
                        <button
                          key={i2}
                          type="button"
                          onClick={() => updateLineField(idx, 'received', String(round2(v)))}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-brand hover:text-brand transition-colors"
                        >
                          {i2 === 0 ? 'Exacto' : money(v)}
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
                      <p className="text-[10px] text-rose-600">Falta {money(Math.abs(change))} para cubrir esta línea.</p>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Detalle de la operación (opcional)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      value={p.numeroOperacion}
                      onChange={e => updateLineField(idx, 'numeroOperacion', e.target.value)}
                      placeholder="N° operación"
                      className="input w-[26%] min-w-0 px-2 py-2 text-xs text-right"
                    />
                    <input
                      value={p.entidadBancaria}
                      onChange={e => updateLineField(idx, 'entidadBancaria', e.target.value)}
                      placeholder="Entidad bancaria"
                      className="input w-[32%] min-w-0 px-2 py-2 text-xs text-right"
                    />
                    <input
                      value={p.observacion}
                      onChange={e => updateLineField(idx, 'observacion', e.target.value)}
                      placeholder="Observación"
                      className="input w-[42%] min-w-0 px-2 py-2 text-xs text-right"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {visiblePayments.length === 0 && (
          <p className="text-[11px] text-rose-500">No hay métodos de pago habilitados — actívalos en Configuración → Métodos de pago.</p>
        )}

        {payments.length < visiblePayments.length && (
          <button
            type="button"
            onClick={addPaymentLine}
            className="w-full text-[11px] font-bold text-brand hover:underline py-1"
          >
            + Agregar otro método de pago
          </button>
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