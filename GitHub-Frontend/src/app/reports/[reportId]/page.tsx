'use client';

import { useState } from 'react';
import Header from '../../../components/navigation/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { FileText, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ReportDetailPage({ params }: { params: { reportId: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <Link href="/reports" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reports</span>
        </Link>

        {/* Report Header */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Executive Engineering Summary Report</h1>
              <p className="text-xs text-slate-400 mt-0.5">Report ID: {params.reportId}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Gemini Generated
          </span>
        </div>

        {/* Report Content */}
        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4 text-xs leading-relaxed text-slate-300">
          <h2 className="text-base font-bold text-white">1. Executive Overview</h2>
          <p>
            This automated report summarizes the engineering velocity and pull request throughput across all active repositories.
          </p>

          <h2 className="text-base font-bold text-white mt-4">2. Engineering Signals</h2>
          <p>
            All critical metrics are calculated deterministically from PostgreSQL records to prevent AI hallucination.
          </p>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
