'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '../../../components/layout/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { useProjectDetail } from '../../../hooks/use-projects';
import { ProjectTabs } from '../../../components/projects/ProjectTabs';
import { ConnectRepositoryModal } from '../../../components/projects/ConnectRepositoryModal';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { 
  FolderKanban, 
  ArrowLeft, 
  Clock, 
  GitBranch, 
  Users, 
  GitCommit, 
  GitPullRequest, 
  AlertCircle,
  Plus,
  Bot
} from 'lucide-react';

import { DateRangeFilter } from '../../../components/filters/DateRangeFilter';
import { DateRangePreset } from '../../../types';

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [preset, setPreset] = useState<DateRangePreset>('7d');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const {
    projectDetail,
    isLoading,
    isError,
    refetch,
    connectRepo,
    isConnecting,
    disconnectRepo,
    isDisconnecting,
  } = useProjectDetail(params.projectId, { preset, from, to });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex items-center justify-center">
          <LoadingState message="Fetching project engineering metrics and details..." />
        </main>
      </div>
    );
  }

  if (isError || !projectDetail) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <Link href="/projects" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </Link>
          <ErrorState
            title="Failed to Load Project Details"
            message="Could not find or retrieve engineering data for the requested project."
            onRetry={() => refetch()}
          />
        </main>
      </div>
    );
  }

  const { project } = projectDetail;
  const metrics = project.metrics;

  const formattedDate = new Date(metrics.lastActivityAt || project.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleConnectRepo = async (payload: { repositoryId?: string; repositoryUrl?: string; nameOrDescription?: string }) => {
    await connectRepo(payload);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Navigation Breadcrumb */}
        <Link 
          href="/projects" 
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>

        {/* Project Header Banner */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <FolderKanban className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight">{project.name}</h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-medium">
                  {project.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {project.description || 'No description provided for this monitoring group.'}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Last activity: {formattedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Header Action & Quick Metrics Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            <Link
              href={`/ai?projectId=${project.id}&projectName=${encodeURIComponent(project.name)}`}
              className="px-4 py-2.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
              title="Analyze this project with Engineering AI Agent"
            >
              <Bot className="w-4 h-4" />
              <span>Ask Agent</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Repository</span>
            </button>

            <div className="flex items-center gap-3 py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-blue-400" /> Repos
                </span>
                <span className="text-sm font-bold text-white mt-0.5 block">{metrics.repositoriesCount}</span>
              </div>
              <div className="text-center px-2 border-l border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-400" /> Devs
                </span>
                <span className="text-sm font-bold text-white mt-0.5 block">{metrics.developersCount}</span>
              </div>
              <div className="text-center px-2 border-l border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <GitCommit className="w-3 h-3 text-emerald-400" /> Commits
                </span>
                <span className="text-sm font-bold text-white mt-0.5 block">{metrics.commitsCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Date Filter Control Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl shadow-lg">
          <span className="text-xs text-slate-400 font-semibold px-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" /> Date Range Filter:
          </span>
          <DateRangeFilter
            preset={preset}
            from={from}
            to={to}
            onPresetChange={(newPreset) => setPreset(newPreset)}
            onCustomDateChange={(newFrom, newTo) => {
              setFrom(newFrom || '');
              setTo(newTo || '');
            }}
          />
        </div>

        {/* Tabbed View Modules */}
        <ProjectTabs
          detail={projectDetail}
          onConnectRepo={() => setIsConnectModalOpen(true)}
          onDisconnectRepo={disconnectRepo}
          isDisconnecting={isDisconnecting}
        />
      </main>

      <ConnectRepositoryModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        projectId={params.projectId}
        onConnect={handleConnectRepo}
        isConnecting={isConnecting}
      />

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
