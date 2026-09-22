'use client';

import { useState } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { FilterBar } from '../../components/filters/FilterBar';
import { useProjects } from '../../hooks/use-projects';
import { useRepositories } from '../../hooks/use-repositories';
import { useDevelopers } from '../../hooks/use-developers';
import { Activity, ShieldCheck } from 'lucide-react';

export default function ActivityPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const { projects } = useProjects();
  const { repositories } = useRepositories();
  const { developers } = useDevelopers();

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

        {/* Global Filter Bar */}
        <FilterBar
          projects={projects}
          repositories={repositories}
          developers={developers}
        />

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 text-slate-400 text-xs text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-blue-400 mx-auto" />
          <p className="font-semibold text-slate-200">Live Webhook Event Ingestion Stream</p>
          <p className="text-[11px] text-slate-400 max-w-lg mx-auto">
            Activity stream filters respond automatically to selected projects, repositories, contributors, event types, and custom date ranges.
          </p>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
