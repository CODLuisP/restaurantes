import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import SessionProviderWrapper from '@/components/auth/SessionProviderWrapper';
import { AuthProvider } from '@/context/AuthContext';

/* Fuentes autoalojadas (paquetes @fontsource-variable): no dependen de descargar Google Fonts
   durante el build, que fallaba en Vercel con `next/font/google`. */

export const metadata: Metadata = {
  title: 'RestoFly — SaaS POS Perú',
  description: 'Sistema de gestión de restaurantes para Perú. Punto de venta, cocina, inventario y más.',
  icons: {
    icon: '/logorestofly.ico',
    shortcut: '/logorestofly.ico',
    apple: '/campana-icono-app.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionProviderWrapper>
          <AuthProvider>{children}</AuthProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
