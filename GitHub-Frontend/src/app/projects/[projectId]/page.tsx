'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../../components/navigation/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { fetchProjectDetails } from '../../../lib/api-client';
import { FolderKanban, ArrowLeft, GitBranch, ExternalLink, ShieldCheck, Layers } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project-detail', params.projectId],
    queryFn: () => fetchProjectDetails(params.projectId),
  });

  const project = projectData?.data;

  if (isLoading || !project) {
    return (
      <div className="flex-1 min-h-screen bg-slate-950 p-8 flex items-center justify-center text-slate-400 text-xs">
        Loading project details...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <Link href="/projects" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>

        {/* Project Header */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{project.description || 'No description provided'}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
            {project.status}
          </span>
        </div>

        {/* Repositories List */}
        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="font-semibold text-white text-sm">Repositories in Monitoring Group</h2>
          {project.repositories && project.repositories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.repositories.map((repo: any) => (
                <div key={repo.id} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GitBranch className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-200">{repo.fullName}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Branch: {repo.defaultBranch}</p>
                    </div>
                  </div>
                  <Link href={`/repositories/${repo.id}`} className="text-xs text-blue-400 hover:underline">
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No repositories attached to this project.</p>
          )}
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
