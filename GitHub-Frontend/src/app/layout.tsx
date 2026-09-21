import type { Metadata } from 'next';
import './globals.css';
import ReactQueryProvider from '../providers/react-query-provider';
import Sidebar from '../components/navigation/sidebar';

export const metadata: Metadata = {
  title: 'GitHub Project Monitoring AI Agent',
  description: 'AI-powered Engineering Intelligence & Management Dashboard for GitHub Projects',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 flex min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        <ReactQueryProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 min-h-screen">
            {children}
          </div>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
