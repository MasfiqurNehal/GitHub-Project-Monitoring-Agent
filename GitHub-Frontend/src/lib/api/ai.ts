import { fetchAiApi } from './client';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metrics?: {
    label: string;
    value: string | number;
    color?: string;
  }[];
  sources?: {
    title: string;
    url?: string;
    type: string;
  }[];
  actions?: {
    label: string;
    href?: string;
    target?: string;
    action?: string;
    type?: string;
  }[];
}

export interface ConversationThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessageItem[];
}

export const MOCK_CONVERSATIONS: ConversationThread[] = [];

export async function fetchUserConversations(): Promise<ConversationThread[]> {
  try {
    const res = await fetchAiApi<{ success: boolean; conversations: any[] }>('/chatbot/conversations');
    if (res && res.conversations) {
      return res.conversations.map((c) => ({
        id: c.id,
        title: c.title || 'Conversation',
        updatedAt: c.updated_at || c.created_at || new Date().toISOString(),
        messages: (c.messages || []).map((m: any) => ({
          id: m.id || m.message_id,
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content,
          timestamp: m.created_at || new Date().toISOString(),
          metrics: m.metrics,
          sources: m.sources,
          actions: m.actions,
        })),
      }));
    }
    return [];
  } catch (err) {
    console.warn('[AI API] Failed to fetch user conversations from FastAPI:', err);
    return [];
  }
}

export async function fetchConversationDetails(conversationId: string): Promise<ConversationThread | null> {
  try {
    const res = await fetchAiApi<{ success: boolean; conversation: any }>(`/chatbot/conversations/${conversationId}`);
    if (res && res.conversation) {
      const c = res.conversation;
      return {
        id: c.id,
        title: c.title || 'Conversation',
        updatedAt: c.updated_at || c.created_at || new Date().toISOString(),
        messages: (c.messages || []).map((m: any) => ({
          id: m.id || m.message_id,
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content,
          timestamp: m.created_at || new Date().toISOString(),
          metrics: m.metrics,
          sources: m.sources,
          actions: m.actions,
        })),
      };
    }
    return null;
  } catch (err) {
    console.warn(`[AI API] Failed to fetch conversation ${conversationId}:`, err);
    return null;
  }
}

export async function createNewConversationApi(title?: string): Promise<ConversationThread | null> {
  try {
    const res = await fetchAiApi<{ success: boolean; conversation: any }>('/chatbot/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Conversation' }),
    });
    if (res && res.conversation) {
      const c = res.conversation;
      return {
        id: c.id,
        title: c.title || 'New Conversation',
        updatedAt: c.updated_at || new Date().toISOString(),
        messages: [],
      };
    }
    return null;
  } catch (err) {
    console.warn('[AI API] Failed to create new conversation:', err);
    return null;
  }
}

export async function deleteConversationApi(conversationId: string): Promise<boolean> {
  try {
    const res = await fetchAiApi<{ success: boolean }>(`/chatbot/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    return res.success;
  } catch (err) {
    console.warn(`[AI API] Failed to delete conversation ${conversationId}:`, err);
    return false;
  }
}

export async function sendEngineeringAgentMessage(
  conversationId: string,
  userMessage: string
): Promise<{ success: boolean; data: ChatMessageItem }> {
  try {
    const res = await fetchAiApi<any>('/chatbot/chat', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        prompt: userMessage,
      }),
    });

    const data = res.data || res;
    const assistantMsg: ChatMessageItem = {
      id: data.message_id || `ast-${Date.now()}`,
      role: 'assistant',
      content: data.answer || 'No response generated.',
      timestamp: new Date().toISOString(),
      metrics: data.metrics,
      sources: data.sources,
      actions: (data.actions || []).map((act: any) => ({
        label: act.label,
        href: act.target || act.href,
        target: act.target,
        type: act.action || act.type,
      })),
    };
    return { success: true, data: assistantMsg };
  } catch (err: any) {
    const errorMsg: ChatMessageItem = {
      id: `err-${Date.now()}`,
      role: 'assistant',
      content: `⚠️ Error: ${err.message || 'Failed to connect to FastAPI AI Backend.'}`,
      timestamp: new Date().toISOString(),
      metrics: [{ label: 'Status', value: 'API Error', color: 'text-rose-400' }],
    };
    return { success: false, data: errorMsg };
  }
}
