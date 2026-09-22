import React from 'react';

export function ChartSkeleton() {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="h-4 bg-slate-800 rounded w-1/6" />
      </div>

      <div className="h-64 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-end justify-between p-6 gap-2">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-slate-800 rounded-t w-full"
            style={{ height: `${Math.floor(Math.random() * 60) + 30}%` }}
          />
        ))}
      </div>
    </div>
  );
}
