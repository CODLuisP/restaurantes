import { AppProvider } from '@/context/AppContext';
import { GastosProvider } from '@/context/GastosContext';
import { SidebarProvider } from '@/context/SidebarContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MainAreaClient from '@/components/layout/MainAreaClient';
import AuthGuard from '@/components/auth/AuthGuard';
import ToastContainer from '@/components/ui/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <GastosProvider>
        <SidebarProvider>
          <div className="min-h-screen font-sans bg-brand-medium/3 text-slate-800">
            <Sidebar />
            <MainAreaClient>
              <TopBar />
              <main className="flex-1 p-4">
                <AuthGuard>{children}</AuthGuard>
              </main>
            </MainAreaClient>
            <ToastContainer />
          </div>
        </SidebarProvider>
      </GastosProvider>
    </AppProvider>
  );
}
