'use client';

import { useState } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { GitPullRequest, Search, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PullRequestsPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [filterState, setFilterState] = useState<'ALL' | 'OPEN' | 'MERGED' | 'CLOSED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const mockPRs = [
    {
      id: 'pr-1',
      number: 142,
      title: 'Implement OAuth authentication & token refresh flow',
      repository: 'BetopiaLtd/beyondAI-backend',
      author: 'johndoe',
      state: 'MERGED',
      createdAt: '2026-09-18T10:30:00Z',
      mergedAt: '2026-09-19T14:20:00Z',
      additions: 450,
      deletions: 120,
      reviewsCount: 3,
    },
    {
      id: 'pr-2',
      number: 143,
      title: 'Add interactive Recharts activity stream visualization',
      repository: 'BetopiaLtd/beyondAI-new-website',
      author: 'sarah_dev',
      state: 'OPEN',
      createdAt: '2026-09-20T08:15:00Z',
      additions: 280,
      deletions: 45,
      reviewsCount: 1,
    },
    {
      id: 'pr-3',
      number: 144,
      title: 'Optimize Prisma query indices for commit aggregation',
      repository: 'BetopiaLtd/beyondAI-backend',
      author: 'alex_m',
      state: 'OPEN',
      createdAt: '2026-09-21T09:00:00Z',
      additions: 95,
      deletions: 30,
      reviewsCount: 0,
    },
  ];

  const filteredPRs = mockPRs.filter((pr) => {
    const matchesState = filterState === 'ALL' || pr.state === filterState;
    const matchesSearch =
      pr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.repository.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesState && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <GitPullRequest className="w-6 h-6 text-purple-400" /> Pull Request Tracking
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Read-only oversight of open, merged, and closed pull request velocity across repositories.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* State Filters */}
            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs">
              {(['ALL', 'OPEN', 'MERGED', 'CLOSED'] as const).map((state) => (
                <button
                  key={state}
                  onClick={() => setFilterState(state)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterState === state ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 w-64">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search PR title or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 flex-1"
              />
            </div>
          </div>
        </div>

        {/* PR List Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">PR Number & Title</th>
                <th className="px-5 py-3.5">Repository</th>
                <th className="px-5 py-3.5">Author</th>
                <th className="px-5 py-3.5">State</th>
                <th className="px-5 py-3.5">Changes</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPRs.map((pr) => (
                <tr key={pr.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/pull-requests/${pr.id}`} className="font-semibold text-slate-200 hover:text-purple-400">
                      #{pr.number} {pr.title}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">{pr.repository}</td>
                  <td className="px-5 py-4 text-slate-300">@{pr.author}</td>
                  <td className="px-5 py-4">
                    {pr.state === 'MERGED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Merged
                      </span>
                    )}
                    {pr.state === 'OPEN' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Clock className="w-3 h-3" /> Open
                      </span>
                    )}
                    {pr.state === 'CLOSED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3 h-3" /> Closed
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px]">
                    <span className="text-emerald-400">+{pr.additions}</span> / <span className="text-rose-400">-{pr.deletions}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-[11px]">{new Date(pr.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/pull-requests/${pr.id}`} className="text-purple-400 hover:underline text-[11px]">
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
