import { FolderSearch } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'No Data Found',
  description = 'There are no records available for the current filter criteria.',
  action,
}: EmptyStateProps) {
  return (
    <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
      <FolderSearch className="w-10 h-10 text-slate-600 mx-auto" />
      <h3 className="font-semibold text-slate-200 text-sm">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mx-auto">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
