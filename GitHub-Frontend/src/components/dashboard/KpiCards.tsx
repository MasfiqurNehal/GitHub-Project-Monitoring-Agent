import {
  FolderKanban,
  GitBranch,
  Users,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertCircle,
  Code2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { DashboardKPI } from '../../types';

interface KpiCardsProps {
  kpi: DashboardKPI;
}

export function KpiCards({ kpi }: KpiCardsProps) {
  const cards = [
    {
      title: 'Monitored Projects',
      value: kpi.totalProjects,
      subtext: `${kpi.totalRepositories} connected repositories`,
      icon: FolderKanban,
      color: 'text-blue-400',
      bg: 'bg-blue-600/10 border-blue-500/20',
    },
    {
      title: 'Connected Repositories',
      value: kpi.totalRepositories,
      subtext: 'Active synchronization',
      icon: GitBranch,
      color: 'text-indigo-400',
      bg: 'bg-indigo-600/10 border-indigo-500/20',
    },
    {
      title: 'Active Developers',
      value: kpi.activeDevelopers,
      subtext: `${kpi.totalReviews} reviews completed`,
      icon: Users,
      color: 'text-purple-400',
      bg: 'bg-purple-600/10 border-purple-500/20',
    },
    {
      title: 'Total Commits',
      value: kpi.totalCommits,
      subtext: `+${kpi.linesAdded} / -${kpi.linesDeleted} lines`,
      icon: GitCommit,
      color: 'text-emerald-400',
      bg: 'bg-emerald-600/10 border-emerald-500/20',
    },
    {
      title: 'Pull Requests',
      value: kpi.totalPRs,
      subtext: `${kpi.mergedPRs} merged / ${kpi.openPRs} open`,
      icon: GitPullRequest,
      color: 'text-purple-400',
      bg: 'bg-purple-600/10 border-purple-500/20',
    },
    {
      title: 'PRs Merged',
      value: kpi.mergedPRs,
      subtext: 'Merged into default branches',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-600/10 border-emerald-500/20',
    },
    {
      title: 'Open PRs',
      value: kpi.openPRs,
      subtext: 'Pending code review',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-600/10 border-amber-500/20',
    },
    {
      title: 'Issues Opened',
      value: kpi.issuesOpened,
      subtext: 'Logged across repositories',
      icon: AlertCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-600/10 border-rose-500/20',
    },
    {
      title: 'Issues Closed',
      value: kpi.issuesClosed,
      subtext: 'Resolved engineering bugs',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-600/10 border-emerald-500/20',
    },
    {
      title: 'Code Added',
      value: `+${kpi.linesAdded.toLocaleString()}`,
      subtext: 'Lines of code added',
      icon: Code2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-600/10 border-emerald-500/20',
    },
    {
      title: 'Code Removed',
      value: `-${kpi.linesDeleted.toLocaleString()}`,
      subtext: 'Lines of code refactored',
      icon: Code2,
      color: 'text-rose-400',
      bg: 'bg-rose-600/10 border-rose-500/20',
    },
    {
      title: 'PR Reviews',
      value: kpi.totalReviews,
      subtext: 'Peer review approvals',
      icon: ShieldCheck,
      color: 'text-cyan-400',
      bg: 'bg-cyan-600/10 border-cyan-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{card.title}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.bg} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
