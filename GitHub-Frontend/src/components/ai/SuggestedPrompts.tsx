'use client';

import React from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { AgentContextScope } from '../../hooks/use-ai-agent';

interface SuggestedPromptsProps {
  onSelectPrompt: (promptText: string) => void;
  contextScope?: AgentContextScope;
}

export function SuggestedPrompts({ onSelectPrompt, contextScope }: SuggestedPromptsProps) {
  let promptItems = [
    {
      title: 'Activity Audit',
      query: 'Show recent commit activity and engineering velocity.',
      badge: 'Activity',
    },
    {
      title: 'PR Bottlenecks',
      query: 'Which PRs are currently blocking merge or waiting for review?',
      badge: 'Code Quality',
    },
    {
      title: 'Developer Metrics',
      query: 'Summarize top developer contributions and code changes this week.',
      badge: 'Engineering Team',
    },
    {
      title: 'Monthly Summary',
      query: 'Generate executive engineering status report.',
      badge: 'Reports',
    },
  ];

  if (contextScope?.projectId) {
    const pName = contextScope.projectName || 'this project';
    promptItems = [
      {
        title: 'Project Velocity',
        query: `Analyze commit velocity and developer activity in ${pName}.`,
        badge: 'Project Velocity',
      },
      {
        title: 'PR Turnaround',
        query: `Show open pull requests and review turnaround time for ${pName}.`,
        badge: 'Pull Requests',
      },
      {
        title: 'Top Contributors',
        query: `Who made the most commits to ${pName} recently?`,
        badge: 'Contributors',
      },
      {
        title: 'Executive Report',
        query: `Generate a comprehensive status and health report for ${pName}.`,
        badge: 'Project Report',
      },
    ];
  } else if (contextScope?.repositoryId) {
    const rName = contextScope.repositoryName || 'this repository';
    promptItems = [
      {
        title: 'Repository Commits',
        query: `Show recent commits and code changes in ${rName}.`,
        badge: 'Commit History',
      },
      {
        title: 'Open Pull Requests',
        query: `Which PRs are open or pending review in ${rName}?`,
        badge: 'Pull Requests',
      },
      {
        title: 'Active Branches',
        query: `List active branches and latest sync status for ${rName}.`,
        badge: 'Branches',
      },
      {
        title: 'Code Churn Analysis',
        query: `Analyze code additions and deletions trends for ${rName}.`,
        badge: 'Code Churn',
      },
    ];
  } else if (contextScope?.developerId) {
    const dName = contextScope.developerName || 'this developer';
    promptItems = [
      {
        title: 'Developer Activity',
        query: `Summarize recent commit activity and PR contributions for ${dName}.`,
        badge: 'Activity',
      },
      {
        title: 'Code Impact',
        query: `Show code impact and churn statistics for ${dName}.`,
        badge: 'Code Impact',
      },
      {
        title: 'Assigned Repositories',
        query: `Which repositories did ${dName} actively contribute to?`,
        badge: 'Repositories',
      },
      {
        title: 'Contribution Report',
        query: `Generate performance and contribution summary for ${dName}.`,
        badge: 'Developer Report',
      },
    ];
  }

  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span>
          {contextScope?.projectId || contextScope?.repositoryId || contextScope?.developerId
            ? 'Context-Aware Suggested Prompts:'
            : 'Suggested Engineering Prompts:'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {promptItems.map((item, idx) => (
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
