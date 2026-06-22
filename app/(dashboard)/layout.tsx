import { AppProvider } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ToastContainer from '@/components/ui/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen font-sans bg-[#F0F2F1] text-slate-800">
        <Sidebar />
        <div className="ml-64 min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
        <ToastContainer />
      </div>
    </AppProvider>
  );
}
