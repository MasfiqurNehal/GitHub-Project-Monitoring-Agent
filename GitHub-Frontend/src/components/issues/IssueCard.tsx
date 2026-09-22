'use client';

import React from 'react';
import Link from 'next/link';
import { IssueWithMetrics } from '../../types';
import { 
  CircleDot, 
  CheckCircle2, 
  ArrowRight,
  FolderKanban,
  GitBranch,
  Tag,
  MessageSquare,
  Clock
} from 'lucide-react';

interface IssueCardProps {
  issue: IssueWithMetrics;
}

export function IssueCard({ issue }: IssueCardProps) {
  const formattedCreated = new Date(issue.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const formattedClosed = issue.closedAt
    ? new Date(issue.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
              #{issue.number}
            </span>
            {issue.state === 'OPEN' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CircleDot className="w-3.5 h-3.5" /> Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Closed
              </span>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            {formattedClosed ? `Closed ${formattedClosed}` : `Opened ${formattedCreated}`}
          </span>
        </div>

        {/* Title & Body */}
        <div>
          <Link
            href={`/issues/${issue.id}`}
            className="font-bold text-slate-100 hover:text-blue-400 transition-colors text-base line-clamp-2"
          >
            {issue.title}
          </Link>
          {issue.body && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {issue.body}
            </p>
          )}
        </div>

        {/* Labels */}
        {issue.labels && issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {issue.labels.map((lbl) => (
              <span
                key={lbl.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border"
                style={{
                  backgroundColor: `${lbl.color || '#3b82f6'}15`,
                  borderColor: `${lbl.color || '#3b82f6'}40`,
                  color: lbl.color || '#60a5fa',
                }}
              >
                <Tag className="w-2.5 h-2.5" />
                {lbl.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <img
              src={issue.author?.avatarUrl || 'https://github.com/github.png'}
              alt={issue.author?.login || 'Author'}
              className="w-5 h-5 rounded-full border border-slate-700 object-cover"
            />
            <span className="font-semibold text-slate-200">@{issue.author?.login}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              {issue.commentsCount || 0}
            </span>

            {issue.assignees && issue.assignees.length > 0 && (
              <div className="flex -space-x-1 overflow-hidden" title="Assignees">
                {issue.assignees.map((assignee) => (
                  <img
                    key={assignee.id}
                    src={assignee.avatarUrl || 'https://github.com/github.png'}
                    alt={assignee.login}
                    className="w-5 h-5 rounded-full border border-slate-800 object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Repo & Action */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[200px]">
            <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate">{issue.repository?.fullName}</span>
          </div>

          <Link
            href={`/issues/${issue.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-semibold border border-blue-500/30 transition-all shrink-0"
          >
            <span>View Issue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
