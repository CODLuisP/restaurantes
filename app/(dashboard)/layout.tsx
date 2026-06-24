import { AppProvider } from '@/context/AppContext';
import { CartaProvider } from '@/context/CartaContext';
import { SidebarProvider } from '@/context/SidebarContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MainAreaClient from '@/components/layout/MainAreaClient';
import ToastContainer from '@/components/ui/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <CartaProvider>
        <SidebarProvider>
          <div className="min-h-screen font-sans bg-[#F0F2F1] text-slate-800">
            <Sidebar />
            <MainAreaClient>
              <Header />
              <main className="flex-1 p-6 lg:p-8">{children}</main>
            </MainAreaClient>
            <ToastContainer />
          </div>
        </SidebarProvider>
      </CartaProvider>
    </AppProvider>
  );
}
