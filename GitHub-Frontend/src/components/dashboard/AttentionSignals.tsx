import { AlertTriangle } from 'lucide-react';
import { EngineeringSignals } from '../../types';

interface AttentionSignalsProps {
  signals: EngineeringSignals;
}

export function AttentionSignals({ signals }: AttentionSignalsProps) {
  const hasInactive = signals.inactiveRepositories && signals.inactiveRepositories.length > 0;
  const hasStale = signals.stalePullRequests && signals.stalePullRequests.length > 0;

  if (!hasInactive && !hasStale) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between text-xs">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold text-amber-300">Engineering Attention Signals:</span>
          <span className="text-amber-200/80 ml-2">
            {signals.inactiveRepositories?.length || 0} inactive repositories, {signals.stalePullRequests?.length || 0} pull requests awaiting review over 7 days.
          </span>
        </div>
      </div>
    </div>
  );
}
