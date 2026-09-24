'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayout } from '../../providers/layout-provider';
import { sendTelemetryLog } from '../../lib/telemetry';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  Users,
  Activity,
  GitPullRequest,
  AlertCircle,
  FileText,
  Bot,
  Link2,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
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

import { useState, useRef, useEffect } from 'react';
import UserProfileModal from '../profile/UserProfileModal';
import { User, MoreVertical } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useLayout();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col justify-between bg-slate-900/90 border-r border-slate-800 h-screen sticky top-0 shrink-0 z-40 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="overflow-y-auto flex-1">
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="font-bold text-white text-sm leading-tight truncate">GitHub Monitoring</h1>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" /> Read-Only Agent
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar Collapse Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label={isSidebarCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Grouped Navigation List */}
          <nav aria-label="Main sidebar navigation" className="p-3 space-y-4">
            {navigationGroups.map((group) => (
              <div key={group.name} className="space-y-1">
                {!isSidebarCollapsed ? (
                  <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {group.name}
                  </span>
                ) : (
                  <div className="h-px bg-slate-800 my-2" />
                )}

                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' &&
                     item.href !== '/' &&
                     item.href !== '/settings' &&
                     pathname.startsWith(item.href + '/'));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isSidebarCollapsed ? item.name : undefined}
                      onClick={() => sendTelemetryLog(`Clicked sidebar menu item '${item.name}'`, 'PAGE_NAVIGATION', { href: item.href })}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isSidebarCollapsed ? 'justify-center px-2' : ''
                      } ${
                        isActive
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer User Profile & Options */}
        <div className="p-3 border-t border-slate-800/80 shrink-0 relative" ref={menuRef}>
          {/* Options Popover Menu */}
          {isMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 p-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsProfileOpen(true);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-blue-600/10 hover:text-blue-400 transition-colors"
              >
                <User className="w-4 h-4 text-blue-400 shrink-0" />
                <span>See Profile</span>
              </button>
              <div className="h-px bg-slate-800/80 my-1" />
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Log Out</span>
              </button>
            </div>
          )}

          {/* User Profile Card */}
          <div
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="bg-slate-800/50 hover:bg-slate-800/80 cursor-pointer rounded-xl p-2.5 flex items-center justify-between border border-slate-700/50 hover:border-slate-600/60 transition-all group"
            title="Click to view profile options"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'User avatar'}
                  className="w-8 h-8 rounded-full object-cover border border-blue-500/40 shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs border border-blue-500/30 shrink-0 shadow-sm">
                  {getInitials(user?.name)}
                </div>
              )}

              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate transition-colors">
                    {user?.name || 'Admin User'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user?.designation || user?.companyName || user?.email || 'admin1@masfiqurnehal.com'}
                  </p>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && (
              <MoreVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-200 shrink-0" />
            )}
          </div>
        </div>
      </aside>

      {/* User Profile Modal */}
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}


