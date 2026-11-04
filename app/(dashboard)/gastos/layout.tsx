import { GastosProvider } from '@/context/GastosContext';

/* Los gastos, categorías y proveedores solo se usan en esta sección: el provider vive aquí para
   no pedirlos al backend en cada pantalla del dashboard. */
export default function GastosLayout({ children }: { children: React.ReactNode }) {
  return <GastosProvider>{children}</GastosProvider>;
}
