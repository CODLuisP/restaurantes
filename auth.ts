import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const API_URL = process.env.API_URL ?? 'http://localhost:5004';

// Refresca el token de tu backend usando el refreshToken guardado en el JWT de NextAuth.
async function refreshAccessToken(token: any) {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error('No se pudo refrescar el token');

    return {
      ...token,
      accessToken: data.token as string,
      accessTokenExpires: data.expiresAt as string,
      refreshToken: (data.refreshToken as string) ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' as const };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/' },
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
        pin: {},
      },
      async authorize(credentials) {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: credentials?.username,
            password: credentials?.password || null,
            pin: credentials?.pin || null,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) return null;

        return {
          id: String(data.usuario.id),
          name: data.usuario.nombre as string,
          username: data.usuario.username as string,
          role: data.usuario.rol as string,
          empresaId: data.usuario.empresaId as number,
          sucursalId: (data.usuario.sucursalId as number | null) ?? null,
          accessToken: data.token as string,
          accessTokenExpires: data.expiresAt as string,
          refreshToken: data.refreshToken as string,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Primer login: el objeto `user` viene de authorize()
      if (user) {
        return {
          ...token,
          id: user.id,
          username: (user as any).username,
          role: (user as any).role,
          empresaId: (user as any).empresaId,
          sucursalId: (user as any).sucursalId,
          accessToken: (user as any).accessToken,
          accessTokenExpires: (user as any).accessTokenExpires,
          refreshToken: (user as any).refreshToken,
        };
      }

      // Access token todavía vigente (con 1 min de margen)
      const expiresAt = token.accessTokenExpires ? new Date(token.accessTokenExpires as string).getTime() : 0;
      if (Date.now() < expiresAt - 60_000) return token;

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.username = token.username as string;
      session.user.role = token.role as string;
      session.user.empresaId = token.empresaId as number;
      session.user.sucursalId = token.sucursalId as number | null;
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
