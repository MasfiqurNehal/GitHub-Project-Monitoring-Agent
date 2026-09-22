import Link from 'next/link';
import { Users, ExternalLink } from 'lucide-react';
import { DeveloperContributionItem } from '../../types';

interface DeveloperOverviewListProps {
  developers: DeveloperContributionItem[];
}

export function DeveloperOverviewList({ developers }: DeveloperOverviewListProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" /> Active Developer Velocity
        </h3>
        <Link href="/developers" className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-medium">
          <span>View Team Performance</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {developers.map((dev) => (
          <div key={dev.id} className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={dev.avatarUrl || 'https://github.com/github.png'}
                alt={dev.login}
                className="w-9 h-9 rounded-full border border-slate-700 object-cover"
              />
              <div>
                <Link href={`/developers/${dev.id}`} className="font-bold text-slate-200 text-xs hover:text-purple-400 transition-colors">
                  @{dev.login}
                </Link>
                <p className="text-[11px] text-slate-400">{dev.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Commits</span>
                <span className="text-slate-200 font-bold">{dev.commits}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">PRs / Reviews</span>
                <span className="text-purple-400 font-bold">{dev.prs} / {dev.reviews}</span>
              </div>
              <div className="text-right font-mono text-[11px]">
                <span className="text-emerald-400">+{dev.linesAdded}</span> / <span className="text-rose-400">-{dev.linesDeleted}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
