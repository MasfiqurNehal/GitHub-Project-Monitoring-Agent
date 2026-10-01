'use client';

import React from 'react';
import { Bot, Sparkles, Cpu } from 'lucide-react';

interface ThinkingStateProps {
  statusText?: string;
}

export function ThinkingState({ statusText = 'Analyzing request & synthesizing engineering insights...' }: ThinkingStateProps) {
  return (
    <div className="flex items-start space-x-3 text-xs animate-fade-in py-2">
      <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 animate-bounce" />
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 space-y-2 max-w-md shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2.5 text-slate-200 font-medium">
          <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
          <span>{statusText}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 pl-6 border-l border-slate-800/80">
          <Cpu className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="text-slate-400">Executing LLM reasoning engine</span>
          <span className="flex space-x-1 ml-1">
            <span className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" />
            <span className="w-1 h-1 bg-blue-400 rounded-full animate-ping delay-150" />
            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-ping delay-300" />
          </span>
        </div>
      </div>
    </div>
  );
}
