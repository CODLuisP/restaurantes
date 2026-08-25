'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { CashSession, CashMovementType, Toast } from '@/types';
import { ApiError } from '@/lib/api/client';
import {
  abrirTurno, cerrarTurno, getTurnoActivo, getTurnoActivoSucursal, getResumenTurno, getHistorialTurnos,
  crearMovimientoCaja, getMovimientosTurno,
  type TurnoCajaDto, type ResumenTurnoDto, type MovimientoCajaDto,
} from '@/lib/api/turnosCaja';

/** Arma el CashSession que consume la UI a partir del turno + resumen + movimientos reales del backend. */
function mapTurnoToCashSession(
  turno: TurnoCajaDto,
  resumen: ResumenTurnoDto | null,
  movimientos: MovimientoCajaDto[],
  previousClosingAmount?: number,
): CashSession {
  const digitalSales = (resumen?.totalYape ?? 0) + (resumen?.totalPlin ?? 0) + (resumen?.totalOtro ?? 0);
  const status: CashSession['status'] = turno.estado === 'abierto' ? 'abierta' : 'cerrada';
  return {
    id: `CJ-${turno.id}`,
    turnoId: turno.id,
    status,
    openedBy: turno.cajeroNombre ?? '',
    openedAt: turno.abiertoAt,
    openingAmount: turno.montoApertura,
    previousClosingAmount,
    openingDifference: previousClosingAmount !== undefined ? turno.montoApertura - previousClosingAmount : undefined,
    movements: movimientos.map(m => ({
      id: String(m.id),
      type: m.tipo,
      amount: m.monto,
      reason: m.motivo,
      time: new Date(m.creadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      by: m.usuarioNombre ?? '',
    })),
    cashSales: resumen?.totalEfectivo ?? 0,
    cardSales: resumen?.totalTarjeta ?? 0,
    digitalSales,
    salesCount: resumen?.cantidadVentas ?? 0,
    closedBy: status === 'cerrada' ? (turno.cajeroNombre ?? undefined) : undefined,
    closedAt: turno.cerradoAt ?? undefined,
    countedAmount: turno.montoCierre ?? undefined,
    expectedAmount: resumen?.efectivoEsperado,
    difference: turno.montoCierre != null && resumen ? turno.montoCierre - resumen.efectivoEsperado : undefined,
  };
}

/**
 * Estado del turno de caja contra el backend: turno propio del cajero (apertura, cierre,
 * movimientos manuales) e indicador de si hay caja abierta en el local.
 */
export function useCajaTurno(triggerToast: (message: string, type?: Toast['type']) => void) {
  const { data: authSession } = useSession();
  const token = authSession?.accessToken;
  const cajeroId = authSession?.user?.id ? Number(authSession.user.id) : undefined;
  const sucursalId = authSession?.user?.sucursalId ?? undefined;

  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [cajaHistory, setCajaHistory] = useState<CashSession[]>([]);
  const [cajaLoading, setCajaLoading] = useState(true);
  const [sucursalCajaAbierta, setSucursalCajaAbierta] = useState(false);
  const [sucursalTurnoActivo, setSucursalTurnoActivo] = useState<TurnoCajaDto | null>(null);
  const previousClosingRef = useRef<number | undefined>(undefined);

  /* Turno de OTRO cajero que quedó abierto desde un día calendario anterior: hay que cerrarlo
     antes de poder abrir uno nuevo (ver bloqueo equivalente en el backend, AbrirAsync). */
  const sucursalTurnoStale = !!sucursalTurnoActivo &&
    new Date(sucursalTurnoActivo.abiertoAt).toDateString() !== new Date().toDateString();

  /** Trae el turno activo (si existe) junto con su resumen y movimientos, y arma el CashSession. */
  const loadActiveTurno = useCallback(async () => {
    if (!token || !cajeroId) { setCajaLoading(false); return; }
    setCajaLoading(true);
    try {
      const turno = await getTurnoActivo(token, cajeroId);
      const [resumen, movimientos] = await Promise.all([
        getResumenTurno(token, turno.id).catch(() => null),
        getMovimientosTurno(token, turno.id).catch(() => []),
      ]);
      setCashSession(mapTurnoToCashSession(turno, resumen, movimientos, previousClosingRef.current));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        triggerToast('No se pudo cargar el turno de caja.', 'error');
      }
      setCashSession(null);
    } finally {
      setCajaLoading(false);
    }
  }, [token, cajeroId]);

  useEffect(() => { loadActiveTurno(); }, [loadActiveTurno]);

  /* ¿Hay caja abierta en el local (de cualquier cajero)? Distinto de "mi turno personal":
     lo usa AuthGuard para habilitar a los mozos aunque ellos mismos no operen la caja. */

  const loadSucursalCajaAbierta = useCallback(async () => {
    if (!token) return;
    try {
      const turno = await getTurnoActivoSucursal(token, sucursalId);
      setSucursalCajaAbierta(true);
      setSucursalTurnoActivo(turno);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSucursalCajaAbierta(false);
        setSucursalTurnoActivo(null);
      }
    }
  }, [token, sucursalId]);

  useEffect(() => { loadSucursalCajaAbierta(); }, [loadSucursalCajaAbierta]);

  const loadCajaHistory = useCallback(async (desde: string, hasta: string) => {
    if (!token) return;
    try {
      const turnos = await getHistorialTurnos(token, { desde, hasta });
      const resumenes = await Promise.all(turnos.map(t => getResumenTurno(token, t.id).catch(() => null)));
      setCajaHistory(turnos.map((t, i) => mapTurnoToCashSession(t, resumenes[i], [])));
    } catch {
      triggerToast('No se pudo cargar el historial de caja.', 'error');
    }
  }, [token]);

  /* ── Caja ─────────────────────────────────────────────────── */

  const isCajaOpen = cashSession?.status === 'abierta';

  /* Efectivo que debería haber físicamente en caja: lo calcula el backend
     (fondo inicial + ventas en efectivo + ingresos - egresos, vía /resumen). */
  const cajaExpectedCash = cashSession?.expectedAmount ?? 0;

  const openCaja = useCallback(
    async (openingAmount: number, by: string) => {
      if (!token || !cajeroId) { triggerToast('Sesión expirada.', 'error'); return; }
      if (cashSession?.status === 'abierta') {
        triggerToast('Ya existe una caja abierta.', 'warning');
        return;
      }
      /* Continuidad: lo que el turno anterior contó físicamente al cerrar debe
         coincidir con el fondo de apertura de este turno. Si no coincide, el
         dinero "desaparecido" entre un cierre y la siguiente apertura queda
         registrado igual — así nadie puede llevarse efectivo sin que se note. */
      const previousClosingAmount = cashSession?.status === 'cerrada' ? cashSession.countedAmount : undefined;

      try {
        const turno = await abrirTurno(token, { cajeroId, montoApertura: openingAmount });
        previousClosingRef.current = previousClosingAmount;
        setCashSession(mapTurnoToCashSession(turno, null, [], previousClosingAmount));
        setSucursalCajaAbierta(true);

        const openingDifference = previousClosingAmount !== undefined ? openingAmount - previousClosingAmount : undefined;
        if (openingDifference && Math.abs(openingDifference) > 0.001) {
          triggerToast(
            `⚠️ El cierre anterior contó S/. ${previousClosingAmount!.toFixed(2)} y estás abriendo con S/. ${openingAmount.toFixed(2)} ` +
            `(${openingDifference > 0 ? 'sobran' : 'faltan'} S/. ${Math.abs(openingDifference).toFixed(2)} entre turnos).`,
            'warning'
          );
        } else {
          triggerToast(`Caja aperturada por ${by} con fondo de S/. ${openingAmount.toFixed(2)}.`, 'success');
        }
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo aperturar la caja.', 'error');
      }
    },
    [token, cajeroId, cashSession, triggerToast]
  );

  const addCashMovement = useCallback(
    async (type: CashMovementType, amount: number, reason: string) => {
      if (!token || !cashSession?.turnoId || cashSession.status !== 'abierta') {
        triggerToast('No hay caja abierta para registrar movimientos.', 'error');
        return;
      }
      const turnoId = cashSession.turnoId;
      try {
        const nuevoMovimiento = await crearMovimientoCaja(token, turnoId, { tipo: type, monto: amount, motivo: reason });
        const resumen = await getResumenTurno(token, turnoId).catch(() => null);
        setCashSession(prev => prev && {
          ...prev,
          movements: [
            ...prev.movements,
            {
              id: String(nuevoMovimiento.id),
              type: nuevoMovimiento.tipo,
              amount: nuevoMovimiento.monto,
              reason: nuevoMovimiento.motivo,
              time: new Date(nuevoMovimiento.creadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
              by: nuevoMovimiento.usuarioNombre ?? '',
            },
          ],
          cashSales: resumen?.totalEfectivo ?? prev.cashSales,
          cardSales: resumen?.totalTarjeta ?? prev.cardSales,
          digitalSales: resumen ? (resumen.totalYape + resumen.totalPlin + resumen.totalOtro) : prev.digitalSales,
          salesCount: resumen?.cantidadVentas ?? prev.salesCount,
          expectedAmount: resumen?.efectivoEsperado ?? prev.expectedAmount,
        });
        triggerToast(
          `${type === 'ingreso' ? 'Ingreso' : 'Egreso'} de S/. ${amount.toFixed(2)} registrado en caja.`,
          'info'
        );
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo registrar el movimiento.', 'error');
      }
    },
    [token, cashSession, triggerToast]
  );

  /** Refresca cashSales/cardSales/digitalSales/salesCount/expectedAmount con el resumen real
   *  del backend — se llama tras registrar una venta real (Cobrar) para reflejarla en caja. */
  const refreshResumen = useCallback(async () => {
    if (!token || !cashSession?.turnoId) return;
    const resumen = await getResumenTurno(token, cashSession.turnoId).catch(() => null);
    if (!resumen) return;
    setCashSession(prev => prev && {
      ...prev,
      cashSales: resumen.totalEfectivo,
      cardSales: resumen.totalTarjeta,
      digitalSales: resumen.totalYape + resumen.totalPlin + resumen.totalOtro,
      salesCount: resumen.cantidadVentas,
      expectedAmount: resumen.efectivoEsperado,
    });
  }, [token, cashSession?.turnoId]);

  const closeCaja = useCallback(
    async (countedAmount: number, by: string): Promise<CashSession | null> => {
      if (!token || !cashSession?.turnoId || cashSession.status !== 'abierta') {
        triggerToast('No hay caja abierta para cerrar.', 'error');
        return null;
      }
      try {
        const turno = await cerrarTurno(token, cashSession.turnoId, { montoCierre: countedAmount });
        const resumen = await getResumenTurno(token, cashSession.turnoId).catch(() => null);
        const closed = mapTurnoToCashSession(turno, resumen, cashSession.movements.map(m => ({
          id: Number(m.id), turnoId: cashSession.turnoId!, tipo: m.type, monto: m.amount, motivo: m.reason,
          usuarioId: 0, usuarioNombre: m.by, creadoEn: new Date().toISOString(),
        })));
        setCashSession(closed);
        setCajaHistory(prev => [closed, ...prev]);
        loadSucursalCajaAbierta();
        const diff = closed.difference ?? 0;
        triggerToast(
          diff === 0
            ? `Caja cerrada y cuadrada correctamente por ${by}.`
            : `Caja cerrada por ${by}. ${diff > 0 ? 'Sobrante' : 'Faltante'} de S/. ${Math.abs(diff).toFixed(2)}.`,
          diff === 0 ? 'success' : 'warning'
        );
        return closed;
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo cerrar la caja.', 'error');
        return null;
      }
    },
    [token, cashSession, triggerToast, loadSucursalCajaAbierta]
  );

  /* Admin cerrando el turno stale de OTRO cajero (no el propio): requiere el conteo físico
     igual que un cierre normal, solo que actúa sobre un turnoId ajeno. */
  const cerrarTurnoAjeno = useCallback(
    async (turnoId: number, countedAmount: number, by: string) => {
      if (!token) { triggerToast('Sesión expirada.', 'error'); return; }
      try {
        await cerrarTurno(token, turnoId, { montoCierre: countedAmount });
        await loadSucursalCajaAbierta();
        triggerToast(`Turno pendiente cerrado por ${by}.`, 'success');
      } catch (err) {
        triggerToast(err instanceof ApiError ? err.message : 'No se pudo cerrar el turno.', 'error');
      }
    },
    [token, triggerToast, loadSucursalCajaAbierta]
  );

  return {
    cashSession, setCashSession,
    cajaHistory, cajaLoading, sucursalCajaAbierta,
    sucursalTurnoActivo, sucursalTurnoStale,
    isCajaOpen, cajaExpectedCash,
    openCaja, closeCaja, addCashMovement, loadCajaHistory, cerrarTurnoAjeno, refreshResumen,
  };
}
