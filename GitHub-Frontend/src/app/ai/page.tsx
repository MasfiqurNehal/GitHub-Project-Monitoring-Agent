'use client';

import { useState } from 'react';
import Header from '../../components/navigation/header';
import { Bot, Send, Sparkles, User, Loader2 } from 'lucide-react';
import { sendAIChatMessage } from '../../lib/api-client';

export default function AIWorkspacePage() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to the **Multi-Agent AI Workspace**. I am connected to your database facts and GitHub activity services.
      
Ask me anything regarding your repositories, active developers, pull request bottlenecks, or date-based engineering trends.`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => `conv-ws-${Date.now()}`);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    setMessages((prev) => [...prev, { id: `usr-${Date.now()}`, role: 'user', content: text }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await sendAIChatMessage(conversationId, text);
      setMessages((prev) => [
        ...prev,
        { id: res.data.messageId || `ast-${Date.now()}`, role: 'assistant', content: res.data.answer },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: 'Unable to connect to AI orchestrator backend.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header />

      <main className="flex-1 p-6 max-w-4xl w-full mx-auto flex flex-col h-[calc(100vh-4rem)]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-400" /> Executive AI Intelligence Workspace
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Gemini Multi-Agent System with direct access to deterministic database analytics tools.
          </p>
        </div>

        <div className="flex-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-3 text-slate-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Orchestrating agents and executing tools...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about project activity, developers, pull requests..."
            className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 px-2"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputMessage.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-40 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
