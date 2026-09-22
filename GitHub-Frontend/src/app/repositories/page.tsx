'use client';

import { useState } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useRepositories } from '../../hooks/use-repositories';
import { GitBranch, ExternalLink, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';

export default function RepositoriesPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { repositories, isLoading, syncRepository, refetch } = useRepositories();

  const filteredRepos = repositories.filter(
    (repo) =>
      repo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repo.language && repo.language.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSync = async (repoId: string) => {
    setSyncingId(repoId);
    try {
      await syncRepository(repoId);
      await refetch();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-blue-400" /> Monitored GitHub Repositories
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Read-only synchronized GitHub codebases across all monitoring project groups.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search repository..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 flex-1"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading repositories..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRepos.map((repo) => (
              <div
                key={repo.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl space-y-4 flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-medium">
                      {repo.language || 'Codebase'}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Read-Only
                    </span>
                  </div>

                  <Link href={`/repositories/${repo.id}`} className="mt-3 block group">
                    <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors truncate">
                      {repo.fullName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Default Branch: {repo.defaultBranch}</p>
                  </Link>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">
                    Synced: {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleTimeString() : 'Never'}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSync(repo.id)}
                      disabled={syncingId === repo.id}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-40"
                      title="Trigger Sync"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingId === repo.id ? 'animate-spin text-blue-400' : ''}`} />
                    </button>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}

            {filteredRepos.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="No Repositories Found"
                  description={`No repositories found matching "${searchTerm}". Connect repositories from the Projects page.`}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
