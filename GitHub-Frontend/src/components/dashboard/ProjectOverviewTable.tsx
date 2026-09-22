import Link from 'next/link';
import { FolderKanban, ExternalLink } from 'lucide-react';
import { ProjectOverviewItem } from '../../types';

interface ProjectOverviewTableProps {
  projects: ProjectOverviewItem[];
}

export function ProjectOverviewTable({ projects }: ProjectOverviewTableProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-blue-400" /> Monitored Project Overview
        </h3>
        <Link href="/projects" className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium">
          <span>View All Projects</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Project Name</th>
              <th className="px-4 py-3">Repositories</th>
              <th className="px-4 py-3">Commits</th>
              <th className="px-4 py-3">Pull Requests</th>
              <th className="px-4 py-3">Issues</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {projects.map((proj) => (
              <tr key={proj.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3.5">
                  <Link href={`/projects/${proj.id}`} className="font-semibold text-slate-200 hover:text-blue-400 transition-colors">
                    {proj.name}
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-slate-300 font-medium">{proj.repositoriesCount} repos</td>
                <td className="px-4 py-3.5 text-slate-300 font-medium">{proj.commitsCount} commits</td>
                <td className="px-4 py-3.5 text-slate-300 font-medium">{proj.prsCount} PRs</td>
                <td className="px-4 py-3.5 text-slate-300 font-medium">{proj.issuesCount} issues</td>
                <td className="px-4 py-3.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {proj.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
