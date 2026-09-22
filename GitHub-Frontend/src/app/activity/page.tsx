'use client';

import React, { useState, useMemo } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useActivityStream } from '../../hooks/use-activity';
import { useProjects } from '../../hooks/use-projects';
import { useRepositories } from '../../hooks/use-repositories';
import { useDevelopers } from '../../hooks/use-developers';
import { ActivityTable } from '../../components/activity/ActivityTable';
import { ActivityTimelineView } from '../../components/activity/ActivityTimelineView';
import { ProjectFilter } from '../../components/filters/ProjectFilter';
import { RepositoryFilter } from '../../components/filters/RepositoryFilter';
import { DeveloperFilter } from '../../components/filters/DeveloperFilter';
import { DateRangeFilter } from '../../components/filters/DateRangeFilter';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { DateRangePreset } from '../../types';
import { 
  Activity, 
  Search, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Clock,
  Filter
} from 'lucide-react';

const activityTypesOptions = [
  { id: 'all', label: 'All Activities' },
  { id: 'commit', label: 'Commit' },
  { id: 'push', label: 'Push' },
  { id: 'pull_request', label: 'Pull Request' },
  { id: 'review', label: 'PR Review' },
  { id: 'issue', label: 'Issue' },
  { id: 'issue_comment', label: 'Issue Comment' },
  { id: 'merge', label: 'Merge' },
  { id: 'branch', label: 'Branch Activity' },
];

export default function ActivityPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | undefined>(undefined);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string | undefined>(undefined);
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const { projects } = useProjects();
  const { repositories } = useRepositories();
  const { developers } = useDevelopers();

  const { activities, isLoading, isError, refetch } = useActivityStream({
    projectId: selectedProjectId,
    repositoryId: selectedRepositoryId,
    developerId: selectedDeveloperId,
    activityType: selectedActivityType,
    preset: datePreset,
    search: searchQuery,
    sortBy: sortBy,
  });

  // Client-side pagination calculations
  const totalItems = activities.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activities.slice(start, start + pageSize);
  }, [activities, currentPage, pageSize]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-blue-400" /> Engineering Activity Stream
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Complete chronological stream of commits, pushes, PRs, reviews, issues, comments, merges, and branch events.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Normalized Telemetry Stream</span>
          </div>
        </div>

        {/* Global Filter & Control Bar */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
          {/* Top Row: Search, Sorting, View Mode Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search activity by title, description, developer, or repo..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Sorting Selector */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-400 text-[11px] font-medium">Sort:</span>
                <button
                  onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
                  className="font-semibold text-white hover:text-blue-400 transition-colors"
                >
                  {sortBy === 'newest' ? 'Newest First' : 'Oldest First'}
                </button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    viewMode === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Timeline View"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Timeline</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Filters (Project, Repository, Developer, Activity Type, Date Range) */}
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

            {/* Activity Type Dropdown Filter */}
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-blue-400 absolute left-3 pointer-events-none" />
              <select
                value={selectedActivityType}
                onChange={(e) => {
                  setSelectedActivityType(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 text-slate-200 text-xs rounded-xl pl-8 pr-8 py-2 border border-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none font-medium"
              >
                {activityTypesOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>

            <DateRangeFilter
              preset={datePreset}
              from={fromDate}
              to={toDate}
              onPresetChange={(preset) => {
                setDatePreset(preset);
                setCurrentPage(1);
              }}
              onCustomDateChange={(from, to) => {
                setFromDate(from || '');
                setToDate(to || '');
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Content Area: Timeline vs Table */}
        {isLoading ? (
          <LoadingState message="Fetching normalized engineering activity stream..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Activity Stream"
            message="Could not retrieve activity events from the monitoring pipeline."
            onRetry={() => refetch()}
          />
        ) : activities.length === 0 ? (
          <EmptyState
            title="No Activity Events Found"
            description="No activity matches the active search parameters and filters."
          />
        ) : (
          <div className="space-y-6">
            {viewMode === 'timeline' ? (
              <ActivityTimelineView activities={paginatedActivities} />
            ) : (
              <ActivityTable activities={paginatedActivities} />
            )}

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Showing <span className="font-bold text-white">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to{' '}
                <span className="font-bold text-white">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
                <span className="font-bold text-white">{totalItems}</span> activity events
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors flex items-center gap-1 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-200">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors flex items-center gap-1 font-medium"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
