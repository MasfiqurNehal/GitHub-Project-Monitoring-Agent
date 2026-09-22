'use client';

import { useState } from 'react';
import Header from '../../../components/navigation/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { GitPullRequest, ArrowLeft, ExternalLink, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

export default function PullRequestDetailPage({ params }: { params: { pullRequestId: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'commits' | 'reviews' | 'files'>('overview');

  const mockPR = {
    id: params.pullRequestId,
    number: 142,
    title: 'Implement OAuth authentication & token refresh flow',
    repository: 'BetopiaLtd/beyondAI-backend',
    author: 'johndoe',
    state: 'MERGED',
    createdAt: '2026-09-18T10:30:00Z',
    mergedAt: '2026-09-19T14:20:00Z',
    additions: 450,
    deletions: 120,
    changedFiles: 8,
    reviews: [
      { reviewer: 'sarah_dev', state: 'APPROVED', date: '2026-09-19T11:00:00Z' },
      { reviewer: 'alex_m', state: 'APPROVED', date: '2026-09-19T13:45:00Z' },
    ],
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <Link href="/pull-requests" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pull Requests</span>
        </Link>

        {/* PR Detail Header */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-white">
                #{mockPR.number} {mockPR.title}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {mockPR.state}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Opened by <span className="text-slate-200">@{mockPR.author}</span> in <span className="font-mono">{mockPR.repository}</span>
            </p>
          </div>

          <a
            href={`https://github.com/${mockPR.repository}/pull/${mockPR.number}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl transition-colors"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs">
          {(['overview', 'commits', 'reviews', 'files'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab ? 'bg-slate-800 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-xl text-center">
                <div>
                  <span className="text-slate-400">Additions</span>
                  <div className="text-emerald-400 font-bold text-base">+{mockPR.additions}</div>
                </div>
                <div>
                  <span className="text-slate-400">Deletions</span>
                  <div className="text-rose-400 font-bold text-base">-{mockPR.deletions}</div>
                </div>
                <div>
                  <span className="text-slate-400">Changed Files</span>
                  <div className="text-purple-400 font-bold text-base">{mockPR.changedFiles}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-3 text-xs">
              {mockPR.reviews.map((rev, idx) => (
                <div key={idx} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-center justify-between">
                  <span className="font-semibold text-slate-200">@{rev.reviewer}</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px]">
                    {rev.state}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
