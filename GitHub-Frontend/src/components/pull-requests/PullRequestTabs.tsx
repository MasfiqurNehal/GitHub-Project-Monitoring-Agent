'use client';

import React, { useState } from 'react';
import { PullRequestDetailData } from '../../types';
import { 
  LayoutDashboard, 
  Clock, 
  Users, 
  GitCommit, 
  FileCode, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  GitBranch,
  ShieldCheck,
  GitMerge
} from 'lucide-react';

export type PRTabId = 'overview' | 'timeline' | 'reviewers' | 'commits' | 'files';

interface PullRequestTabsProps {
  detail: PullRequestDetailData;
}

export function PullRequestTabs({ detail }: PullRequestTabsProps) {
  const [activeTab, setActiveTab] = useState<PRTabId>('overview');
  const { pullRequest, reviewers, commits, files, timeline } = detail;

  const tabs: { id: PRTabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" />, count: timeline.length },
    { id: 'reviewers', label: 'Reviewers & Activity', icon: <Users className="w-4 h-4" />, count: reviewers.length },
    { id: 'commits', label: 'Commits', icon: <GitCommit className="w-4 h-4" />, count: commits.length },
    { id: 'files', label: 'Files Changed', icon: <FileCode className="w-4 h-4" />, count: files.length },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs Header Bar */}
      <div className="border-b border-slate-800 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                activeTab === tab.id
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* PR Description & Summary */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <LayoutDashboard className="w-4 h-4 text-blue-400" /> Description & Specification
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {pullRequest.body || 'No description provided for this pull request.'}
              </p>
            </div>

            {/* Read-Only Safety Banner */}
            <div className="p-4 bg-slate-900/60 border border-blue-500/30 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <div>
                  <h4 className="font-bold text-white">Read-Only Monitoring Console</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    PR merging and branch actions are executed directly within GitHub. This console provides read-only executive intelligence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-emerald-400" /> Lifecycle Timeline
            </h3>

            <div className="pl-4 border-l-2 border-slate-800 space-y-4 ml-3">
              {timeline.map((step) => (
                <div key={step.id} className="relative group">
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-400" />
                  <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-100">{step.actor} <span className="font-normal text-slate-400">{step.title}</span></span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(step.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {step.details && <p className="text-[11px] text-slate-400 italic pt-1">{step.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviewers & Review Activity Tab */}
        {activeTab === 'reviewers' && (
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Users className="w-4 h-4 text-purple-400" /> Peer Code Reviewers & Decisions ({reviewers.length})
            </h3>

            {reviewers.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No reviewers assigned or review decisions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {reviewers.map((rev) => (
                  <div key={rev.id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rev.avatarUrl || 'https://github.com/github.png'}
                          alt={rev.login}
                          className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                        />
                        <div>
                          <span className="font-bold text-xs text-white">{rev.name || rev.login}</span>
                          <span className="text-[11px] text-blue-400 font-mono ml-2">@{rev.login}</span>
                        </div>
                      </div>

                      {rev.state === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {rev.state === 'CHANGES_REQUESTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" /> Changes Requested
                        </span>
                      )}
                    </div>

                    {rev.body && <p className="text-xs text-slate-300 italic pt-1">{rev.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Commits Tab */}
        {activeTab === 'commits' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">SHA</th>
                    <th className="py-3 px-4">Commit Message</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4 text-center">Changes</th>
                    <th className="py-3 px-4">Committed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {commits.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-[11px]">
                          {c.githubSha.substring(0, 7)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-100 max-w-md truncate">{c.message}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">@{c.author?.login || 'author'}</td>
                      <td className="py-3 px-4 text-center font-mono text-[11px]">
                        <span className="text-emerald-400">+{c.additions}</span> <span className="text-rose-400">-{c.deletions}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(c.committedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Files Changed Tab */}
        {activeTab === 'files' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileCode className="w-4 h-4 text-cyan-400" /> Changed Files Breakdown ({files.length})
            </h3>

            <div className="space-y-3">
              {files.map((file, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      file.status === 'added' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      file.status === 'deleted' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {file.status}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200 truncate">{file.filename}</span>
                  </div>

                  <div className="font-mono text-xs font-semibold shrink-0">
                    <span className="text-emerald-400">+{file.additions}</span>{' '}
                    <span className="text-rose-400">-{file.deletions}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
