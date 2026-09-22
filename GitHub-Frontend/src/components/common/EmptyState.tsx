import React from 'react';
import { FolderSearch, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title = 'No Records Found',
  description = 'There are no items matching the selected filters or date range.',
  icon: Icon = FolderSearch,
  action,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 space-y-3 shadow-xl ${className}`}>
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl w-fit mx-auto">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
      <div>
        <h3 className="font-bold text-slate-200 text-sm tracking-tight">{title}</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">{description}</p>
      </div>

      {action ? (
        <div className="pt-2">{action}</div>
      ) : actionLabel && onAction ? (
        <div className="pt-2">
          <button
            onClick={onAction}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
