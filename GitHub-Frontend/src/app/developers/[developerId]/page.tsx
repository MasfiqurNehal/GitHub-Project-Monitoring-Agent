'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Header from '../../../components/layout/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { useDeveloperDetail } from '../../../hooks/use-developers';
import { useProjects } from '../../../hooks/use-projects';
import { useRepositories } from '../../../hooks/use-repositories';
import { DeveloperActivityTimeline } from '../../../components/developers/DeveloperActivityTimeline';
import { DeveloperContributionChart } from '../../../components/developers/DeveloperContributionChart';
import { CodeChangeChart } from '../../../components/charts/CodeChangeChart';
import { ProjectFilter } from '../../../components/filters/ProjectFilter';
import { RepositoryFilter } from '../../../components/filters/RepositoryFilter';
import { DateRangeFilter } from '../../../components/filters/DateRangeFilter';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { DateRangePreset } from '../../../types';
import { 
  Users, 
  ArrowLeft, 
  GitCommit, 
  GitPullRequest, 
  MessageSquare, 
  AlertCircle, 
  FileCode, 
  ExternalLink,
  FolderKanban,
  GitBranch,
  Clock,
  Activity,
  CheckCircle2
} from 'lucide-react';

export default function DeveloperDetailPage({ params }: { params: { developerId: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | undefined>(undefined);
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const detailFilters = useMemo(() => ({
    projectId: selectedProjectId,
    repositoryId: selectedRepositoryId,
    dateFrom: fromDate || undefined,
    dateTo: toDate || undefined,
    activityType: activityTypeFilter !== 'all' ? activityTypeFilter : undefined,
  }), [selectedProjectId, selectedRepositoryId, fromDate, toDate, activityTypeFilter]);

  const { developerDetail, isLoading, isError, refetch } = useDeveloperDetail(params.developerId, detailFilters);
  const { projects } = useProjects();
  const { repositories } = useRepositories();

  // Filter activity timeline events based on selected filters
  const filteredTimelineEvents = useMemo(() => {
    if (!developerDetail) return [];
    return developerDetail.activityTimeline.filter((ev) => {
      if (activityTypeFilter !== 'all' && ev.type !== activityTypeFilter) {
        return false;
      }
      return true;
    });
  }, [developerDetail, activityTypeFilter]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex items-center justify-center">
          <LoadingState message="Fetching developer activity metrics and timeline..." />
        </main>
      </div>
    );
  }

  if (isError || !developerDetail) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <Link href="/developers" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Developers</span>
          </Link>
          <ErrorState
            title="Failed to Load Developer Metrics"
            message="Could not find or retrieve activity telemetry for the requested developer."
            onRetry={() => refetch()}
          />
        </main>
      </div>
    );
  }

  const { developer, commitStats, prStats, reviewStats, issueStats, codeChangeStats, activityDistribution } = developerDetail;
  const metrics = developer.metrics;

  const formattedDate = new Date(metrics.lastActivityAt || developer.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Navigation Breadcrumb */}
        <Link 
          href="/developers" 
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Developers</span>
        </Link>

        {/* Profile Banner */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start gap-4">
            <img
              src={developer.avatarUrl || 'https://github.com/github.png'}
              alt={developer.login}
              className="w-16 h-16 rounded-full border-2 border-slate-700 object-cover shrink-0 shadow-lg"
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight">{developer.name || developer.login}</h1>
                <span className="text-xs font-semibold text-blue-400 font-mono">@{developer.login}</span>
                {developer.profileUrl && (
                  <a
                    href={developer.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                  Projects: {developer.projects?.map(p => p.name).join(', ') || 'None'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                  Repos: {developer.repositories?.map(r => r.name).join(', ') || 'None'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Last activity: {formattedDate}
                </span>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Factual Activity Metrics</span>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex flex-wrap items-center gap-3">
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

            <DateRangeFilter
              preset={datePreset}
              from={fromDate}
              to={toDate}
              onPresetChange={(preset) => setDatePreset(preset)}
              onCustomDateChange={(from, to) => {
                setFromDate(from || '');
                setToDate(to || '');
              }}
            />
          </div>

          {/* Activity Type Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            {['all', 'commit', 'pull_request', 'review', 'issue'].map((type) => (
              <button
                key={type}
                onClick={() => setActivityTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg capitalize text-[11px] font-medium transition-all ${
                  activityTypeFilter === type
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Factual Activity Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <GitCommit className="w-4 h-4 text-emerald-400" /> Commit Output
            </span>
            <div className="text-2xl font-bold text-white pt-1">{commitStats.totalCommits}</div>
            <p className="text-[11px] text-slate-400 pt-1">
              Top repo: <span className="font-mono text-slate-200">{commitStats.topRepo}</span>
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <GitPullRequest className="w-4 h-4 text-amber-400" /> Pull Requests
            </span>
            <div className="text-2xl font-bold text-white pt-1">{prStats.totalPRs}</div>
            <p className="text-[11px] text-slate-400 pt-1">
              <span className="text-emerald-400 font-semibold">{prStats.mergedPRs} merged</span> · {prStats.openPRs} open
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-purple-400" /> Code Reviews
            </span>
            <div className="text-2xl font-bold text-white pt-1">{reviewStats.totalReviews}</div>
            <p className="text-[11px] text-slate-400 pt-1">
              <span className="text-emerald-400 font-semibold">{reviewStats.approved} approved</span> · {reviewStats.changesRequested} changes req.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-cyan-400" /> Code Impact
            </span>
            <div className="text-xl font-bold text-emerald-400 pt-1">
              +{codeChangeStats.totalAdditions.toLocaleString()} <span className="text-rose-400">-{codeChangeStats.totalDeletions.toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Net churn: <span className="font-mono text-slate-200">+{codeChangeStats.netChanges.toLocaleString()} lines</span>
            </p>
          </div>
        </div>

        {/* Factual Activity Patterns Distribution Chart */}
        <DeveloperContributionChart data={activityDistribution} />

        {/* Code Changes Area Chart */}
        <CodeChangeChart data={codeChangeStats.trend} />

        {/* Chronological Activity Timeline */}
        <DeveloperActivityTimeline events={filteredTimelineEvents} />
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
