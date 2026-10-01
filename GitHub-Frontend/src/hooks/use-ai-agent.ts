'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ConversationThread,
  ChatMessageItem,
  listEngineeringConversations,
  getEngineeringConversation,
  createEngineeringConversation,
  renameEngineeringConversation,
  deleteEngineeringConversation,
  sendEngineeringAgentMessage,
  getCachedSummaries,
  setCachedSummaries,
  getCachedConversationMessages,
  setCachedConversationMessages,
  invalidateConversationCache,
} from '../lib/api/ai';

export interface AgentContextScope {
  conversationId?: string;
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
  // Navigation performance: initialize with cached summaries if returning to /ai (Part 16)
  const cachedInitial = getCachedSummaries();
  const [conversations, setConversations] = useState<ConversationThread[]>(cachedInitial || []);
  const [activeConversationId, setActiveConversationId] = useState<string>(
    initialContext?.conversationId || ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConversationsLoading, setIsConversationsLoading] = useState<boolean>(!cachedInitial || cachedInitial.length === 0);
  const [isMessagesLoading, setIsMessagesLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [contextScope, setContextScope] = useState<AgentContextScope>(initialContext || {});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [executionStage, setExecutionStage] = useState<string>('Understanding request...');
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);

  // Stale request abortion & duplicate prevention refs (Part 15)
  const activeFetchAbortRef = useRef<AbortController | null>(null);
  const isFetchingSummariesRef = useRef<boolean>(false);

  // Update context scope if initialContext changes from URL/parent
  useEffect(() => {
    if (initialContext && (initialContext.projectId || initialContext.repositoryId || initialContext.developerId)) {
      setContextScope((prev) => ({
        ...prev,
        ...initialContext,
      }));
    }
  }, [initialContext?.projectId, initialContext?.repositoryId, initialContext?.developerId]);

  // Load persistent conversations on initial mount without forcing old conversation selection (Part 15)
  useEffect(() => {
    let isMounted = true;
    if (isFetchingSummariesRef.current) return;
    isFetchingSummariesRef.current = true;

    async function loadInitialConversations() {
      if (!cachedInitial || cachedInitial.length === 0) {
        setIsConversationsLoading(true);
      }
      setErrorMessage(null);
      try {
        const fetched = await listEngineeringConversations();
        if (isMounted) {
          setConversations(fetched);
          setCachedSummaries(fetched);

          // If a specific conversationId was explicitly requested in initialContext/URL, load it
          if (initialContext?.conversationId) {
            const requestedId = initialContext.conversationId;
            setActiveConversationId(requestedId);
            setIsMessagesLoading(true);
            try {
              const details = await getEngineeringConversation(requestedId);
              if (details && isMounted) {
                setConversations((prev) =>
                  prev.map((c) => (c.id === requestedId ? { ...c, ...details } : c))
                );
              }
            } catch (err) {
              console.warn('[useAIAgent] Failed to load requested conversation:', err);
            } finally {
              if (isMounted) setIsMessagesLoading(false);
            }
          }
        }
      } catch (err: any) {
        console.warn('[useAIAgent] Failed to load persistent conversations:', err);
        if (isMounted) {
          setErrorMessage(err?.message || 'Unable to load conversation history.');
        }
      } finally {
        if (isMounted) setIsConversationsLoading(false);
        isFetchingSummariesRef.current = false;
      }
    }

    loadInitialConversations();
    return () => {
      isMounted = false;
      isFetchingSummariesRef.current = false;
    };
  }, [initialContext?.conversationId]);

  // Handler to switch active conversation with AbortController for stale requests & in-memory caching (Part 15 & 16)
  const handleSelectConversation = useCallback(
    async (convId: string) => {
      if (!convId) {
        setActiveConversationId('');
        return;
      }
      setActiveConversationId(convId);

      // Check in-memory message cache first
      const cached = getCachedConversationMessages(convId);
      if (cached && cached.messages && cached.messages.length > 0) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, ...cached } : c))
        );
        setIsMessagesLoading(false);
        return;
      }

      // Abort any in-flight stale conversation fetch
      if (activeFetchAbortRef.current) {
        activeFetchAbortRef.current.abort();
      }
      const controller = new AbortController();
      activeFetchAbortRef.current = controller;

      setIsMessagesLoading(true);
      try {
        const details = await getEngineeringConversation(convId, { signal: controller.signal });
        if (details) {
          setCachedConversationMessages(convId, details);
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, ...details } : c))
          );
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn(`[useAIAgent] Failed to fetch details for conversation ${convId}:`, err);
        }
      } finally {
        setIsMessagesLoading(false);
      }
    },
    []
  );

  // Derive the active conversation object (supporting optimistic draft updates)
  const activeConversation: ConversationThread = useMemo(() => {
    if (!activeConversationId) {
      const draftThread = conversations.find((c) => c.id === '');
      return draftThread || DRAFT_WELCOME_THREAD;
    }
    const found = conversations.find((c) => c.id === activeConversationId);
    return found || DRAFT_WELCOME_THREAD;
  }, [conversations, activeConversationId]);

  // Handle sending a message in the active session (Immediate rendering & duplicate prevention - Part 10)
  const handleSendMessage = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    // 1. Immediately render user's message with client message ID
    const clientTempId = `client-msg-${Date.now()}`;
    const userMessage: ChatMessageItem = {
      id: clientTempId,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    const currentConvId = activeConversationId;
    const isNewDraft = !currentConvId;

    // Optimistically update visible messages immediately
    if (isNewDraft) {
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

    // 2. Disable duplicate submissions & initialize execution progress state (Part 10 & 11)
    setIsLoading(true);
    setExecutionStage('Understanding request...');
    setActiveTool(undefined);

    try {
      const res = await sendEngineeringAgentMessage({
        conversationId: currentConvId || undefined,
        userMessage: promptText,
        projectId: contextScope.projectId,
        repositoryId: contextScope.repositoryId,
        developerId: contextScope.developerId,
        onProgress: (stage, tool) => {
          setExecutionStage(stage);
          if (tool) setActiveTool(tool);
        },
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
          setCachedConversationMessages(actualConvId, realThread);
          updatedList = [realThread, ...prev.filter((t) => t.id !== '')];
        } else {
          updatedList = prev.map((thread) => {
            if (thread.id === currentConvId || thread.id === actualConvId) {
              const updatedThread: ConversationThread = {
                ...thread,
                id: actualConvId,
                updatedAt: new Date().toISOString(),
                messages: [...thread.messages, res.data],
              };
              setCachedConversationMessages(actualConvId, updatedThread);
              return updatedThread;
            }
            return thread;
          });
        }

        const sorted = updatedList.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setCachedSummaries(sorted);
        return sorted;
      });

      if (isNewDraft && actualConvId) {
        setActiveConversationId(actualConvId);
      }
    } catch (err: any) {
      console.error('[useAIAgent] Send message error:', err);
      // Keep the user message visible on error (Part 10)
      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Something went wrong while processing this request.\n\n**Details:** ${err?.message || 'The AI Agent service encountered an unexpected error.'}`,
        timestamp: new Date().toISOString(),
        isError: true,
        errorCategory: err?.category || 'AGENT_EXECUTION_ERROR',
        rawErrorDetails: err?.rawDetails,
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
      setActiveTool(undefined);
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
        setConversations((prev) => {
          const updatedList = prev.map((c) =>
            c.id === conversationId ? { ...c, title: updated.title, updatedAt: updated.updatedAt } : c
          );
          setCachedSummaries(updatedList);
          return updatedList;
        });
        const cachedThread = getCachedConversationMessages(conversationId);
        if (cachedThread) {
          setCachedConversationMessages(conversationId, {
            ...cachedThread,
            title: updated.title,
            updatedAt: updated.updatedAt,
          });
        }
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
        invalidateConversationCache(conversationId);
        const remaining = conversations.filter((c) => c.id !== conversationId);
        setConversations(remaining);
        setCachedSummaries(remaining);
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
    executionStage,
    activeTool,
  };
}

