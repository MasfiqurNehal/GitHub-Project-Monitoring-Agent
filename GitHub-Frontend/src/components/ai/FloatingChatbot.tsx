'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLayout } from '../../providers/layout-provider';
import { useAuth } from '../../context/AuthContext';
import { sendEngineeringAgentMessage } from '../../lib/api/ai';
import {
  Bot,
  X,
  Send,
  User,
  Sparkles,
  RotateCcw,
  History,
  Trash2,
  Plus,
  MessageSquare,
  Clock,
  ChevronRight,
  AlertTriangle,
  FolderGit2,
  BarChart3,
  Users,
  Zap,
  CornerDownLeft,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const STORAGE_KEY_SESSIONS = 'gitmonitor_chatbot_sessions_v1';
const STORAGE_KEY_ACTIVE = 'gitmonitor_chatbot_active_id_v1';

const SUGGESTED_QUESTIONS = [
  'How do I add a new repository?',
  'Where can I generate reports?',
  'How do I track developer activity?',
  'What are webhooks used for?',
];

const QUICK_FEATURE_CARDS = [
  { icon: FolderGit2, title: 'Repositories', desc: 'Add & validate codebases', query: 'How do I add a new repository?' },
  { icon: BarChart3, title: 'Reports', desc: 'Daily & developer analytics', query: 'Where can I generate reports?' },
  { icon: Users, title: 'Developers', desc: 'Track velocity & PR reviews', query: 'How do I track developer activity?' },
  { icon: Zap, title: 'Webhooks', desc: 'Real-time telemetry events', query: 'What are webhooks used for?' },
];

const INITIAL_WELCOME_MSG = (userName?: string): ChatMessage => ({
  id: 'welcome-initial',
  sender: 'bot',
  text: `👋 Hello${userName ? ` **${userName}**` : ''}! I am your **GitMonitor AI Assistant**.\n\nI can help you navigate repository setup, developer metrics, code churn analytics, and reporting. What would you like to explore today?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

export default function FloatingChatbot() {
  const pathname = usePathname();
  const { isAIChatOpen, setAIChatOpen } = useLayout();
  const { user } = useAuth();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isHiddenPage = pathname === '/ai' || pathname === '/';

  // 1. Load Sessions from localStorage on initial render
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedSessionsRaw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE);

      let parsedSessions: ChatSession[] = [];
      if (savedSessionsRaw) {
        parsedSessions = JSON.parse(savedSessionsRaw);
      }

      if (!Array.isArray(parsedSessions) || parsedSessions.length === 0) {
        const defaultSessionId = `session-${Date.now()}`;
        const defaultSession: ChatSession = {
          id: defaultSessionId,
          title: 'New Conversation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [INITIAL_WELCOME_MSG(user?.name)],
        };
        parsedSessions = [defaultSession];
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(parsedSessions));
        localStorage.setItem(STORAGE_KEY_ACTIVE, defaultSessionId);
        setSessions(parsedSessions);
        setActiveSessionId(defaultSessionId);
      } else {
        setSessions(parsedSessions);
        const validActiveId = savedActiveId && parsedSessions.some(s => s.id === savedActiveId)
          ? savedActiveId
          : parsedSessions[0].id;
        setActiveSessionId(validActiveId);
      }
    } catch (err) {
      // Fallback
    }
  }, [user?.name]);

  // Save Sessions to localStorage whenever sessions or activeSessionId change
  useEffect(() => {
    if (typeof window === 'undefined' || sessions.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE, activeSessionId);
      }
    } catch (err) {
      // Ignore quota errors
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (isAIChatOpen && activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isAIChatOpen, isTyping, activeTab]);

  if (isHiddenPage) {
    return null;
  }

  // Helper to format response text with bold & line breaks
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|\`.*?\`)/g);
      return (
        <p key={lIdx} className={line.trim() === '' ? 'h-2' : 'min-h-[1rem]'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return <code key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 font-mono text-[11px] text-blue-300">{part.slice(1, -1)}</code>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  // Smart Frontend-Only Mock Response Generator
  const generateMockResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('repo') || q.includes('connect') || q.includes('add') || q.includes('github connection')) {
      return `🔗 **Connecting Repositories & Monitoring:**\n\n1. Go to **SYSTEM > GitHub Connection** in the left sidebar.\n2. Paste your public or private GitHub repository URL (e.g. \`https://github.com/org/repo\`).\n3. Click **Validate Repository** to enable automated telemetry synchronization.`;
    }

    if (q.includes('report') || q.includes('export') || q.includes('pdf') || q.includes('daily') || q.includes('weekly')) {
      return `📊 **Reporting & Analytics:**\n\nYou can generate structured reports under **REPORTING > Reports**.\n\nSupported modes:\n• **Daily & Weekly Reports** for executive summaries\n• **Repository Reports** for code churn metrics\n• **Developer Activity Reports** for velocity insights\n\nAll reports support custom date range filtering!`;
    }

    if (q.includes('developer') || q.includes('team') || q.includes('activity') || q.includes('commit') || q.includes('churn')) {
      return `👥 **Developer & Commit Insights:**\n\n• Head to **PROJECTS > Developers** to inspect individual commit velocity, PR review counts, and code added/removed.\n• View real-time activity events in **MONITORING > Activity Stream**.`;
    }

    if (q.includes('pr') || q.includes('pull request') || q.includes('issue') || q.includes('review')) {
      return `🔀 **Pull Requests & Issues:**\n\n• Track open PRs, review approvals, and merge velocity under **MONITORING > Pull Requests**.\n• Inspect logged repository issues in **MONITORING > Issues**.`;
    }

    if (q.includes('webhook') || q.includes('sync') || q.includes('realtime')) {
      return `⚡ **Real-Time Webhooks:**\n\nGitMonitor automatically captures push events, pull requests, and code review webhooks in real-time. Check the top bar indicator to verify that **Webhooks Active** status is green!`;
    }

    if (q.includes('profile') || q.includes('user') || q.includes('setting') || q.includes('logout') || q.includes('avatar')) {
      return `👤 **User Profile & Settings:**\n\nClick on your user card at the bottom-left of the sidebar and select **See Profile** to update your name, designation, company name, phone number, and Cloudinary avatar picture!`;
    }

    return `🤖 I'm here to help with GitMonitor AI! You can ask me about:\n\n• How to add & sync GitHub repositories\n• Viewing developer activity & code churn\n• Generating daily/weekly reports\n• Configuring user profiles & settings\n\nWhat would you like to explore?`;
  };

  const updateCurrentSessionMessages = (newMsgs: ChatMessage[], newTitle?: string) => {
    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === activeSessionId) {
          const title =
            newTitle ||
            (session.title !== 'New Conversation'
              ? session.title
              : newMsgs.find((m) => m.sender === 'user')?.text.slice(0, 30) + '...' || 'Conversation');

          return {
            ...session,
            title,
            updatedAt: new Date().toISOString(),
            messages: newMsgs,
          };
        }
        return session;
      })
    );
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    
    let customTitle: string | undefined;
    if (activeSession && activeSession.title === 'New Conversation') {
      customTitle = text.length > 28 ? `${text.slice(0, 28)}...` : text;
    }

    updateCurrentSessionMessages(updatedMessages, customTitle);
    setInputText('');
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // 1. Invoke FastAPI AI Services endpoint (/api/v1/chatbot/chat)
      const res = await sendEngineeringAgentMessage(activeSessionId, text);
      const answerContent = res?.data?.content || generateMockResponse(text);

      const botMsg: ChatMessage = {
        id: res?.data?.id || `bot-${Date.now()}`,
        sender: 'bot',
        text: answerContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id === activeSessionId) {
            return {
              ...session,
              updatedAt: new Date().toISOString(),
              messages: [...session.messages, botMsg],
            };
          }
          return session;
        })
      );
    } catch (err) {
      console.warn('[FloatingChatbot] Live AI endpoint unavailable, using smart local fallback:', err);
      const responseText = generateMockResponse(text);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id === activeSessionId) {
            return {
              ...session,
              updatedAt: new Date().toISOString(),
              messages: [...session.messages, botMsg],
            };
          }
          return session;
        })
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateNewChat = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [INITIAL_WELCOME_MSG(user?.name)],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setActiveTab('chat');
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== sessionId);

    if (filtered.length === 0) {
      const newSessionId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: newSessionId,
        title: 'New Conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [INITIAL_WELCOME_MSG(user?.name)],
      };
      setSessions([newSession]);
      setActiveSessionId(newSessionId);
    } else {
      setSessions(filtered);
      if (sessionId === activeSessionId) {
        setActiveSessionId(filtered[0].id);
      }
    }
  };

  const handleClearAllHistory = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [INITIAL_WELCOME_MSG(user?.name)],
    };
    setSessions([newSession]);
    setActiveSessionId(newSessionId);
    setShowClearConfirm(false);
    setActiveTab('chat');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const userMessagesCount = messages.filter(m => m.sender === 'user').length;

  return (
    <>
      {/* Floating AI Logo Trigger Button (Bottom-Right) */}
      {!isAIChatOpen && (
        <button
          type="button"
          onClick={() => setAIChatOpen(true)}
          aria-label="GitMonitor AI Assistant"
          title="GitMonitor AI Assistant"
          className="fixed bottom-6 right-6 z-40 p-3.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-indigo-400 text-white rounded-2xl shadow-2xl shadow-blue-600/50 ring-2 ring-blue-400/40 hover:ring-blue-300 transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer flex items-center justify-center"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300 animate-pulse" />
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-slate-900 shadow-sm" />
          </div>
        </button>
      )}

      {/* Right-Side Docked / Mobile Drawer AI Chat Window Panel */}
      {isAIChatOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
            onClick={() => setAIChatOpen(false)}
          />

          {/* Panel Container: Docked on desktop, drawer on mobile */}
          <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:static lg:z-30 lg:w-96 xl:w-[420px] 2xl:w-[440px] lg:h-screen lg:sticky lg:top-0 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 shadow-2xl flex flex-col shrink-0 overflow-hidden transition-all duration-300 animate-in slide-in-from-right-4">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="relative p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shrink-0">
                <Bot className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <span>GitMonitor AI</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-semibold border border-blue-500/20 shrink-0">
                    Assistant
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                  <span className="truncate">{activeTab === 'chat' ? (activeSession?.title || 'Active Session') : 'Conversation History'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              {/* New Chat Button */}
              <button
                type="button"
                onClick={handleCreateNewChat}
                title="Start New Conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* History Toggle Button */}
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'chat' ? 'history' : 'chat')}
                title={activeTab === 'chat' ? 'View Conversation History' : 'Back to Active Chat'}
                className={`p-1.5 rounded-lg transition-colors relative ${
                  activeTab === 'history'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                {sessions.length > 1 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {sessions.length}
                  </span>
                )}
              </button>

              {/* Close Drawer Button */}
              <button
                type="button"
                onClick={() => setAIChatOpen(false)}
                title="Close AI Assistant"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAB 1: ACTIVE CHAT VIEW */}
          {activeTab === 'chat' && (
            <>
              {/* Messages Stream */}
              <div ref={messagesContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/40">
                {/* Welcome Card feature shortcuts if no user messages yet */}
                {userMessagesCount === 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                    <p className="text-[11px] font-semibold text-slate-300">Quick Guide & Capabilities:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_FEATURE_CARDS.map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSendMessage(card.query)}
                            className="p-2.5 rounded-lg bg-slate-800/60 hover:bg-blue-600/10 hover:border-blue-500/30 border border-slate-700/40 text-left transition-all group"
                          >
                            <div className="flex items-center space-x-1.5 text-blue-400 mb-1">
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-xs font-semibold group-hover:text-blue-300 truncate">{card.title}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight truncate">{card.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-2.5 ${
                      msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    {/* Avatar */}
                    {msg.sender === 'user' ? (
                      user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name || 'User'}
                          className="w-7 h-7 rounded-full object-cover border border-blue-500/40 shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] border border-blue-500/30 shrink-0 shadow-sm">
                          {getInitials(user?.name)}
                        </div>
                      )
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-blue-400 border border-slate-700/60 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Content & Timestamp */}
                    <div className="max-w-[84%] space-y-1">
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md'
                            : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                        }`}
                      >
                        <div>{renderFormattedText(msg.text)}</div>
                      </div>
                      <p
                        className={`text-[9px] text-slate-500 px-1 ${
                          msg.sender === 'user' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center space-x-2.5 text-slate-400 text-xs py-1">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-blue-400 border border-slate-700/60 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 animate-bounce" />
                    </div>
                    <div className="bg-slate-800/80 px-3.5 py-2.5 rounded-xl border border-slate-700/50 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-150" />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-300" />
                      <span className="text-[11px] text-slate-400 ml-1">GitMonitor AI is thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested Prompts */}
              <div className="px-3 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center space-x-1.5 overflow-x-auto text-[11px] no-scrollbar shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0 ml-1" />
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    disabled={isTyping}
                    className="px-2.5 py-1 bg-slate-800/80 hover:bg-blue-600/20 hover:text-blue-300 text-slate-300 rounded-lg whitespace-nowrap border border-slate-700/60 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0 space-y-1">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-end space-x-2 bg-slate-800/90 rounded-xl p-2 border border-slate-700/70 focus-within:border-blue-500/80 transition-all"
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask AI Assistant a question..."
                    style={{ outline: 'none', boxShadow: 'none', border: 'none', resize: 'none' }}
                    className="flex-1 bg-transparent border-0 outline-none ring-0 text-xs text-slate-100 placeholder:text-slate-500 px-2 py-1 max-h-24 focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isTyping}
                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg shadow-md transition-all shrink-0 cursor-pointer"
                    title="Send Message (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="flex items-center justify-between px-1 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3 text-slate-500 inline" />
                    <span>Enter to send, Shift+Enter for newline</span>
                  </span>
                  <span>Frontend AI Assistant</span>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: HISTORY VIEW */}
          {activeTab === 'history' && (
            <div className="flex-1 flex flex-col justify-between bg-slate-950/60 overflow-hidden">
              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Saved Conversations ({sessions.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleCreateNewChat}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[11px] font-medium transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Chat</span>
                  </button>
                </div>

                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p>No conversation history saved.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => {
                      const isSelected = session.id === activeSessionId;
                      const msgCount = session.messages.filter((m) => m.sender === 'user').length;
                      const dateStr = new Date(session.updatedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={session.id}
                          onClick={() => {
                            setActiveSessionId(session.id);
                            setActiveTab('chat');
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                            isSelected
                              ? 'bg-blue-600/10 border-blue-500/40 shadow-sm'
                              : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/50 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start space-x-3 min-w-0 flex-1 pr-2">
                            <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-700/50 text-slate-400'}`}>
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-300' : 'text-slate-200 group-hover:text-white'}`}>
                                {session.title}
                              </p>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                                <span>{msgCount} messages</span>
                                <span>•</span>
                                <span>{dateStr}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              title="Delete Conversation"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Clear History Action */}
              {sessions.length > 0 && (
                <div className="p-3 border-t border-slate-800 bg-slate-900 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Chat History</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CLEAR ALL CONFIRMATION DIALOG MODAL */}
          {showClearConfirm && (
            <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4">
                <div className="flex items-center space-x-3 text-rose-400">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white">Clear History?</h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to delete all chat history? This action cannot be undone.
                </p>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </>
    )}
  </>
);
}
