'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogOut } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Spinner } from '@/components/ui';

/**
 * Protege el contenido interno del dashboard:
 *  - Sin sesión → redirige al login.
 *  - Rol "mozo" con la caja cerrada → pantalla de espera en la zona de contenido.
 *  - Admin / cajero siempre pueden entrar.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, ready, logout } = useAuth();
  const { isCajaOpen } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && !currentUser) router.replace('/');
  }, [ready, currentUser, router]);

  /* Esperando hidratación de sesión de usuario en el área de contenido */
  if (!ready) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <span className="text-xs font-semibold text-slate-400">Cargando módulo...</span>
      </div>
    );
  }

  if (!currentUser) return null;

  /* Bloqueo del mozo cuando la caja está cerrada */
  if (currentUser.role === 'mozo' && !isCajaOpen) {
    return (
      <div className="py-12 flex items-center justify-center p-4">
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
            className="btn-secondary w-full justify-center cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
