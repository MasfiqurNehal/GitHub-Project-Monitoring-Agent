'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '../../../components/layout/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { useRepositoryDetail } from '../../../hooks/use-repositories';
import { RepositoryTabs } from '../../../components/repositories/RepositoryTabs';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { 
  GitBranch, 
  ArrowLeft, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  Globe, 
  FolderKanban,
  Clock
} from 'lucide-react';

export default function RepositoryDetailPage({ params }: { params: { repositoryId: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { repositoryDetail, isLoading, isError, refetch, syncRepository, isSyncing: isHookSyncing } = useRepositoryDetail(params.repositoryId);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (syncRepository) {
        await syncRepository(params.repositoryId);
      }
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex items-center justify-center">
          <LoadingState message="Fetching repository engineering data and telemetry..." />
        </main>
      </div>
    );
  }

  if (isError || !repositoryDetail) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <Link href="/repositories" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Repositories</span>
          </Link>
          <ErrorState
            title="Failed to Load Repository"
            message="Could not find or retrieve engineering data for the requested repository."
            onRetry={() => refetch()}
          />
        </main>
      </div>
    );
  }

  const { repository } = repositoryDetail;
  const metrics = repository.metrics;

  const formattedSynced = repository.lastSyncedAt
    ? new Date(repository.lastSyncedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Navigation Breadcrumb */}
        <Link 
          href="/repositories" 
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Repositories</span>
        </Link>

        {/* Repository Header Banner */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <GitBranch className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">{repository.name}</h1>
                
                {/* Visibility Badge */}
                {repository.isPrivate ? (
                  <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[11px] font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Private
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-[11px] font-medium flex items-center gap-1">
                    <Globe className="w-3 h-3 text-blue-400" /> Public
                  </span>
                )}

                {/* Language Badge */}
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[11px] font-mono">
                  {repository.language || 'Codebase'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="font-mono text-slate-300">
                  {repository.owner} / <span className="font-semibold text-white">{repository.name}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                  {repository.project ? (
                    <Link href={`/projects/${repository.project.id}`} className="text-blue-400 hover:underline font-semibold">
                      {repository.project.name}
                    </Link>
                  ) : (
                    <span className="text-slate-500 italic">Unassigned</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Synced: {formattedSynced}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Enforced Read-Only
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Repository'}</span>
            </button>
            <a
              href={repository.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-900/20"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Tabbed View Modules */}
        <RepositoryTabs detail={repositoryDetail} />
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
