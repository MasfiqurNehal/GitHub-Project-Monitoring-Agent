'use client';

import React, { useState, useMemo } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useRepositories } from '../../hooks/use-repositories';
import { useProjects } from '../../hooks/use-projects';
import { RepositoryCard } from '../../components/repositories/RepositoryCard';
import { RepositoryTable } from '../../components/repositories/RepositoryTable';
import { ProjectFilter } from '../../components/filters/ProjectFilter';
import { RepositoryFilter } from '../../components/filters/RepositoryFilter';
import { DateRangeFilter } from '../../components/filters/DateRangeFilter';
import { LoadingState } from '../../components/common/LoadingState';
import { DateRangePreset, RepositoryWithMetrics } from '../../types';
import { 
  GitBranch, 
  Search, 
  LayoutGrid, 
  List, 
  Lock, 
  Globe, 
  Users, 
  GitCommit, 
  GitPullRequest, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

export default function RepositoriesPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | undefined>(undefined);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { repositories, isLoading, syncRepository, refetch } = useRepositories();
  const { projects } = useProjects();

  const handleSync = async (repoId: string) => {
    setSyncingId(repoId);
    try {
      await syncRepository(repoId);
      await refetch();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncingId(null);
    }
  };

  // Filter Repositories by search, project, and repository selection
  const filteredRepositories = useMemo(() => {
    return (repositories as RepositoryWithMetrics[]).filter((repo) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = repo.name.toLowerCase().includes(q) || repo.fullName.toLowerCase().includes(q);
        const matchesOwner = repo.owner.toLowerCase().includes(q);
        const matchesLang = repo.language ? repo.language.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesOwner && !matchesLang) return false;
      }

      // Project Filter
      if (selectedProjectId && repo.projectId !== selectedProjectId) {
        return false;
      }

      // Specific Repository Filter
      if (selectedRepositoryId && repo.id !== selectedRepositoryId) {
        return false;
      }

      return true;
    });
  }, [repositories, searchQuery, selectedProjectId, selectedRepositoryId]);

  // Aggregate KPI summary
  const stats = useMemo(() => {
    let privateCount = 0;
    let publicCount = 0;
    let totalDevs = 0;
    let totalCommits = 0;
    let totalPRs = 0;
    let totalIssues = 0;

    (repositories as RepositoryWithMetrics[]).forEach((repo) => {
      if (repo.isPrivate) privateCount++;
      else publicCount++;

      const m = repo.metrics || {
        developersCount: 0,
        commitsCount: 0,
        prsCount: 0,
        issuesCount: 0,
      };

      totalDevs += m.developersCount;
      totalCommits += m.commitsCount;
      totalPRs += m.prsCount;
      totalIssues += m.issuesCount;
    });

    return {
      total: repositories.length,
      privateCount,
      publicCount,
      totalDevs,
      totalCommits,
      totalPRs,
      totalIssues,
    };
  }, [repositories]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <GitBranch className="w-6 h-6 text-blue-400" /> Monitored Repositories
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Read-only synchronized GitHub codebases across all monitoring project groups.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Enforced Read-Only Mode</span>
          </div>
        </div>

        {/* Global Summary KPI Banner */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 py-3 px-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-blue-400" /> Monitored Repos
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.total}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Lock className="w-3 h-3 text-rose-400" /> Private Repos
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.privateCount}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Globe className="w-3 h-3 text-blue-400" /> Public Repos
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.publicCount}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" /> Active Devs
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.totalDevs}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitCommit className="w-3 h-3 text-emerald-400" /> Commits
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.totalCommits}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitPullRequest className="w-3 h-3 text-amber-400" /> Pull Requests
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.totalPRs}</span>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search repository by name, owner, or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
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
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Repositories View: Grid or Table */}
        {isLoading ? (
          <LoadingState message="Loading monitored GitHub repositories..." />
        ) : filteredRepositories.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <GitBranch className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Repositories Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery ? `No repositories matching "${searchQuery}".` : 'No repositories attached under the selected filters.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRepositories.map((repo) => (
              <RepositoryCard
                key={repo.id}
                repository={repo}
                onSync={handleSync}
                isSyncing={syncingId === repo.id}
              />
            ))}
          </div>
        ) : (
          <RepositoryTable
            repositories={filteredRepositories}
            onSync={handleSync}
            syncingId={syncingId}
          />
        )}
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
