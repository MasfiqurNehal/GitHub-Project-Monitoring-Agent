'use client';

import React, { useState } from 'react';
import { ConversationThread } from '../../lib/api/ai';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Loader2,
  Calendar,
} from 'lucide-react';

interface ConversationListProps {
  conversations: ConversationThread[];
  activeConversationId: string;
  isLoadingConversations?: boolean;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation?: (id: string, newTitle: string) => Promise<boolean>;
  onDeleteConversation: (id: string) => void;
}

interface DateGroup {
  label: 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';
  items: ConversationThread[];
}

function groupConversationsByRecency(conversations: ConversationThread[]): DateGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOf7DaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const today: ConversationThread[] = [];
  const yesterday: ConversationThread[] = [];
  const previous7Days: ConversationThread[] = [];
  const older: ConversationThread[] = [];

  // Sort by updatedAt DESC
  const sorted = [...conversations].filter((c) => Boolean(c.id)).sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  for (const conv of sorted) {
    const time = new Date(conv.updatedAt || conv.createdAt || 0).getTime();
    if (time >= startOfToday) {
      today.push(conv);
    } else if (time >= startOfYesterday) {
      yesterday.push(conv);
    } else if (time >= startOf7DaysAgo) {
      previous7Days.push(conv);
    } else {
      older.push(conv);
    }
  }

  const groups: DateGroup[] = [];
  if (today.length > 0) groups.push({ label: 'Today', items: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
  if (previous7Days.length > 0) groups.push({ label: 'Previous 7 Days', items: previous7Days });
  if (older.length > 0) groups.push({ label: 'Older', items: older });

  return groups;
}

export function ConversationList({
  conversations,
  activeConversationId,
  isLoadingConversations = false,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [isSavingRename, setIsSavingRename] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startRename = (conv: ConversationThread) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
    setConfirmDeleteId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleSaveRename = async (id: string) => {
    if (!editingTitle.trim() || !onRenameConversation) {
      cancelRename();
      return;
    }
    setIsSavingRename(true);
    try {
      await onRenameConversation(id, editingTitle.trim());
    } finally {
      setIsSavingRename(false);
      setEditingId(null);
    }
  };

  const handleKeyDownRename = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename(id);
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  const groups = groupConversationsByRecency(conversations);

  return (
    <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Sidebar Header: New Chat Button */}
      <div className="p-3.5 border-b border-slate-800 space-y-2">
        <button
          onClick={() => {
            cancelRename();
            setConfirmDeleteId(null);
            onNewChat();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation Thread List with ChatGPT-Style Recency Groups */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {isLoadingConversations ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-[11px]">Loading conversations...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No conversations yet.</p>
            <p className="text-[11px] text-slate-600">Start an engineering analysis to begin.</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="space-y-1">
              {/* Group Category Header */}
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-600" />
                <span>{group.label}</span>
              </div>

              {/* Group Items */}
              {group.items.map((thread) => {
                const isActive = thread.id === activeConversationId;
                const isEditing = editingId === thread.id;
                const isConfirmingDelete = confirmDeleteId === thread.id;

                if (isEditing) {
                  return (
                    <div
                      key={thread.id}
                      className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs"
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyDownRename(e, thread.id)}
                        disabled={isSavingRename}
                        autoFocus
                        className="flex-1 bg-slate-950 text-white text-xs px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => handleSaveRename(thread.id)}
                        disabled={isSavingRename}
                        className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded"
                        title="Save title"
                      >
                        {isSavingRename ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={cancelRename}
                        disabled={isSavingRename}
                        className="p-1 text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                if (isConfirmingDelete) {
                  return (
                    <div
                      key={thread.id}
                      className="p-2 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs space-y-1.5"
                    >
                      <span className="text-[11px] text-rose-300 block font-medium">Delete chat?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setConfirmDeleteId(null);
                            onDeleteConversation(thread.id);
                          }}
                          className="flex-1 py-1 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold transition-all"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={thread.id}
                    onClick={() => onSelectConversation(thread.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all relative ${
                      isActive
                        ? 'bg-slate-900 border border-slate-800 text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-400'
                        }`}
                      />
                      <span className="truncate">{thread.title || 'Untitled Conversation'}</span>
                    </div>

                    {/* Action Buttons: Rename & Delete */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onRenameConversation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(thread);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                          title="Rename title"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(thread.id);
                          setEditingId(null);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Engineering Agent</span>
        </div>
        <span className="font-mono text-[10px] text-slate-600">v2.0</span>
      </div>
    </div>
  );
}
