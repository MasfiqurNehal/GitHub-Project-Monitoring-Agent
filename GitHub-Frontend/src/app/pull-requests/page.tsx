'use client';

import React, { useState, useMemo } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { usePullRequests } from '../../hooks/use-pull-requests';
import { useProjects } from '../../hooks/use-projects';
import { useRepositories } from '../../hooks/use-repositories';
import { useDevelopers } from '../../hooks/use-developers';
import { PullRequestTable } from '../../components/pull-requests/PullRequestTable';
import { PullRequestCard } from '../../components/pull-requests/PullRequestCard';
import { ProjectFilter } from '../../components/filters/ProjectFilter';
import { RepositoryFilter } from '../../components/filters/RepositoryFilter';
import { DeveloperFilter } from '../../components/filters/DeveloperFilter';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { PullRequestWithMetrics } from '../../types';
import { 
  GitPullRequest, 
  Search, 
  LayoutGrid, 
  List, 
  GitMerge, 
  Clock, 
  XCircle, 
  ShieldCheck,
  CheckCircle2,
  FileCode
} from 'lucide-react';

export default function PullRequestsPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | undefined>(undefined);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string | undefined>(undefined);

  const { projects } = useProjects();
  const { repositories } = useRepositories();
  const { developers } = useDevelopers();

  const { pullRequests, isLoading, isError, refetch } = usePullRequests({
    projectId: selectedProjectId,
    repositoryId: selectedRepositoryId,
    developerId: selectedDeveloperId,
    state: selectedState,
    reviewStatus: selectedReviewStatus,
    search: searchQuery,
  });

  // Aggregate summary statistics
  const stats = useMemo(() => {
    let open = 0;
    let merged = 0;
    let closed = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;

    (pullRequests as PullRequestWithMetrics[]).forEach((pr) => {
      if (pr.state === 'OPEN') open++;
      else if (pr.state === 'MERGED') merged++;
      else if (pr.state === 'CLOSED') closed++;

      totalAdditions += pr.additions || 0;
      totalDeletions += pr.deletions || 0;
    });

    return {
      total: pullRequests.length,
      open,
      merged,
      closed,
      totalAdditions,
      totalDeletions,
    };
  }, [pullRequests]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <GitPullRequest className="w-6 h-6 text-amber-400" /> Pull Request Oversight
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Read-only oversight of open, merged, and closed pull requests across monitored repositories.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Read-Only Telemetry (No Writing)</span>
          </div>
        </div>

        {/* Global Summary KPI Banner */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 py-3 px-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitPullRequest className="w-3 h-3 text-amber-400" /> Total PRs
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.total}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> Open PRs
            </span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5">{stats.open}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitMerge className="w-3 h-3 text-purple-400" /> Merged PRs
            </span>
            <span className="text-lg font-bold text-purple-400 mt-0.5">{stats.merged}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-400" /> Closed PRs
            </span>
            <span className="text-lg font-bold text-rose-400 mt-0.5">{stats.closed}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <FileCode className="w-3 h-3 text-emerald-400" /> Lines Added
            </span>
            <span className="text-base font-bold text-emerald-400 mt-0.5">+{stats.totalAdditions.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <FileCode className="w-3 h-3 text-rose-400" /> Lines Deleted
            </span>
            <span className="text-base font-bold text-rose-400 mt-0.5">-{stats.totalDeletions.toLocaleString()}</span>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
          {/* Top Row: State Filter Pills, Search, View Mode Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* PR State Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
              {(['ALL', 'OPEN', 'MERGED', 'CLOSED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedState(st)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedState === st ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search PR title, #number, author, or repo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Project, Repository, Developer Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
            <ProjectFilter
              projects={projects}
              value={selectedProjectId}
              onChange={(val) => {
                setSelectedProjectId(val);
                setSelectedRepositoryId(undefined);
              }}
            />

            <RepositoryFilter
              repositories={repositories}
              value={selectedRepositoryId}
              onChange={(val) => setSelectedRepositoryId(val)}
            />

            <DeveloperFilter
              developers={developers}
              value={selectedDeveloperId}
              onChange={(val) => setSelectedDeveloperId(val)}
            />
          </div>
        </div>

        {/* Content Area: Table vs Grid */}
        {isLoading ? (
          <LoadingState message="Loading pull request metrics and telemetry..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Pull Requests"
            message="Could not retrieve pull request data from backend services."
            onRetry={() => refetch()}
          />
        ) : pullRequests.length === 0 ? (
          <EmptyState
            title="No Pull Requests Found"
            description="No pull requests matching the selected state and filter parameters."
          />
        ) : viewMode === 'table' ? (
          <PullRequestTable pullRequests={pullRequests} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pullRequests.map((pr) => (
              <PullRequestCard key={pr.id} pullRequest={pr} />
            ))}
          </div>
        )}
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
