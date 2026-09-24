import type { Metadata } from 'next';
import './globals.css';
import ReactQueryProvider from '../providers/react-query-provider';
import { AuthProvider } from '../context/AuthContext';
import { AppShell } from '../components/layout/app-shell';

export const metadata: Metadata = {
  title: 'GitHub Monitoring Agent | AI Engineering Intelligence',
  description: 'AI-powered Engineering Intelligence & Management Dashboard for GitHub Projects',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        <ReactQueryProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
