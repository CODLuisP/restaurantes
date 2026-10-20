import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rolPuedeAcceder, rutaPorDefectoDeRol } from '@/lib/auth/routeAccess';
import { subdominioDeHost } from '@/lib/menu/subdominio';

// Rutas accesibles sin sesión: login ('/'), el menú público que escanea el cliente por QR,
// y el alta pública de una empresa nueva.
function esRutaPublica(pathname: string) {
  return pathname === '/' || pathname.startsWith('/menu') || pathname.startsWith('/api') || pathname === '/registro';
}


export default auth((req) => {
  const { pathname } = req.nextUrl;
  const autenticado = !!req.auth;

  // paikos.restofly.com.pe solo sirve la carta pública de esa empresa: "/" y "/menu" muestran
  // su carta (el subdominio viaja como parámetro y gana sobre cualquiera escrito a mano) y
  // cualquier otra pantalla del sistema vuelve a la carta.
  const host = req.headers.get('host');
  const subdominio = subdominioDeHost(host);
  if (subdominio) {
    if (pathname === '/' || pathname === '/menu' || pathname.startsWith('/menu/')) {
      const destino = req.nextUrl.clone();
      if (pathname === '/') destino.pathname = '/menu';
      destino.searchParams.set('subdominio', subdominio);
      return NextResponse.rewrite(destino);
    }
    return NextResponse.redirect(new URL('/menu', `${req.nextUrl.protocol}//${host}`));
  }

  if (!autenticado && !esRutaPublica(pathname)) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin));
  }

  if (autenticado) {
    const role = req.auth?.user?.role;
    const rutaPorDefecto = rutaPorDefectoDeRol(role);

    if (pathname === '/') {
      return NextResponse.redirect(new URL(rutaPorDefecto, req.nextUrl.origin));
    }

    // Cada rol solo navega por sus pantallas (ver lib/auth/routeAccess.ts); el resto redirige a la suya.
    if (!esRutaPublica(pathname) && !rolPuedeAcceder(role, pathname)) {
      return NextResponse.redirect(new URL(rutaPorDefecto, req.nextUrl.origin));
    }
  }
});

export const config = {
  // Corre en todo menos assets estáticos (incluye archivos servidos desde /public, como los
  // SVG de redes sociales que usa el menú público), la API (NextAuth y demás rutas propias) y el favicon.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
