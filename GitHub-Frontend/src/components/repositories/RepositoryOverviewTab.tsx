'use client';

import React from 'react';
import Link from 'next/link';
import { RepositoryDetailData } from '../../types';
import { 
  GitBranch, 
  Users, 
  GitCommit, 
  GitPullRequest, 
  AlertCircle, 
  FileCode, 
  ShieldCheck, 
  Lock, 
  Globe,
  Clock,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

interface RepositoryOverviewTabProps {
  detail: RepositoryDetailData;
}

export function RepositoryOverviewTab({ detail }: RepositoryOverviewTabProps) {
  const { repository, overview, developers, recentActivity } = detail;
  const metrics = repository.metrics;

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Active Branch</span>
            <p className="text-sm font-bold text-white font-mono">{overview.activeBranch}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Developers</span>
            <p className="text-xl font-bold text-white">{metrics.developersCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <GitCommit className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Commits</span>
            <p className="text-xl font-bold text-white">{metrics.commitsCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Open PRs</span>
            <p className="text-xl font-bold text-amber-400">{overview.openPRsCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Open Issues</span>
            <p className="text-xl font-bold text-rose-400">{overview.openIssuesCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Code Impact</span>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">
              +{metrics.linesAdded.toLocaleString()} <span className="text-rose-400">-{metrics.linesDeleted.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Repository Specs & Top Developers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Security & Access Specs */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Repository Security & Monitoring Policy
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Visibility</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-100 text-xs">
                  {repository.isPrivate ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Private Repository
                    </span>
                  ) : (
                    <span className="text-blue-400 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> Public Repository
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Access Control</span>
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" /> Enforced Read-Only
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Sync Status</span>
                <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Synchronized
                </div>
              </div>
            </div>
          </div>

          {/* Key Developer Contributors */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Users className="w-4 h-4 text-purple-400" /> Active Repository Contributors ({developers.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {developers.map((dev) => (
                <div key={dev.id} className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs shrink-0">
                    {dev.name ? dev.name[0] : dev.login[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{dev.name || dev.login}</h4>
                    <span className="text-[10px] text-slate-400">@{dev.login}</span>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>{dev.commits} commits</span>
                      <span>•</span>
                      <span>{dev.prs} PRs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-emerald-400" /> Recent Repository Activity
          </h3>

          <div className="space-y-3">
            {recentActivity.map((act) => (
              <div key={act.id} className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-blue-400">{act.author}</span>
                  <span className="text-slate-500">{act.timeAgo}</span>
                </div>
                <p className="text-xs text-slate-200 font-medium line-clamp-2">{act.title}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="font-mono text-slate-400">{act.repoName}</span>
                  {act.status && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                      {act.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
