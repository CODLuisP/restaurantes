import { Suspense } from 'react';
import { AppProvider } from '@/context/AppContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { CocinaPedidosProvider } from '@/context/CocinaPedidosContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MainAreaClient from '@/components/layout/MainAreaClient';
import AuthGuard from '@/components/auth/AuthGuard';
import ToastContainer from '@/components/ui/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <CocinaPedidosProvider>
        <SidebarProvider>
          <div className="min-h-screen font-sans bg-brand-medium/3 text-slate-800">
            <Sidebar />
            <MainAreaClient>
              {/* TopBar lee los query params (useSearchParams): requiere Suspense para el build estático. */}
              <Suspense fallback={<div className="h-16 bg-white border-b border-border-card" />}>
                <TopBar />
              </Suspense>
              <main className="flex-1 p-4">
                <AuthGuard>{children}</AuthGuard>
              </main>
            </MainAreaClient>
            <ToastContainer />
          </div>
        </SidebarProvider>
      </CocinaPedidosProvider>
    </AppProvider>
  );
}
