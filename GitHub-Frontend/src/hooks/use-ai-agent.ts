import { useState, useEffect, useCallback } from 'react';
import { 
  ConversationThread, 
  ChatMessageItem, 
  sendEngineeringAgentMessage,
  fetchUserConversations,
  fetchConversationDetails,
  createNewConversationApi,
  deleteConversationApi
} from '../lib/api/ai';

const DEFAULT_WELCOME_THREAD: ConversationThread = {
  id: `conv-${Date.now()}`,
  title: 'GitMonitor AI Assistant',
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: 'Welcome to **GitMonitor AI Assistant**. How can I help you analyze repositories, commits, PRs, and software development activity today?',
      timestamp: new Date().toISOString(),
    },
  ],
};

export function useAIAgent() {
  const [conversations, setConversations] = useState<ConversationThread[]>([DEFAULT_WELCOME_THREAD]);
  const [activeConversationId, setActiveConversationId] = useState<string>(DEFAULT_WELCOME_THREAD.id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Load user conversations on initial mount
  useEffect(() => {
    let isMounted = true;
    async function loadInitialConversations() {
      try {
        const fetched = await fetchUserConversations();
        if (isMounted && fetched.length > 0) {
          setConversations(fetched);
          setActiveConversationId(fetched[0].id);

          // Fetch full message details for the first conversation
          const details = await fetchConversationDetails(fetched[0].id);
          if (details && isMounted) {
            setConversations((prev) =>
              prev.map((c) => (c.id === details.id ? details : c))
            );
          }
        }
      } catch (err) {
        console.warn('[useAIAgent] Failed to load conversations:', err);
      }
    }
    loadInitialConversations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handler to switch active conversation and fetch its messages
  const handleSelectConversation = useCallback(async (convId: string) => {
    setActiveConversationId(convId);
    try {
      const details = await fetchConversationDetails(convId);
      if (details) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? details : c))
        );
      }
    } catch (err) {
      console.warn(`[useAIAgent] Failed to fetch details for conversation ${convId}:`, err);
    }
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0] || DEFAULT_WELCOME_THREAD;

  const handleSendMessage = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    const userMessage: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    const targetConvId = activeConversationId;

    // Append user message immediately
    setConversations((prev) =>
      prev.map((thread) => {
        if (thread.id === targetConvId) {
          const updatedMessages = [...thread.messages, userMessage];
          return {
            ...thread,
            title: thread.messages.length <= 1 ? promptText.slice(0, 35) : thread.title,
            updatedAt: new Date().toISOString(),
            messages: updatedMessages,
          };
        }
        return thread;
      })
    );

    setIsLoading(true);

    try {
      const res = await sendEngineeringAgentMessage(targetConvId, promptText);

      setConversations((prev) =>
        prev.map((thread) => {
          if (thread.id === targetConvId) {
            return {
              ...thread,
              updatedAt: new Date().toISOString(),
              messages: [...thread.messages, res.data],
            };
          }
          return thread;
        })
      );
    } catch (err) {
      console.error('[useAIAgent] Send message error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const created = await createNewConversationApi('New Conversation');
      if (created) {
        setConversations((prev) => [created, ...prev]);
        setActiveConversationId(created.id);
        return;
      }
    } catch (err) {
      console.warn('[useAIAgent] Failed to create chat via API, creating local thread:', err);
    }

    const fallbackId = `conv-${Date.now()}`;
    const newThread: ConversationThread = {
      id: fallbackId,
      title: 'New Conversation',
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setConversations((prev) => [newThread, ...prev]);
    setActiveConversationId(fallbackId);
  };

  const clearCurrentChat = () => {
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

  const deleteConversation = async (id: string) => {
    await deleteConversationApi(id);
    const remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length > 0) {
      setConversations(remaining);
      if (activeConversationId === id) {
        setActiveConversationId(remaining[0].id);
      }
    } else {
      const newThread = await createNewConversationApi('New Conversation');
      if (newThread) {
        setConversations([newThread]);
        setActiveConversationId(newThread.id);
      } else {
        setConversations([DEFAULT_WELCOME_THREAD]);
        setActiveConversationId(DEFAULT_WELCOME_THREAD.id);
      }
    }
  };

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId: handleSelectConversation,
    isLoading,
    isSidebarOpen,
    setIsSidebarOpen,
    handleSendMessage,
    createNewChat,
    clearCurrentChat,
    deleteConversation,
  };
}
