'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RetryButtonProps {
  onRetry: () => void;
  label?: string;
  isRetrying?: boolean;
  className?: string;
}

export function RetryButton({
  onRetry,
  label = 'Retry Loading',
  isRetrying = false,
  className = '',
}: RetryButtonProps) {
  return (
    <button
      onClick={onRetry}
      disabled={isRetrying}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50 ${className}`}
    >
      <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRetrying ? 'animate-spin' : ''}`} />
      <span>{isRetrying ? 'Retrying...' : label}</span>
    </button>
  );
}
