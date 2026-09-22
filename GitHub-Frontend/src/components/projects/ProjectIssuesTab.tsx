'use client';

import React from 'react';
import { ProjectIssue } from '../../types';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface ProjectIssuesTabProps {
  issues: ProjectIssue[];
}

export function ProjectIssuesTab({ issues }: ProjectIssuesTabProps) {
  const getIssueBadge = (state: string) => {
    switch (state) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Open
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <CheckCircle2 className="w-3 h-3" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-rose-400" /> Project Issues ({issues.length})
      </h3>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4"># Issue</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Repository</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {issues.map((issue) => {
                const formattedDate = new Date(issue.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={issue.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[11px]">
                        #{issue.number}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100 max-w-md truncate">
                      {issue.title}
                    </td>
                    <td className="py-3 px-4">{getIssueBadge(issue.state)}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {issue.repoName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {issue.author}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
