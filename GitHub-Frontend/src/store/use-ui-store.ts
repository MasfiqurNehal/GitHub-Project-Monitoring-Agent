import { useState, useCallback } from 'react';

// Simple global event/state store pattern without unneeded external dependencies
export function useUIStore() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const openAIChat = useCallback(() => setIsAIChatOpen(true), []);
  const closeAIChat = useCallback(() => setIsAIChatOpen(false), []);
  const toggleAIChat = useCallback(() => setIsAIChatOpen((prev) => !prev), []);
  const toggleSidebar = useCallback(() => setIsSidebarCollapsed((prev) => !prev), []);

  return {
    isAIChatOpen,
    isSidebarCollapsed,
    openAIChat,
    closeAIChat,
    toggleAIChat,
    toggleSidebar,
  };
}
