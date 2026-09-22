'use client';

import React from 'react';
import { AlertCircle, LucideIcon } from 'lucide-react';
import { RetryButton } from './RetryButton';

interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: LucideIcon;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Unable to Load Data',
  message = 'Failed to fetch telemetry metrics from backend service.',
  icon: Icon = AlertCircle,
  onRetry,
  isRetrying = false,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`p-8 text-center bg-rose-500/5 border border-rose-500/20 rounded-2xl text-slate-300 space-y-4 shadow-xl ${className}`}>
      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl w-fit mx-auto">
        <Icon className="w-8 h-8 text-rose-400" />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-rose-200 text-sm tracking-tight">{title}</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <RetryButton onRetry={onRetry} isRetrying={isRetrying} />
        </div>
      )}
    </div>
  );
}
