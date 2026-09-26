'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface LayoutContextType {
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  isAIChatOpen: boolean;
  setAIChatOpen: (open: boolean) => void;
  toggleAIChat: () => void;
}

const defaultContextValue: LayoutContextType = {
  isSidebarCollapsed: false,
  toggleSidebarCollapsed: () => {},
  isMobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  toggleMobileMenu: () => {},
  isAIChatOpen: false,
  setAIChatOpen: () => {},
  toggleAIChat: () => {},
};

const LayoutContext = createContext<LayoutContextType>(defaultContextValue);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(true);

  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const toggleAIChat = useCallback(() => {
    setIsAIChatOpen((prev) => !prev);
  }, []);

  const setAIChatOpen = useCallback((open: boolean) => {
    setIsAIChatOpen(open);
  }, []);

  const setMobileMenuOpen = useCallback((open: boolean) => {
    setIsMobileMenuOpen(open);
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        isSidebarCollapsed,
        toggleSidebarCollapsed,
        isMobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu,
        isAIChatOpen,
        setAIChatOpen,
        toggleAIChat,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  return context || defaultContextValue;
}
