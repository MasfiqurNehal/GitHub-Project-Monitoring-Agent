'use client';

import React, { useState, useMemo } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useProjects } from '../../hooks/use-projects';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { ProjectTable } from '../../components/projects/ProjectTable';
import { CreateProjectModal } from '../../components/projects/CreateProjectModal';
import { DeleteProjectModal } from '../../components/projects/DeleteProjectModal';
import { DateRangeFilter } from '../../components/filters/DateRangeFilter';
import { LoadingState } from '../../components/common/LoadingState';
import { DateRangePreset, ProjectWithMetrics } from '../../types';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  GitBranch, 
  Users, 
  GitCommit, 
  GitPullRequest, 
  AlertCircle 
} from 'lucide-react';

export default function ProjectsPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<ProjectWithMetrics | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const { projects, isLoading, createProject, isCreating, deleteProject, isDeleting } = useProjects();

  const handleCreateProject = async (name: string, description?: string) => {
    try {
      await createProject({ name, description });
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string, password: string) => {
    await deleteProject({ projectId, password });
    setDeletingProject(null);
  };

  // Filter projects by Search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects as ProjectWithMetrics[];
    const q = searchQuery.toLowerCase();
    return (projects as ProjectWithMetrics[]).filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  // Aggregate project statistics
  const stats = useMemo(() => {
    let repos = 0;
    let devs = 0;
    let commits = 0;
    let prs = 0;
    let issues = 0;

    (projects as ProjectWithMetrics[]).forEach((p) => {
      const m = p.metrics || {
        repositoriesCount: p.repositories?.length || 0,
        developersCount: 0,
        commitsCount: 0,
        prsCount: 0,
        issuesCount: 0,
      };
      repos += m.repositoriesCount;
      devs += m.developersCount;
      commits += m.commitsCount;
      prs += m.prsCount;
      issues += m.issuesCount;
    });

    return { totalProjects: projects.length, repos, devs, commits, prs, issues };
  }, [projects]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Title & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <FolderKanban className="w-6 h-6 text-blue-400" /> Projects Management
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Monitor software engineering projects, repositories, code velocity, and developer activity.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Global Summary KPI Banner */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 py-3 px-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Projects</span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.totalProjects}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-blue-400" /> Repositories
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.repos}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" /> Developers
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.devs}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitCommit className="w-3 h-3 text-emerald-400" /> Commits
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.commits}</span>
          </div>
          <div className="flex flex-col items-center border-r border-slate-800/80 pr-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <GitPullRequest className="w-3 h-3 text-amber-400" /> Pull Requests
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.prs}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-400" /> Open Issues
            </span>
            <span className="text-lg font-bold text-white mt-0.5">{stats.issues}</span>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search projects by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Date Range & View Mode Switcher */}
          <div className="flex items-center gap-3">
            <DateRangeFilter
              preset={datePreset}
              from={fromDate}
              to={toDate}
              onPresetChange={(preset) => setDatePreset(preset)}
              onCustomDateChange={(from, to) => {
                setFromDate(from || '');
                setToDate(to || '');
              }}
            />

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Projects View: Grid or Table */}
        {isLoading ? (
          <LoadingState message="Loading engineering projects..." />
        ) : filteredProjects.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Projects Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery ? `No projects matching "${searchQuery}".` : 'Get started by creating your first software monitoring project.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDeleteProject={(p) => setDeletingProject(p)}
              />
            ))}
          </div>
        ) : (
          <ProjectTable 
            projects={filteredProjects} 
            onDeleteProject={(p) => setDeletingProject(p)}
          />
        )}
      </main>

      {/* Modal Dialog for Project Creation */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
        isCreating={isCreating}
      />

      {/* Modal Dialog for Secure Project Deletion */}
      <DeleteProjectModal
        isOpen={!!deletingProject}
        project={deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirmDelete={handleDeleteProject}
        isDeleting={isDeleting}
      />

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
