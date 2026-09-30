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
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageItem;
  onRetry?: (messageId: string) => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = Boolean(message.isError);

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

  const formattedTime = React.useMemo(() => {
    if (!message.timestamp) return null;
    const date = new Date(message.timestamp);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (isToday) {
      return timeStr;
    }
    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }
    if (date.getFullYear() === now.getFullYear()) {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    }
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, ${timeStr}`;
  }, [message.timestamp]);

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
            : isError
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : isError ? (
          <AlertTriangle className="w-4 h-4 text-rose-400" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message Content Container */}
      <div
        className={`max-w-[90%] sm:max-w-[80%] space-y-3 ${
          isUser
            ? 'bg-amber-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md text-xs'
            : isError
            ? 'bg-rose-950/40 border border-rose-800/80 text-rose-200 p-5 rounded-2xl rounded-tl-none shadow-xl text-xs'
            : 'bg-slate-900 border border-slate-800 text-slate-200 p-5 rounded-2xl rounded-tl-none shadow-xl text-xs'
        }`}
      >
        {/* Agent & Specialist Header Badge */}
        {!isUser && !isError && (message.selectedAgent || message.detectedIntent) && (
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60 flex-wrap">
            {message.selectedAgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                {message.selectedAgent.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {message.detectedIntent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-400">
                Intent: {message.detectedIntent}
              </span>
            )}
            {message.executionTimeMs ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 ml-auto font-mono">
                <Clock className="w-3 h-3" />
                {(message.executionTimeMs / 1000).toFixed(2)}s
              </span>
            ) : null}
          </div>
        )}

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
                {m.change && (
                  <span className="text-[10px] text-emerald-400 font-medium block">
                    {m.change}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 2. Generated Analytical Artifacts (Reports / Summaries) */}
        {!isUser && message.artifacts && message.artifacts.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Generated Analytical Reports:
            </span>
            <div className="space-y-2">
              {message.artifacts.map((art) => (
                <div
                  key={art.id}
                  className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {art.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {art.artifact_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded-lg font-mono border border-slate-800/50 max-h-48 overflow-y-auto">
                    {art.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Executed Tool Telemetry Summaries */}
        {!isUser && message.toolsExecuted && message.toolsExecuted.length > 0 && (
          <div className="pt-2 border-t border-slate-800/60 flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Executed Tools:</span>
            {message.toolsExecuted.map((t, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-300"
              >
                {t.tool_name} ({t.duration_ms.toFixed(0)}ms)
              </span>
            ))}
          </div>
        )}

        {/* 4. Source References (if response contains cited sources) */}
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

        {/* 5. Interactive Action Buttons */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Suggested Actions:
            </span>
            <div className="flex flex-wrap gap-2">
              {message.actions.map((act, idx) => (
                <Link
                  key={idx}
                  href={act.href || '#'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold transition-all shadow-sm"
                >
                  {renderActionIcon(act.type)}
                  <span>{act.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 6. Error Retry Action */}
        {isError && onRetry && (
          <div className="pt-2 border-t border-rose-900/40 flex items-center justify-between">
            <span className="text-[11px] text-rose-300">Execution failed. Would you like to retry?</span>
            <button
              onClick={() => onRetry(message.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Prompt</span>
            </button>
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
