'use client';

import React from 'react';
import { Bot, Loader2, Database, GitBranch, Cpu } from 'lucide-react';

export function ThinkingState() {
  return (
    <div className="flex items-start space-x-3 text-xs animate-fade-in py-2">
      <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 animate-bounce" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 space-y-2.5 max-w-md shadow-lg">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Orchestrating agents & querying database facts...</span>
        </div>

        <div className="space-y-1 text-[11px] text-slate-400 pl-6 border-l border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Database className="w-3 h-3 text-blue-400" />
            <span>Scanning commit_events & activity_logs telemetry...</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <GitBranch className="w-3 h-3 text-indigo-400" />
            <span>Filtering repositories & PR state vectors...</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3 h-3 text-amber-400" />
            <span>Executing Gemini LLM context summarizer...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
