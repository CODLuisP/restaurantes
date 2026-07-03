import { AppProvider } from '@/context/AppContext';
import { CartaProvider } from '@/context/CartaContext';
import { SidebarProvider } from '@/context/SidebarContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MainAreaClient from '@/components/layout/MainAreaClient';
import AuthGuard from '@/components/layout/AuthGuard';
import ToastContainer from '@/components/ui/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <CartaProvider>
        <SidebarProvider>
          <AuthGuard>
            <div className="min-h-screen font-sans bg-brand-medium/3 text-slate-800">
              <Sidebar />
              <MainAreaClient>
                <TopBar />
                <main className="flex-1 p-6 lg:p-8">{children}</main>
              </MainAreaClient>
              <ToastContainer />
            </div>
          </AuthGuard>
        </SidebarProvider>
      </CartaProvider>
    </AppProvider>
  );
}
