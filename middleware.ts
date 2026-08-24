import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Rutas accesibles sin sesión: login ('/') y el menú público que escanea el cliente por QR.
function esRutaPublica(pathname: string) {
  return pathname === '/' || pathname.startsWith('/menu') || pathname.startsWith('/api');
}

// El cocinero solo opera Cocina y ve el Menú Digital (sin editar nada, ver carta/page.tsx).
const RUTAS_COCINERO = ['/cocina', '/carta'];

// El Dashboard ejecutivo es solo para admin; cada otro rol aterriza en su propia pantalla operativa.
function rutaPorDefectoDeRol(role: string | undefined) {
  switch (role) {
    case 'cocinero': return '/carta';
    case 'mozo': return '/comandero';
    case 'cajero': return '/cobrar';
    case 'repartidor': return '/carta';
    default: return '/dashboard';
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const autenticado = !!req.auth;

  if (!autenticado && !esRutaPublica(pathname)) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin));
  }

  if (autenticado) {
    const role = req.auth?.user?.role;
    const rutaPorDefecto = rutaPorDefectoDeRol(role);

    if (pathname === '/') {
      return NextResponse.redirect(new URL(rutaPorDefecto, req.nextUrl.origin));
    }

    if (role === 'cocinero' && !RUTAS_COCINERO.includes(pathname)) {
      return NextResponse.redirect(new URL(rutaPorDefecto, req.nextUrl.origin));
    }

    // "Componentes UI" es un playground interno, solo para admin.
    if (pathname === '/ui-components' && role !== 'admin') {
      return NextResponse.redirect(new URL(rutaPorDefecto, req.nextUrl.origin));
    }

    // Cocina (KDS) es solo para quien prepara los platos y el admin.
    if (pathname === '/cocina' && role !== 'admin' && role !== 'cocinero') {
      return NextResponse.redirect(new URL(rutaPorDefecto, req.nextUrl.origin));
    }

    // Dashboard ejecutivo (KPIs, ventas) es solo para admin.
    if (pathname === '/dashboard' && role !== 'admin') {
      return NextResponse.redirect(new URL(rutaPorDefecto, req.nextUrl.origin));
    }
  }
});

export const config = {
  // Corre en todo menos assets estáticos (incluye archivos servidos desde /public, como los
  // SVG de redes sociales que usa el menú público), la API (NextAuth y demás rutas propias) y el favicon.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
