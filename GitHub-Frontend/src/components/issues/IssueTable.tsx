'use client';

import React from 'react';
import Link from 'next/link';
import { IssueWithMetrics } from '../../types';
import { 
  CircleDot, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  FolderKanban,
  GitBranch,
  Tag,
  UserCheck,
  MessageSquare
} from 'lucide-react';

interface IssueTableProps {
  issues: IssueWithMetrics[];
}

export function IssueTable({ issues }: IssueTableProps) {
  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CircleDot className="w-3.5 h-3.5" /> Open
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Closed
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

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th scope="col" className="py-3.5 px-4"># Issue & Title</th>
              <th scope="col" className="py-3.5 px-4">Repository / Project</th>
              <th scope="col" className="py-3.5 px-4">Author</th>
              <th scope="col" className="py-3.5 px-4">Status</th>
              <th scope="col" className="py-3.5 px-4">Labels</th>
              <th scope="col" className="py-3.5 px-4">Assignees</th>
              <th scope="col" className="py-3.5 px-4 text-center">Comments</th>
              <th scope="col" className="py-3.5 px-4">Created / Closed</th>
              <th scope="col" className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {issues.map((issue) => {
              const formattedCreated = new Date(issue.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const formattedClosed = issue.closedAt
                ? new Date(issue.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : null;

              return (
                <tr key={issue.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* # Issue & Title */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px] shrink-0">
                          #{issue.number}
                        </span>
                        <Link 
                          href={`/issues/${issue.id}`} 
                          className="font-bold text-slate-100 hover:text-blue-400 transition-colors line-clamp-1"
                        >
                          {issue.title}
                        </Link>
                      </div>
                    </div>
                  </td>

                  {/* Repository / Project */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1 max-w-xs">
                      <div className="font-mono text-xs font-semibold text-slate-200 flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate">{issue.repository?.fullName || 'Repository'}</span>
                      </div>
                      {issue.project && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          <FolderKanban className="w-2.5 h-2.5" />
                          {issue.project.name}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Author */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={issue.author?.avatarUrl || 'https://github.com/github.png'}
                        alt={issue.author?.login || 'Author'}
                        className="w-6 h-6 rounded-full border border-slate-700 object-cover"
                      />
                      <span className="font-semibold text-slate-200">@{issue.author?.login || 'author'}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">{getStatusBadge(issue.state)}</td>

                  {/* Labels */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {issue.labels && issue.labels.length > 0 ? (
                        issue.labels.map((lbl) => (
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
                        ))
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Assignees */}
                  <td className="py-3.5 px-4">
                    {issue.assignees && issue.assignees.length > 0 ? (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {issue.assignees.map((assignee) => (
                          <img
                            key={assignee.id}
                            src={assignee.avatarUrl || 'https://github.com/github.png'}
                            alt={assignee.login}
                            title={`Assigned to @${assignee.login}`}
                            className="w-6 h-6 rounded-full border border-slate-800 object-cover"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Unassigned</span>
                    )}
                  </td>

                  {/* Comments Count */}
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <MessageSquare className="w-3 h-3 text-slate-400" />
                      {issue.commentsCount || 0}
                    </span>
                  </td>

                  {/* Created / Closed */}
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    <div>Created: {formattedCreated}</div>
                    {formattedClosed ? (
                      <div className="text-purple-400 font-medium">Closed: {formattedClosed}</div>
                    ) : (
                      <div className="text-emerald-400/80 font-medium">Active</div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/issues/${issue.id}`}
                      aria-label={`View details for issue #${issue.number} ${issue.title}`}
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
