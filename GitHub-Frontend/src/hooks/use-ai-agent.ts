import { useState } from 'react';
import { 
  MOCK_CONVERSATIONS, 
  ConversationThread, 
  ChatMessageItem, 
  sendEngineeringAgentMessage 
} from '../lib/api/ai';

export function useAIAgent() {
  const [conversations, setConversations] = useState<ConversationThread[]>(MOCK_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string>(MOCK_CONVERSATIONS[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const handleSendMessage = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    const userMessage: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    // Add user message to active thread
    setConversations((prev) =>
      prev.map((thread) => {
        if (thread.id === activeConversationId) {
          const updatedMessages = [...thread.messages, userMessage];
          return {
            ...thread,
            title: thread.messages.length === 0 ? promptText : thread.title,
            updatedAt: new Date().toISOString(),
            messages: updatedMessages,
          };
        }
        return thread;
      })
    );

    setIsLoading(true);

    try {
      const res = await sendEngineeringAgentMessage(activeConversationId, promptText);

      setConversations((prev) =>
        prev.map((thread) => {
          if (thread.id === activeConversationId) {
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
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newThread: ConversationThread = {
      id: newId,
      title: 'New Engineering Analysis',
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome-msg',
          role: 'assistant',
          content: 'Welcome to the **Engineering Agent Console**. I am equipped with read-only database telemetry, commit logs, PR review matrices, and repository indexes.\n\nAsk me any question regarding active sprint activity, developer metrics, PR bottlenecks, or historical trends.',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setConversations((prev) => [newThread, ...prev]);
    setActiveConversationId(newId);
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

  const deleteConversation = (id: string) => {
    const remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length > 0) {
      setConversations(remaining);
      if (activeConversationId === id) {
        setActiveConversationId(remaining[0].id);
      }
    }
  };

  return {
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
  };
}
