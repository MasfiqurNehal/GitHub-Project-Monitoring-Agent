import Link from 'next/link';
import { GitBranch, ExternalLink, ShieldCheck } from 'lucide-react';
import { RepositoryOverviewItem } from '../../types';

interface RepositoryOverviewGridProps {
  repositories: RepositoryOverviewItem[];
}

export function RepositoryOverviewGrid({ repositories }: RepositoryOverviewGridProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-indigo-400" /> Connected Repository Overview
        </h3>
        <Link href="/repositories" className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-medium">
          <span>View All Repositories</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {repositories.map((repo) => (
          <div key={repo.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 space-y-3">
            <div className="flex items-center justify-between">
              <Link href={`/repositories/${repo.id}`} className="font-bold text-slate-200 text-xs hover:text-indigo-400 transition-colors truncate">
                {repo.fullName}
              </Link>
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-medium">
                {repo.language || 'Codebase'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-slate-900/60 p-2 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Commits</span>
                <span className="font-bold text-slate-200">{repo.commitsCount}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Open PRs</span>
                <span className="font-bold text-purple-400">{repo.openPRsCount}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Issues</span>
                <span className="font-bold text-amber-400">{repo.issuesCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
