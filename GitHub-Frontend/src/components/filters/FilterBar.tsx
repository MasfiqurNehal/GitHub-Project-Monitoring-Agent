'use client';

import { Suspense } from 'react';
import { useFilters } from '../../hooks/use-filters';
import { ProjectFilter } from './ProjectFilter';
import { RepositoryFilter } from './RepositoryFilter';
import { DeveloperFilter } from './DeveloperFilter';
import { ActivityTypeFilter } from './ActivityTypeFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { Project, Repository, Developer } from '../../types';
import { Filter, X } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface FilterBarProps {
  projects?: Project[];
  repositories?: Repository[];
  developers?: Developer[];
  showProjectFilter?: boolean;
  showRepositoryFilter?: boolean;
  showDeveloperFilter?: boolean;
  showActivityTypeFilter?: boolean;
  showDateRangeFilter?: boolean;
  className?: string;
}

function FilterBarContent({
  projects = [],
  repositories = [],
  developers = [],
  showProjectFilter = true,
  showRepositoryFilter = true,
  showDeveloperFilter = true,
  showActivityTypeFilter = true,
  showDateRangeFilter = true,
  className = '',
}: FilterBarProps) {
  const { filters, setFilter, setPreset, setCustomDate, resetFilters } = useFilters();

  // Check if any non-default filter is currently active
  const hasActiveFilters =
    Boolean(filters.projectId) ||
    Boolean(filters.repositoryId) ||
    Boolean(filters.developerId) ||
    Boolean(filters.activityType) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    (filters.preset && filters.preset !== '7d');

  // Filter repositories by selected project if projectId is active
  const availableRepositories = filters.projectId
    ? repositories.filter((r) => r.projectId === filters.projectId)
    : repositories;

  return (
    <div className={`bg-slate-900/80 border border-slate-800/90 p-4 rounded-2xl shadow-md space-y-3 backdrop-blur-md ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filter Title & Clear Action */}
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Global Filter Console</span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-2 inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[11px] font-medium transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Date Range Filter */}
        {showDateRangeFilter && (
          <DateRangeFilter
            preset={filters.preset}
            from={filters.from}
            to={filters.to}
            onPresetChange={setPreset}
            onCustomDateChange={setCustomDate}
          />
        )}
      </div>

      {/* Selectors Bar */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/70">
        {showProjectFilter && (
          <ProjectFilter
            projects={projects}
            value={filters.projectId}
            onChange={(val) => setFilter('project', val)}
          />
        )}

        {showRepositoryFilter && (
          <RepositoryFilter
            repositories={availableRepositories}
            value={filters.repositoryId}
            onChange={(val) => setFilter('repository', val)}
          />
        )}

        {showDeveloperFilter && (
          <DeveloperFilter
            developers={developers}
            value={filters.developerId}
            onChange={(val) => setFilter('developer', val)}
          />
        )}

        {showActivityTypeFilter && (
          <ActivityTypeFilter
            value={filters.activityType}
            onChange={(val) => setFilter('activity', val)}
          />
        )}
      </div>
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="bg-slate-900/80 border border-slate-800/90 p-4 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
}

export function FilterBar(props: FilterBarProps) {
  return (
    <Suspense fallback={<FilterBarSkeleton />}>
      <FilterBarContent {...props} />
    </Suspense>
  );
}
