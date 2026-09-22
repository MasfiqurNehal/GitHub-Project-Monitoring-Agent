import Link from 'next/link';
import { Activity, GitCommit, GitPullRequest, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { RecentActivityItem } from '../../types';

interface RecentActivityFeedProps {
  activity: RecentActivityItem[];
}

export function RecentActivityFeed({ activity }: RecentActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'commit':
        return <GitCommit className="w-4 h-4 text-emerald-400" />;
      case 'pull_request':
        return <GitPullRequest className="w-4 h-4 text-purple-400" />;
      case 'review':
        return <ShieldCheck className="w-4 h-4 text-indigo-400" />;
      case 'issue':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" /> Recent Activity Stream
        </h3>
        <Link href="/activity" className="text-xs text-blue-400 hover:underline font-medium">
          View Full Stream
        </Link>
      </div>

      <div className="space-y-3">
        {activity.map((act) => (
          <div key={act.id} className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-start space-x-3 text-xs">
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 shrink-0">
              {getIcon(act.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 truncate">{act.title}</span>
                <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {act.timeAgo}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                <span className="font-mono text-slate-300">{act.repoName}</span>
                <span>•</span>
                <span>@{act.author}</span>
                {act.details && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono">{act.details}</span>
                  </>
                )}
                {act.status && (
                  <span className="ml-auto px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-semibold">
                    {act.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
