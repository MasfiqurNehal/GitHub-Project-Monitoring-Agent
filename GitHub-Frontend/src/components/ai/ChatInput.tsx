'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Command } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!inputMessage.trim() || isLoading) return;
    onSendMessage(inputMessage.trim());
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputMessage]);

  return (
    <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-2">
      <div className="relative flex items-end gap-2 bg-slate-950 border border-slate-800 focus-within:border-amber-500/50 rounded-2xl p-2.5 transition-all shadow-xl">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about project activity, repository PR bottlenecks, developer metrics... (e.g. 'Show me Enosis backend activity on August 16')"
          className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 resize-none px-2 max-h-32 min-h-[36px] py-1.5 leading-relaxed"
        />

        <button
          onClick={handleSend}
          disabled={isLoading || !inputMessage.trim()}
          className="p-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl disabled:opacity-40 shadow-md shadow-amber-600/20 transition-all shrink-0"
          title="Send Prompt (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 px-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Press <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[9px] text-slate-300">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[9px] text-slate-300">Shift+Enter</kbd> for line breaks.</span>
        </div>

        <span className="hidden sm:inline">Read-only agent telemetry interface</span>
      </div>
    </div>
  );
}
