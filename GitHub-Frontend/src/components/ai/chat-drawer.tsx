'use client';

import { useState } from 'react';
import { X, Bot, User, Send, Sparkles, Filter, ExternalLink, Loader2 } from 'lucide-react';
import { sendEngineeringAgentMessage } from '../../lib/api/ai';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter?: (action: any) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  uiActions?: any[];
}

export default function ChatDrawer({ isOpen, onClose, onApplyFilter }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **GitHub Engineering Intelligence Agent**. 
      
I can analyze activity across your monitored projects, repositories, and developers. How can I help you today?`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => `conv-${Date.now()}`);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await sendEngineeringAgentMessage(conversationId, text);
      const assistantMsg: Message = {
        id: res.data.id || `ast-${Date.now()}`,
        role: 'assistant',
        content: res.data.content,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an issue fetching metrics from the backend.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Monitoring Intelligence Agent</h3>
              <p className="text-[11px] text-slate-400">Powered by Gemini Multi-Agent System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* UI Action Button if Agent requests dashboard filter */}
                {msg.uiActions && msg.uiActions.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-700/50">
                    {msg.uiActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => onApplyFilter && onApplyFilter(action)}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-[11px] font-medium border border-blue-500/30 transition-all"
                      >
                        <Filter className="w-3.5 h-3.5 text-blue-400" />
                        <span>Apply Filter: {action.projectName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-3 text-slate-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Analyzing GitHub data facts...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800/60 flex items-center space-x-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 shrink-0">Prompts:</span>
          {['Summary of today', 'Active developers', 'Stale PR alerts'].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-md whitespace-nowrap border border-slate-700/50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-2 bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask AI about commits, PRs, developers..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 px-2"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputMessage.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-40 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
