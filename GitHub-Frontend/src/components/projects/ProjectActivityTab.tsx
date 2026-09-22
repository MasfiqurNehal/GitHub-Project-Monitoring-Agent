'use client';

import React, { useState } from 'react';
import { RecentActivityItem } from '../../types';
import { Activity, Clock, GitCommit, GitPullRequest, MessageSquare, AlertCircle } from 'lucide-react';

interface ProjectActivityTabProps {
  activity: RecentActivityItem[];
}

export function ProjectActivityTab({ activity }: ProjectActivityTabProps) {
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = filterType === 'all' 
    ? activity 
    : activity.filter((act) => act.type === filterType);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit':
        return <GitCommit className="w-4 h-4 text-emerald-400" />;
      case 'pull_request':
        return <GitPullRequest className="w-4 h-4 text-amber-400" />;
      case 'review':
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'issue':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" /> Project Activity Stream
        </h3>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          {['all', 'commit', 'pull_request', 'review', 'issue'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-lg capitalize text-[11px] font-medium transition-all ${
                filterType === type
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-6 text-center">No activity events found for the selected filter.</p>
        ) : (
          filtered.map((act) => (
            <div key={act.id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                {getActivityIcon(act.type)}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{act.author}</span>
                  <span className="text-slate-500 text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {act.timeAgo}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium">{act.title}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="font-mono text-slate-400">{act.repoName}</span>
                  {act.details && <span className="font-mono text-emerald-400 text-[10px]">{act.details}</span>}
                  {act.status && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-mono text-[10px]">
                      {act.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
