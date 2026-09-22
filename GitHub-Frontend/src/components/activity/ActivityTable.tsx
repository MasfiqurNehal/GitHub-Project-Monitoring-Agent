'use client';

import React from 'react';
import Link from 'next/link';
import { EngineeringActivityItem } from '../../types';
import { 
  GitCommit, 
  GitPullRequest, 
  MessageSquare, 
  AlertCircle, 
  Clock, 
  ExternalLink, 
  FolderKanban, 
  GitBranch, 
  GitMerge, 
  GitFork, 
  CornerDownRight 
} from 'lucide-react';

interface ActivityTableProps {
  activities: EngineeringActivityItem[];
}

export function ActivityTable({ activities }: ActivityTableProps) {
  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'commit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <GitCommit className="w-3.5 h-3.5" /> Commit
          </span>
        );
      case 'push':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <GitBranch className="w-3.5 h-3.5" /> Push
          </span>
        );
      case 'pull_request':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <GitPullRequest className="w-3.5 h-3.5" /> Pull Request
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <MessageSquare className="w-3.5 h-3.5" /> PR Review
          </span>
        );
      case 'issue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> Issue
          </span>
        );
      case 'issue_comment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CornerDownRight className="w-3.5 h-3.5" /> Comment
          </span>
        );
      case 'merge':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <GitMerge className="w-3.5 h-3.5" /> Merge
          </span>
        );
      case 'branch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <GitFork className="w-3.5 h-3.5" /> Branch
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {type}
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
              <th className="py-3.5 px-4">Time & Date</th>
              <th className="py-3.5 px-4">Activity Type</th>
              <th className="py-3.5 px-4">Developer</th>
              <th className="py-3.5 px-4">Repository / Project</th>
              <th className="py-3.5 px-4">Title & Description</th>
              <th className="py-3.5 px-4 text-center">GitHub Item</th>
              <th className="py-3.5 px-4 text-center">Code Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {activities.map((act) => (
              <tr key={act.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="font-mono text-xs font-bold text-white">{act.formattedTime}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{act.formattedDate}</span>
                  </div>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap">{getActivityBadge(act.type)}</td>

                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={act.developer.avatarUrl || 'https://github.com/github.png'}
                      alt={act.developer.login}
                      className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                    />
                    <div>
                      <Link href={`/developers/${act.developer.id}`} className="font-bold text-slate-100 hover:text-blue-400 transition-colors">
                        {act.developer.name || act.developer.login}
                      </Link>
                      <p className="text-[10px] text-blue-400 font-mono">@{act.developer.login}</p>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="space-y-1 max-w-xs">
                    <div className="font-mono text-xs font-semibold text-slate-200 flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="truncate">{act.repository.fullName}</span>
                    </div>
                    {act.project && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                        <FolderKanban className="w-2.5 h-2.5" />
                        {act.project.name}
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3.5 px-4 max-w-md">
                  <p className="font-bold text-slate-100 text-xs">{act.title}</p>
                  {act.description && <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{act.description}</p>}
                </td>

                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                  <a
                    href={act.githubItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-mono border border-slate-700/80 transition-colors"
                  >
                    <span>{act.githubItem.label}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>

                <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono text-[11px]">
                  {act.additions !== undefined && act.deletions !== undefined ? (
                    <span>
                      <span className="text-emerald-400">+{act.additions}</span>{' '}
                      <span className="text-rose-400">-{act.deletions}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
