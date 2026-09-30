'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/layout/header';
import ChatDrawer from '../../components/ai/chat-drawer';
import { useAIAgent } from '../../hooks/use-ai-agent';
import { ChatHeader } from '../../components/ai/ChatHeader';
import { ConversationList } from '../../components/ai/ConversationList';
import { ChatMessage } from '../../components/ai/ChatMessage';
import { SuggestedPrompts } from '../../components/ai/SuggestedPrompts';
import { ThinkingState } from '../../components/ai/ThinkingState';
import { ChatInput } from '../../components/ai/ChatInput';
import { LoadingState } from '../../components/common/LoadingState';

function AIWorkspaceContent() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const projectId = searchParams.get('projectId') || searchParams.get('project_id') || undefined;
  const projectName = searchParams.get('projectName') || undefined;
  const repositoryId = searchParams.get('repositoryId') || searchParams.get('repository_id') || undefined;
  const repositoryName = searchParams.get('repositoryName') || undefined;
  const developerId = searchParams.get('developerId') || searchParams.get('developer_id') || undefined;
  const developerName = searchParams.get('developerName') || undefined;

  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    isLoading,
    isConversationsLoading,
    isMessagesLoading,
    isSidebarOpen,
    setIsSidebarOpen,
    contextScope,
    clearContextScope,
    handleSendMessage,
    retryMessage,
    createNewChat,
    renameConversation,
    clearCurrentChat,
    deleteConversation,
  } = useAIAgent({
    projectId,
    projectName,
    repositoryId,
    repositoryName,
    developerId,
    developerName,
  });

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
            contextScope={contextScope}
            onClearContext={clearContextScope}
          />

          {/* Main Body Grid: Sidebar + Chat Messages */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* Sidebar Conversation List */}
            {isSidebarOpen && (
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                isLoadingConversations={isConversationsLoading}
                onSelectConversation={(id) => setActiveConversationId(id)}
                onNewChat={createNewChat}
                onRenameConversation={renameConversation}
                onDeleteConversation={deleteConversation}
              />
            )}

            {/* Chat Messages Workspace Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950/60">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {isMessagesLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Loading conversation history...</span>
                  </div>
                ) : (
                  activeConversation.messages.map((msg) => (
                    <ChatMessage 
                      key={msg.id} 
                      message={msg} 
                      onRetry={(msgId) => retryMessage(msgId)} 
                    />
                  ))
                )}

                {/* Thinking / Processing State Indicator */}
                {isLoading && <ThinkingState />}

                {/* Suggested Prompt Chips (rendered if conversation has <= 1 message and not loading) */}
                {!isMessagesLoading && activeConversation.messages.length <= 1 && !isLoading && (
                  <SuggestedPrompts 
                    onSelectPrompt={handleSendMessage} 
                    contextScope={contextScope} 
                  />
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

export default function AIWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <LoadingState message="Loading Engineering Agent Console..." />
      </div>
    }>
      <AIWorkspaceContent />
    </Suspense>
  );
}
