'use client';

import { Suspense, useState } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useDashboard } from '../../hooks/use-dashboard';
import { useProjects } from '../../hooks/use-projects';
import { useRepositories } from '../../hooks/use-repositories';
import { useDevelopers } from '../../hooks/use-developers';
import { useFilters } from '../../hooks/use-filters';
import { KpiCards } from '../../components/dashboard/KpiCards';
import { AttentionSignals } from '../../components/dashboard/AttentionSignals';
import { ActivityTrendChart } from '../../components/charts/ActivityTrendChart';
import { FilterBar } from '../../components/filters/FilterBar';
import { LoadingState } from '../../components/common/LoadingState';

function DashboardContent() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const { filters } = useFilters();

  const { overview, signals } = useDashboard(filters);
  const { projects } = useProjects();
  const { repositories } = useRepositories();
  const { developers } = useDevelopers();

  const kpi = overview?.kpi || {
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

  const trendData = overview?.activityTrend || [
    { date: '2026-09-15', commits: 12, prs: 3, reviews: 5 },
    { date: '2026-09-16', commits: 18, prs: 5, reviews: 8 },
    { date: '2026-09-17', commits: 24, prs: 4, reviews: 10 },
    { date: '2026-09-18', commits: 15, prs: 2, reviews: 4 },
    { date: '2026-09-19', commits: 30, prs: 8, reviews: 12 },
    { date: '2026-09-20', commits: 22, prs: 6, reviews: 9 },
    { date: '2026-09-21', commits: 35, prs: 9, reviews: 14 },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-blue-900/30">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Engineering Intelligence Console
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Read-only GitHub project monitoring and AI activity agent for executive oversight.
          </p>
        </div>

        {/* Global Executive Filter Console */}
        <FilterBar
          projects={projects}
          repositories={repositories}
          developers={developers}
        />

        {/* Signals Alert Banner */}
        <AttentionSignals signals={signals} />

        {/* Top Metric Cards */}
        <KpiCards kpi={kpi} />

        {/* Activity Trend Graph Section */}
        <ActivityTrendChart data={trendData} />
      </main>

      {/* AI Assistant Chat Drawer */}
      <ChatDrawer
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading dashboard intelligence..." />}>
      <DashboardContent />
    </Suspense>
  );
}
