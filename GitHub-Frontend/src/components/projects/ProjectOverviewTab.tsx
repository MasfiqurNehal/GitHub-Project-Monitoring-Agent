'use client';

import React from 'react';
import Link from 'next/link';
import { ProjectDetailData } from '../../types';
import { 
  GitBranch, 
  Users, 
  GitCommit, 
  GitPullRequest, 
  AlertCircle, 
  FileCode, 
  Clock, 
  ArrowUpRight, 
  ExternalLink,
  ShieldCheck,
  Plus
} from 'lucide-react';

interface ProjectOverviewTabProps {
  detail: ProjectDetailData;
  onConnectRepo?: () => void;
}

export function ProjectOverviewTab({ detail, onConnectRepo }: ProjectOverviewTabProps) {
  const { project, repositories, developers, recentActivity } = detail;
  const metrics = project.metrics;

  return (
    <div className="space-y-6">
      {/* Metrics Header Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Repositories</span>
            <p className="text-xl font-bold text-white">{metrics.repositoriesCount}</p>
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
            <span className="text-[11px] text-slate-400 font-medium">Pull Requests</span>
            <p className="text-xl font-bold text-white">{metrics.prsCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Issues</span>
            <p className="text-xl font-bold text-white">{metrics.issuesCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Lines Changed</span>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">
              +{metrics.linesAdded.toLocaleString()} <span className="text-rose-400">-{metrics.linesDeleted.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Repositories & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Repositories & Top Developers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connected Repositories Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-400" /> Monitored Repositories ({repositories.length})
              </h3>
              {onConnectRepo ? (
                <button
                  type="button"
                  onClick={onConnectRepo}
                  className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Connect Repo</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Project scope</span>
              )}
            </div>

            {repositories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {repositories.map((repo) => (
                  <div key={repo.id} className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{repo.fullName}</span>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-[10px]">
                        {repo.language || 'Code'}
                      </span>
                      <span>Branch: {repo.defaultBranch}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">No repositories connected to this project yet.</p>
            )}
          </div>

          {/* Top Developer Contributors */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> Key Contributors ({developers.length})
              </h3>
            </div>

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
            <Clock className="w-4 h-4 text-emerald-400" /> Recent Activity Stream
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
                  <span className="font-mono">{act.repoName.split('/')[1] || act.repoName}</span>
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
