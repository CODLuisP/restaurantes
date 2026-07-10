import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      empresaId: number;
      sucursalId: number | null;
    } & DefaultSession['user'];
    accessToken: string;
    error?: string;
  }

  interface User {
    username: string;
    role: string;
    empresaId: number;
    sucursalId: number | null;
    accessToken: string;
    accessTokenExpires: string;
    refreshToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: string;
    empresaId: number;
    sucursalId: number | null;
    accessToken: string;
    accessTokenExpires: string;
    refreshToken: string;
    error?: string;
  }
}
