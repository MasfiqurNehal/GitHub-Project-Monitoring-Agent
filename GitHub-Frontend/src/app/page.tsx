'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/navigation/header';
import ChatDrawer from '../components/ai/chat-drawer';
import { fetchDashboardOverview, fetchEngineeringSignals, fetchProjects } from '../lib/api-client';
import {
  FolderKanban,
  GitCommit,
  GitPullRequest,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Code2,
  GitBranch,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  // Queries
  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['dashboard-overview', selectedProjectId],
    queryFn: () => fetchDashboardOverview({ projectId: selectedProjectId }),
  });

  const { data: signalsData } = useQuery({
    queryKey: ['engineering-signals'],
    queryFn: fetchEngineeringSignals,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: fetchProjects,
  });

  const kpi = overviewData?.data?.kpi || {
    totalProjects: 0,
    totalRepositories: 0,
    totalCommits: 0,
    totalPRs: 0,
    mergedPRs: 0,
    openPRs: 0,
    totalReviews: 0,
    activeDevelopers: 0,
    linesAdded: 0,
    linesDeleted: 0,
  };

  const trendData = overviewData?.data?.activityTrend || [
    { date: '2026-09-15', commits: 12, prs: 3, reviews: 5 },
    { date: '2026-09-16', commits: 18, prs: 5, reviews: 8 },
    { date: '2026-09-17', commits: 24, prs: 4, reviews: 10 },
    { date: '2026-09-18', commits: 15, prs: 2, reviews: 4 },
    { date: '2026-09-19', commits: 30, prs: 8, reviews: 12 },
    { date: '2026-09-20', commits: 22, prs: 6, reviews: 9 },
    { date: '2026-09-21', commits: 35, prs: 9, reviews: 14 },
  ];

  const signals = signalsData?.data || { inactiveRepositories: [], stalePullRequests: [] };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-blue-900/30">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Engineering Intelligence Console
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Read-only GitHub project monitoring and AI activity agent for executive oversight.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {projectsData?.data && projectsData.data.length > 0 && (
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
                className="bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-700 outline-none"
              >
                <option value="">All Projects</option>
                {projectsData.data.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Signals Alert Banner */}
        {(signals.inactiveRepositories.length > 0 || signals.stalePullRequests.length > 0) && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-amber-300">Engineering Attention Signals:</span>
                <span className="text-amber-200/80 ml-2">
                  {signals.inactiveRepositories.length} inactive repositories, {signals.stalePullRequests.length} pull requests awaiting review over 7 days.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monitored Projects</span>
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-white tracking-tight">{kpi.totalProjects}</div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-blue-400" /> {kpi.totalRepositories} connected repositories
              </p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Commits</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <GitCommit className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-white tracking-tight">{kpi.totalCommits}</div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Code2 className="w-3 h-3 text-emerald-400" /> +{kpi.linesAdded} / -{kpi.linesDeleted} lines
              </p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pull Requests</span>
              <div className="w-9 h-9 rounded-xl bg-purple-600/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <GitPullRequest className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-white tracking-tight">{kpi.totalPRs}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                <span className="text-emerald-400 font-medium">{kpi.mergedPRs} merged</span> · <span className="text-purple-400">{kpi.openPRs} open</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Engineering Team</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-white tracking-tight">{kpi.activeDevelopers}</div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" /> {kpi.totalReviews} PR reviews completed
              </p>
            </div>
          </div>
        </div>

        {/* Activity Trend Graph Section */}
        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Activity Stream Trends
              </h2>
              <p className="text-xs text-slate-400">Daily commits, pull requests, and peer reviews</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="commitsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="prsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="commits" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#commitsGrad)" name="Commits" />
                <Area type="monotone" dataKey="prs" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#prsGrad)" name="Pull Requests" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>

      {/* AI Assistant Chat Drawer */}
      <ChatDrawer
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        onApplyFilter={(action) => {
          if (action.projectId) setSelectedProjectId(action.projectId);
          setIsAIChatOpen(false);
        }}
      />
    </div>
  );
}
