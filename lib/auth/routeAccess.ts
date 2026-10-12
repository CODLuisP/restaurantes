/** Rutas del dashboard permitidas por rol — fuente única para el middleware (y alineada con los
 *  `roles` del menú en components/layout/Sidebar.tsx). Admin y superadmin no tienen restricción.
 *  Ojo: esto solo protege la NAVEGACIÓN; el backend debe validar el rol en cada endpoint. */

const RUTAS_POR_ROL: Record<string, string[]> = {
  mozo:       ['/comandero', '/despachar', '/carta'],
  cocinero:   ['/cocina', '/carta'],
  cajero:     ['/cobrar', '/caja', '/gastos', '/comprobantes', '/carta', '/clientes', '/reportes'],
  repartidor: ['/carta'],
};

/** Pantalla donde aterriza cada rol (y a donde se le redirige si intenta entrar a otra). */
export function rutaPorDefectoDeRol(role: string | undefined): string {
  switch (role) {
    case 'cocinero': return '/cocina';
    case 'mozo': return '/comandero';
    case 'cajero': return '/cobrar';
    case 'repartidor': return '/carta';
    default: return '/dashboard';
  }
}

export function rolPuedeAcceder(role: string | undefined, pathname: string): boolean {
  if (role === 'admin' || role === 'superadmin') return true;
  const permitidas = role ? RUTAS_POR_ROL[role] : undefined;
  if (!permitidas) return false;
  return permitidas.some(r => pathname === r || pathname.startsWith(`${r}/`));
}
