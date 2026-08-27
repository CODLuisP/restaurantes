'use client';

import { AlertTriangle, Calculator, CheckCircle2, Coins } from 'lucide-react';
import { Modal, Button, Input, Select } from '@/components/ui';
import type { CashMovementType, CashSession } from '@/types';
import { money } from './types';
import { Row } from './CajaCards';

interface CajaModalsProps {
  /* Apertura */
  openModal: boolean;
  setOpenModal: (v: boolean) => void;
  openingInput: string;
  setOpeningInput: (v: string) => void;
  previousClosingAmount: number | null;
  openingDiff: number | null;
  onOpen: () => void;
  /* Movimiento */
  moveModal: boolean;
  setMoveModal: (v: boolean) => void;
  moveType: CashMovementType;
  setMoveType: (v: CashMovementType) => void;
  moveAmount: string;
  setMoveAmount: (v: string) => void;
  moveReason: string;
  setMoveReason: (v: string) => void;
  onMovement: () => void;
  /* Cierre */
  closeModal: boolean;
  setCloseModal: (v: boolean) => void;
  countedInput: string;
  setCountedInput: (v: string) => void;
  closeDiff: number;
  cajaExpectedCash: number;
  cashSession: CashSession | null;
  onClose: () => void;
  /* Común */
  saving: boolean;
  byName: string;
}

/** Modales de apertura, movimiento manual y cierre (arqueo) del turno de caja. */
export default function CajaModals({
  openModal, setOpenModal, openingInput, setOpeningInput, previousClosingAmount, openingDiff, onOpen,
  moveModal, setMoveModal, moveType, setMoveType, moveAmount, setMoveAmount, moveReason, setMoveReason, onMovement,
  closeModal, setCloseModal, countedInput, setCountedInput, closeDiff, cajaExpectedCash, cashSession, onClose,
  saving, byName,
}: CajaModalsProps) {
  return (
    <>
      {/* ── Modal: Apertura ──────────────────────────────────── */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Apertura de Caja"
        subtitle="Registre el monto de efectivo con el que inicia el turno."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" onClick={onOpen} disabled={saving}>{saving ? 'Aperturando...' : 'Aperturar'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {previousClosingAmount !== null && (
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 text-xs">
              <span className="text-slate-500">El cierre anterior contó físicamente</span>
              <span className="font-mono font-bold text-slate-800">{money(previousClosingAmount)}</span>
            </div>
          )}
          <Input
            label="Fondo inicial (S/.)"
            type="number" min="0" step="0.10" inputMode="decimal"
            placeholder="0.00"
            value={openingInput}
            onChange={e => setOpeningInput(e.target.value)}
            iconLeft={<Coins className="h-4 w-4" />}
            autoFocus
          />
          {openingDiff !== null && Math.abs(openingDiff) > 0.001 && (
            <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold ${
              openingDiff > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'
            }`}>
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                {openingDiff > 0 ? 'Sobran' : 'Faltan'} respecto al cierre anterior
              </span>
              <span className="font-mono">{money(Math.abs(openingDiff))}</span>
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            Responsable de apertura: <strong>{byName}</strong>
          </p>
        </div>
      </Modal>

      {/* ── Modal: Movimiento ────────────────────────────────── */}
      <Modal
        open={moveModal}
        onClose={() => setMoveModal(false)}
        title="Movimiento de Caja"
        subtitle="Registre un ingreso o egreso de efectivo (propinas, compras, retiros...)."
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoveModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" onClick={onMovement} disabled={saving}>{saving ? 'Registrando...' : 'Registrar'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select label="Tipo de movimiento" value={moveType} onChange={e => setMoveType(e.target.value as CashMovementType)}>
            <option value="ingreso">Ingreso (entra efectivo)</option>
            <option value="egreso">Egreso (sale efectivo)</option>
          </Select>
          <Input
            label="Monto (S/.)"
            type="number" min="0" step="0.10" inputMode="decimal"
            placeholder="0.00"
            value={moveAmount}
            onChange={e => setMoveAmount(e.target.value)}
          />
          <Input
            label="Motivo"
            placeholder="Ej. Compra de hielo, retiro parcial, propina..."
            value={moveReason}
            onChange={e => setMoveReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* ── Modal: Cierre ────────────────────────────────────── */}
      <Modal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        title="Cierre de Caja (Arqueo)"
        subtitle="Cuente el efectivo físico en caja y regístrelo para cuadrar el turno."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCloseModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="danger" onClick={onClose} disabled={saving}>{saving ? 'Cerrando...' : 'Confirmar Cierre'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <Row label="Efectivo esperado (sistema)" value={money(cajaExpectedCash)} />
            <Row label="Ventas con tarjeta" value={money(cashSession?.cardSales ?? 0)} />
            <Row label="Ventas Yape / Plin" value={money(cashSession?.digitalSales ?? 0)} />
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
          {countedInput !== '' && (
            <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold ${
              closeDiff === 0 ? 'bg-emerald-50 text-emerald-800'
              : closeDiff > 0 ? 'bg-amber-50 text-amber-800'
              : 'bg-rose-50 text-rose-700'
            }`}>
              <span className="flex items-center gap-1.5">
                {closeDiff === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {closeDiff === 0 ? 'Caja cuadrada' : closeDiff > 0 ? 'Sobrante' : 'Faltante'}
              </span>
              <span className="font-mono">{money(Math.abs(closeDiff))}</span>
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            Este monto quedará como sugerencia de apertura para el siguiente turno.
          </p>
        </div>
      </Modal>
    </>
  );
}
