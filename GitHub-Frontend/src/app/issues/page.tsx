'use client';

import { useState } from 'react';
import Header from '../../components/navigation/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { AlertCircle, Search, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function IssuesPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [filterState, setFilterState] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const mockIssues = [
    {
      id: 'issue-1',
      number: 88,
      title: 'PostgreSQL connection timeout during high-volume webhook ingestion',
      repository: 'BetopiaLtd/beyondAI-backend',
      author: 'dev_lead',
      state: 'OPEN',
      createdAt: '2026-09-19T14:10:00Z',
      commentsCount: 5,
    },
    {
      id: 'issue-2',
      number: 89,
      title: 'Fix mobile drawer overflow animation timing in Next.js layout',
      repository: 'BetopiaLtd/beyondAI-new-website',
      author: 'sarah_dev',
      state: 'CLOSED',
      createdAt: '2026-09-15T09:20:00Z',
      closedAt: '2026-09-16T11:40:00Z',
      commentsCount: 2,
    },
  ];

  const filteredIssues = mockIssues.filter((issue) => {
    const matchesState = filterState === 'ALL' || issue.state === filterState;
    const matchesSearch =
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.repository.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesState && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-amber-400" /> GitHub Issue Tracking
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Read-only view of open and resolved issues across all monitored codebases.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs">
              {(['ALL', 'OPEN', 'CLOSED'] as const).map((state) => (
                <button
                  key={state}
                  onClick={() => setFilterState(state)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterState === state ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 w-64">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search issue title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 flex-1"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Issue Number & Title</th>
                <th className="px-5 py-3.5">Repository</th>
                <th className="px-5 py-3.5">Author</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Comments</th>
                <th className="px-5 py-3.5">Opened</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/issues/${issue.id}`} className="font-semibold text-slate-200 hover:text-amber-400">
                      #{issue.number} {issue.title}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">{issue.repository}</td>
                  <td className="px-5 py-4 text-slate-300">@{issue.author}</td>
                  <td className="px-5 py-4">
                    {issue.state === 'OPEN' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" /> Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Closed
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-400">{issue.commentsCount} comments</td>
                  <td className="px-5 py-4 text-slate-400 text-[11px]">{new Date(issue.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/issues/${issue.id}`} className="text-amber-400 hover:underline text-[11px]">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
