'use client';

import { useState } from 'react';
import {
  Wallet, Lock, Unlock, ArrowDownCircle, ArrowUpCircle, CreditCard,
  Smartphone, Coins, Calculator, AlertTriangle, CheckCircle2, ShieldAlert, Clock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Modal, Button, Input, Select } from '@/components/ui';
import type { CashMovementType } from '@/types';

const money = (n: number) => `S/. ${n.toFixed(2)}`;
const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function CajaPage() {
  const { cashSession, isCajaOpen, cajaExpectedCash, openCaja, closeCaja, addCashMovement, triggerToast } = useApp();
  const { currentUser } = useAuth();

  const [openModal, setOpenModal]   = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [moveModal, setMoveModal]   = useState(false);

  const [openingInput, setOpeningInput] = useState('');
  const [countedInput, setCountedInput] = useState('');
  const [moveType, setMoveType]     = useState<CashMovementType>('ingreso');
  const [moveAmount, setMoveAmount] = useState('');
  const [moveReason, setMoveReason] = useState('');

  const byName = currentUser?.name ?? 'Sistema';
  const canOperate = currentUser?.role === 'admin' || currentUser?.role === 'cajero';

  /* Guard de rol: solo admin y cajero operan la caja */
  if (!canOperate) {
    return (
      <div className="card-lg max-w-md mx-auto my-16 p-8 text-center space-y-3 animate-section">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Acceso restringido</h3>
        <p className="text-xs text-slate-500">
          Solo el <strong>cajero</strong> o el <strong>administrador</strong> pueden gestionar la apertura y cierre de caja.
        </p>
      </div>
    );
  }

  const totalSales = cashSession
    ? cashSession.cashSales + cashSession.cardSales + cashSession.digitalSales
    : 0;

  const countedNum   = parseFloat(countedInput) || 0;
  const closeDiff    = countedNum - cajaExpectedCash;

  const handleOpen = () => {
    const amount = parseFloat(openingInput);
    if (isNaN(amount) || amount < 0) { triggerToast('Ingrese un monto de fondo válido.', 'warning'); return; }
    openCaja(amount, byName);
    setOpeningInput('');
    setOpenModal(false);
  };

  const handleClose = () => {
    const amount = parseFloat(countedInput);
    if (isNaN(amount) || amount < 0) { triggerToast('Ingrese el efectivo contado.', 'warning'); return; }
    closeCaja(amount, byName);
    setCountedInput('');
    setCloseModal(false);
  };

  const handleMovement = () => {
    const amount = parseFloat(moveAmount);
    if (isNaN(amount) || amount <= 0) { triggerToast('Ingrese un monto válido.', 'warning'); return; }
    if (!moveReason.trim())           { triggerToast('Indique el motivo del movimiento.', 'warning'); return; }
    addCashMovement(moveType, amount, moveReason.trim(), byName);
    setMoveAmount(''); setMoveReason(''); setMoveType('ingreso');
    setMoveModal(false);
  };

  return (
    <div className="space-y-6 animate-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand" /> Gestión de Caja
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Apertura, arqueo y cierre del punto de cobro — {currentUser?.name} ({currentUser?.role}).
          </p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-bold inline-flex items-center gap-1.5 w-max ${
          isCajaOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
        }`}>
          {isCajaOpen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {isCajaOpen ? 'Caja Abierta' : 'Caja Cerrada'}
        </span>
      </div>

      {/* ── Caja ABIERTA ─────────────────────────────────────── */}
      {isCajaOpen && cashSession && (
        <>
          {/* Info de sesión */}
          <div className="card-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Sesión</span>
                <span className="text-sm font-mono font-bold text-slate-800">{cashSession.id}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Aperturada por</span>
                <span className="text-sm font-semibold text-slate-800">{cashSession.openedBy}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Hora apertura</span>
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> {fmtTime(cashSession.openedAt)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Fondo inicial</span>
                <span className="text-sm font-mono font-bold text-slate-800">{money(cashSession.openingAmount)}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" size="sm" icon={<ArrowDownCircle className="h-3.5 w-3.5" />} onClick={() => setMoveModal(true)}>
                Ingreso / Egreso
              </Button>
              <Button variant="danger" size="sm" icon={<Lock className="h-3.5 w-3.5" />} onClick={() => setCloseModal(true)}>
                Cerrar Caja
              </Button>
            </div>
          </div>

          {/* KPIs de ventas de la sesión */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Coins className="h-4 w-4" />}       tone="emerald" label="Ventas en Efectivo" value={money(cashSession.cashSales)} />
            <StatCard icon={<CreditCard className="h-4 w-4" />}  tone="sky"     label="Ventas con Tarjeta" value={money(cashSession.cardSales)} />
            <StatCard icon={<Smartphone className="h-4 w-4" />}  tone="violet"  label="Yape / Plin (QR)"   value={money(cashSession.digitalSales)} />
            <StatCard icon={<Wallet className="h-4 w-4" />}      tone="brand"   label={`Ventas Totales (${cashSession.salesCount})`} value={money(totalSales)} />
          </div>

          {/* Efectivo esperado + movimientos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Arqueo teórico */}
            <div className="card-lg p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="h-4 w-4 text-brand" /> Efectivo esperado en caja
              </h4>
              <div className="space-y-2 text-xs">
                <Row label="Fondo inicial" value={money(cashSession.openingAmount)} />
                <Row label="+ Ventas en efectivo" value={money(cashSession.cashSales)} />
                <Row label="+ Ingresos manuales" value={money(cashSession.movements.filter(m => m.type === 'ingreso').reduce((a, m) => a + m.amount, 0))} />
                <Row label="− Egresos manuales" value={money(cashSession.movements.filter(m => m.type === 'egreso').reduce((a, m) => a + m.amount, 0))} />
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
                  <span className="font-bold text-slate-800">Total esperado</span>
                  <span className="font-mono font-bold text-brand text-base">{money(cajaExpectedCash)}</span>
                </div>
              </div>
            </div>

            {/* Movimientos */}
            <div className="card-lg p-5 space-y-3 lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Movimientos de caja</h4>
              {cashSession.movements.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">Sin ingresos ni egresos manuales registrados.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cashSession.movements.slice().reverse().map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        {m.type === 'ingreso'
                          ? <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                          : <ArrowUpCircle className="h-4 w-4 text-rose-500" />}
                        <div>
                          <p className="text-xs font-medium text-slate-700">{m.reason}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{m.time} · {m.by}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-bold ${m.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.type === 'ingreso' ? '+' : '−'}{money(m.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Caja CERRADA ─────────────────────────────────────── */}
      {!isCajaOpen && (
        <>
          {/* Arqueo del último cierre */}
          {cashSession?.status === 'cerrada' && (
            <div className="card-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h4 className="text-sm font-bold text-slate-800">Arqueo del último cierre — {cashSession.id}</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <Row col label="Cerrada por" value={cashSession.closedBy ?? '—'} />
                <Row col label="Fecha / hora" value={`${fmtDate(cashSession.closedAt)} · ${fmtTime(cashSession.closedAt)}`} />
                <Row col label="Efectivo esperado" value={money(cashSession.expectedAmount ?? 0)} />
                <Row col label="Efectivo contado" value={money(cashSession.countedAmount ?? 0)} />
              </div>
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                (cashSession.difference ?? 0) === 0 ? 'bg-emerald-50 text-emerald-800'
                : (cashSession.difference ?? 0) > 0 ? 'bg-amber-50 text-amber-800'
                : 'bg-rose-50 text-rose-700'
              }`}>
                <span className="text-xs font-bold flex items-center gap-2">
                  {(cashSession.difference ?? 0) === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {(cashSession.difference ?? 0) === 0 ? 'Caja cuadrada' : (cashSession.difference ?? 0) > 0 ? 'Sobrante de caja' : 'Faltante de caja'}
                </span>
                <span className="font-mono font-bold text-base">{money(Math.abs(cashSession.difference ?? 0))}</span>
              </div>
            </div>
          )}

          {/* Apertura */}
          <div className="card-lg p-10 text-center space-y-4 max-w-lg mx-auto">
            <div className="mx-auto w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <Lock className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800">La caja está cerrada</h4>
              <p className="text-xs text-slate-500 mt-1">
                Registre el fondo inicial (monto de apertura) para habilitar el cobro en el POS.
                Mientras la caja esté cerrada, los mozos no podrán operar.
              </p>
            </div>
            <Button variant="primary" size="lg" icon={<Unlock className="h-4 w-4" />} onClick={() => setOpenModal(true)} className="mx-auto">
              Aperturar Caja
            </Button>
          </div>
        </>
      )}

      {/* ── Modal: Apertura ──────────────────────────────────── */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Apertura de Caja"
        subtitle="Registre el monto de efectivo con el que inicia el turno."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleOpen}>Aperturar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Fondo inicial (S/.)"
            type="number" min="0" step="0.10" inputMode="decimal"
            placeholder="0.00"
            value={openingInput}
            onChange={e => setOpeningInput(e.target.value)}
            iconLeft={<Coins className="h-4 w-4" />}
            autoFocus
          />
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
            <Button variant="secondary" onClick={() => setMoveModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleMovement}>Registrar</Button>
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
            <Button variant="secondary" onClick={() => setCloseModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleClose}>Confirmar Cierre</Button>
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
        </div>
      </Modal>
    </div>
  );
}

/* ── Subcomponentes ─────────────────────────────────────────── */

function Row({ label, value, col }: { label: string; value: string; col?: boolean }) {
  if (col) {
    return (
      <div>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">{label}</span>
        <span className="text-sm font-semibold text-slate-800">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono font-semibold text-slate-700">{value}</span>
    </div>
  );
}

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  sky:     'bg-sky-50 text-sky-600',
  violet:  'bg-violet-50 text-violet-600',
  brand:   'bg-brand/10 text-brand',
};

function StatCard({ icon, tone, label, value }: { icon: React.ReactNode; tone: string; label: string; value: string }) {
  return (
    <div className="card p-4 space-y-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONES[tone]}`}>{icon}</div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{label}</p>
        <p className="text-lg font-mono font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
