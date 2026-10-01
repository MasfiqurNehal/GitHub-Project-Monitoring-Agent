import { fetchAiApi } from './client';

export interface ChatbotResponseData {
  message_id: string;
  conversation_id: string;
  answer: string;
  metrics?: Array<{ label: string; value: string; color?: string }>;
  sources?: Array<{ title: string; type: string; url?: string }>;
  actions?: Array<{ label: string; action?: string; href?: string }>;
}

export interface ChatbotResponseEnvelope {
  success: boolean;
  data: ChatbotResponseData;
  message?: string;
}

export interface ChatbotConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages_count?: number;
}

/**
 * Sends a chat message to the Floating Chatbot endpoint (/api/v1/chatbot/chat).
 * Enforces strictly isolated chatbot pipeline separate from Engineering Agent.
 */
export async function sendChatbotMessage(
  message: string,
  conversationId?: string
): Promise<ChatbotResponseEnvelope> {
  return await fetchAiApi<ChatbotResponseEnvelope>('/chatbot/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      prompt: message,
      conversation_id: conversationId,
    }),
  });
}

/**
 * Fetch all chatbot conversation sessions owned by the authenticated user.
 */
export async function getChatbotConversations(): Promise<{
  success: boolean;
  conversations: ChatbotConversation[];
  count: number;
}> {
  return await fetchAiApi('/chatbot/conversations', {
    method: 'GET',
  });
}

/**
 * Delete a specific chatbot conversation.
 */
export async function deleteChatbotConversation(conversationId: string): Promise<{ success: boolean }> {
  return await fetchAiApi(`/chatbot/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}

/**
 * Clear all chatbot conversations for user.
 */
export async function clearChatbotHistory(): Promise<{ success: boolean; cleared_count: number }> {
  return await fetchAiApi('/chatbot/history', {
    method: 'DELETE',
  });
}
