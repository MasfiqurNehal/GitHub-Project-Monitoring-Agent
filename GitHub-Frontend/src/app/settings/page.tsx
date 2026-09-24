'use client';

import { useState } from 'react';
import Header from '../../components/navigation/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { Settings, ShieldCheck, Key, Webhook, Database, Cpu } from 'lucide-react';

export default function SettingsPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-400" /> Platform & Integration Settings
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure GitHub API tokens, webhooks, PostgreSQL connections, and Gemini API keys.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center space-x-3 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold text-white text-sm">Read-Only Safety Policy</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This monitoring platform strictly enforces **Read-Only** behavior against GitHub API endpoints. It will never push commits, merge PRs, delete branches, or edit issue text.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              <Webhook className="w-5 h-5" />
              <h3 className="font-bold text-white text-sm">GitHub Webhook URL</h3>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs font-mono text-slate-300 select-all">
              {process.env.NEXT_PUBLIC_GITHUB_WEBHOOK_URL || (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/webhooks/github` : 'http://localhost:5001/api/webhooks/github')}
            </div>
          </div>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
