'use client';

import React from 'react';
import Link from 'next/link';
import { DeveloperWithMetrics } from '../../types';
import { 
  Users, 
  GitCommit, 
  GitPullRequest, 
  MessageSquare, 
  AlertCircle, 
  ArrowRight,
  Clock,
  FolderKanban,
  GitBranch
} from 'lucide-react';

interface DeveloperTableProps {
  developers: DeveloperWithMetrics[];
}

export function DeveloperTable({ developers }: DeveloperTableProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Developer</th>
              <th className="py-3.5 px-4">Projects</th>
              <th className="py-3.5 px-4">Repositories</th>
              <th className="py-3.5 px-4 text-center">Commits</th>
              <th className="py-3.5 px-4 text-center">PRs</th>
              <th className="py-3.5 px-4 text-center">Reviews</th>
              <th className="py-3.5 px-4 text-center">Issues</th>
              <th className="py-3.5 px-4 text-center">Lines + / -</th>
              <th className="py-3.5 px-4">Last Activity</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {developers.map((dev) => {
              const metrics = dev.metrics || {
                projectsCount: dev.projects?.length || 0,
                repositoriesCount: dev.repositories?.length || 0,
                commitsCount: dev._count?.commits || 0,
                prsCount: dev._count?.pullRequests || 0,
                reviewsCount: dev._count?.reviews || 0,
                issuesCount: 0,
                linesAdded: 0,
                linesDeleted: 0,
                lastActivityAt: dev.updatedAt,
              };

              const formattedDate = new Date(metrics.lastActivityAt || dev.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={dev.avatarUrl || 'https://github.com/github.png'}
                        alt={dev.login}
                        className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                      />
                      <div>
                        <Link href={`/developers/${dev.id}`} className="font-bold text-slate-100 hover:text-blue-400 transition-colors">
                          {dev.name || dev.login}
                        </Link>
                        <p className="text-[11px] text-blue-400 font-mono">@{dev.login}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {dev.projects && dev.projects.length > 0 ? (
                        dev.projects.map((p) => (
                          <span key={p.id} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded text-[10px] font-medium">
                            {p.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {dev.repositories && dev.repositories.length > 0 ? (
                        dev.repositories.map((r) => (
                          <span key={r.id} className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700/60 rounded text-[10px] font-mono">
                            {r.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">None</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{metrics.commitsCount}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{metrics.prsCount}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{metrics.reviewsCount}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{metrics.issuesCount}</td>
                  <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                    <span className="text-emerald-400">+{metrics.linesAdded.toLocaleString()}</span>{' '}
                    <span className="text-rose-400">-{metrics.linesDeleted.toLocaleString()}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formattedDate}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/developers/${dev.id}`}
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
