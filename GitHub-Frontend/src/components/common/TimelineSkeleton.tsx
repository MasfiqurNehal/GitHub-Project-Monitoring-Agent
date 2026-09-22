import React from 'react';

interface TimelineSkeletonProps {
  count?: number;
}

export function TimelineSkeleton({ count = 4 }: TimelineSkeletonProps) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex items-start gap-4 pl-4">
          <div className="w-4 h-4 rounded-full bg-slate-800 shrink-0 mt-1" />
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex-1 space-y-2 shadow-sm">
            <div className="flex justify-between">
              <div className="h-4 bg-slate-800 rounded w-1/2" />
              <div className="h-3 bg-slate-800/80 rounded w-1/6" />
            </div>
            <div className="h-3 bg-slate-800/60 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
