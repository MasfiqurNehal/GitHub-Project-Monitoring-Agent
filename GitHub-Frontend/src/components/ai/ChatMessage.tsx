'use client';

import React from 'react';
import Link from 'next/link';
import { ChatMessageItem } from '../../lib/api/ai';
import { 
  Bot, 
  User, 
  ExternalLink, 
  Database, 
  GitBranch, 
  GitPullRequest, 
  FolderKanban, 
  Users, 
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageItem;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const renderActionIcon = (type?: string) => {
    switch (type) {
      case 'activity':
        return <Activity className="w-3.5 h-3.5 text-blue-400" />;
      case 'repository':
        return <GitBranch className="w-3.5 h-3.5 text-indigo-400" />;
      case 'developer':
        return <Users className="w-3.5 h-3.5 text-emerald-400" />;
      case 'report':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <ArrowRight className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formattedTime = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      className={`flex items-start space-x-3 ${
        isUser ? 'flex-row-reverse space-x-reverse' : ''
      }`}
    >
      {/* Avatar Icon */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-md ${
          isUser
            ? 'bg-amber-600 text-white'
            : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content Container */}
      <div
        className={`max-w-[85%] sm:max-w-[75%] space-y-3 ${
          isUser
            ? 'bg-amber-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md text-xs'
            : 'bg-slate-900 border border-slate-800 text-slate-200 p-5 rounded-2xl rounded-tl-none shadow-xl text-xs'
        }`}
      >
        {/* Main Text Content */}
        <div className="whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>

        {/* 1. Metrics Grid (if response contains metrics) */}
        {!isUser && message.metrics && message.metrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
            {message.metrics.map((m, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center space-y-0.5"
              >
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  {m.label}
                </span>
                <span className={`text-base font-bold font-mono ${m.color || 'text-amber-400'}`}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 2. Source References (if response contains cited sources) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Cited Data Sources:
            </span>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((src, idx) => {
                const badge = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-colors">
                    {src.type === 'database' ? (
                      <Database className="w-3 h-3 text-blue-400" />
                    ) : (
                      <GitBranch className="w-3 h-3 text-indigo-400" />
                    )}
                    <span>{src.title}</span>
                  </span>
                );

                return src.url ? (
                  <Link key={idx} href={src.url}>
                    {badge}
                  </Link>
                ) : (
                  <React.Fragment key={idx}>{badge}</React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Interactive Action Buttons (if response contains actions) */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Suggested Actions:
            </span>
            <div className="flex flex-wrap gap-2">
              {message.actions.map((act, idx) => (
                <Link
                  key={idx}
                  href={act.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold transition-all shadow-sm"
                >
                  {renderActionIcon(act.type)}
                  <span>[{act.label}]</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        {formattedTime && (
          <div
            className={`text-[10px] pt-1 ${
              isUser ? 'text-amber-200/80 text-right' : 'text-slate-500'
            }`}
          >
            {formattedTime}
          </div>
        )}
      </div>
    </div>
  );
}
