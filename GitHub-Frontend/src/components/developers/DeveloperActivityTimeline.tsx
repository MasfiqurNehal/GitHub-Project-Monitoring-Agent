'use client';

import React from 'react';
import { TimelineEvent } from '../../types';
import { 
  GitCommit, 
  GitPullRequest, 
  MessageSquare, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Calendar
} from 'lucide-react';

interface DeveloperActivityTimelineProps {
  events: TimelineEvent[];
}

export function DeveloperActivityTimeline({ events }: DeveloperActivityTimelineProps) {
  // Group events by date (e.g. "22 Sep", "21 Sep", "16 Aug")
  const groupedEvents = events.reduce((acc, event) => {
    const key = event.displayDate || event.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'commit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <GitCommit className="w-3.5 h-3.5" /> Commit
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
            <MessageSquare className="w-3.5 h-3.5" /> Code Review
          </span>
        );
      case 'issue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> Issue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Activity
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" /> Factual Activity Timeline
        </h3>
        <span className="text-[11px] text-slate-400">Chronological activity feed</span>
      </div>

      {Object.keys(groupedEvents).length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          No activity events found for the selected filter parameters.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([dateGroup, dateEvents]) => (
            <div key={dateGroup} className="space-y-4">
              {/* Date Header Header */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  {dateGroup}
                </span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              {/* Timeline Items List */}
              <div className="pl-4 border-l-2 border-slate-800 space-y-4 ml-3">
                {dateEvents.map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-400 group-hover:scale-125 transition-transform" />

                    <div className="bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/80 p-4 rounded-2xl space-y-2 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-slate-400 font-semibold">{item.time}</span>
                          {getEventBadge(item.type)}
                          <span className="text-[11px] font-mono text-slate-400">{item.repoName}</span>
                        </div>

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-white transition-colors self-start sm:self-auto"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <p className="text-xs font-bold text-slate-100">{item.title}</p>

                      <div className="flex items-center gap-3 text-[11px]">
                        {item.additions !== undefined && item.deletions !== undefined && (
                          <span className="font-mono font-semibold text-emerald-400">
                            +{item.additions} <span className="text-rose-400">-{item.deletions}</span>
                          </span>
                        )}

                        {item.status && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-blue-400 border border-slate-800 font-mono text-[10px]">
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
