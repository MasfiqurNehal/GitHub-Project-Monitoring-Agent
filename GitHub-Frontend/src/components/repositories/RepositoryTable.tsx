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
  ArrowRight,
  Clock,
  Lock,
  Globe,
  RefreshCw,
  FolderKanban
} from 'lucide-react';

interface RepositoryTableProps {
  repositories: RepositoryWithMetrics[];
  onSync: (repoId: string) => void;
  syncingId?: string | null;
}

export function RepositoryTable({ repositories, onSync, syncingId }: RepositoryTableProps) {
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
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Repository</th>
              <th className="py-3.5 px-4">Project</th>
              <th className="py-3.5 px-4">Visibility</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Devs</th>
              <th className="py-3.5 px-4 text-center">Commits</th>
              <th className="py-3.5 px-4 text-center">PRs</th>
              <th className="py-3.5 px-4 text-center">Issues</th>
              <th className="py-3.5 px-4">Last Synced</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {repositories.map((repo) => {
              const metrics = repo.metrics || {
                developersCount: 0,
                commitsCount: 0,
                prsCount: 0,
                issuesCount: 0,
                linesAdded: 0,
                linesDeleted: 0,
                lastActivityAt: repo.updatedAt,
              };

              const formattedSynced = repo.lastSyncedAt
                ? new Date(repo.lastSyncedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Never';

              return (
                <tr key={repo.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <GitBranch className="w-4 h-4" />
                      </div>
                      <div>
                        <Link href={`/repositories/${repo.id}`} className="font-bold text-slate-100 hover:text-blue-400 transition-colors">
                          {repo.name}
                        </Link>
                        <p className="text-[11px] font-mono text-slate-400">{repo.owner}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {repo.project ? (
                      <Link href={`/projects/${repo.project.id}`} className="font-semibold text-blue-400 hover:underline flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5" />
                        <span>{repo.project.name}</span>
                      </Link>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {repo.isPrivate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Lock className="w-3 h-3" /> Private
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        <Globe className="w-3 h-3 text-blue-400" /> Public
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">{getStatusBadge(repo.status || 'ACTIVE')}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{metrics.developersCount}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{metrics.commitsCount}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{metrics.prsCount}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{metrics.issuesCount}</td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formattedSynced}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSync(repo.id)}
                        disabled={syncingId === repo.id}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-40"
                        title="Sync Repository"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingId === repo.id ? 'animate-spin text-blue-400' : ''}`} />
                      </button>
                      <Link
                        href={`/repositories/${repo.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-semibold border border-blue-500/30 transition-all"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
