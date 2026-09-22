import { FolderKanban, GitCommit, GitPullRequest, Users, GitBranch, Code2, ShieldCheck } from 'lucide-react';
import { DashboardKPI } from '../../types';

interface KpiCardsProps {
  kpi: DashboardKPI;
}

export function KpiCards({ kpi }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monitored Projects</span>
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <FolderKanban className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-white tracking-tight">{kpi.totalProjects}</div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-blue-400" /> {kpi.totalRepositories} connected repositories
          </p>
        </div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Commits</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <GitCommit className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-white tracking-tight">{kpi.totalCommits}</div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Code2 className="w-3 h-3 text-emerald-400" /> +{kpi.linesAdded} / -{kpi.linesDeleted} lines
          </p>
        </div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pull Requests</span>
          <div className="w-9 h-9 rounded-xl bg-purple-600/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <GitPullRequest className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-white tracking-tight">{kpi.totalPRs}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-medium">{kpi.mergedPRs} merged</span> · <span className="text-purple-400">{kpi.openPRs} open</span>
          </p>
        </div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Engineering Team</span>
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-white tracking-tight">{kpi.activeDevelopers}</div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-indigo-400" /> {kpi.totalReviews} PR reviews completed
          </p>
        </div>
      </div>
    </div>
  );
}
