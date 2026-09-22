'use client';

import React, { useState, useMemo } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useIssues } from '../../hooks/use-issues';
import { useProjects } from '../../hooks/use-projects';
import { useRepositories } from '../../hooks/use-repositories';
import { useDevelopers } from '../../hooks/use-developers';
import { IssueTable } from '../../components/issues/IssueTable';
import { IssueCard } from '../../components/issues/IssueCard';
import { ProjectFilter } from '../../components/filters/ProjectFilter';
import { RepositoryFilter } from '../../components/filters/RepositoryFilter';
import { DeveloperFilter } from '../../components/filters/DeveloperFilter';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { IssueWithMetrics } from '../../types';
import { 
  CircleDot, 
  Search, 
  LayoutGrid, 
  List, 
  CheckCircle2, 
  ShieldCheck,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function IssuesPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | undefined>(undefined);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string | undefined>(undefined);

  const { projects } = useProjects();
  const { repositories } = useRepositories();
  const { developers } = useDevelopers();

  const { issues, isLoading, isError, refetch } = useIssues({
    projectId: selectedProjectId,
    repositoryId: selectedRepositoryId,
    developerId: selectedDeveloperId,
    state: selectedState,
    search: searchQuery,
  });

  // Aggregate summary statistics
  const stats = useMemo(() => {
    let open = 0;
    let closed = 0;
    let totalComments = 0;

    (issues as IssueWithMetrics[]).forEach((issue) => {
      if (issue.state === 'OPEN') open++;
      else if (issue.state === 'CLOSED') closed++;
      totalComments += issue.commentsCount || 0;
    });

    return {
      total: issues.length,
      open,
      closed,
      totalComments,
    };
  }, [issues]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(issues.length / itemsPerPage));
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return issues.slice(start, start + itemsPerPage);
  }, [issues, currentPage]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <CircleDot className="w-6 h-6 text-amber-400" /> Issues Monitoring
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Read-only executive monitoring of reported bugs, feature requests, and issue resolution patterns across engineering projects.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Read-Only Telemetry (No Writing)</span>
          </div>
        </div>

        {/* Global Summary KPI Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 px-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <CircleDot className="w-3 h-3 text-amber-400" /> Total Issues
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.total}</span>
          </div>

          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <CircleDot className="w-3 h-3 text-emerald-400" /> Open Issues
            </span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5">{stats.open}</span>
          </div>

          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-purple-400" /> Closed Issues
            </span>
            <span className="text-lg font-bold text-purple-400 mt-0.5">{stats.closed}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-blue-400" /> Discussion Comments
            </span>
            <span className="text-lg font-bold text-blue-400 mt-0.5">{stats.totalComments}</span>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
          {/* Top Row: State Filter Pills, Search, View Mode Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Issue State Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
              {(['ALL', 'OPEN', 'CLOSED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setSelectedState(st);
                    setCurrentPage(1);
                  }}
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
                placeholder="Search issue title, #number, author, or repo..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
                setCurrentPage(1);
              }}
            />

            <RepositoryFilter
              repositories={repositories}
              value={selectedRepositoryId}
              onChange={(val) => {
                setSelectedRepositoryId(val);
                setCurrentPage(1);
              }}
            />

            <DeveloperFilter
              developers={developers}
              value={selectedDeveloperId}
              onChange={(val) => {
                setSelectedDeveloperId(val);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Content Area: Table vs Grid */}
        {isLoading ? (
          <LoadingState message="Fetching issues metrics and discussion telemetry..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Issues"
            message="Could not retrieve issue data from backend services."
            onRetry={() => refetch()}
          />
        ) : issues.length === 0 ? (
          <EmptyState
            title="No Issues Found"
            description="No issues matching the selected state and filter parameters."
          />
        ) : (
          <div className="space-y-4">
            {viewMode === 'table' ? (
              <IssueTable issues={paginatedIssues} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                <span className="text-slate-400">
                  Showing Page <span className="font-bold text-slate-200">{currentPage}</span> of{' '}
                  <span className="font-bold text-slate-200">{totalPages}</span> ({issues.length} total issues)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
