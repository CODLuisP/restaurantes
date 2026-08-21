'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Wallet, Lock, Unlock, ArrowDownCircle, ArrowUpCircle, CreditCard,
  Smartphone, Coins, Calculator, AlertTriangle, CheckCircle2, ShieldAlert, Clock, History, Info,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { StatCard, Row } from '@/components/caja/CajaCards';
import HistorialView from '@/components/caja/HistorialView';
import CajaModals from '@/components/caja/CajaModals';
import TurnoStaleWarning from '@/components/caja/TurnoStaleWarning';
import CerrarTurnoAjenoModal from '@/components/caja/CerrarTurnoAjenoModal';
import { money, fmtTime, fmtDate, todayStr, daysAgoStr, type QuickRange, type View } from '@/components/caja/types';
import type { CashMovementType, CashSession } from '@/types';

export default function CajaPage() {
  const {
    cashSession, cajaHistory, cajaLoading, isCajaOpen, cajaExpectedCash,
    sucursalTurnoActivo, sucursalTurnoStale, cerrarTurnoAjeno,
    openCaja, closeCaja, addCashMovement, loadCajaHistory, triggerToast,
  } = useApp();
  const { currentUser } = useAuth();

  const [view, setView] = useState<View>('cajas');

  const [openModal, setOpenModal]   = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [moveModal, setMoveModal]   = useState(false);
  const [closeForeignModal, setCloseForeignModal] = useState(false);
  const [foreignCountedInput, setForeignCountedInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [openingInput, setOpeningInput] = useState('');
  const [countedInput, setCountedInput] = useState('');
  const [moveType, setMoveType]     = useState<CashMovementType>('ingreso');
  const [moveAmount, setMoveAmount] = useState('');
  const [moveReason, setMoveReason] = useState('');

  const [fromDate, setFromDate] = useState(daysAgoStr(30));
  const [toDate, setToDate]     = useState(todayStr());

  /* Trae el historial real del backend cuando se abre la pestaña o cambia el rango de fechas */
  useEffect(() => {
    if (view === 'historial') loadCajaHistory(fromDate, toDate);
  }, [view, fromDate, toDate, loadCajaHistory]);

  const byName = currentUser?.name ?? 'Sistema';
  const canOperate = currentUser?.role === 'admin' || currentUser?.role === 'cajero';
  const isAdmin = currentUser?.role === 'admin';

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

  /* Continuidad de turno: lo último que se contó al cerrar la caja anterior */
  const previousClosingAmount = !isCajaOpen && cashSession?.status === 'cerrada' ? cashSession.countedAmount ?? 0 : null;
  const openingNum  = parseFloat(openingInput) || 0;
  const openingDiff = previousClosingAmount !== null && openingInput !== '' ? openingNum - previousClosingAmount : null;

  const openOpenModal = () => {
    // Sugiere como fondo inicial lo mismo que se contó en el cierre anterior (continuidad del efectivo)
    setOpeningInput(previousClosingAmount !== null ? previousClosingAmount.toFixed(2) : '');
    setOpenModal(true);
  };

  const handleOpen = async () => {
    const amount = parseFloat(openingInput);
    if (isNaN(amount) || amount < 0) { triggerToast('Ingrese un monto de fondo válido.', 'warning'); return; }
    setSaving(true);
    await openCaja(amount, byName);
    setSaving(false);
    setOpeningInput('');
    setOpenModal(false);
  };

  const handleClose = async () => {
    const amount = parseFloat(countedInput);
    if (isNaN(amount) || amount < 0) { triggerToast('Ingrese el efectivo contado.', 'warning'); return; }
    setSaving(true);
    await closeCaja(amount, byName);
    setSaving(false);
    setCountedInput('');
    setCloseModal(false);
  };

  const handleCloseForeign = async () => {
    if (!sucursalTurnoActivo) return;
    const amount = parseFloat(foreignCountedInput);
    if (isNaN(amount) || amount < 0) { triggerToast('Ingrese el efectivo contado.', 'warning'); return; }
    setSaving(true);
    await cerrarTurnoAjeno(sucursalTurnoActivo.id, amount, byName);
    setSaving(false);
    setForeignCountedInput('');
    setCloseForeignModal(false);
  };

  const handleMovement = async () => {
    const amount = parseFloat(moveAmount);
    if (isNaN(amount) || amount <= 0) { triggerToast('Ingrese un monto válido.', 'warning'); return; }
    if (!moveReason.trim())           { triggerToast('Indique el motivo del movimiento.', 'warning'); return; }
    setSaving(true);
    await addCashMovement(moveType, amount, moveReason.trim(), byName);
    setSaving(false);
    setMoveAmount(''); setMoveReason(''); setMoveType('ingreso');
    setMoveModal(false);
  };

  /* ── Historial: turno abierto (si existe) + turnos cerrados, filtrados por rango de fecha ──
     `cajaHistory` (backend) ya incluye cualquier turno dentro del rango, incluido el abierto —
     hay que sacarlo de ahí para no duplicar su id al anteponer `cashSession`. */
  const historyRows = useMemo(() => {
    const rows: CashSession[] = isCajaOpen && cashSession
      ? [cashSession, ...cajaHistory.filter(s => s.id !== cashSession.id)]
      : cajaHistory;
    const from = new Date(`${fromDate}T00:00:00`);
    const to   = new Date(`${toDate}T23:59:59`);
    return rows.filter(s => {
      const opened = new Date(s.openedAt);
      return opened >= from && opened <= to;
    });
  }, [isCajaOpen, cashSession, cajaHistory, fromDate, toDate]);

  const setQuickRange = (r: QuickRange) => {
    setFromDate(r === 'hoy' ? todayStr() : r === '7d' ? daysAgoStr(7) : daysAgoStr(30));
    setToDate(todayStr());
  };
  const activeQuick: QuickRange | null =
    toDate !== todayStr() ? null
    : fromDate === todayStr() ? 'hoy'
    : fromDate === daysAgoStr(7) ? '7d'
    : fromDate === daysAgoStr(30) ? '30d'
    : null;

  return (
    <div className="space-y-6 animate-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand" /> Gestión de Caja
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Turnos, arqueo y movimientos de efectivo — {currentUser?.name} ({currentUser?.role}).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView('cajas')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors ${
                view === 'cajas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Wallet className="h-3.5 w-3.5" /> Cajas
            </button>
            <button
              onClick={() => setView('historial')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors ${
                view === 'historial' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="h-3.5 w-3.5" /> Historial
            </button>
          </div>
          {view === 'cajas' && (
            <span className={`text-xs px-3 py-1.5 rounded-full font-bold inline-flex items-center gap-1.5 w-max shrink-0 ${
              isCajaOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
            }`}>
              {isCajaOpen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {isCajaOpen ? 'Caja Abierta' : 'Caja Cerrada'}
            </span>
          )}
        </div>
      </div>

      {cajaLoading ? (
        <div className="card-lg flex items-center justify-center py-20 text-xs text-slate-400">
          Cargando estado de caja...
        </div>
      ) : view === 'historial' ? (
        <HistorialView
          rows={historyRows}
          fromDate={fromDate}
          toDate={toDate}
          onFromDate={setFromDate}
          onToDate={setToDate}
          activeQuick={activeQuick}
          onQuickRange={setQuickRange}
        />
      ) : (
        <>
          {/* ── Caja ABIERTA ─────────────────────────────────────── */}
          {isCajaOpen && cashSession && (
            <>
              {/* Aviso de continuidad si el fondo de apertura no coincidió con el cierre anterior */}
              {cashSession.openingDifference !== undefined && Math.abs(cashSession.openingDifference) > 0.001 && (
                <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  cashSession.openingDifference > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'
                }`}>
                  <span className="text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    El cierre anterior contó {money(cashSession.previousClosingAmount ?? 0)} y esta caja abrió con {money(cashSession.openingAmount)} —
                    {cashSession.openingDifference > 0 ? ' sobran ' : ' faltan '}
                    {money(Math.abs(cashSession.openingDifference))} entre turnos.
                  </span>
                </div>
              )}

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
                <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => setMoveModal(true)}
                    className="flex items-center gap-3 pl-2.5 pr-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-left group"
                  >
                    <span className="h-9 w-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-brand transition-colors shrink-0">
                      <ArrowDownCircle className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Ingreso / Egreso</p>
                      <p className="text-[10px] text-slate-500">Registrar movimiento manual</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setCloseModal(true)}
                    className="flex items-center gap-3 pl-2.5 pr-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-700 transition-colors text-left shadow-sm shadow-rose-600/20"
                  >
                    <span className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">
                      <Lock className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">Cerrar Caja</p>
                      <p className="text-[10px] text-white/70">Arqueo y fin de turno</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* KPIs de ventas de la sesión */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Coins className="h-4 w-4" />}       tone="emerald" label="Ventas en Efectivo" value={money(cashSession.cashSales)} />
                <StatCard icon={<CreditCard className="h-4 w-4" />}  tone="sky"     label="Ventas con Tarjeta" value={money(cashSession.cardSales)} />
                <StatCard icon={<Smartphone className="h-4 w-4" />}  tone="violet"  label="Yape / Plin (QR)"   value={money(cashSession.digitalSales)} />
                <StatCard icon={<Wallet className="h-4 w-4" />}      tone="brand"   label={`Ventas Totales (${cashSession.salesCount})`} value={money(totalSales)} />
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Estas cifras reflejan las ventas registradas contra el sistema de cobro; si aún no está conectado, mostrarán S/. 0.00.
              </p>

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
                  <p className="text-[11px] text-slate-400">
                    El próximo turno debería abrir con {money(cashSession.countedAmount ?? 0)} — el sistema avisará si no coincide.
                  </p>
                </div>
              )}

              {/* Bloqueo: turno de otro cajero sin cerrar desde un día anterior */}
              {sucursalTurnoStale && sucursalTurnoActivo ? (
                <TurnoStaleWarning
                  turno={sucursalTurnoActivo}
                  canClose={isAdmin}
                  onCloseClick={() => setCloseForeignModal(true)}
                />
              ) : (
                /* Apertura */
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
                  <Button variant="primary" size="lg" icon={<Unlock className="h-4 w-4" />} onClick={openOpenModal} className="mx-auto">
                    Aperturar Caja
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <CajaModals
        openModal={openModal}
        setOpenModal={setOpenModal}
        openingInput={openingInput}
        setOpeningInput={setOpeningInput}
        previousClosingAmount={previousClosingAmount}
        openingDiff={openingDiff}
        onOpen={handleOpen}
        moveModal={moveModal}
        setMoveModal={setMoveModal}
        moveType={moveType}
        setMoveType={setMoveType}
        moveAmount={moveAmount}
        setMoveAmount={setMoveAmount}
        moveReason={moveReason}
        setMoveReason={setMoveReason}
        onMovement={handleMovement}
        closeModal={closeModal}
        setCloseModal={setCloseModal}
        countedInput={countedInput}
        setCountedInput={setCountedInput}
        closeDiff={closeDiff}
        cajaExpectedCash={cajaExpectedCash}
        cashSession={cashSession}
        onClose={handleClose}
        saving={saving}
        byName={byName}
      />

      <CerrarTurnoAjenoModal
        open={closeForeignModal}
        onClose={() => setCloseForeignModal(false)}
        turno={sucursalTurnoActivo}
        countedInput={foreignCountedInput}
        setCountedInput={setForeignCountedInput}
        onConfirm={handleCloseForeign}
        saving={saving}
      />
    </div>
  );}
