'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { MOCK_USERS } from '@/data/mockData';
import type { User, Role } from '@/types';

interface AuthContextType {
  users: User[];
  currentUser: User | null;
  /** true una vez NextAuth resolvió el estado de sesión (evita parpadeo de guard) */
  ready: boolean;
  logout: () => void;
  addUser: (data: Omit<User, 'id'>) => void;
  toggleUserActive: (id: string) => void;
  hasRole: (...roles: Role[]) => boolean;
  loginByEmail: (email: string) => User | null;
  loginByPin: (pin: string) => User | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// El backend distingue superadmin (todas las sucursales) de admin (una sola), pero
// para la UI (menús, permisos) ambos se agrupan bajo el mismo Role local "admin".
function mapBackendRole(rol: string): Role {
  switch (rol?.trim().toLowerCase()) {
    case 'superadmin':
    case 'admin':
      return 'admin';
    case 'cajero':
      return 'cajero';
    case 'cocinero':
      return 'cocinero';
    case 'repartidor':
      return 'repartidor';
    case 'mozo':
      return 'mozo';
    default:
      console.warn(`[AuthContext] Rol de backend no reconocido: "${rol}". Se usará "mozo" por defecto.`);
      return 'mozo';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // Lista de personal mock, usada hoy solo por la pantalla de gestión de Personal
  // (aún no conectada al backend real de usuarios). No tiene relación con currentUser.
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [localUser, setLocalUser] = useState<User | null>(null);

  const currentUser: User | null = useMemo(() => {
    if (session?.user) {
      return {
        id: session.user.id,
        name: session.user.name ?? session.user.username,
        role: mapBackendRole(session.user.role),
        email: session.user.username,
        pin: '',
        station: '',
        active: true,
        username: session.user.username,
        empresaId: session.user.empresaId,
        sucursalId: session.user.sucursalId,
      };
    }

    return localUser;
  }, [session, localUser]);

  const logout = useCallback(() => {
    setLocalUser(null);
    signOut({ callbackUrl: '/' });
  }, []);

  const loginByEmail = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase();
    const match = users.find(user => user.email.toLowerCase() === normalized && user.active) ?? null;
    setLocalUser(match);
    return match;
  }, [users]);

  const loginByPin = useCallback((pin: string) => {
    const match = users.find(user => user.pin === pin.trim() && user.active) ?? null;
    setLocalUser(match);
    return match;
  }, [users]);

  const addUser = useCallback((data: Omit<User, 'id'>) => {
    const newUser: User = { ...data, id: `u${Date.now().toString(36)}` };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const toggleUserActive = useCallback((id: string) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, active: !u.active } : u)));
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => !!currentUser && roles.includes(currentUser.role),
    [currentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        ready: status !== 'loading',
        logout,
        addUser,
        toggleUserActive,
        hasRole,
        loginByEmail,
        loginByPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/* Etiquetas legibles por rol, reutilizables en toda la app */
export const ROLE_LABELS: Record<Role, string> = {
  admin:      'Administrador',
  cajero:     'Cajero / Facturación',
  mozo:       'Mozo / Salón',
  cocinero:   'Cocina',
  repartidor: 'Repartidor',
};
