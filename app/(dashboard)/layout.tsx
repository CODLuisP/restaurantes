import { AppProvider } from '@/context/AppContext';
import { CartaProvider } from '@/context/CartaContext';
import { BannersProvider } from '@/context/BannersContext';
import { BusinessProvider } from '@/context/BusinessContext';
import { PaymentMethodsProvider } from '@/context/PaymentMethodsContext';
import { DeliveryMethodsProvider } from '@/context/DeliveryMethodsContext';
import { DeliveryZonesProvider } from '@/context/DeliveryZonesContext';
import { RedesSocialesProvider } from '@/context/RedesSocialesContext';
import { HorariosProvider } from '@/context/HorariosContext';
import { SidebarProvider } from '@/context/SidebarContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MainAreaClient from '@/components/layout/MainAreaClient';
import AuthGuard from '@/components/auth/AuthGuard';
import ToastContainer from '@/components/ui/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <CartaProvider>
        <BannersProvider>
          <BusinessProvider>
            <PaymentMethodsProvider>
              <DeliveryMethodsProvider>
                <DeliveryZonesProvider>
                  <RedesSocialesProvider>
                    <HorariosProvider>
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
                    </HorariosProvider>
                  </RedesSocialesProvider>
                </DeliveryZonesProvider>
              </DeliveryMethodsProvider>
            </PaymentMethodsProvider>
          </BusinessProvider>
        </BannersProvider>
      </CartaProvider>
    </AppProvider>
  );
}
