'use client';

import React, { useState, useMemo } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useDevelopers } from '../../hooks/use-developers';
import { useProjects } from '../../hooks/use-projects';
import { useRepositories } from '../../hooks/use-repositories';
import { DeveloperCard } from '../../components/developers/DeveloperCard';
import { DeveloperTable } from '../../components/developers/DeveloperTable';
import { ProjectFilter } from '../../components/filters/ProjectFilter';
import { RepositoryFilter } from '../../components/filters/RepositoryFilter';
import { DateRangeFilter } from '../../components/filters/DateRangeFilter';
import { LoadingState } from '../../components/common/LoadingState';
import { DateRangePreset, DeveloperWithMetrics } from '../../types';
import { 
  Users, 
  Search, 
  LayoutGrid, 
  List, 
  GitCommit, 
  GitPullRequest, 
  MessageSquare, 
  FileCode,
  CheckCircle2
} from 'lucide-react';

export default function DevelopersPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | undefined>(undefined);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const listFilters = useMemo(() => ({
    projectId: selectedProjectId,
    repositoryId: selectedRepositoryId,
    search: searchQuery || undefined,
    dateFrom: fromDate || undefined,
    dateTo: toDate || undefined,
  }), [selectedProjectId, selectedRepositoryId, searchQuery, fromDate, toDate]);

  const { developers, isLoading } = useDevelopers(listFilters);
  const { projects } = useProjects();
  const { repositories } = useRepositories();

  // Filter developers list by search, project, and repository
  const filteredDevelopers = useMemo(() => {
    return (developers as DeveloperWithMetrics[]).filter((dev) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = dev.name ? dev.name.toLowerCase().includes(q) : false;
        const matchesLogin = dev.login.toLowerCase().includes(q);
        if (!matchesName && !matchesLogin) return false;
      }

      // Project Filter
      if (selectedProjectId) {
        const hasProject = dev.projects?.some((p) => p.id === selectedProjectId);
        if (!hasProject) return false;
      }

      // Repository Filter
      if (selectedRepositoryId) {
        const hasRepo = dev.repositories?.some((r) => r.id === selectedRepositoryId);
        if (!hasRepo) return false;
      }

      return true;
    });
  }, [developers, searchQuery, selectedProjectId, selectedRepositoryId]);

  // Aggregate KPI summary
  const stats = useMemo(() => {
    let totalCommits = 0;
    let totalPRs = 0;
    let totalReviews = 0;
    let totalLinesAdded = 0;
    let totalLinesDeleted = 0;

    (developers as DeveloperWithMetrics[]).forEach((dev) => {
      const m = dev.metrics || {
        commitsCount: dev._count?.commits || 0,
        prsCount: dev._count?.pullRequests || 0,
        reviewsCount: dev._count?.reviews || 0,
        linesAdded: 0,
        linesDeleted: 0,
      };
      totalCommits += m.commitsCount;
      totalPRs += m.prsCount;
      totalReviews += m.reviewsCount;
      totalLinesAdded += m.linesAdded;
      totalLinesDeleted += m.linesDeleted;
    });

    return {
      totalDevs: developers.length,
      totalCommits,
      totalPRs,
      totalReviews,
      totalLinesAdded,
      totalLinesDeleted,
    };
  }, [developers]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-purple-400" /> Developers & Contributors
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Factual engineering telemetry and activity patterns across all project repositories.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Factual Analytics Only (No Scoring)</span>
          </div>
        </div>

        {/* Global KPI Summary Banner */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 py-3 px-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" /> Active Devs
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.totalDevs}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitCommit className="w-3 h-3 text-emerald-400" /> Total Commits
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.totalCommits}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitPullRequest className="w-3 h-3 text-amber-400" /> Pull Requests
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.totalPRs}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-purple-400" /> Code Reviews
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.totalReviews}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <FileCode className="w-3 h-3 text-emerald-400" /> Lines Added
            </span>
            <span className="text-base font-bold text-emerald-400 mt-0.5">+{stats.totalLinesAdded.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <FileCode className="w-3 h-3 text-rose-400" /> Lines Removed
            </span>
            <span className="text-base font-bold text-rose-400 mt-0.5">-{stats.totalLinesDeleted.toLocaleString()}</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search developer by name or @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Filters Row */}
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

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Developers View: Grid or Table */}
        {isLoading ? (
          <LoadingState message="Loading engineering developer metrics..." />
        ) : filteredDevelopers.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Developers Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery ? `No contributors matching "${searchQuery}".` : 'No developers found matching the active project filters.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevelopers.map((dev) => (
              <DeveloperCard key={dev.id} developer={dev} />
            ))}
          </div>
        ) : (
          <DeveloperTable developers={filteredDevelopers} />
        )}
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
