'use client';

import React from 'react';
import Link from 'next/link';
import { ProjectWithMetrics } from '../../types';
import { 
  FolderKanban, 
  GitBranch, 
  Users, 
  GitCommit, 
  GitPullRequest, 
  AlertCircle, 
  ArrowRight,
  Clock
} from 'lucide-react';

interface ProjectTableProps {
  projects: ProjectWithMetrics[];
}

export function ProjectTable({ projects }: ProjectTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Paused
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th scope="col" className="py-3.5 px-4">Project Name</th>
              <th scope="col" className="py-3.5 px-4">Status</th>
              <th scope="col" className="py-3.5 px-4 text-center">Repositories</th>
              <th scope="col" className="py-3.5 px-4 text-center">Developers</th>
              <th scope="col" className="py-3.5 px-4 text-center">Commits</th>
              <th scope="col" className="py-3.5 px-4 text-center">PRs</th>
              <th scope="col" className="py-3.5 px-4 text-center">Issues</th>
              <th scope="col" className="py-3.5 px-4">Last Activity</th>
              <th scope="col" className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {projects.map((project) => {
              const metrics = project.metrics || {
                repositoriesCount: project.repositories?.length || 0,
                developersCount: 0,
                commitsCount: 0,
                prsCount: 0,
                issuesCount: 0,
                linesAdded: 0,
                linesDeleted: 0,
                lastActivityAt: project.updatedAt,
              };

              const formattedDate = new Date(metrics.lastActivityAt || project.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <tr key={project.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <div>
                        <Link href={`/projects/${project.id}`} className="font-bold text-slate-100 hover:text-blue-400 transition-colors">
                          {project.name}
                        </Link>
                        <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{project.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">{getStatusBadge(project.status)}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-semibold text-slate-200">{metrics.repositoriesCount}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-semibold text-slate-200">{metrics.developersCount}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-semibold text-slate-200">{metrics.commitsCount}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-semibold text-slate-200">{metrics.prsCount}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-semibold text-slate-200">{metrics.issuesCount}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formattedDate}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/projects/${project.id}`}
                      aria-label={`View details for ${project.name}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-semibold border border-blue-500/30 transition-all"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
