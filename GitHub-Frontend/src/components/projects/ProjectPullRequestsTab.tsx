'use client';

import React from 'react';
import { PullRequest } from '../../types';
import { GitPullRequest, Clock, CheckCircle2, AlertCircle, GitMerge } from 'lucide-react';

interface ProjectPullRequestsTabProps {
  pullRequests: PullRequest[];
}

export function ProjectPullRequestsTab({ pullRequests }: ProjectPullRequestsTabProps) {
  const getPRBadge = (state: string) => {
    switch (state) {
      case 'MERGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GitMerge className="w-3 h-3" /> Merged
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Open
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <GitPullRequest className="w-4 h-4 text-amber-400" /> Pull Requests ({pullRequests.length})
      </h3>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4"># PR</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4 text-center">Lines Changed</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {pullRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-slate-400 text-xs">
                    No pull requests found for this project in the selected time period.
                  </td>
                </tr>
              ) : (
                pullRequests.map((pr) => {
                  const formattedDate = new Date(pr.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={pr.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                          #{pr.number}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-100 max-w-md truncate">
                        {pr.title}
                      </td>
                      <td className="py-3 px-4">{getPRBadge(pr.state)}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200">
                          {pr.author?.name || pr.author?.login || 'Developer'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px]">
                        <span className="text-emerald-400">+{pr.additions}</span>{' '}
                        <span className="text-rose-400">-{pr.deletions}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
