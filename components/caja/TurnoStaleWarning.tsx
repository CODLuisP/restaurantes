'use client';

import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui';
import { money, fmtDate, fmtTime } from './types';
import type { TurnoCajaDto } from '@/lib/api/turnosCaja';

interface TurnoStaleWarningProps {
  turno: TurnoCajaDto;
  /** Solo el admin puede cerrar el turno de otro cajero. */
  canClose: boolean;
  onCloseClick: () => void;
}

/** Aviso bloqueante: un turno de otro cajero quedó abierto desde un día anterior (olvido de cierre). */
export default function TurnoStaleWarning({ turno, canClose, onCloseClick }: TurnoStaleWarningProps) {
  return (
    <div className="card-lg p-6 space-y-4 border border-amber-200 bg-amber-50/40 max-w-lg mx-auto">
      <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="text-center">
        <h4 className="text-sm font-bold text-slate-800">Hay un turno pendiente de cerrar</h4>
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
          <strong>{turno.cajeroNombre ?? 'Un cajero'}</strong> abrió caja el {fmtDate(turno.abiertoAt)} a las{' '}
          {fmtTime(turno.abiertoAt)} con fondo de {money(turno.montoApertura)} y no se cerró. No se puede aperturar
          un turno nuevo hasta que este se cuadre y cierre.
        </p>
      </div>
      {canClose ? (
        <Button variant="danger" size="lg" icon={<Lock className="h-4 w-4" />} onClick={onCloseClick} className="mx-auto">
          Cerrar ese turno
        </Button>
      ) : (
        <p className="text-[11px] text-slate-500 text-center bg-white/70 rounded-xl px-4 py-2.5">
          Solicita a un <strong>administrador</strong> que revise y cierre ese turno para poder continuar.
        </p>
      )}
    </div>
  );
}
