'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeNameMap: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  repositories: 'Repositories',
  developers: 'Developers',
  activity: 'Activity Stream',
  'pull-requests': 'Pull Requests',
  issues: 'Issues',
  reports: 'Reports',
  ai: 'Engineering Agent',
  settings: 'Settings',
  github: 'GitHub Connection',
  appearance: 'Appearance',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Default to Dashboard if at root
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return (
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Home className="w-3.5 h-3.5 text-blue-400" />
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="font-semibold text-slate-200">Dashboard</span>
      </div>
    );
  }

  let currentPath = '';

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-400 overflow-x-auto py-1">
      <Link href="/dashboard" className="flex items-center space-x-1 hover:text-slate-200 transition-colors shrink-0">
        <Home className="w-3.5 h-3.5 text-blue-400" />
      </Link>

      {segments.map((segment, index) => {
        currentPath += `/${segment}`;
        const isLast = index === segments.length - 1;
        const displayName = routeNameMap[segment] || segment;

        return (
          <div key={currentPath} className="flex items-center space-x-1.5 shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-200 truncate max-w-[160px]">{displayName}</span>
            ) : (
              <Link href={currentPath} className="hover:text-slate-200 transition-colors truncate max-w-[140px]">
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
