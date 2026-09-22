'use client';

import React from 'react';
import { Sparkles, MessageSquareCode, ArrowUpRight } from 'lucide-react';

interface SuggestedPromptsProps {
  onSelectPrompt: (promptText: string) => void;
}

const PROMPT_ITEMS = [
  {
    title: 'Enosis Activity Audit',
    query: 'Show me Enosis backend activity on August 16.',
    badge: 'Popular Query',
  },
  {
    title: 'PR Bottlenecks',
    query: 'Which PRs are currently blocking merge in BeyondAI platform?',
    badge: 'Code Quality',
  },
  {
    title: 'Developer Metrics',
    query: 'Summarize top developer contributions for Alex Mercer this week.',
    badge: 'Engineering Team',
  },
  {
    title: 'Monthly Summary',
    query: 'Generate executive monthly report for Enosis Enterprise Suite.',
    badge: 'Reports',
  },
];

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span>Suggested CTO Engineering Prompts:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROMPT_ITEMS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.query)}
            className="group text-left p-3.5 bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all duration-200 shadow-md hover:bg-slate-900 flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {item.badge}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>

            <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors line-clamp-2">
              "{item.query}"
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
