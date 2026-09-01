'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Modal, Button, Select, Input } from '@/components/ui';
import { generarNota, type NotaVentaResult } from '@/lib/api/comprobantes';
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

export default function GenerarNotaModal({
  open, onClose, comprobante, tipoNota, token, onSuccess, triggerToast,
}: GenerarNotaModalProps) {
  const motivos = tipoNota === 'credito' ? MOTIVOS_CREDITO : MOTIVOS_DEBITO;
  const [codMotivo, setCodMotivo] = useState(motivos[0].codigo);
  const [desMotivo, setDesMotivo] = useState(motivos[0].label);
  const [montoTotal, setMontoTotal] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    const primero = motivos[0];
    setCodMotivo(primero.codigo);
    setDesMotivo(primero.label);
    setMontoTotal(comprobante ? comprobante.monto.toFixed(2) : '');
  }, [open, tipoNota]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!comprobante) return null;

  const titulo = tipoNota === 'credito' ? 'Generar Nota de Crédito' : 'Generar Nota de Débito';
  const monto = parseFloat(montoTotal || '0');
  const montoInvalido = !monto || monto <= 0 || (tipoNota === 'credito' && monto > comprobante.monto);

  const handleMotivoChange = (codigo: string) => {
    setCodMotivo(codigo);
    const encontrado = motivos.find(m => m.codigo === codigo);
    setDesMotivo(encontrado?.label ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || montoInvalido) return;

    setEnviando(true);
    try {
      const result = await generarNota(token, parseInt(comprobante.id), {
        tipoNota, codMotivo, desMotivo, montoTotal: monto,
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
