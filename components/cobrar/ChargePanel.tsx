'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Ban, CheckCircle2, ChevronDown, Divide, FileText, Loader2, MapPin, Pencil, Phone, Printer, Receipt, Search, Users, Wallet, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { PaymentMethod, DocType, CustomerDoc, ChargeInput, SalesHistory, PaymentLine } from '@/types';
import {
  money, round2, onlyDigits, PAYMENTS, TYPE_META, ESTADO_PEDIDO_LABEL, type Chargeable, type SplitMode,
} from './types';
import { getSeriesFacturacion, type SeriesSucursal } from '@/lib/api/facturacion';
import { ApiError } from '@/lib/api/client';
import { getClientes } from '@/lib/api/clientes';
import type { Cliente } from '@/types/clientes';
import { imprimirReciboCliente, imprimirReciboAparte, abrirVentanaImpresion } from '@/lib/print/recibo';
import type { TicketOrderData } from '@/lib/print/renderTicket';
import { qrToDataUrl } from '@/lib/print/qrDataUrl';
import { DOC_META, defaultComprobante, type ComprobanteKind } from '@/components/configuracion/tickets/ticketData';
import { getComprobantes } from '@/lib/api/comprobantes';

/** Siguiente correlativo de nota de venta de la sucursal (el backend asigna MAX + 1): se lee de la
 *  última nota de venta emitida. null si no se pudo saber — entonces se espera al cobro para imprimir. */
async function leerSiguienteTicket(token: string): Promise<number | null> {
  const r = await getComprobantes(token, { tipoComprobante: 'ticket', pageSize: 1, ordenarPorCorrelativo: true });
  const ultimo = r.items[0];
  /* Sin notas de venta previas (o un backend que aún no las lista): no se adivina, se espera al cobro. */
  if (!ultimo) return null;
  const m = /#(\d+)$/.exec(ultimo.numero);
  return m ? Number(m[1]) + 1 : null;
}

/* Próximo N° ya "gastado" en tickets impresos cuyo cobro sigue en la cola de segundo plano. Vive a
   nivel de módulo porque el panel se desmonta al pasar a otra mesa: así el siguiente cobro no repite
   el número aunque la API de facturación todavía no lo haya consumido. Se limpia al vaciarse la cola. */
const reservas = { correlativoBoleta: 0, correlativoFactura: 0, ticket: 0 };
const conReservas = (s: SeriesSucursal): SeriesSucursal => ({
  ...s,
  correlativoBoleta: Math.max(s.correlativoBoleta, reservas.correlativoBoleta),
  correlativoFactura: Math.max(s.correlativoFactura, reservas.correlativoFactura),
});
const ticketConReserva = (n: number | null): number | null =>
  n == null ? (reservas.ticket || null) : Math.max(n, reservas.ticket);

export default function ChargePanel({
  selected, isCajaOpen, cashier, onAddItems, onClosed,
}: {
  selected: Chargeable;
  isCajaOpen: boolean;
  cashier?: string;
  onAddItems: () => void;
  onClosed: () => void;
}) {
  const {
    chargeTable, chargeOrder, encolarCobro, hayCobrosEnCurso, triggerToast, metodosPago, igvPorcentaje, impresoraCocina,
    usarFacturacionElectronica, sucursalSincronizada, comprobanteBlocks, ticketPaperSize, negocioTicket,
  } = useApp();
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
          if (data.length > 0) setSeries(conReservas(data[0]));
          return;
        } catch (err) {
          // 4xx = problema de configuración (ej. empresa sin API key de facturación): reintentar no
          // lo arregla, solo repite el mismo error.
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) return;
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

  /* ── Siguiente N° de nota de venta: con esto la nota de venta también se imprime en el mismo clic ── */
  const [siguienteTicket, setSiguienteTicket] = useState<number | null>(null);
  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;
    let cancelado = false;
    leerSiguienteTicket(token).then(n => { if (!cancelado) setSiguienteTicket(ticketConReserva(n)); }).catch(() => {});
    return () => { cancelado = true; };
  }, [session?.accessToken]);

  /* ── ¿La sucursal ya está sincronizada con la API de facturación? ──
     Si no lo está, el backend rechaza la emisión (AsegurarSucursalSincronizadaAsync) y la venta
     queda "Pendiente" para siempre sin que el cajero se entere. Mientras no esté sincronizada,
     solo se ofrece "Sin comprob." — null mientras carga o si no aplica, para no bloquear de más
     por un hipo de red (se asume sincronizada hasta confirmar lo contrario). */
  /* Interruptor general de la empresa (Configuración → Datos del negocio → "usar facturación
     electrónica"). Es el único paso que necesita el negocio para dejar de emitir boletas/facturas
     sin tocar Ideatec ni resincronizar nada — apagarlo/prenderlo no afecta sucursalSincronizada.
     Ambos se cargan una sola vez en AppContext (useNegocioConfig). */
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
  /* pendiente=true: la cuenta ya se cobró en pantalla pero la venta aún se registra en segundo plano. */
  const [chargedAccounts, setChargedAccounts] = useState<{ sale: SalesHistory; itemLabels: string[]; pendiente?: boolean }[]>([]);
  const [showChargedAccounts, setShowChargedAccounts] = useState(false);

  /* ── Comprobante ── */
  const [docType, setDocType] = useState<DocType>('Boleta');
  const [esPorConsumo, setEsPorConsumo] = useState(false);
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
      /* Con una sola línea en efectivo, lo escrito en "¿Con cuánto paga?" es lo que el cliente da
         en efectivo: si no alcanza el total, esa es la parte en efectivo y el resto va al nuevo método
         (antes se pisaba con el total y el segundo método quedaba en 0). */
      const recibido = Number(prev[0]?.received) || 0;
      const primeraParte = prev[0]?.method === 'Efectivo' && recibido > 0 && recibido < amountDue ? recibido : amountDue;
      const base = prev.length === 1 ? [{ ...prev[0], amount: String(primeraParte), received: '' }] : prev;
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
        // Vacío = pagó exacto (es lo que muestra el campo por defecto).
        const rec = payments[i].received === '' ? null : Number(payments[i].received);
        if (rec != null && rec < lineAmount(i)) return 'El efectivo recibido es menor al monto de esa línea.';
      }
    }
    if (!selected.sesionMesaId) {
      return 'Esta cuenta no tiene una sesión activa en el sistema; no se puede cobrar.';
    }
    return null;
  };
  const validationError = validate();

  /* ── Cobro ──
     imprimir=true además imprime el ticket de cliente (plantilla de Configuración → Tickets, con
     el tamaño de papel definido ahí) apenas se confirma el cobro. */
  const doCharge = async (imprimir: boolean) => {
    const err = validate();
    if (err) { triggerToast(err, 'warning'); return; }
    /* Ventana vinculada "Generando comprobante…": solo cuando aún no se sabe el N° y hay que esperar
       al cobro para imprimir (se abre en el mismo clic para que el navegador no la bloquee). Si el N°
       ya se conoce, el ticket va en una ventana independiente que no congela esta página. */
    let ventanaImpresion: Window | null = null;
    const tokenSesion = session?.accessToken;
    const kind: ComprobanteKind = docType === 'Factura' ? 'factura' : docType === 'Boleta' ? 'boleta' : 'notaVenta';

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
      // Efectivo sin monto escrito = pagó exacto.
      received: p.method !== 'Efectivo' ? undefined : p.received !== '' ? Number(p.received) : lineAmount(i),
      numeroOperacion: p.method !== 'Efectivo' && p.numeroOperacion.trim() ? p.numeroOperacion.trim() : undefined,
      entidadBancaria: p.method !== 'Efectivo' && p.entidadBancaria.trim() ? p.entidadBancaria.trim() : undefined,
      observacion: p.method !== 'Efectivo' && p.observacion.trim() ? p.observacion.trim() : undefined,
    }));

    /* ── Ticket del comprobante, armado 100% en el front ──
       Plantilla del tipo cobrado (Configuración → Tickets: boleta, factura o nota de venta) + datos
       que ya están en pantalla. No se espera ni la emisión ante SUNAT ni el refresco de mesas/caja. */
    const ahora = new Date();
    let impreso = false;
    const imprimirComprobante = (numero?: string) => {
      if (!imprimir || impreso) return;
      impreso = true;
      /* Un fallo al armar el ticket nunca debe tumbar el cobro (esto también corre dentro del cobro). */
      try {
        escribirTicket(numero);
      } catch (e) {
        console.error('No se pudo armar el ticket', e);
        ventanaImpresion?.close();
        triggerToast('No se pudo generar el ticket. Puedes reimprimirlo desde Comprobantes.', 'warning');
      }
    };
    const escribirTicket = (numero?: string) => {
      /* Mismo contenido que el QR oficial de SUNAT: RUC|tipo|serie|correlativo|IGV|total|fecha|tipo doc|doc.
         Una nota de venta no tiene comprobante electrónico: ahí el QR (si se agrega) lleva al menú digital. */
      const [serie, correlativo] = (numero ?? '').split('-');
      const qrValue = kind !== 'notaVenta' && serie && correlativo
        ? [
            negocioTicket.ruc ?? '', kind === 'factura' ? '01' : '03', serie, correlativo,
            igv.toFixed(2), amountDue.toFixed(2), ahora.toLocaleDateString('en-CA'),
            customerDoc?.type === 'RUC' ? '6' : customerDoc ? '1' : '0', customerDoc?.number ?? '0',
          ].join('|')
        : `${window.location.origin}/menu`;

      /* Si la plantilla aún no cargó (o vino vacía), se imprime con la plantilla por defecto. */
      const plantilla = comprobanteBlocks?.[kind]?.length ? comprobanteBlocks[kind] : defaultComprobante(kind);
      const datos: TicketOrderData = {
        businessName: negocioTicket.businessName,
        businessAddress: negocioTicket.direccion,
        logoUrl: negocioTicket.logoUrl,
        ruc: negocioTicket.ruc,
        docLabel: DOC_META[kind].docLabel,
        docNumber: numero,
        clienteDoc: customerDoc?.number,
        clienteDocLabel: DOC_META[kind].clienteDocLabel,
        igv,
        igvPorcentaje,
        pagos: paymentLines.map(p => ({ metodo: p.method, monto: p.amount })),
        fecha: ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        mozo: selected.waiter ?? cashier,
        clienteName: customerDoc?.name ?? selected.customer,
        clientePhone: selected.phone,
        clienteAddress: selected.address,
        items: chargingItems.map((i, idx) => ({
          cantidad: i.quantity, nombre: i.product.name, precio: i.product.price,
          codigo: i.product.sku || `P${String(idx + 1).padStart(3, '0')}`,
        })),
        subtotal: base,
        total: amountDue,
        paymentMethod: paymentLines.map(p => p.method).join(' + '),
        qrDataUrl: qrToDataUrl(qrValue),
      };
      if (ventanaImpresion) imprimirReciboCliente(plantilla, ticketPaperSize, datos, ventanaImpresion);
      else imprimirReciboAparte(plantilla, ticketPaperSize, datos);
    };

    /* Boleta/factura: el N° es el siguiente correlativo de la serie — el mismo que el backend usa al
       emitir (FacturacionAppService.EmitirAsync) — así que se imprime YA, sin esperar a SUNAT. Se
       reserva en pantalla (+1) para que un segundo cobro seguido no repita el número; al terminar se
       vuelven a leer las series reales. */
    const campoCorrelativo = kind === 'factura' ? 'correlativoFactura' : 'correlativoBoleta';
    const numeroPrevisto = kind !== 'notaVenta'
      ? (series ? `${kind === 'factura' ? series.serieFactura : series.serieBoleta}-${String(series[campoCorrelativo]).padStart(8, '0')}` : undefined)
      : (siguienteTicket != null ? String(siguienteTicket).padStart(8, '0') : undefined);
    if (imprimir && !numeroPrevisto) ventanaImpresion = abrirVentanaImpresion();
    if (numeroPrevisto) {
      imprimirComprobante(numeroPrevisto);
      const siguiente = Number(numeroPrevisto.split('-').pop()) + 1;
      if (kind === 'notaVenta') {
        reservas.ticket = Math.max(reservas.ticket, siguiente);
        setSiguienteTicket(siguiente);
      } else {
        reservas[campoCorrelativo] = Math.max(reservas[campoCorrelativo], siguiente);
        setSeries(s => (s ? { ...s, [campoCorrelativo]: siguiente } : s));
      }
    }

    /* Re-sincroniza con la API la serie / el N° de nota de venta: confirma el +1 reservado si se
       emitió, o lo corrige si el cobro falló o la emisión quedó pendiente (el N° no se consumió). */
    const resincronizar = () => {
      if (!tokenSesion) return;
      if (kind !== 'notaVenta') {
        getSeriesFacturacion(tokenSesion).then(d => { if (d.length > 0) setSeries(conReservas(d[0])); }).catch(() => {});
      } else {
        leerSiguienteTicket(tokenSesion).then(n => setSiguienteTicket(ticketConReserva(n))).catch(() => {});
      }
    };

    {
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
        esPorConsumo: (docType === 'Boleta' || docType === 'Nota de venta') ? esPorConsumo : false,
        /* Apenas el backend registra la venta (antes de refrescar mesas/caja):
           - Nota de venta: se imprime aquí con su correlativo real (no pasa por SUNAT, responde rápido).
           - Boleta/factura sin series cargadas: se imprime con el N° que devolvió la emisión.
           - Boleta/factura ya impresa: si SUNAT asignó otro N° (o quedó pendiente), se avisa. */
        onVentaCreada: venta => {
          /* El N° real ya quedó consumido: ningún cobro posterior puede reusarlo. */
          const nReal = kind === 'notaVenta' ? venta.correlativoTicket : Number(venta.numeroComprobante?.split('-').pop());
          if (nReal && Number.isFinite(nReal)) {
            if (kind === 'notaVenta') reservas.ticket = Math.max(reservas.ticket, nReal + 1);
            else reservas[campoCorrelativo] = Math.max(reservas[campoCorrelativo], nReal + 1);
          }
          if (kind === 'notaVenta') {
            const real = String(venta.correlativoTicket ?? venta.id).padStart(8, '0');
            if (!numeroPrevisto) imprimirComprobante(real);
            else if (imprimir && real !== numeroPrevisto) {
              triggerToast(`La nota de venta quedó con el N° ${real} (el ticket impreso dice ${numeroPrevisto}). Reimprímela desde Comprobantes.`, 'warning');
            }
            setSiguienteTicket((venta.correlativoTicket ?? 0) > 0 ? venta.correlativoTicket! + 1 : null);
          } else if (!numeroPrevisto) {
            imprimirComprobante(venta.numeroComprobante ?? undefined);
          } else if (imprimir && venta.numeroComprobante !== numeroPrevisto) {
            triggerToast(
              venta.numeroComprobante
                ? `SUNAT asignó el N° ${venta.numeroComprobante} (el ticket impreso dice ${numeroPrevisto}). Reimprímelo desde Comprobantes.`
                : `El comprobante quedó pendiente de SUNAT: el N° ${numeroPrevisto} del ticket puede cambiar al reintentar la emisión.`,
              'warning',
            );
          }
        },
      };
      const cobrar = () => (selected.kind === 'mesa' ? chargeTable(selected.ref, input) : chargeOrder(selected.ref, input));

      /* ── Cobro completo: va a la cola de segundo plano ──
         El ticket ya salió; el panel se libera YA y la cuenta desaparece de la lista para seguir
         cobrando otras mesas. La venta (y la emisión ante SUNAT) se registra detrás; si falla, la
         cuenta vuelve a aparecer con un aviso. Las cuentas separadas (cobro parcial) siguen esperando
         la respuesta: necesitan el resultado para mostrar el avance. */
      if (willCloseAfter) {
        const etiqueta = selected.kind === 'mesa' ? `Mesa ${selected.label}` : `Pedido #${selected.ref}`;
        const vuelto = round2(paymentLines.reduce(
          (s, p) => s + (p.method === 'Efectivo' && p.received != null ? Math.max(0, p.received - p.amount) : 0), 0,
        ));
        if (vuelto > 0) triggerToast(`Vuelto a entregar: ${money(vuelto)}`, 'info');

        encolarCobro(selected.key, async () => {
          const sale = await cobrar();
          if (!sale) {
            ventanaImpresion?.close();
            triggerToast(`${etiqueta}: el cobro no se registró. Volvió a la lista para cobrarla de nuevo.`, 'error');
            return;
          }
          imprimirComprobante(); // respaldo sin N° (solo si no se pudo imprimir antes)
        }).then(() => {
          if (!hayCobrosEnCurso()) { reservas.correlativoBoleta = 0; reservas.correlativoFactura = 0; reservas.ticket = 0; }
          resincronizar();
        });
        onClosed();
        return;
      }

      /* ── Cuenta parcial (dividir cuenta): también va a la cola ──
         Los ítems quedan como pagados y la cuenta aparece en "Cuentas cobradas" (Registrando…) al
         instante, así se puede cobrar la siguiente parte sin esperar. Si el backend la rechaza, los
         ítems vuelven a quedar pendientes y se avisa. */
      const idProvisional = `pend-${Date.now()}`;
      const itemIds = pickedItems.map(i => i.product.id);
      const provisional: SalesHistory = {
        id: idProvisional,
        time: ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        itemsCount: itemsCountForCharge,
        paymentMethod: paymentLines.map(p => p.method).join(' + '),
        total: amountDue,
        table: selected.label,
        docType,
        comprobante: kind !== 'notaVenta' ? numeroPrevisto : undefined,
        cashier,
        customerDoc,
      };
      const vueltoParcial = round2(paymentLines.reduce(
        (s, p) => s + (p.method === 'Efectivo' && p.received != null ? Math.max(0, p.received - p.amount) : 0), 0,
      ));
      if (vueltoParcial > 0) triggerToast(`Vuelto a entregar: ${money(vueltoParcial)}`, 'info');

      setPaidItemIds(prev => new Set([...prev, ...itemIds]));
      setPickItemIds(new Set());
      setChargedAccounts(prev => [
        ...prev,
        { sale: provisional, itemLabels: chargingItems.map(i => `${i.quantity}× ${i.product.name}`), pendiente: true },
      ]);
      setPayments([blankLine(payments[0].method)]);
      setDocNumber('');
      setDocName('');
      clearCliente();

      encolarCobro(`${selected.key}#${idProvisional}`, async () => {
        const sale = await cobrar();
        if (!sale) {
          ventanaImpresion?.close();
          setPaidItemIds(prev => new Set([...prev].filter(id => !itemIds.includes(id))));
          setChargedAccounts(prev => prev.filter(a => a.sale.id !== idProvisional));
          triggerToast('Una cuenta separada no se registró: sus ítems volvieron a quedar pendientes.', 'error');
          return;
        }
        imprimirComprobante(); // respaldo sin N° (solo si no se pudo imprimir antes)
        setChargedAccounts(prev => prev.map(a => (a.sale.id === idProvisional
          ? { ...a, sale: { ...sale, comprobante: sale.comprobante ?? provisional.comprobante }, pendiente: false }
          : a)));
      }).then(() => {
        if (!hayCobrosEnCurso()) { reservas.correlativoBoleta = 0; reservas.correlativoFactura = 0; reservas.ticket = 0; }
        resincronizar();
      });
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
    <div className="card-lg p-4 space-y-3 sticky top-20">
      {/* Encabezado (con el mozo en la misma fila) */}
      <div className="flex justify-between items-center gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 shrink-0 ${TYPE_META[selected.kind].badge}`}>
            {TYPE_META[selected.kind].icon} {TYPE_META[selected.kind].label}
          </span>
          <h4 className="text-sm font-bold text-slate-800 shrink-0">{selected.kind === 'mesa' ? `Mesa ${selected.label}` : `Pedido #${selected.ref}`}</h4>
          <span className="text-[10px] text-slate-400 truncate">· Mozo: {selected.waiter ?? '—'}</span>
        </div>
        {selected.kind === 'mesa' && !started && (
          <button onClick={onAddItems} disabled={esPorConsumo} className="text-[11px] font-medium text-brand hover:underline inline-flex items-center gap-1 disabled:opacity-30 disabled:no-underline disabled:cursor-not-allowed">
            <Pencil className="h-3 w-3" /> Agregar platos
          </button>
        )}
      </div>

      {esperandoEntrega && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2 text-xs font-bold">
          <Loader2 className="h-4 w-4 shrink-0" />
          {ESTADO_PEDIDO_LABEL[selected.pedidoEstado!] ?? 'Pedido en curso'} — no se puede cobrar hasta que se entreguen todos los platos.
        </div>
      )}

      {/* Cliente (pedidos para llevar / delivery) */}
      {(selected.customer || selected.phone || selected.address) && (
        <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
          {selected.customer && <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" /> {selected.customer}</p>}
          {selected.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {selected.phone}</p>}
          {selected.address && <p className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5" /> {selected.address}</p>}
        </div>
      )}

      {/* Detalle de ítems (con selección en modo "por ítems") */}
      <div className="space-y-0.5">
        {/* Cabecera con switch Por consumo (solo Boleta / Nota de venta) */}
        {(docType === 'Boleta' || docType === 'Nota de venta') && (
          <button
            type="button"
            onClick={() => { setEsPorConsumo(v => !v); if (!esPorConsumo) setSplitMode('full'); }}
            className="w-full flex items-center justify-end px-2 py-1 text-[11px] font-semibold"
          >
            <span className={`flex items-center gap-2 px-2 py-0.5 rounded-lg transition-all ${esPorConsumo ? 'bg-brand/10 text-brand' : 'text-slate-400 hover:text-slate-600'}`}>
              Por consumo
              {/* Switch visual */}
              <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${esPorConsumo ? 'bg-brand' : 'bg-slate-200'}`}>
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${esPorConsumo ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </span>
            </span>
          </button>
        )}

        <div className="max-h-36 overflow-y-auto space-y-0.5">
          {esPorConsumo ? (
            <div className="w-full flex justify-between items-center text-xs rounded-lg px-2 py-0.5">
              <span className="text-slate-600 font-semibold">1× Consumo</span>
              <span className="font-mono text-slate-700">{money(total)}</span>
            </div>
          ) : (
            selected.items.map(i => {
              const isPaid = paidItemIds.has(i.product.id);
              const selectable = splitMode === 'items' && !isPaid;
              const picked = pickItemIds.has(i.product.id);
              return (
                <button
                  key={i.product.id}
                  type="button"
                  disabled={!selectable}
                  onClick={() => selectable && toggleItem(i.product.id)}
                  className={`w-full flex justify-between items-center text-xs rounded-lg px-2 py-0.5 transition-colors ${
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
            })
          )}
        </div>
      </div>

      {/* Cuentas ya cobradas (desplegable) */}
      {chargedAccounts.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
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
                    <span className="inline-flex items-center gap-1.5">
                      Cuenta {idx + 1} · {acc.sale.docType ?? 'Nota de venta'}
                      {acc.pendiente && (
                        <span className="inline-flex items-center gap-1 font-medium text-sky-700">
                          <Loader2 className="h-3 w-3 animate-spin" /> Registrando…
                        </span>
                      )}
                    </span>
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
      <div className="border-t border-slate-200 pt-2 space-y-2">
        <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <Divide className="h-3.5 w-3.5" /> Forma de cobro
        </p>
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl flex-1">
          {([
            { id: 'full' as const,  label: 'Pago único' },
            { id: 'items' as const, label: 'Dividir cuenta' },
          ]).map(m => (
            <button
              key={m.id}
              onClick={() => changeSplitMode(m.id)}
              disabled={(splitLocked && splitMode !== m.id) || (esPorConsumo && m.id === 'items')}
              className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                splitMode === m.id ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-800 disabled:opacity-40'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        </div>

        {splitMode === 'items' && (
          <div className="text-[11px] text-slate-500 flex justify-between bg-emerald-50 rounded-lg px-3 py-1">
            <span>Cuenta en curso</span>
            <span className="font-mono">Abonado {money(paidAmount)} · Falta {money(remaining)}</span>
          </div>
        )}
      </div>

      {/* Comprobante */}
      <div className="border-t border-slate-200 pt-2 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Comprobante</p>
        <div className={`grid gap-1.5 ${comprobantesElectronicosDisponibles ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {([
            { id: 'Boleta' as const,        label: 'Boleta',        icon: <Receipt className="h-3.5 w-3.5" />,  serie: series ? `${series.serieBoleta}-${String(series.correlativoBoleta).padStart(8,'0')}` : null },
            { id: 'Factura' as const,       label: 'Factura',       icon: <FileText className="h-3.5 w-3.5" />, serie: series ? `${series.serieFactura}-${String(series.correlativoFactura).padStart(8,'0')}` : null },
            { id: 'Nota de venta' as const, label: 'Nota de venta', icon: <Ban className="h-3.5 w-3.5" />,      serie: null },
          ])
            .filter(d => comprobantesElectronicosDisponibles || d.id === 'Nota de venta')
            .map(d => (
            <button
              key={d.id}
              onClick={() => { setDocType(d.id); setDocNumber(''); setDocName(''); clearCliente(); if (d.id === 'Factura') setEsPorConsumo(false); }}
              disabled={esPorConsumo && d.id === 'Factura'}
              className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${
                docType === d.id ? 'bg-brand/10 border-brand text-brand' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="inline-flex items-center gap-1">{d.icon} {d.label}</span>
              {d.serie && <span className="text-[8px] font-mono opacity-70 leading-none">{d.serie}</span>}
            </button>
          ))}
        </div>

        {docType === 'Boleta' && (
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                value={clienteQuery}
                onChange={e => handlePersonInput(e.target.value)}
                onFocus={() => setShowClienteResults(true)}
                onBlur={() => setTimeout(() => setShowClienteResults(false), 150)}
                placeholder="DNI o nombre (opcional)"
                className="input w-full pl-8 pr-14 py-1.5 text-xs"
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
                <div className="absolute z-10 mt-1 w-full min-w-[260px] bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
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
              className="input w-full px-3 py-1.5 text-xs"
            />
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate" title="Escribe el DNI o busca por nombre: primero en tu CRM local y, si no está, en RENIEC.">
              <Users className="h-3 w-3 shrink-0" /> Sin DNI se emite como <strong>Cliente varios</strong> · busca en tu CRM o RENIEC.
            </p>
          </div>
        )}

        {docType === 'Factura' && (
          <div className="grid grid-cols-2 gap-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                value={clienteQuery}
                onChange={e => handlePersonInput(e.target.value)}
                onFocus={() => setShowClienteResults(true)}
                onBlur={() => setTimeout(() => setShowClienteResults(false), 150)}
                placeholder="RUC o razón social *"
                className="input w-full pl-8 pr-14 py-1.5 text-xs"
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
                <div className="absolute z-10 mt-1 w-full min-w-[260px] bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
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
              className="input w-full px-3 py-1.5 text-xs"
            />
          </div>
        )}

        {docType === 'Nota de venta' && comprobantesElectronicosDisponibles && (
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <Ban className="h-3.5 w-3.5 shrink-0" /> No se emitirá boleta ni factura electrónica (venta interna).
          </p>
        )}

      </div>

      {/* Totales de la cuenta a cobrar — nota de venta no desglosa IGV, es venta interna sin comprobante */}
      <div className="flex items-end justify-between gap-3 text-xs border-t border-slate-200 pt-2">
        <div className="font-mono text-[10px] text-slate-500 leading-tight">
          {docType !== 'Nota de venta' && (
            <>
              <p>Op. gravada {money(base)}</p>
              <p>IGV ({igvPorcentaje}%) {money(igv)}</p>
            </>
          )}
        </div>
        <div className="flex items-baseline gap-2 font-mono font-bold text-slate-800">
          <span className="text-xs">{splitMode === 'full' ? 'Total' : 'A cobrar ahora'}</span>
          <span className="text-base">{money(amountDue)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div className="space-y-2 border-t border-slate-200 pt-2">
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
          /* Sin monto escrito = pago exacto: el campo lo muestra así y el vuelto sale 0. */
          const receivedNum = p.method !== 'Efectivo' ? null : p.received === '' ? amount : Number(p.received);
          const change = p.method === 'Efectivo' && receivedNum != null ? round2(receivedNum - amount) : null;
          const usadoEnOtraLinea = new Set(payments.filter((_, i) => i !== idx).map(pp => pp.method));
          const quickCashLinea = [amount, 20, 50, 100, 200];

          return (
            <div key={idx} className="space-y-2 bg-slate-50 rounded-xl p-2">
              <div className="flex items-center gap-1.5">
                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {visiblePayments.map(vp => (
                    <button
                      key={vp.id}
                      type="button"
                      disabled={usadoEnOtraLinea.has(vp.id)}
                      onClick={() => updateLineMethod(idx, vp.id)}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
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
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                      <Wallet className="h-3.5 w-3.5" /> ¿Con cuánto paga?
                    </label>
                    <input
                      value={p.received === '' ? amount.toFixed(2) : p.received}
                      onChange={e => updateLineField(idx, 'received', onlyDigits(e.target.value.replace('.', '')) ? e.target.value.replace(/[^\d.]/g, '') : '')}
                      /* Por defecto muestra el monto exacto; al entrar se selecciona todo para escribir encima. */
                      onFocus={e => e.target.select()}
                      inputMode="decimal"
                      placeholder={money(amount)}
                      className="input flex-1 min-w-0 px-3 py-1.5 text-sm font-mono"
                    />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
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
                      {/* Vuelto en la misma fila que los billetes rápidos */}
                      {receivedNum != null && (
                        <div className={`ml-auto flex items-center gap-2 text-sm font-bold ${change != null && change >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          <span className="text-[10px] uppercase tracking-wide">Vuelto</span>
                          <span className="font-mono">{change != null ? money(Math.max(0, change)) : money(0)}</span>
                        </div>
                      )}
                    </div>
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
                      className="input w-[26%] min-w-0 px-2 py-1.5 text-xs text-right"
                    />
                    <input
                      value={p.entidadBancaria}
                      onChange={e => updateLineField(idx, 'entidadBancaria', e.target.value)}
                      placeholder="Entidad bancaria"
                      className="input w-[32%] min-w-0 px-2 py-1.5 text-xs text-right"
                    />
                    <input
                      value={p.observacion}
                      onChange={e => updateLineField(idx, 'observacion', e.target.value)}
                      placeholder="Observación"
                      className="input w-[42%] min-w-0 px-2 py-1.5 text-xs text-right"
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

      {/* Botón cobrar — "Cobrar" solo registra el pago; "Cobrar e imprimir" además imprime el
          ticket de cliente (plantilla y tamaño configurados en Configuración → Tickets). */}
      <div className="flex gap-2 items-stretch">
        <button
          onClick={() => doCharge(true)}
          disabled={!isCajaOpen || !!validationError}
          className="flex-1 bg-brand hover:bg-brand-hover text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <Printer className="h-4 w-4" /> Cobrar e imprimir {money(amountDue)}{docType !== 'Nota de venta' ? ` · ${docType}` : ''}
        </button>
        <button
          onClick={() => doCharge(false)}
          disabled={!isCajaOpen || !!validationError}
          className="shrink-0 bg-[#1f2d4d] hover:bg-[#18233c] text-white text-xs font-bold px-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Solo cobrar
        </button>
      </div>

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
