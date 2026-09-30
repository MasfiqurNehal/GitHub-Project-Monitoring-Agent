'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ConversationThread,
  ChatMessageItem,
  listEngineeringConversations,
  getEngineeringConversation,
  createEngineeringConversation,
  renameEngineeringConversation,
  deleteEngineeringConversation,
  sendEngineeringAgentMessage,
} from '../lib/api/ai';

export interface AgentContextScope {
  projectId?: string;
  projectName?: string;
  repositoryId?: string;
  repositoryName?: string;
  developerId?: string;
  developerName?: string;
}

export const DRAFT_WELCOME_THREAD: ConversationThread = {
  id: '',
  title: 'New Engineering Analysis',
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Welcome to the **Engineering AI Agent Console**. I provide deterministic, read-only intelligence and multi-agent analysis across your monitored repositories, pull requests, commits, and developer metrics.\n\nHow can I help you today?',
      timestamp: new Date().toISOString(),
    },
  ],
};

export function useAIAgent(initialContext?: AgentContextScope) {
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConversationsLoading, setIsConversationsLoading] = useState<boolean>(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [contextScope, setContextScope] = useState<AgentContextScope>(initialContext || {});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update context scope if initialContext changes from URL/parent
  useEffect(() => {
    if (initialContext && (initialContext.projectId || initialContext.repositoryId || initialContext.developerId)) {
      setContextScope((prev) => ({
        ...prev,
        ...initialContext,
      }));
    }
  }, [initialContext?.projectId, initialContext?.repositoryId, initialContext?.developerId]);

  // Load persistent conversations on initial mount
  useEffect(() => {
    let isMounted = true;
    async function loadInitialConversations() {
      setIsConversationsLoading(true);
      setErrorMessage(null);
      try {
        const fetched = await listEngineeringConversations();
        if (isMounted) {
          if (fetched.length > 0) {
            setConversations(fetched);
            const firstId = fetched[0].id;
            setActiveConversationId(firstId);

            // Fetch full ordered messages for the first active conversation
            setIsMessagesLoading(true);
            try {
              const details = await getEngineeringConversation(firstId);
              if (details && isMounted) {
                setConversations((prev) =>
                  prev.map((c) => (c.id === firstId ? { ...c, ...details } : c))
                );
              }
            } catch (err) {
              console.warn('[useAIAgent] Failed to load messages for initial conversation:', err);
            } finally {
              if (isMounted) setIsMessagesLoading(false);
            }
          } else {
            setConversations([]);
            setActiveConversationId('');
          }
        }
      } catch (err: any) {
        console.warn('[useAIAgent] Failed to load persistent conversations:', err);
        if (isMounted) {
          setErrorMessage(err?.message || 'Unable to load conversation history.');
        }
      } finally {
        if (isMounted) setIsConversationsLoading(false);
      }
    }

    loadInitialConversations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handler to switch active conversation and fetch its historical messages
  const handleSelectConversation = useCallback(
    async (convId: string) => {
      if (!convId) {
        setActiveConversationId('');
        return;
      }
      setActiveConversationId(convId);
      setIsMessagesLoading(true);
      try {
        const details = await getEngineeringConversation(convId);
        if (details) {
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, ...details } : c))
          );
        }
      } catch (err) {
        console.warn(`[useAIAgent] Failed to fetch details for conversation ${convId}:`, err);
      } finally {
        setIsMessagesLoading(false);
      }
    },
    []
  );

  // Derive the active conversation object
  const activeConversation: ConversationThread = useMemo(() => {
    if (!activeConversationId) {
      return DRAFT_WELCOME_THREAD;
    }
    const found = conversations.find((c) => c.id === activeConversationId);
    return found || DRAFT_WELCOME_THREAD;
  }, [conversations, activeConversationId]);

  // Handle sending a message in the active session
  const handleSendMessage = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    const userMessage: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    const currentConvId = activeConversationId;
    const isNewDraft = !currentConvId;

    // Optimistically update visible messages
    if (isNewDraft) {
      // Draft mode: start with user message
      const tempThread: ConversationThread = {
        id: '',
        title: promptText.slice(0, 40),
        updatedAt: new Date().toISOString(),
        messages: [userMessage],
        projectId: contextScope.projectId,
        repositoryId: contextScope.repositoryId,
        developerId: contextScope.developerId,
      };
      setConversations((prev) => [tempThread, ...prev]);
    } else {
      setConversations((prev) =>
        prev.map((thread) => {
          if (thread.id === currentConvId) {
            return {
              ...thread,
              updatedAt: new Date().toISOString(),
              messages: [...thread.messages, userMessage],
            };
          }
          return thread;
        })
      );
    }

    setIsLoading(true);

    try {
      const res = await sendEngineeringAgentMessage({
        conversationId: currentConvId || undefined,
        userMessage: promptText,
        projectId: contextScope.projectId,
        repositoryId: contextScope.repositoryId,
        developerId: contextScope.developerId,
      });

      const actualConvId = res.conversationId;

      setConversations((prev) => {
        let updatedList: ConversationThread[];
        if (isNewDraft) {
          // Replace temp draft thread with real persisted thread
          const realThread: ConversationThread = {
            id: actualConvId,
            title: promptText.slice(0, 40),
            updatedAt: new Date().toISOString(),
            messages: [userMessage, res.data],
            projectId: contextScope.projectId,
            repositoryId: contextScope.repositoryId,
            developerId: contextScope.developerId,
          };
          updatedList = [realThread, ...prev.filter((t) => t.id !== '')];
        } else {
          updatedList = prev.map((thread) => {
            if (thread.id === currentConvId || thread.id === actualConvId) {
              return {
                ...thread,
                id: actualConvId,
                updatedAt: new Date().toISOString(),
                messages: [...thread.messages, res.data],
              };
            }
            return thread;
          });
        }

        // Re-sort conversations by updatedAt DESC so the active conversation moves to top
        return updatedList.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });

      if (isNewDraft && actualConvId) {
        setActiveConversationId(actualConvId);
      }
    } catch (err: any) {
      console.error('[useAIAgent] Send message error:', err);
      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Error: ${err?.message || 'Failed to process engineering analysis.'}`,
        timestamp: new Date().toISOString(),
        isError: true,
        failedPrompt: promptText,
      };

      setConversations((prev) =>
        prev.map((thread) => {
          if (thread.id === currentConvId || (isNewDraft && thread.id === '')) {
            return {
              ...thread,
              updatedAt: new Date().toISOString(),
              messages: [...thread.messages, errorMsg],
            };
          }
          return thread;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Retry a failed prompt
  const retryMessage = async (failedMessageId?: string) => {
    const thread = activeConversation;
    if (!thread || isLoading) return;

    let promptToRetry = '';
    const updatedMessages = [...thread.messages];

    if (failedMessageId) {
      const errorMsgIndex = updatedMessages.findIndex((m) => m.id === failedMessageId);
      if (errorMsgIndex >= 0) {
        const errorMsg = updatedMessages[errorMsgIndex];
        promptToRetry = errorMsg.failedPrompt || '';
        if (!promptToRetry && errorMsgIndex > 0 && updatedMessages[errorMsgIndex - 1].role === 'user') {
          promptToRetry = updatedMessages[errorMsgIndex - 1].content;
        }
        updatedMessages.splice(errorMsgIndex, 1);
      }
    } else {
      const lastMsg = updatedMessages[updatedMessages.length - 1];
      if (lastMsg && lastMsg.isError) {
        promptToRetry = lastMsg.failedPrompt || '';
        updatedMessages.pop();
      }
    }

    if (!promptToRetry) {
      const lastUserMsg = [...updatedMessages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        promptToRetry = lastUserMsg.content;
      }
    }

    if (!promptToRetry) return;

    setConversations((prev) =>
      prev.map((t) => (t.id === activeConversationId ? { ...t, messages: updatedMessages } : t))
    );

    setIsLoading(true);
    try {
      const res = await sendEngineeringAgentMessage({
        conversationId: activeConversationId || undefined,
        userMessage: promptToRetry,
        projectId: contextScope.projectId,
        repositoryId: contextScope.repositoryId,
        developerId: contextScope.developerId,
      });

      setConversations((prev) =>
        prev.map((t) => {
          if (t.id === activeConversationId) {
            return {
              ...t,
              updatedAt: new Date().toISOString(),
              messages: [...updatedMessages, res.data],
            };
          }
          return t;
        })
      );
    } catch (err) {
      console.error('[useAIAgent] Retry error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare a clean new chat session without polluting PostgreSQL with empty records
  const createNewChat = () => {
    setActiveConversationId('');
  };

  // Rename conversation title via PATCH API
  const renameConversation = async (conversationId: string, newTitle: string): Promise<boolean> => {
    if (!conversationId || !newTitle.trim()) return false;
    try {
      const updated = await renameEngineeringConversation(conversationId, newTitle.trim());
      if (updated) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, title: updated.title, updatedAt: updated.updatedAt } : c
          )
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error(`[useAIAgent] Failed to rename conversation ${conversationId}:`, err);
      return false;
    }
  };

  // Soft-delete conversation via DELETE API
  const deleteConversation = async (conversationId: string): Promise<boolean> => {
    if (!conversationId) return false;
    try {
      const success = await deleteEngineeringConversation(conversationId);
      if (success) {
        const remaining = conversations.filter((c) => c.id !== conversationId);
        setConversations(remaining);
        if (activeConversationId === conversationId) {
          if (remaining.length > 0) {
            handleSelectConversation(remaining[0].id);
          } else {
            setActiveConversationId('');
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(`[useAIAgent] Failed to delete conversation ${conversationId}:`, err);
      return false;
    }
  };

  const clearCurrentChat = () => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((thread) => {
        if (thread.id === activeConversationId) {
          return {
            ...thread,
            messages: [],
          };
        }
        return thread;
      })
    );
  };

  const clearContextScope = (scopeKey?: 'projectId' | 'repositoryId' | 'developerId') => {
    if (scopeKey) {
      setContextScope((prev) => {
        const updated = { ...prev };
        delete updated[scopeKey];
        if (scopeKey === 'projectId') delete updated.projectName;
        if (scopeKey === 'repositoryId') delete updated.repositoryName;
        if (scopeKey === 'developerId') delete updated.developerName;
        return updated;
      });
    } else {
      setContextScope({});
    }
  };

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId: handleSelectConversation,
    isLoading,
    isConversationsLoading,
    isMessagesLoading,
    isSidebarOpen,
    setIsSidebarOpen,
    contextScope,
    setContextScope,
    clearContextScope,
    handleSendMessage,
    retryMessage,
    createNewChat,
    renameConversation,
    deleteConversation,
    clearCurrentChat,
    errorMessage,
  };
}
