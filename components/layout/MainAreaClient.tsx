'use client';

import { useSidebar } from '@/context/SidebarContext';

export default function MainAreaClient({ children }: { children: React.ReactNode }) {
  const { isCollapsed, isOpen, closeOpen } = useSidebar();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/50 md:hidden"
          onClick={closeOpen}
        />
      )}
      <div className={`min-h-screen flex flex-col transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        {children}
      </div>
    </>
  );
}
