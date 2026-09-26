'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/layout/header';
import { useLayout } from '../../providers/layout-provider';
import { useDashboard } from '../../hooks/use-dashboard';
import { useProjects } from '../../hooks/use-projects';
import { useRepositories } from '../../hooks/use-repositories';
import { useDevelopers } from '../../hooks/use-developers';
import { useFilters } from '../../hooks/use-filters';
import { fetchApi } from '../../lib/api/client';
import { RotateCw } from 'lucide-react';

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
  const router = useRouter();
  const { setAIChatOpen } = useLayout();
  const [activeChartTab, setActiveChartTab] = useState<'overview' | 'commits' | 'prs' | 'issues' | 'code' | 'developers'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { filters } = useFilters();

  const { overview, signals, isLoading, isError, refetch } = useDashboard(filters);
  const { projects } = useProjects();
  const { repositories } = useRepositories();
  const { developers } = useDevelopers();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (filters.repositoryId) {
        await fetchApi(`/repositories/${filters.repositoryId}/sync`, { method: 'POST' });
      } else {
        await fetchApi('/repositories/sync-all', { method: 'POST' });
      }
      await refetch();
    } catch (err) {
      console.error('Failed to sync dashboard data', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setAIChatOpen(true)} />
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setAIChatOpen(true)} />
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
  const hasRepositories = overview.repositoryOverview.length > 0 || kpi.totalRepositories > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-blue-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Engineering Intelligence Console
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Read-only GitHub project monitoring and AI activity agent for executive CTO oversight.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>

        {/* Global Executive Filter Bar */}
        <FilterBar
          projects={projects}
          repositories={repositories}
          developers={developers}
        />

        {!hasRepositories ? (
          <EmptyState
            title="No Monitored Repositories Synchronized"
            description="Your organization has no active GitHub repositories connected. Connect a repository through the GitHub App to begin tracking commits, pull requests, and real-time engineering analytics."
            actionLabel="Connect Repositories"
            onAction={() => router.push('/repositories')}
          />
        ) : (
          <>
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
          </>
        )}
      </main>
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
