'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, LogOut } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

/**
 * Protege el área del dashboard:
 *  - Sin sesión → redirige al login.
 *  - Rol "mozo" con la caja cerrada → pantalla de espera (no puede operar).
 *  - Admin / cajero siempre pueden entrar (necesitan aperturar la caja).
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, ready, logout } = useAuth();
  const { isCajaOpen } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && !currentUser) router.replace('/');
  }, [ready, currentUser, router]);

  /* Esperando hidratación de localStorage */
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-medium/3">
        <Loader2 className="h-6 w-6 text-brand animate-spin" />
      </div>
    );
  }

  if (!currentUser) return null;

  /* Bloqueo del mozo cuando la caja está cerrada */
  if (currentUser.role === 'mozo' && !isCajaOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-brand-medium/3">
        <div className="card-lg max-w-md w-full p-8 text-center space-y-5 animate-section">
          <div className="mx-auto w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border-2 border-rose-100">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Caja cerrada</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Hola <strong>{currentUser.name}</strong>. Aún no puedes iniciar tu turno porque la
              caja del local está cerrada. Espera a que el <strong>cajero</strong> o el{' '}
              <strong>administrador</strong> realice la apertura de caja.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500">
            Sesión iniciada como <span className="font-bold text-slate-700">{ROLE_LABELS[currentUser.role]}</span>
          </div>
          <button
            onClick={() => logout()}
            className="btn-secondary w-full justify-center"
          >
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
