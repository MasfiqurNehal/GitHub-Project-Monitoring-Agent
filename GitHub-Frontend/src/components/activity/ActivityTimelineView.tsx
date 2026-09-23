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
  Calendar,
  FolderKanban,
  GitBranch,
  GitMerge,
  GitFork,
  CornerDownRight
} from 'lucide-react';

interface ActivityTimelineViewProps {
  activities: EngineeringActivityItem[];
}

export function ActivityTimelineView({ activities }: ActivityTimelineViewProps) {
  // Group activities by date string (e.g. "22 Sep 2026")
  const grouped = activities.reduce((acc, act) => {
    const key = act.formattedDate || 'Recent';
    if (!acc[key]) acc[key] = [];
    acc[key].push(act);
    return acc;
  }, {} as Record<string, EngineeringActivityItem[]>);

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'commit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <GitCommit className="w-3.5 h-3.5" /> Commit
          </span>
        );
      case 'push':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <GitBranch className="w-3.5 h-3.5" /> Push
          </span>
        );
      case 'pull_request':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <GitPullRequest className="w-3.5 h-3.5" /> Pull Request
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <MessageSquare className="w-3.5 h-3.5" /> PR Review
          </span>
        );
      case 'issue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> Issue
          </span>
        );
      case 'issue_comment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CornerDownRight className="w-3.5 h-3.5" /> Comment
          </span>
        );
      case 'merge':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <GitMerge className="w-3.5 h-3.5" /> Merge
          </span>
        );
      case 'branch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <GitFork className="w-3.5 h-3.5" /> Branch
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([dateHeader, items]) => (
        <div key={dateHeader} className="space-y-4">
          {/* Date Group Header */}
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {dateHeader}
            </span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          {/* Timeline Items */}
          <div className="pl-4 border-l-2 border-slate-800 space-y-4 ml-3">
            {items.map((item) => (
              <div key={item.id} className="relative group">
                {/* Timeline Node Dot */}
                <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-400 group-hover:scale-125 transition-transform" />

                <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 transition-all">
                  {/* Top Bar: Time, Type, Developer, Repo & Project */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs text-slate-400 font-bold">{item.formattedTime}</span>
                      {getActivityBadge(item.type)}
                      <div className="flex items-center gap-1.5">
                        <img
                          src={item.developer?.avatarUrl || 'https://github.com/github.png'}
                          alt={item.developer?.login || 'developer'}
                          className="w-5 h-5 rounded-full border border-slate-700 object-cover"
                        />
                        <Link href={`/developers/${item.developer?.id || '#'}`} className="font-bold text-xs text-slate-100 hover:text-blue-400 transition-colors">
                          {item.developer?.name || item.developer?.login || 'System'}
                        </Link>
                      </div>
                    </div>

                    {item.githubItem?.url && (
                      <a
                        href={item.githubItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300 self-start sm:self-auto"
                      >
                        <span>{item.githubItem.label || 'View on GitHub'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                    {item.description && <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>}
                  </div>

                  {/* Footer Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-indigo-400" /> {item.repository.fullName}
                      </span>
                      {item.project && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                          {item.project.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      {item.additions !== undefined && item.deletions !== undefined && (
                        <span className="font-semibold text-emerald-400">
                          +{item.additions} <span className="text-rose-400">-{item.deletions}</span>
                        </span>
                      )}
                      {item.status && (
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-blue-400 border border-slate-800 text-[10px]">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
