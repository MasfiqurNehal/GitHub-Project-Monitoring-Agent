'use client';

import React, { useRef, useEffect, useState } from 'react';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useAIAgent } from '../../hooks/use-ai-agent';
import { ChatHeader } from '../../components/ai/ChatHeader';
import { ConversationList } from '../../components/ai/ConversationList';
import { ChatMessage } from '../../components/ai/ChatMessage';
import { SuggestedPrompts } from '../../components/ai/SuggestedPrompts';
import { ThinkingState } from '../../components/ai/ThinkingState';
import { ChatInput } from '../../components/ai/ChatInput';

export default function AIWorkspacePage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    isLoading,
    isSidebarOpen,
    setIsSidebarOpen,
    handleSendMessage,
    createNewChat,
    clearCurrentChat,
    deleteConversation,
  } = useAIAgent();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation.messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 flex min-h-[calc(100vh-4rem)] max-w-7xl w-full mx-auto p-4 md:p-6 gap-4">
        {/* Chat Interface Main Box */}
        <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-6.5rem)]">
          {/* Top Bar Header */}
          <ChatHeader
            onNewChat={createNewChat}
            onClearChat={clearCurrentChat}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Main Body Grid: Sidebar + Chat Messages */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* Sidebar Conversation List */}
            {isSidebarOpen && (
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={(id) => setActiveConversationId(id)}
                onNewChat={createNewChat}
                onDeleteConversation={deleteConversation}
              />
            )}

            {/* Chat Messages Workspace Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950/60">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {activeConversation.messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}

                {/* Thinking / Processing State Indicator */}
                {isLoading && <ThinkingState />}

                {/* Suggested Prompt Chips (rendered if conversation has <= 1 message) */}
                {activeConversation.messages.length <= 1 && !isLoading && (
                  <SuggestedPrompts onSelectPrompt={handleSendMessage} />
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Field */}
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
