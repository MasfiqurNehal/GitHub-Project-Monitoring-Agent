'use client';

import React from 'react';
import Link from 'next/link';
import { DeveloperWithMetrics } from '../../types';
import { 
  Users, 
  GitCommit, 
  GitPullRequest, 
  MessageSquare, 
  AlertCircle, 
  FolderKanban, 
  GitBranch, 
  Clock, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface DeveloperCardProps {
  developer: DeveloperWithMetrics;
}

export function DeveloperCard({ developer }: DeveloperCardProps) {
  const metrics = developer.metrics || {
    projectsCount: developer.projects?.length || 0,
    repositoriesCount: developer.repositories?.length || 0,
    commitsCount: developer._count?.commits || 0,
    prsCount: developer._count?.pullRequests || 0,
    reviewsCount: developer._count?.reviews || 0,
    issuesCount: 0,
    linesAdded: 0,
    linesDeleted: 0,
    lastActivityAt: developer.updatedAt,
  };

  const formattedDate = new Date(metrics.lastActivityAt || developer.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group shadow-lg shadow-black/20">
      {/* Top Profile Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={developer.avatarUrl || 'https://github.com/github.png'}
              alt={developer.login}
              className="w-12 h-12 rounded-full border border-slate-700 object-cover group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <Link
                href={`/developers/${developer.id}`}
                className="text-base font-bold text-white hover:text-blue-400 transition-colors line-clamp-1"
              >
                {developer.name || developer.login}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400 font-semibold">@{developer.login}</span>
                {developer.profileUrl && (
                  <a
                    href={developer.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Last Active</span>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 justify-end mt-0.5">
              <Clock className="w-3 h-3 text-slate-500" /> {formattedDate}
            </span>
          </div>
        </div>

        {/* Assigned Projects & Repositories Badges */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs">
            <FolderKanban className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Projects:</span>
            <div className="flex flex-wrap gap-1">
              {developer.projects && developer.projects.length > 0 ? (
                developer.projects.map((p) => (
                  <span key={p.id} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded text-[10px] font-medium">
                    {p.name}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic text-[10px]">None</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Repositories:</span>
            <div className="flex flex-wrap gap-1">
              {developer.repositories && developer.repositories.length > 0 ? (
                developer.repositories.slice(0, 2).map((r) => (
                  <span key={r.id} className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700/60 rounded text-[10px] font-mono">
                    {r.name}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic text-[10px]">None</span>
              )}
              {developer.repositories && developer.repositories.length > 2 && (
                <span className="text-slate-500 text-[10px]">+{developer.repositories.length - 2} more</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="my-4 py-3 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80 grid grid-cols-4 gap-2 text-center">
        <div className="flex flex-col items-center">
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
            <MessageSquare className="w-3 h-3 text-purple-400" /> Reviews
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.reviewsCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800/60">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3 text-rose-400" /> Issues
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.issuesCount}</span>
        </div>
      </div>

      {/* Code Impact Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="text-xs">
          <span className="text-[10px] text-slate-500 block">Code Impact</span>
          <span className="font-mono text-[11px] font-semibold text-emerald-400">
            +{metrics.linesAdded.toLocaleString()} <span className="text-rose-400">-{metrics.linesDeleted.toLocaleString()}</span>
          </span>
        </div>

        <Link
          href={`/developers/${developer.id}`}
          className="px-4 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/20"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
