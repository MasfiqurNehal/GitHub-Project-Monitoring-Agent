'use client';

import React from 'react';
import Link from 'next/link';
import { RepositoryWithMetrics } from '../../types';
import { 
  GitBranch, 
  Users, 
  GitCommit, 
  GitPullRequest, 
  AlertCircle, 
  Clock, 
  Lock, 
  Globe, 
  RefreshCw, 
  ExternalLink,
  ArrowRight,
  FolderKanban,
  ShieldCheck
} from 'lucide-react';

interface RepositoryCardProps {
  repository: RepositoryWithMetrics;
  onSync: (repoId: string) => void;
  isSyncing?: boolean;
}

export function RepositoryCard({ repository, onSync, isSyncing }: RepositoryCardProps) {
  const metrics = repository.metrics || {
    developersCount: 0,
    commitsCount: 0,
    prsCount: 0,
    issuesCount: 0,
    linesAdded: 0,
    linesDeleted: 0,
    lastActivityAt: repository.updatedAt,
  };

  const formattedSynced = repository.lastSyncedAt
    ? new Date(repository.lastSyncedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        );
      case 'SYNCING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Syncing
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Paused
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group shadow-lg shadow-black/20">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
              <GitBranch className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <Link 
                href={`/repositories/${repository.id}`}
                className="text-base font-bold text-slate-100 hover:text-blue-400 transition-colors line-clamp-1"
              >
                {repository.name}
              </Link>
              <span className="text-[11px] text-slate-400 font-mono">
                {repository.owner} / <span className="text-slate-300 font-semibold">{repository.name}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {getStatusBadge(repository.status || 'ACTIVE')}
            {repository.isPrivate ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Lock className="w-3 h-3" /> Private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <Globe className="w-3 h-3 text-blue-400" /> Public
              </span>
            )}
          </div>
        </div>

        {/* Project & Branch Metadata */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Project:</span>
            {repository.project ? (
              <Link href={`/projects/${repository.project.id}`} className="font-semibold text-blue-400 hover:underline">
                {repository.project.name}
              </Link>
            ) : (
              <span className="text-slate-500 italic">Unassigned</span>
            )}
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 text-[10px] font-mono">
            {repository.language || 'Codebase'}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="my-4 py-3 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80 grid grid-cols-4 gap-2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <Users className="w-3 h-3 text-purple-400" /> Devs
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.developersCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800/60">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <GitCommit className="w-3 h-3 text-emerald-400" /> Commits
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.commitsCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800/60">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <GitPullRequest className="w-3 h-3 text-amber-400" /> PRs
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.prsCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800/60">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3 text-rose-400" /> Issues
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.issuesCount}</span>
        </div>
      </div>

      {/* Footer Meta & Actions */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Synced: {formattedSynced}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3 h-3" /> Read-Only
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSync(repository.id)}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-medium rounded-xl border border-slate-700/50 flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Trigger Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <a
              href={repository.url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/50 transition-colors"
              title="Open GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <Link
            href={`/repositories/${repository.id}`}
            className="px-4 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/20"
          >
            <span>View Repo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
