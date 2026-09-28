'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Repository } from '../../types';
import { 
  GitBranch, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  GitCommit, 
  GitPullRequest, 
  AlertCircle, 
  Users, 
  Loader2 
} from 'lucide-react';

interface ProjectRepositoriesTabProps {
  repositories: Repository[];
  onConnectRepo?: () => void;
  onDisconnectRepo?: (repositoryId: string) => Promise<any>;
  isDisconnecting?: boolean;
}

export function ProjectRepositoriesTab({
  repositories,
  onConnectRepo,
  onDisconnectRepo,
  isDisconnecting,
}: ProjectRepositoriesTabProps) {
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const handleDisconnect = async (repositoryId: string) => {
    if (!onDisconnectRepo) return;
    if (!window.confirm('Are you sure you want to remove this repository from the project? The repository itself will not be deleted.')) {
      return;
    }
    setDisconnectingId(repositoryId);
    try {
      await onDisconnectRepo(repositoryId);
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-400" /> Monitored Repositories ({repositories.length})
        </h3>
        {onConnectRepo && (
          <button
            type="button"
            onClick={onConnectRepo}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Repository</span>
          </button>
        )}
      </div>

      {repositories.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <p className="text-slate-400 text-xs">No repositories associated with this project yet.</p>
          {onConnectRepo && (
            <button
              type="button"
              onClick={onConnectRepo}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Repository</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {repositories.map((repo) => {
            const formattedSynced = repo.lastSyncedAt
              ? new Date(repo.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'Never';

            const m = repo.metrics || {
              commitsCount: 0,
              prsCount: 0,
              issuesCount: 0,
              developersCount: 0,
              linesAdded: 0,
              linesDeleted: 0,
            };

            const isThisDisconnecting = disconnectingId === repo.id || (isDisconnecting && disconnectingId === repo.id);

            return (
              <div key={repo.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700/80 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <GitBranch className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight">{repo.fullName || repo.name}</h4>
                        <p className="text-[11px] text-slate-400">Default branch: <span className="font-mono text-slate-300">{repo.defaultBranch}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        title="View on GitHub"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {onDisconnectRepo && (
                        <button
                          type="button"
                          onClick={() => handleDisconnect(repo.id)}
                          disabled={isThisDisconnecting}
                          title="Disconnect repository from project"
                          className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isThisDisconnecting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {repo.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                      {repo.description}
                    </p>
                  )}

                  {/* Repository Statistics Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                        <GitCommit className="w-3 h-3 text-emerald-400" /> Commits
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5 block">{m.commitsCount}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                        <GitPullRequest className="w-3 h-3 text-amber-400" /> PRs
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5 block">{m.prsCount}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-400" /> Issues
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5 block">{m.issuesCount}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 text-purple-400" /> Devs
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5 block">{m.developersCount}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-[10px]">
                      {repo.language || 'TypeScript'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Sync
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Synced: {formattedSynced}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
