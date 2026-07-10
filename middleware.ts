import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Rutas accesibles sin sesión: login ('/') y el menú público que escanea el cliente por QR.
function esRutaPublica(pathname: string) {
  return pathname === '/' || pathname.startsWith('/menu');
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const autenticado = !!req.auth;

  if (!autenticado && !esRutaPublica(pathname)) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin));
  }

  if (autenticado && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin));
  }
});

export const config = {
  // Corre en todo menos assets estáticos, la API (NextAuth y demás rutas propias) y el favicon.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
