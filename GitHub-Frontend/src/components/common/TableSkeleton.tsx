import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-pulse">
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between gap-4">
        {Array.from({ length: columns }).map((_, cIdx) => (
          <div key={cIdx} className="h-4 bg-slate-800 rounded w-1/6" />
        ))}
      </div>

      <div className="divide-y divide-slate-800/60 p-4 space-y-4">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center justify-between gap-4 pt-3">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div key={cIdx} className="h-4 bg-slate-800/80 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
