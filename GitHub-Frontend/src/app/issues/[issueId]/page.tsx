'use client';

import { useState } from 'react';
import Header from '../../../components/navigation/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { AlertCircle, ArrowLeft, ExternalLink, MessageSquare, Clock } from 'lucide-react';
import Link from 'next/link';

export default function IssueDetailPage({ params }: { params: { issueId: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const mockIssue = {
    id: params.issueId,
    number: 88,
    title: 'PostgreSQL connection timeout during high-volume webhook ingestion',
    repository: 'BetopiaLtd/beyondAI-backend',
    author: 'dev_lead',
    state: 'OPEN',
    createdAt: '2026-09-19T14:10:00Z',
    body: 'We noticed periodic connection timeouts in BullMQ workers when processing burst webhook payloads. Need to adjust connection pool limits.',
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <Link href="/issues" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Issues</span>
        </Link>

        {/* Issue Detail Card */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-white">
                #{mockIssue.number} {mockIssue.title}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {mockIssue.state}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Opened by <span className="text-slate-200">@{mockIssue.author}</span> in <span className="font-mono">{mockIssue.repository}</span>
            </p>
          </div>

          <a
            href={`https://github.com/${mockIssue.repository}/issues/${mockIssue.number}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl transition-colors"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-3">
          <h3 className="font-semibold text-white text-xs uppercase tracking-wider">Issue Description</h3>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{mockIssue.body}</p>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
