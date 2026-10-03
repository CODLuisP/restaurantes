'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Search, Wallet } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { getClientes } from '@/lib/api/clientes';
import { convertirTicket } from '@/lib/api/comprobantes';
import { getVentaById, type VentaDto } from '@/lib/api/ventas';
import { formatMetodoPago } from '@/lib/config/metodos';
import type { Cliente } from '@/types/clientes';

const onlyDigits = (s: string) => s.replace(/\D/g, '');
const money = (n: number) => `S/. ${n.toFixed(2)}`;

type TipoComprobante = 'boleta' | 'factura';

/** Detalle completo de la venta interna (ítems, método de pago, IGV) — igual al que se ve en
 *  Caja → Ventas del día, para que quede claro qué se está convirtiendo antes de emitir. */
function VentaDetalleBox({ detalle }: { detalle: VentaDto }) {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2 text-xs">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Artículos</span>
      <div className="space-y-1.5">
        {detalle.items.map(item => (
          <div key={item.id} className="flex justify-between items-center gap-2">
            <span className="text-slate-700 truncate">
              {item.productoNombre ? (item.varianteNombre ? `${item.productoNombre} (${item.varianteNombre})` : item.productoNombre) : item.comboNombre ?? 'Producto'}
              {' '}<span className="text-slate-400">x{item.cantidad}</span>
            </span>
            <span className="font-mono font-semibold text-slate-800 shrink-0">{money(item.precioUnitario * item.cantidad)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-slate-200 pt-2">
        <div className="flex items-center justify-between text-slate-600">
          <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-slate-400" /> {formatMetodoPago(detalle.metodoPago)}</span>
        </div>
        {detalle.numeroOperacion && (
          <p className="text-[11px] text-slate-500 pl-5 mt-0.5">
            N° Operación: <span className="font-medium text-slate-700">{detalle.numeroOperacion}</span>
            {detalle.entidadBancaria ? ` — ${detalle.entidadBancaria}` : ''}
          </p>
        )}
      </div>

      <div className="border-t border-slate-200 pt-2 space-y-1">
        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-mono">{money(detalle.subtotal)}</span></div>
        <div className="flex justify-between text-slate-500"><span>IGV ({detalle.igvPorcentaje}%)</span><span className="font-mono">{money(detalle.igvMonto)}</span></div>
        <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100"><span>Total</span><span className="font-mono">{money(detalle.total)}</span></div>
      </div>
    </div>
  );
}

interface ConvertirTicketModalProps {
  open: boolean;
  venta: VentaDto | null;
  token: string | undefined;
  onClose: () => void;
  onConverted: () => void;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/** Convierte un ticket (venta interna sin datos fiscales) en boleta o factura, buscando el
 *  cliente primero en el CRM y, si no hay match, en la API externa de RUC/DNI (json.pe) —
 *  la misma lógica de búsqueda que ya usa el módulo Cobrar (ChargePanel). */
export function ConvertirTicketModal({ open, venta, token, onClose, onConverted, triggerToast }: ConvertirTicketModalProps) {
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('boleta');
  const [docNumber, setDocNumber] = useState('');
  const [docName, setDocName] = useState('');
  // Solo informativa (RUC vía json.pe trae domicilio fiscal) — nunca editable, no se envía al backend.
  const [direccion, setDireccion] = useState('');
  const [clienteId, setClienteId] = useState<number | undefined>(undefined);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteQuery, setClienteQuery] = useState('');
  const [showClienteResults, setShowClienteResults] = useState(false);
  const [consultandoDoc, setConsultandoDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Diálogo pequeño de "¿seguro?" antes de emitir — no repite el formulario, solo pregunta.
  const [confirmando, setConfirmando] = useState(false);

  /* El listado de "Ventas del día" no trae el detalle de pago (N° operación/entidad) para no
     pagar ese JOIN en cada fila — se pide puntual aquí, igual que en la página que abre este
     modal, para mostrar el detalle completo de la venta interna antes de convertirla. */
  const [ventaDetalle, setVentaDetalle] = useState<VentaDto | null>(null);
  useEffect(() => {
    if (!open) return;
    setTipoComprobante('boleta');
    setDocNumber('');
    setDocName('');
    setDireccion('');
    setClienteId(undefined);
    setClienteQuery('');
    setShowClienteResults(false);
    setVentaDetalle(null);
    setConfirmando(false);
  }, [open, venta?.id]);

  useEffect(() => {
    if (!open || !token || !venta) return;
    let cancelado = false;
    getVentaById(token, venta.id).then(v => { if (!cancelado) setVentaDetalle(v); }).catch(() => {});
    return () => { cancelado = true; };
  }, [open, token, venta?.id]);

  useEffect(() => {
    if (!open || !token) return;
    getClientes(token).then(setClientes).catch(() => { /* buscador queda vacío, no bloquea la conversión */ });
  }, [open, token]);

  const clienteMatches = useMemo(() => {
    const q = clienteQuery.trim().toLowerCase();
    if (!q) return [];
    const docLen = tipoComprobante === 'factura' ? 11 : 8;
    return clientes
      .filter(c => onlyDigits(c.numeroDocumento ?? '').length === docLen)
      .filter(c => c.nombre.toLowerCase().includes(q) || (c.numeroDocumento ?? '').includes(q))
      .slice(0, 8);
  }, [clientes, clienteQuery, tipoComprobante]);

  const handlePersonInput = (raw: string) => {
    const maxLen = tipoComprobante === 'factura' ? 11 : 8;
    const digitsOnly = onlyDigits(raw);
    const isNumericQuery = raw !== '' && digitsOnly === raw;
    const displayValue = isNumericQuery ? digitsOnly.slice(0, maxLen) : raw;

    setClienteQuery(displayValue);
    setShowClienteResults(true);

    const digits = digitsOnly.slice(0, maxLen);
    setDocNumber(digits);
    if (digits.length !== maxLen) {
      setDocName('');
      setDireccion('');
      setClienteId(undefined);
    }
  };

  const selectCliente = (c: Cliente) => {
    setClienteId(c.id);
    setShowClienteResults(false);
    setDocName(c.nombre);
    setDireccion(''); // el CRM no trae domicilio fiscal en este listado
    if (c.numeroDocumento) {
      setTipoComprobante(c.numeroDocumento.length === 11 ? 'factura' : 'boleta');
      setDocNumber(c.numeroDocumento);
      setClienteQuery(c.numeroDocumento);
    }
  };

  /* Autocompleta el nombre/razón social (y, si es RUC, el domicilio fiscal) apenas el número
     alcanza su longitud válida: primero CRM local, si no hay match cae a la API externa
     (RENIEC/SUNAT vía json.pe). */
  useEffect(() => {
    const digits = onlyDigits(docNumber);
    const isRuc = tipoComprobante === 'factura';
    const longitudValida = isRuc ? digits.length === 11 : digits.length === 8;
    if (!open || !longitudValida) return;

    const local = clientes.find(c => onlyDigits(c.numeroDocumento ?? '') === digits);
    if (local) {
      setClienteId(local.id);
      setDocName(local.nombre);
      setDireccion('');
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
          const d = data.data ?? {};
          setDocName(d.nombre_o_razon_social || '');
          const partes = [d.direccion, d.distrito, d.provincia, d.departamento].filter(Boolean);
          setDireccion(d.direccion_completa || partes.join(', '));
        } else {
          const { nombres, apellido_paterno, apellido_materno } = data.data ?? {};
          setDocName([nombres, apellido_paterno, apellido_materno].filter(Boolean).join(' ').trim());
          setDireccion('');
        }
        setShowClienteResults(false);
      })
      .catch(() => { if (!cancelado) triggerToast(`Error al consultar el ${isRuc ? 'RUC' : 'DNI'}.`, 'error'); })
      .finally(() => { if (!cancelado) setConsultandoDoc(false); });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docNumber, tipoComprobante, clientes, open]);

  const validate = (): string | null => {
    const digits = onlyDigits(docNumber);
    if (tipoComprobante === 'factura') {
      if (digits.length !== 11) return 'La factura requiere un RUC válido (11 dígitos).';
      if (!docName.trim()) return 'Ingresa la razón social para la factura.';
    } else if (digits.length > 0 && digits.length !== 8) {
      return 'El DNI debe tener 8 dígitos (o déjalo vacío para Clientes varios).';
    }
    return null;
  };
  const validationError = validate();

  const handleEmitirClick = () => {
    const err = validate();
    if (err) { triggerToast(err, 'warning'); return; }
    setConfirmando(true);
  };

  const handleConfirmar = async () => {
    if (!venta || !token) return;
    const digits = onlyDigits(docNumber);
    setSubmitting(true);
    try {
      const result = await convertirTicket(token, venta.id, {
        tipoComprobante,
        tipoDoc: tipoComprobante === 'factura' ? 'ruc' : (digits.length > 0 ? 'dni' : null),
        numDoc: digits.length > 0 ? digits : null,
        razonSocial: docName.trim() || null,
        clienteId: clienteId ?? null,
      });
      if (result.exitoso) {
        triggerToast(`Convertido a ${tipoComprobante} ${result.numeroComprobante ?? ''}`.trim(), 'success');
        onConverted();
        onClose();
      } else {
        triggerToast(result.mensaje || 'No se pudo convertir el ticket.', 'error');
        setConfirmando(false);
      }
    } catch {
      triggerToast('Error al convertir el ticket.', 'error');
      setConfirmando(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!venta) return null;
  const detalle = ventaDetalle ?? venta;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Convertir a comprobante electrónico"
        subtitle={`${venta.numeroComprobante || `Venta #${venta.id}`} — ${money(venta.total)}`}
        size="sm"
        footer={
          <>
            <button type="button" onClick={onClose} className="btn-ghost text-xs">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleEmitirClick}
              disabled={!!validationError}
              className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed capitalize"
            >
              Emitir {tipoComprobante}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['boleta', 'factura'] as TipoComprobante[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTipoComprobante(t); setDocNumber(''); setDocName(''); setDireccion(''); setClienteId(undefined); setClienteQuery(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors capitalize ${
                  tipoComprobante === t
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              {tipoComprobante === 'factura' ? 'RUC' : 'DNI (opcional — vacío = Clientes varios)'}
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={clienteQuery || docNumber}
                onChange={e => handlePersonInput(e.target.value)}
                onFocus={() => setShowClienteResults(true)}
                placeholder={tipoComprobante === 'factura' ? '11 dígitos o nombre del cliente' : '8 dígitos o nombre del cliente'}
                className="input w-full pl-8 pr-8 py-2 text-xs"
              />
              {consultandoDoc && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />}
            </div>

            {showClienteResults && clienteMatches.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {clienteMatches.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCliente(c)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    <p className="font-semibold text-slate-800">{c.nombre}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{c.numeroDocumento}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              {tipoComprobante === 'factura' ? 'Razón social' : 'Nombre (opcional)'}
            </label>
            <input
              type="text"
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder={tipoComprobante === 'factura' ? 'Razón social del RUC' : 'Nombre del cliente'}
              className="input w-full py-2 text-xs"
            />
            {direccion && (
              <p className="mt-1.5 flex items-start gap-1 text-[11px] text-slate-400">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="truncate">{direccion}</span>
              </p>
            )}
          </div>

          {tipoComprobante === 'boleta' && !docNumber && (
            <p className="text-[11px] text-slate-400 italic">Sin DNI se emitirá como "Clientes varios".</p>
          )}

          <VentaDetalleBox detalle={detalle} />
        </div>
      </Modal>

      {/* Diálogo pequeño de confirmación — no repite el formulario, solo pregunta antes de emitir. */}
      <Modal
        open={confirmando}
        onClose={() => !submitting && setConfirmando(false)}
        title={`¿Emitir ${tipoComprobante}?`}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setConfirmando(false)} className="btn-ghost text-xs" disabled={submitting}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={submitting}
              className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {submitting ? 'Emitiendo...' : 'Sí, emitir'}
            </button>
          </>
        }
      >
        <p className="text-xs text-slate-600">
          Se convertirá el ticket en <span className="font-bold capitalize">{tipoComprobante}</span> por{' '}
          <span className="font-bold">{money(venta.total)}</span> a nombre de{' '}
          <span className="font-bold">{docName.trim() || 'Clientes varios'}</span> y se emitirá a SUNAT. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </>
  );
}
