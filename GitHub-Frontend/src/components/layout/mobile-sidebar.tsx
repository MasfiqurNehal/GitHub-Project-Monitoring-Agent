'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayout } from '../../providers/layout-provider';
import {
  X,
  Bot,
  ShieldCheck,
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  Users,
  Activity,
  GitPullRequest,
  AlertCircle,
  FileText,
  Link2,
  Settings,
} from 'lucide-react';

const navigationGroups = [
  {
    name: 'MAIN',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    name: 'PROJECTS',
    items: [
      { name: 'Projects', href: '/projects', icon: FolderKanban },
      { name: 'Repositories', href: '/repositories', icon: GitBranch },
      { name: 'Developers', href: '/developers', icon: Users },
    ],
  },
  {
    name: 'MONITORING',
    items: [
      { name: 'Activity Stream', href: '/activity', icon: Activity },
      { name: 'Pull Requests', href: '/pull-requests', icon: GitPullRequest },
      { name: 'Issues', href: '/issues', icon: AlertCircle },
    ],
  },
  {
    name: 'REPORTING',
    items: [{ name: 'Reports', href: '/reports', icon: FileText }],
  },
  {
    name: 'AI',
    items: [{ name: 'Engineering Agent', href: '/ai', icon: Bot }],
  },
  {
    name: 'SYSTEM',
    items: [
      { name: 'GitHub Connection', href: '/settings/github', icon: Link2 },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const { isMobileMenuOpen, setMobileMenuOpen } = useLayout();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, setMobileMenuOpen]);

  if (!isMobileMenuOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
      className="fixed inset-0 z-50 lg:hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-300 z-50">
        <div className="overflow-y-auto flex-1">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-white text-sm leading-tight">GitHub Monitoring</h1>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Executive Console
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Mobile Navigation" className="p-3 space-y-4">
            {navigationGroups.map((group) => (
              <div key={group.name} className="space-y-1">
                <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {group.name}
                </span>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && item.href !== '/' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <div className="bg-slate-800/50 rounded-xl p-3 flex items-center space-x-3 border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
              CTO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Executive Console</p>
              <p className="text-[10px] text-slate-400 truncate">Agent Monitoring Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

