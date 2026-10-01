'use client';

import React from 'react';
import { Bot, Sparkles, Cpu, Wrench, Search, Database, Layers } from 'lucide-react';

export interface ThinkingStateProps {
  statusText?: string;
  currentStage?: string;
  activeTool?: string;
}

export function ThinkingState({
  statusText,
  currentStage = 'Understanding request...',
  activeTool
}: ThinkingStateProps) {
  const displayStatus = statusText || currentStage;

  // Determine which icon and badge best reflects the live progress
  const getStageIcon = () => {
    const s = displayStatus.toLowerCase();
    if (s.includes('context') || s.includes('project')) {
      return <Layers className="w-3.5 h-3.5 text-blue-400 animate-pulse" />;
    }
    if (s.includes('tool') || s.includes('github') || activeTool) {
      return <Wrench className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
    }
    if (s.includes('analyz') || s.includes('result') || s.includes('synthesiz')) {
      return <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />;
    }
    if (s.includes('generat') || s.includes('llm') || s.includes('response')) {
      return <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />;
    }
    return <Search className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />;
  };

  return (
    <div className="flex items-start space-x-3 text-xs animate-fade-in py-2">
      <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-md">
        <Bot className="w-4 h-4 animate-bounce" />
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 space-y-2.5 max-w-md shadow-xl backdrop-blur-sm">
        {/* Main Status Text */}
        <div className="flex items-center gap-2.5 text-slate-200 font-medium">
          <Sparkles className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-200">{displayStatus}</span>
        </div>

        {/* Live Execution Stage Badge */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 pl-6 border-l border-slate-800/80">
          {getStageIcon()}
          {activeTool ? (
            <span className="text-amber-300 font-mono text-[10px] px-1.5 py-0.5 bg-amber-950/40 border border-amber-800/50 rounded">
              Tool: {activeTool}
            </span>
          ) : (
            <span className="text-slate-400">{displayStatus}</span>
          )}
          <span className="flex space-x-1 ml-auto shrink-0">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping delay-150" />
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping delay-300" />
          </span>
        </div>
      </div>
    </div>
  );
}

