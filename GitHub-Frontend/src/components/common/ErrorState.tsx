import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Unable to Load Data',
  message = 'Failed to fetch analytics from backend service.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="p-8 text-center bg-rose-500/5 border border-rose-500/20 rounded-2xl text-slate-300 space-y-3">
      <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
      <h3 className="font-semibold text-rose-200 text-sm">{title}</h3>
      <p className="text-xs text-slate-400 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      )}
    </div>
  );
}
