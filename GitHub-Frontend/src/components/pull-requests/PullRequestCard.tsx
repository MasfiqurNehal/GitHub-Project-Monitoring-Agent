'use client';

import React from 'react';
import Link from 'next/link';
import { PullRequestWithMetrics } from '../../types';
import { 
  GitPullRequest, 
  GitMerge, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  ArrowRight,
  GitBranch,
  FolderKanban,
  FileCode,
  GitCommit,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';

interface PullRequestCardProps {
  pullRequest: PullRequestWithMetrics;
}

export function PullRequestCard({ pullRequest }: PullRequestCardProps) {
  const formattedCreated = new Date(pullRequest.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

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

  const getReviewBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Changes Req.
          </span>
        );
      case 'COMMENTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <MessageSquare className="w-3 h-3" /> Commented
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group shadow-lg shadow-black/20">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
              #{pullRequest.number}
            </span>
            {getStatusBadge(pullRequest.state)}
          </div>
          {getReviewBadge(pullRequest.reviewStatus || 'PENDING')}
        </div>

        {/* Title */}
        <Link
          href={`/pull-requests/${pullRequest.id}`}
          className="text-base font-bold text-slate-100 hover:text-blue-400 transition-colors line-clamp-2 block"
        >
          {pullRequest.title}
        </Link>

        {/* Repo & Author Metadata */}
        <div className="space-y-1.5 pt-1 text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono text-slate-300 flex items-center gap-1 truncate">
              <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
              {pullRequest.repository?.fullName}
            </span>
            {pullRequest.project && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium shrink-0">
                {pullRequest.project.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <img
              src={pullRequest.author?.avatarUrl || 'https://github.com/github.png'}
              alt={pullRequest.author?.login || 'Author'}
              className="w-5 h-5 rounded-full border border-slate-700 object-cover"
            />
            <span className="text-slate-300 font-medium">@{pullRequest.author?.login || 'author'}</span>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="my-4 py-2.5 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <span className="text-[10px] text-slate-500 block font-medium">Commits</span>
          <span className="font-bold text-white mt-0.5 block">{pullRequest.commitsCount || 1}</span>
        </div>
        <div className="border-l border-slate-800">
          <span className="text-[10px] text-slate-500 block font-medium">Files Changed</span>
          <span className="font-bold text-white mt-0.5 block">{pullRequest.changedFiles}</span>
        </div>
        <div className="border-l border-slate-800">
          <span className="text-[10px] text-slate-500 block font-medium">Impact</span>
          <span className="font-mono text-[11px] font-semibold text-emerald-400 mt-0.5 block">
            +{pullRequest.additions} <span className="text-rose-400">-{pullRequest.deletions}</span>
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Created {formattedCreated}
        </span>

        <Link
          href={`/pull-requests/${pullRequest.id}`}
          className="px-3.5 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/20"
        >
          <span>Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
