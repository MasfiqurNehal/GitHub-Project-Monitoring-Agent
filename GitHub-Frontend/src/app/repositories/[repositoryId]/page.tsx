'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../../components/navigation/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { fetchRepositoryDetails, triggerRepositorySync } from '../../../lib/api-client';
import { GitBranch, ArrowLeft, RefreshCw, ExternalLink, ShieldCheck, Code2, Users } from 'lucide-react';
import Link from 'next/link';

export default function RepositoryDetailPage({ params }: { params: { repositoryId: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: repoData, isLoading, refetch } = useQuery({
    queryKey: ['repository-detail', params.repositoryId],
    queryFn: () => fetchRepositoryDetails(params.repositoryId),
  });

  const repo = repoData?.data;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await triggerRepositorySync(params.repositoryId);
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading || !repo) {
    return (
      <div className="flex-1 min-h-screen bg-slate-950 p-8 flex items-center justify-center text-slate-400 text-xs">
        Loading repository details...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <Link href="/repositories" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Repositories</span>
        </Link>

        {/* Repository Header */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">{repo.fullName}</h1>
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px]">
                  {repo.language || 'Codebase'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Default Branch: {repo.defaultBranch}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Repository'}</span>
            </button>
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl transition-colors"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Repository Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400">Monitoring Mode</span>
            <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Enforced Read-Only
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400">Last Synced</span>
            <div className="text-sm font-bold text-white mt-1">
              {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleString() : 'Never'}
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400">Active Branch</span>
            <div className="text-sm font-bold text-blue-400 mt-1">{repo.defaultBranch}</div>
          </div>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
