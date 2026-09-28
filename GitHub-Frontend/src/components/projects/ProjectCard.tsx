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
  Clock, 
  ArrowRight,
  Trash2
} from 'lucide-react';

interface ProjectCardProps {
  project: ProjectWithMetrics;
  onDeleteProject?: (project: ProjectWithMetrics) => void;
}

export function ProjectCard({ project, onDeleteProject }: ProjectCardProps) {
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
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group shadow-lg shadow-black/20">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <Link 
                href={`/projects/${project.id}`}
                className="text-base font-bold text-slate-100 hover:text-blue-400 transition-colors line-clamp-1"
              >
                {project.name}
              </Link>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Last active: {formattedDate}</span>
              </div>
            </div>
          </div>
          <div>{getStatusBadge(project.status)}</div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] leading-relaxed">
          {project.description || 'No project description available.'}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="my-4 py-3 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80 grid grid-cols-5 gap-2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <GitBranch className="w-3 h-3 text-blue-400" /> Repos
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.repositoriesCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800/60">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <Users className="w-3 h-3 text-purple-400" /> Devs
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.developersCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800/60">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <GitCommit className="w-3 h-3 text-emerald-400" /> Commits
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.commitsCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800/60">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <GitPullRequest className="w-3 h-3 text-amber-400" /> PRs
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.prsCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800/60">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3 text-rose-400" /> Issues
          </span>
          <span className="text-xs font-semibold text-slate-200 mt-0.5">{metrics.issuesCount}</span>
        </div>
      </div>

      {/* Repositories Snippet */}
      {project.repositories && project.repositories.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Connected Repositories ({project.repositories.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {project.repositories.slice(0, 3).map((repo) => (
              <span
                key={repo.id}
                className="px-2 py-0.5 bg-slate-800/80 text-slate-300 border border-slate-700/60 rounded-md text-[11px] font-mono flex items-center gap-1"
              >
                <GitBranch className="w-2.5 h-2.5 text-blue-400" />
                {repo.name}
              </span>
            ))}
            {project.repositories.length > 3 && (
              <span className="px-2 py-0.5 bg-slate-800/40 text-slate-400 text-[10px] rounded-md">
                +{project.repositories.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {onDeleteProject ? (
          <button
            onClick={() => onDeleteProject(project)}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-medium rounded-xl border border-rose-500/20 flex items-center gap-1.5 transition-colors"
            title="Delete Project"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        ) : (
          <div />
        )}

        <Link
          href={`/projects/${project.id}`}
          className="px-4 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/20 ml-auto"
        >
          <span>View Project</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
