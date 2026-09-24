'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutProvider, useLayout } from '../../providers/layout-provider';
import Sidebar from './sidebar';
import { MobileSidebar } from './mobile-sidebar';
import ChatDrawer from '../ai/chat-drawer';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../common/PageLoader';

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { isAIChatOpen, setAIChatOpen } = useLayout();
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLandingPage = pathname === '/';

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLandingPage) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, isLandingPage, router]);

  if (isLandingPage) {
    return <main className="min-h-screen bg-slate-950 text-slate-100">{children}</main>;
  }

  if (isLoading) {
    return <PageLoader message="Authenticating session..." subMessage="Verifying access token with backend" />;
  }

  if (!isAuthenticated) {
    return <PageLoader message="Redirecting to login..." subMessage="Please sign in to access executive console" />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Desktop Persistent Sidebar */}
      <Sidebar />

      {/* Mobile Navigation Drawer */}
      <MobileSidebar />

      {/* Main Content Area */}
      <div id="main-content" className="flex-1 flex flex-col min-w-0 min-h-screen">
        {children}
      </div>

      {/* AI Assistant Chat Drawer */}
      <ChatDrawer
        isOpen={isAIChatOpen}
        onClose={() => setAIChatOpen(false)}
      />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <AppShellContent>{children}</AppShellContent>
    </LayoutProvider>
  );
}
