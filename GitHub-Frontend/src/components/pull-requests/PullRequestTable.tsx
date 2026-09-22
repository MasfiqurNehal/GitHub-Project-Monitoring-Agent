'use client';

import React from 'react';
import Link from 'next/link';
import { PullRequestWithMetrics } from '../../types';
import { 
  GitPullRequest, 
  GitMerge, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight,
  FolderKanban,
  GitBranch,
  FileCode,
  GitCommit,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';

interface PullRequestTableProps {
  pullRequests: PullRequestWithMetrics[];
}

export function PullRequestTable({ pullRequests }: PullRequestTableProps) {
  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'MERGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GitMerge className="w-3.5 h-3.5" /> Merged
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-3.5 h-3.5" /> Open
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {state}
          </span>
        );
    }
  };

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Changes Req.
          </span>
        );
      case 'COMMENTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <MessageSquare className="w-3 h-3" /> Commented
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Pending
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
              <th className="py-3.5 px-4"># PR & Title</th>
              <th className="py-3.5 px-4">Repository / Project</th>
              <th className="py-3.5 px-4">Author</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Review Status</th>
              <th className="py-3.5 px-4 text-center">Commits</th>
              <th className="py-3.5 px-4 text-center">Files</th>
              <th className="py-3.5 px-4 text-center">Additions / Deletions</th>
              <th className="py-3.5 px-4">Created / Merged</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {pullRequests.map((pr) => {
              const formattedCreated = new Date(pr.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const formattedMerged = pr.mergedAt
                ? new Date(pr.mergedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : null;

              return (
                <tr key={pr.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                          #{pr.number}
                        </span>
                        <Link href={`/pull-requests/${pr.id}`} className="font-bold text-slate-100 hover:text-blue-400 transition-colors line-clamp-1">
                          {pr.title}
                        </Link>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="space-y-1 max-w-xs">
                      <div className="font-mono text-xs font-semibold text-slate-200 flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate">{pr.repository?.fullName || 'Repository'}</span>
                      </div>
                      {pr.project && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          <FolderKanban className="w-2.5 h-2.5" />
                          {pr.project.name}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={pr.author?.avatarUrl || 'https://github.com/github.png'}
                        alt={pr.author?.login || 'Author'}
                        className="w-6 h-6 rounded-full border border-slate-700 object-cover"
                      />
                      <span className="font-semibold text-slate-200">@{pr.author?.login || 'author'}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">{getStatusBadge(pr.state)}</td>

                  <td className="py-3.5 px-4">{getReviewStatusBadge(pr.reviewStatus || 'PENDING')}</td>

                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">
                    {pr.commitsCount || pr.changedFiles || 1}
                  </td>

                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">
                    {pr.changedFiles}
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                    <span className="text-emerald-400">+{pr.additions}</span>{' '}
                    <span className="text-rose-400">-{pr.deletions}</span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    <div>Created: {formattedCreated}</div>
                    {formattedMerged ? (
                      <div className="text-purple-400 font-medium">Merged: {formattedMerged}</div>
                    ) : (
                      <div className="text-slate-500">—</div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/pull-requests/${pr.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-semibold border border-blue-500/30 transition-all"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
