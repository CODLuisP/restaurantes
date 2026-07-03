'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MOCK_USERS } from '@/data/mockData';
import type { User, Role } from '@/types';

const USERS_KEY   = 'restopro.users';
const SESSION_KEY = 'restopro.session';

interface AuthContextType {
  users: User[];
  currentUser: User | null;
  /** true una vez hidratado desde localStorage (evita parpadeo de guard) */
  ready: boolean;
  loginByEmail: (email: string) => User | null;
  loginByPin: (pin: string) => User | null;
  logout: () => void;
  addUser: (data: Omit<User, 'id'>) => void;
  toggleUserActive: (id: string) => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  /* Hidratación desde localStorage (solo cliente) */
  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem(USERS_KEY);
      if (storedUsers) setUsers(JSON.parse(storedUsers));

      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) setCurrentUser(JSON.parse(storedSession));
    } catch {
      /* ignora datos corruptos */
    }
    setReady(true);
  }, []);

  const persistUsers = useCallback((next: User[]) => {
    setUsers(next);
    try { localStorage.setItem(USERS_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const persistSession = useCallback((user: User | null) => {
    setCurrentUser(user);
    try {
      if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, []);

  const loginByEmail = useCallback((email: string): User | null => {
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !user.active) return null;
    persistSession(user);
    return user;
  }, [users, persistSession]);

  const loginByPin = useCallback((pin: string): User | null => {
    const user = users.find(u => u.pin === pin.trim());
    if (!user || !user.active) return null;
    persistSession(user);
    return user;
  }, [users, persistSession]);

  const logout = useCallback(() => persistSession(null), [persistSession]);

  const addUser = useCallback((data: Omit<User, 'id'>) => {
    const newUser: User = { ...data, id: `u${Date.now().toString(36)}` };
    persistUsers([...users, newUser]);
  }, [users, persistUsers]);

  const toggleUserActive = useCallback((id: string) => {
    persistUsers(users.map(u => (u.id === id ? { ...u, active: !u.active } : u)));
  }, [users, persistUsers]);

  const hasRole = useCallback(
    (...roles: Role[]) => !!currentUser && roles.includes(currentUser.role),
    [currentUser]
  );

  return (
    <AuthContext.Provider
      value={{ users, currentUser, ready, loginByEmail, loginByPin, logout, addUser, toggleUserActive, hasRole }}
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
  admin:  'Administrador',
  cajero: 'Cajero / Facturación',
  mozo:   'Mozo / Salón',
};
