import Link from 'next/link';
import { DeveloperContributionItem } from '../../types';
import { Users, GitCommit, GitPullRequest, MessageSquare, FileCode } from 'lucide-react';

interface ProjectDevelopersTabProps {
  developers: DeveloperContributionItem[];
}

export function ProjectDevelopersTab({ developers }: ProjectDevelopersTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Users className="w-4 h-4 text-purple-400" /> Active Developers ({developers.length})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {developers.map((dev) => (
          <Link 
            key={dev.id} 
            href={`/developers/${dev.id}`}
            className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-4 transition-all group block"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm overflow-hidden group-hover:border-purple-500/50 transition-colors">
                {dev.avatarUrl ? (
                  <img src={dev.avatarUrl} alt={dev.login} className="w-full h-full object-cover" />
                ) : (
                  dev.name ? dev.name[0] : dev.login[0].toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{dev.name || dev.login}</h4>
                <p className="text-[11px] text-slate-400">@{dev.login}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
                  <GitCommit className="w-3 h-3 text-emerald-400" /> Commits
                </span>
                <p className="text-xs font-bold text-white mt-0.5">{dev.commits}</p>
              </div>
              <div className="border-l border-slate-800">
                <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
                  <GitPullRequest className="w-3 h-3 text-amber-400" /> PRs
                </span>
                <p className="text-xs font-bold text-white mt-0.5">{dev.prs}</p>
              </div>
              <div className="border-l border-slate-800">
                <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3 text-purple-400" /> Reviews
                </span>
                <p className="text-xs font-bold text-white mt-0.5">{dev.reviews}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span className="flex items-center gap-1 text-[11px]">
                <FileCode className="w-3.5 h-3.5 text-slate-500" /> Code Impact:
              </span>
              <span className="font-mono text-[11px] font-semibold text-emerald-400">
                +{dev.linesAdded.toLocaleString()} <span className="text-rose-400">-{dev.linesDeleted.toLocaleString()}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
