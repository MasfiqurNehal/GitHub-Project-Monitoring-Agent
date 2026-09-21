'use client';

import { useState } from 'react';
import Header from '../../components/navigation/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { Activity, GitCommit, GitPullRequest, ShieldCheck } from 'lucide-react';

export default function ActivityPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" /> Global Activity Stream
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time activity feed normalized from GitHub webhooks and incremental synchronization.
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 text-slate-400 text-xs text-center">
          <ShieldCheck className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          Live stream is active. All events are logged continuously from webhooks.
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
