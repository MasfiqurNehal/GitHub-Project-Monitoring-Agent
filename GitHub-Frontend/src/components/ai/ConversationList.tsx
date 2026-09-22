'use client';

import React from 'react';
import { ConversationThread } from '../../lib/api/ai';
import { MessageSquare, Plus, Trash2, Bot, Sparkles } from 'lucide-react';

interface ConversationListProps {
  conversations: ConversationThread[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: ConversationListProps) {
  return (
    <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Recent Conversations
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((thread) => {
          const isActive = thread.id === activeConversationId;

          return (
            <div
              key={thread.id}
              onClick={() => onSelectConversation(thread.id)}
              className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                isActive
                  ? 'bg-slate-900 border border-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="truncate">{thread.title}</span>
              </div>

              {conversations.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(thread.id);
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>CTO Agent Engine</span>
        </div>
        <span className="font-mono text-[10px] text-slate-600">v2.0</span>
      </div>
    </div>
  );
}
