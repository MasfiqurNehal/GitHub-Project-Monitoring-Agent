import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface PageLoaderProps {
  message?: string;
  subMessage?: string;
}

export function PageLoader({
  message = 'Fetching engineering telemetry...',
  subMessage = 'Querying database facts and GitHub activity services',
}: PageLoaderProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] p-8 space-y-3 text-center animate-fade-in">
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
        <LoadingSpinner size="lg" color="text-amber-400" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white tracking-tight">{message}</h3>
        {subMessage && <p className="text-xs text-slate-500 mt-1">{subMessage}</p>}
      </div>
    </div>
  );
}
