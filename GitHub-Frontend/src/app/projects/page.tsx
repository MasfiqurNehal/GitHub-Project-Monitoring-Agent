'use client';

import { useState } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useProjects } from '../../hooks/use-projects';
import { FolderKanban, Plus, GitBranch, ExternalLink } from 'lucide-react';
import { LoadingState } from '../../components/common/LoadingState';

export default function ProjectsPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');

  const { projects, isLoading, createProject, isCreating, connectRepo, isConnecting } = useProjects();

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await createProject({ name: newProjectName, description: newProjectDesc });
      setNewProjectName('');
      setNewProjectDesc('');
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleConnectRepo = async (projectId: string) => {
    if (!repoOwner.trim() || !repoName.trim()) return;
    try {
      await connectRepo({ projectId, owner: repoOwner, name: repoName });
      setRepoOwner('');
      setRepoName('');
      setSelectedProjectId(null);
    } catch (err) {
      console.error('Failed to connect repo:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-blue-400" /> Monitoring Projects
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Group your GitHub repositories into logical projects for engineering analytics.
            </p>
          </div>
        </div>

        {/* Create Project Form */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Create New Monitoring Group</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Project Name (e.g. BeyondAI)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />
            <input
              type="text"
              placeholder="Description (Optional)"
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />
            <button
              onClick={handleCreateProject}
              disabled={!newProjectName || isCreating}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl px-4 py-2 flex items-center justify-center space-x-2 transition-all disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'Creating...' : 'Create Project'}</span>
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <LoadingState message="Loading projects..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{project.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{project.description || 'No description provided'}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-medium">
                    {project.status}
                  </span>
                </div>

                {/* Connected Repositories */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Connected Repositories</span>
                  {project.repositories && project.repositories.length > 0 ? (
                    <div className="space-y-2">
                      {project.repositories.map((repo) => (
                        <div key={repo.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <GitBranch className="w-4 h-4 text-blue-400" />
                            <div>
                              <span className="text-xs font-semibold text-slate-200">{repo.fullName}</span>
                              <span className="text-[10px] text-slate-400 ml-2">Branch: {repo.defaultBranch}</span>
                            </div>
                          </div>
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No repositories connected yet.</p>
                  )}
                </div>

                {/* Connect Repository Controls */}
                {selectedProjectId === project.id ? (
                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-blue-500/30 space-y-3">
                    <h4 className="text-xs font-semibold text-blue-400">Connect GitHub Repository</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Owner (e.g. facebook)"
                        value={repoOwner}
                        onChange={(e) => setRepoOwner(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Repository (e.g. react)"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleConnectRepo(project.id)}
                        disabled={!repoOwner || !repoName || isConnecting}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded-lg font-medium transition-colors"
                      >
                        {isConnecting ? 'Connecting...' : 'Start Connection & Sync'}
                      </button>
                      <button
                        onClick={() => setSelectedProjectId(null)}
                        className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedProjectId(project.id)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl text-xs font-medium text-slate-300 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Connect Repository</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
