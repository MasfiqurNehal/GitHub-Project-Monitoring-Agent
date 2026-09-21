'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/navigation/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { fetchDevelopers } from '../../lib/api-client';
import { Users, GitCommit, GitPullRequest, Code2, ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function DevelopersPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const { data: developersData } = useQuery({
    queryKey: ['developers-list'],
    queryFn: fetchDevelopers,
  });

  const developers = developersData?.data || [];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> Engineering Team Performance
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Factual engineering output metrics across commits, pull requests, and peer code reviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {developers.map((dev: any) => (
            <Link
              key={dev.id}
              href={`/developers/${dev.id}`}
              className="bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 p-5 rounded-2xl transition-all hover:shadow-lg space-y-4 group"
            >
              <div className="flex items-center space-x-3">
                <img
                  src={dev.avatarUrl || 'https://github.com/github.png'}
                  alt={dev.login}
                  className="w-12 h-12 rounded-full border border-slate-700 object-cover"
                />
                <div>
                  <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">@{dev.login}</h3>
                  <p className="text-xs text-slate-400">{dev.name || 'GitHub Contributor'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Commits</span>
                  <div className="font-bold text-slate-200 text-sm">{dev._count?.commits || 0}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">PRs</span>
                  <div className="font-bold text-slate-200 text-sm">{dev._count?.pullRequests || 0}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Reviews</span>
                  <div className="font-bold text-slate-200 text-sm">{dev._count?.reviews || 0}</div>
                </div>
              </div>
            </Link>
          ))}

          {developers.length === 0 && (
            <div className="col-span-full p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500 text-sm">
              No developer activity recorded yet. Connect a repository to sync commits and contributors.
            </div>
          )}
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
