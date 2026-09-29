'use client';

import React from 'react';
import { 
  Bot, 
  Sparkles, 
  Plus, 
  Trash2, 
  Sidebar, 
  Workflow, 
  Cpu,
  FolderKanban,
  GitBranch,
  User,
  X,
  ShieldCheck
} from 'lucide-react';
import { AgentContextScope } from '../../hooks/use-ai-agent';

interface ChatHeaderProps {
  onNewChat: () => void;
  onClearChat: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  contextScope?: AgentContextScope;
  onClearContext?: (key?: 'projectId' | 'repositoryId' | 'developerId') => void;
}

export function ChatHeader({
  onNewChat,
  onClearChat,
  onToggleSidebar,
  isSidebarOpen,
  contextScope,
  onClearContext,
}: ChatHeaderProps) {
  const hasProjectContext = Boolean(contextScope?.projectId);
  const hasRepoContext = Boolean(contextScope?.repositoryId);
  const hasDevContext = Boolean(contextScope?.developerId);
  const hasActiveScope = hasProjectContext || hasRepoContext || hasDevContext;

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Title & Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isSidebarOpen ? 'Hide Conversation History' : 'Show Conversation History'}
        >
          <Sidebar className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 via-blue-500/20 to-purple-500/20 border border-amber-500/30 text-amber-400">
            <Bot className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">Engineering Agent Console</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" /> Tenant Isolated
              </span>
            </div>
            <p className="text-slate-400 text-xs hidden md:block">
              Multi-agent analytical orchestrator over repositories, pull requests, and telemetry.
            </p>
          </div>
        </div>
      </div>

      {/* Active Context Scope Chips & Actions */}
      <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
        {/* Context Badges */}
        {hasActiveScope && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasProjectContext && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-fade-in shadow-sm">
                <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                <span>Project: <strong className="text-white">{contextScope?.projectName || contextScope?.projectId}</strong></span>
                {onClearContext && (
                  <button
                    onClick={() => onClearContext('projectId')}
                    className="p-0.5 hover:bg-blue-500/20 rounded text-blue-300 hover:text-white transition-colors ml-0.5"
                    title="Remove project context"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )}

            {hasRepoContext && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 animate-fade-in shadow-sm">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                <span>Repo: <strong className="text-white">{contextScope?.repositoryName || contextScope?.repositoryId}</strong></span>
                {onClearContext && (
                  <button
                    onClick={() => onClearContext('repositoryId')}
                    className="p-0.5 hover:bg-indigo-500/20 rounded text-indigo-300 hover:text-white transition-colors ml-0.5"
                    title="Remove repository context"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )}

            {hasDevContext && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 animate-fade-in shadow-sm">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>Dev: <strong className="text-white">{contextScope?.developerName || contextScope?.developerId}</strong></span>
                {onClearContext && (
                  <button
                    onClick={() => onClearContext('developerId')}
                    className="p-0.5 hover:bg-purple-500/20 rounded text-purple-300 hover:text-white transition-colors ml-0.5"
                    title="Remove developer context"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )}
          </div>
        )}

        {/* Pipeline Architecture Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
          <Workflow className="w-3 h-3 text-amber-400" />
          <span>FastAPI <strong className="text-slate-200">LangGraph StateGraph</strong></span>
        </div>

        {/* Clear Messages */}
        <button
          onClick={onClearChat}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          title="Clear current thread messages"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* New Chat */}
        <button
          onClick={onNewChat}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>
    </div>
  );
}
