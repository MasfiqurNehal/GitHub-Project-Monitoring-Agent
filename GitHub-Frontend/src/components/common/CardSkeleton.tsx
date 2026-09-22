import React from 'react';

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 6 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-800 rounded w-1/3" />
            <div className="h-4 bg-slate-800 rounded-full w-1/4" />
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-800/80 rounded w-full" />
          </div>
          <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center">
            <div className="h-4 bg-slate-800 rounded w-1/4" />
            <div className="h-7 bg-slate-800 rounded-xl w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
