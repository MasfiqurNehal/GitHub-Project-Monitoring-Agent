'use client';

import React from 'react';
import { Commit } from '../../types';
import { GitCommit, Clock, ExternalLink } from 'lucide-react';

interface ProjectCommitsTabProps {
  commits: Commit[];
}

export function ProjectCommitsTab({ commits }: ProjectCommitsTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <GitCommit className="w-4 h-4 text-emerald-400" /> Recent Commits ({commits.length})
      </h3>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
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
              {commits.map((commit) => {
                const formattedDate = new Date(commit.committedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={commit.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-[11px]">
                        {commit.githubSha.substring(0, 7)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-100 max-w-md truncate">
                      {commit.message}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">
                        {commit.author?.name || commit.author?.login || 'Developer'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px]">
                      <span className="text-emerald-400">+{commit.additions}</span>{' '}
                      <span className="text-rose-400">-{commit.deletions}</span>
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
