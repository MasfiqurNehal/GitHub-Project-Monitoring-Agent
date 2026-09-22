'use client';

import React from 'react';
import { 
  Bot, 
  Sparkles, 
  Plus, 
  Trash2, 
  Sidebar, 
  Workflow, 
  Cpu 
} from 'lucide-react';

interface ChatHeaderProps {
  onNewChat: () => void;
  onClearChat: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function ChatHeader({
  onNewChat,
  onClearChat,
  onToggleSidebar,
  isSidebarOpen,
}: ChatHeaderProps) {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between gap-4">
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
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Engineering Agent Console</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Cpu className="w-3 h-3" /> Gemini Ready (Mock)
              </span>
            </div>
            <p className="text-slate-400 text-xs hidden sm:block">
              ChatGPT-style engineering intelligence over monitored repositories & developer activity.
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls: Architecture Pipeline Badge & Actions */}
      <div className="flex items-center gap-2">
        {/* Pipeline Architecture Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
          <Workflow className="w-3.5 h-3.5 text-indigo-400" />
          <span>Pipeline: <strong className="text-slate-200">Next.js → Express → FastAPI → Orchestrator → Gemini</strong></span>
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
