'use client';

import { AlertTriangle, Calculator } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { money, fmtDate, fmtTime } from './types';
import type { TurnoCajaDto } from '@/lib/api/turnosCaja';

interface CerrarTurnoAjenoModalProps {
  open: boolean;
  onClose: () => void;
  turno: TurnoCajaDto | null;
  countedInput: string;
  setCountedInput: (v: string) => void;
  onConfirm: () => void;
  saving: boolean;
}

/** Modal con el que un admin cierra (con arqueo) el turno que otro cajero dejó pendiente. */
export default function CerrarTurnoAjenoModal({
  open, onClose, turno, countedInput, setCountedInput, onConfirm, saving,
}: CerrarTurnoAjenoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar turno pendiente"
      subtitle="Cuente el efectivo físico que dejó ese turno y regístrelo para poder aperturar uno nuevo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={saving}>{saving ? 'Cerrando...' : 'Confirmar Cierre'}</Button>
        </>
      }
    >
      {turno && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Aperturado por</span>
              <span className="font-semibold text-slate-700">{turno.cajeroNombre ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Fecha / hora de apertura</span>
              <span className="font-mono font-semibold text-slate-700">{fmtDate(turno.abiertoAt)} · {fmtTime(turno.abiertoAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Fondo inicial</span>
              <span className="font-mono font-semibold text-slate-700">{money(turno.montoApertura)}</span>
            </div>
          </div>
          <Input
            label="Efectivo contado físicamente (S/.)"
            type="number" min="0" step="0.10" inputMode="decimal"
            placeholder="0.00"
            value={countedInput}
            onChange={e => setCountedInput(e.target.value)}
            iconLeft={<Calculator className="h-4 w-4" />}
            autoFocus
          />
          <p className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Este cierre queda registrado a tu nombre como administrador, no como el cajero original.
          </p>
        </div>
      )}
    </Modal>
  );
}
