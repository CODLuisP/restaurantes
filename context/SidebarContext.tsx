'use client';

import { createContext, useContext, useState } from 'react';

interface SidebarContextType {
  isOpen: boolean;       // mobile overlay open
  toggleOpen: () => void;
  closeOpen: () => void;
  isCollapsed: boolean;  // desktop icon-only mode
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{
      isOpen,
      toggleOpen: () => setIsOpen(v => !v),
      closeOpen: () => setIsOpen(false),
      isCollapsed,
      toggleCollapsed: () => setIsCollapsed(v => !v),
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
