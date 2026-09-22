'use client';

import { Suspense, useState } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useDashboard } from '../../hooks/use-dashboard';
import { useProjects } from '../../hooks/use-projects';
import { useRepositories } from '../../hooks/use-repositories';
import { useDevelopers } from '../../hooks/use-developers';
import { useFilters } from '../../hooks/use-filters';

// Dashboard components
import { KpiCards } from '../../components/dashboard/KpiCards';
import { AttentionSignals } from '../../components/dashboard/AttentionSignals';
import { ProjectOverviewTable } from '../../components/dashboard/ProjectOverviewTable';
import { RepositoryOverviewGrid } from '../../components/dashboard/RepositoryOverviewGrid';
import { DeveloperOverviewList } from '../../components/dashboard/DeveloperOverviewList';
import { RecentActivityFeed } from '../../components/dashboard/RecentActivityFeed';
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton';
import { FilterBar } from '../../components/filters/FilterBar';

// Charts
import { ActivityTrendChart } from '../../components/charts/ActivityTrendChart';
import { CommitChart } from '../../components/charts/CommitChart';
import { PullRequestChart } from '../../components/charts/PullRequestChart';
import { IssueChart } from '../../components/charts/IssueChart';
import { CodeChangeChart } from '../../components/charts/CodeChangeChart';
import { DeveloperActivityChart } from '../../components/charts/DeveloperActivityChart';

// States
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';

function DashboardContent() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<'overview' | 'commits' | 'prs' | 'issues' | 'code' | 'developers'>('overview');
  const { filters } = useFilters();

  const { overview, signals, isLoading, isError, refetch } = useDashboard(filters);
  const { projects } = useProjects();
  const { repositories } = useRepositories();
  const { developers } = useDevelopers();

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          <ErrorState
            title="Failed to Load Dashboard Metrics"
            message="Unable to communicate with the engineering monitoring database service."
            onRetry={refetch}
          />
        </main>
      </div>
    );
  }

  const kpi = overview.kpi;

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
            Read-only GitHub project monitoring and AI activity agent for executive CTO oversight.
          </p>
        </div>

        {/* Global Executive Filter Bar */}
        <FilterBar
          projects={projects}
          repositories={repositories}
          developers={developers}
        />

        {/* Signals Alert Banner */}
        <AttentionSignals signals={signals} />

        {/* 12 Executive KPI Cards Grid */}
        <KpiCards kpi={kpi} />

        {/* Dynamic Interactive Chart Section with Tabs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 overflow-x-auto text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] shrink-0">
              Analytics Visualizations
            </span>

            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 shrink-0">
              {[
                { id: 'overview', label: 'Activity Trend' },
                { id: 'commits', label: 'Commits' },
                { id: 'prs', label: 'Pull Requests' },
                { id: 'issues', label: 'Issues' },
                { id: 'code', label: 'Code Changes' },
                { id: 'developers', label: 'Team Velocity' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChartTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeChartTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Rendering */}
          <div>
            {activeChartTab === 'overview' && <ActivityTrendChart data={overview.activityTrend} />}
            {activeChartTab === 'commits' && <CommitChart data={overview.activityTrend.map((a) => ({ date: a.date, commits: a.commits }))} />}
            {activeChartTab === 'prs' && <PullRequestChart data={overview.activityTrend.map((a) => ({ date: a.date, prs: a.prs, reviews: a.reviews }))} />}
            {activeChartTab === 'issues' && <IssueChart data={overview.issueTrend || []} />}
            {activeChartTab === 'code' && <CodeChangeChart data={overview.codeChangesTrend || []} />}
            {activeChartTab === 'developers' && <DeveloperActivityChart data={overview.developerActivity || []} />}
          </div>
        </div>

        {/* Dual Grid: Project Overview & Repository Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjectOverviewTable projects={overview.projectOverview || []} />
          <RepositoryOverviewGrid repositories={overview.repositoryOverview || []} />
        </div>

        {/* Dual Grid: Developer Velocity & Recent Activity Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeveloperOverviewList developers={overview.developerActivity || []} />
          <RecentActivityFeed activity={overview.recentActivity || []} />
        </div>
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
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
