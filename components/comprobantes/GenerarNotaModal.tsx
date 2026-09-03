'use client';

import { useEffect, useState } from 'react';
import { Send, PackageSearch } from 'lucide-react';
import { Modal, Button, Select, Input, Alert } from '@/components/ui';
import {
  generarNota, getComprobanteDetalle,
  type NotaVentaResult, type ComprobanteDetailItem,
} from '@/lib/api/comprobantes';
import type { Comprobante } from './types';

interface GenerarNotaModalProps {
  open: boolean;
  onClose: () => void;
  comprobante: Comprobante | null;
  tipoNota: 'credito' | 'debito';
  token: string | null | undefined;
  onSuccess: (result: NotaVentaResult) => void;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const MOTIVOS_CREDITO = [
  { codigo: '01', label: 'Anulación de la operación' },
  { codigo: '02', label: 'Anulación por error en el RUC' },
  { codigo: '03', label: 'Corrección por error en la descripción' },
  { codigo: '04', label: 'Descuento global' },
  { codigo: '05', label: 'Descuento por ítem' },
  { codigo: '06', label: 'Devolución total' },
  { codigo: '07', label: 'Devolución por ítem' },
  { codigo: '08', label: 'Bonificación' },
  { codigo: '09', label: 'Disminución en el valor' },
  { codigo: '10', label: 'Otros conceptos' },
];

const MOTIVOS_DEBITO = [
  { codigo: '01', label: 'Intereses por mora' },
  { codigo: '02', label: 'Aumento en el valor' },
  { codigo: '03', label: 'Penalidades / Otros conceptos' },
];

// Motivos que aplican sobre ítems puntuales del comprobante, no sobre el total.
const MOTIVOS_POR_ITEM = new Set(['05', '07']);

export default function GenerarNotaModal({
  open, onClose, comprobante, tipoNota, token, onSuccess, triggerToast,
}: GenerarNotaModalProps) {
  const motivos = tipoNota === 'credito' ? MOTIVOS_CREDITO : MOTIVOS_DEBITO;
  const [codMotivo, setCodMotivo] = useState(motivos[0].codigo);
  const [desMotivo, setDesMotivo] = useState(motivos[0].label);
  const [montoTotal, setMontoTotal] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [itemsDetalle, setItemsDetalle] = useState<ComprobanteDetailItem[]>([]);
  const [cargandoItems, setCargandoItems] = useState(false);
  // ventaItemId -> cantidad seleccionada para afectar (0 = no seleccionado)
  const [cantidadesSeleccionadas, setCantidadesSeleccionadas] = useState<Record<number, number>>({});

  const esMotivoPorItem = MOTIVOS_POR_ITEM.has(codMotivo) && tipoNota === 'credito';

  useEffect(() => {
    if (!open || !comprobante) return;
    const primero = motivos[0];
    setCodMotivo(primero.codigo);
    setDesMotivo(primero.label);
    setMontoTotal(comprobante.monto.toFixed(2));
    setCantidadesSeleccionadas({});
    setItemsDetalle([]);

    if (!token) return;
    setCargandoItems(true);
    getComprobanteDetalle(token, parseInt(comprobante.id))
      .then(detalle => setItemsDetalle(detalle.items))
      .catch(() => setItemsDetalle([]))
      .finally(() => setCargandoItems(false));
  }, [open, tipoNota]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!comprobante) return null;

  const titulo = tipoNota === 'credito' ? 'Generar Nota de Crédito' : 'Generar Nota de Débito';

  const montoSeleccionadoPorItems = itemsDetalle.reduce((sum, it) => {
    const cant = cantidadesSeleccionadas[it.id] ?? 0;
    return sum + cant * it.precioUnitario;
  }, 0);

  const monto = esMotivoPorItem ? montoSeleccionadoPorItems : parseFloat(montoTotal || '0');
  const hayItemsSeleccionados = Object.values(cantidadesSeleccionadas).some(c => c > 0);
  const montoInvalido = esMotivoPorItem
    ? !hayItemsSeleccionados || monto <= 0
    : !monto || monto <= 0 || (tipoNota === 'credito' && monto > comprobante.monto);

  const handleMotivoChange = (codigo: string) => {
    setCodMotivo(codigo);
    const encontrado = motivos.find(m => m.codigo === codigo);
    setDesMotivo(encontrado?.label ?? '');
    setCantidadesSeleccionadas({});
  };

  const toggleItem = (itemId: number, cantidadMaxima: number, checked: boolean) => {
    setCantidadesSeleccionadas(prev => ({ ...prev, [itemId]: checked ? cantidadMaxima : 0 }));
  };

  const setCantidadItem = (itemId: number, cantidad: number, cantidadMaxima: number) => {
    const clamped = Math.max(0, Math.min(cantidad, cantidadMaxima));
    setCantidadesSeleccionadas(prev => ({ ...prev, [itemId]: clamped }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || montoInvalido || enviando) return;

    setEnviando(true);
    try {
      const items = esMotivoPorItem
        ? Object.entries(cantidadesSeleccionadas)
            .filter(([, cant]) => cant > 0)
            .map(([ventaItemId, cantidad]) => ({ ventaItemId: parseInt(ventaItemId), cantidad }))
        : undefined;

      const result = await generarNota(token, parseInt(comprobante.id), {
        tipoNota, codMotivo, desMotivo,
        montoTotal: Math.round(monto * 100) / 100,
        items,
      });
      onSuccess(result);
      if (result.exitoso) onClose();
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Error al generar la nota.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={titulo} subtitle={`Referente a ${comprobante.numero}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] text-slate-600">
          <div className="flex justify-between"><span>Comprobante afectado</span><span className="font-bold text-slate-800">{comprobante.numero}</span></div>
          <div className="flex justify-between"><span>Total original</span><span className="font-bold text-slate-800">S/ {comprobante.monto.toFixed(2)}</span></div>
        </div>

        <Select label="Motivo" value={codMotivo} onChange={e => handleMotivoChange(e.target.value)} disabled={enviando}>
          {motivos.map(m => (
            <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.label}</option>
          ))}
        </Select>

        <Input
          label="Descripción del motivo"
          value={desMotivo}
          onChange={e => setDesMotivo(e.target.value)}
          disabled={enviando}
          required
        />

        {esMotivoPorItem ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ítems a afectar
            </label>

            {cargandoItems && (
              <p className="text-[11px] text-slate-400 py-2">Cargando ítems del comprobante…</p>
            )}

            {!cargandoItems && itemsDetalle.length === 0 && (
              <Alert variant="warning" title="Sin ítems detallados">
                Este comprobante no tiene ítems registrados; usa un motivo global en su lugar.
              </Alert>
            )}

            {!cargandoItems && itemsDetalle.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {itemsDetalle.map(it => {
                  const nombre = it.productoNombre || it.comboNombre || 'Producto';
                  const cantidadSel = cantidadesSeleccionadas[it.id] ?? 0;
                  const checked = cantidadSel > 0;
                  return (
                    <div key={it.id} className="flex items-center gap-2 px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand shrink-0"
                        checked={checked}
                        disabled={enviando}
                        onChange={e => toggleItem(it.id, it.cantidad, e.target.checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-slate-700 truncate">{nombre}</p>
                        <p className="text-[10px] text-slate-400">
                          S/ {it.precioUnitario.toFixed(2)} c/u · máx {it.cantidad}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={it.cantidad}
                        value={cantidadSel}
                        disabled={!checked || enviando}
                        onChange={e => setCantidadItem(it.id, parseInt(e.target.value) || 0, it.cantidad)}
                        className="input w-16 px-2 py-1 text-[11px] text-center disabled:opacity-40"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 flex justify-between items-center">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <PackageSearch className="h-3.5 w-3.5" /> Monto calculado
              </span>
              <span className="text-sm font-bold text-slate-800">S/ {monto.toFixed(2)}</span>
            </div>
            {!hayItemsSeleccionados && (
              <p className="text-[10px] text-rose-500 font-medium">Selecciona al menos un ítem.</p>
            )}
          </div>
        ) : (
          <Input
            label="Monto total de la nota (incluye IGV)"
            type="number"
            step="0.01"
            min="0"
            value={montoTotal}
            onChange={e => setMontoTotal(e.target.value)}
            disabled={enviando}
            error={montoInvalido && montoTotal ? (tipoNota === 'credito' ? 'No puede superar el total original.' : 'Debe ser mayor a cero.') : undefined}
            required
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={enviando} disabled={montoInvalido} icon={<Send className="h-3.5 w-3.5" />}>
            Emitir nota
          </Button>
        </div>
      </form>
    </Modal>
  );
}
