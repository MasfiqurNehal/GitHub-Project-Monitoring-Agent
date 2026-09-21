'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../../components/navigation/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { fetchDeveloperDetails } from '../../../lib/api-client';
import { Users, GitCommit, GitPullRequest, Code2, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DeveloperDetailPage({ params }: { params: { id: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const { data: devDetailData, isLoading } = useQuery({
    queryKey: ['developer-detail', params.id],
    queryFn: () => fetchDeveloperDetails(params.id),
  });

  const data = devDetailData?.data;
  const dev = data?.developer;

  if (isLoading || !dev) {
    return (
      <div className="flex-1 min-h-screen bg-slate-950 p-8 flex items-center justify-center text-slate-400 text-xs">
        Loading developer profile...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <Link href="/developers" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Developers</span>
        </Link>

        {/* Profile Card */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex items-center space-x-5">
          <img
            src={dev.avatarUrl || 'https://github.com/github.png'}
            alt={dev.login}
            className="w-16 h-16 rounded-full border border-slate-700 object-cover"
          />
          <div>
            <h1 className="text-xl font-bold text-white">@{dev.login}</h1>
            <p className="text-xs text-slate-400">{dev.name || 'GitHub Contributor'}</p>
            {dev.profileUrl && (
              <a
                href={dev.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:underline mt-1"
              >
                <span>GitHub Profile</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-semibold text-slate-400">Total Commits</span>
            <div className="text-2xl font-bold text-white mt-1">{data.totalCommits}</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-semibold text-slate-400">Lines Added</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">+{data.linesAdded}</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-semibold text-slate-400">Lines Deleted</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">-{data.linesDeleted}</div>
          </div>
        </div>

        {/* Recent Activity lists */}
        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="font-semibold text-white text-sm">Recent Commits</h3>
          <div className="space-y-2">
            {dev.commits.map((c: any) => (
              <div key={c.id} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium text-slate-200">{c.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {c.repository.fullName} · {new Date(c.committedAt).toLocaleDateString()}
                  </p>
                </div>
                <a href={c.commitUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
