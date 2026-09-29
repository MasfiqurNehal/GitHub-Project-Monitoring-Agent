import { fetchAiApi } from './client';

export interface MetricItem {
  label: string;
  value: string | number;
  change?: string;
  color?: string;
}

export interface ArtifactItem {
  id: string;
  title: string;
  artifact_type: string;
  content: string;
  created_at: string;
}

export interface ActionItem {
  label: string;
  href?: string;
  target?: string;
  action?: string;
  type?: string;
}

export interface ToolExecutionSummary {
  tool_name: string;
  status: string;
  duration_ms: number;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  detectedIntent?: string;
  selectedAgent?: string;
  metrics?: MetricItem[];
  sources?: {
    title: string;
    url?: string;
    type: string;
  }[];
  actions?: ActionItem[];
  artifacts?: ArtifactItem[];
  toolsExecuted?: ToolExecutionSummary[];
  executionTimeMs?: number;
  isError?: boolean;
  failedPrompt?: string;
}

export interface ConversationThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessageItem[];
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
}

export interface SendMessageOptions {
  conversationId: string;
  userMessage: string;
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  agentMode?: string;
  parameters?: Record<string, any>;
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
          content: m.content || m.response || '',
          timestamp: m.created_at || new Date().toISOString(),
          metrics: m.metrics,
          sources: m.sources,
          actions: m.actions,
          artifacts: m.artifacts,
          toolsExecuted: m.tools_executed,
          detectedIntent: m.detected_intent,
          selectedAgent: m.selected_agent,
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
          content: m.content || m.response || '',
          timestamp: m.created_at || new Date().toISOString(),
          metrics: m.metrics,
          sources: m.sources,
          actions: m.actions,
          artifacts: m.artifacts,
          toolsExecuted: m.tools_executed,
          detectedIntent: m.detected_intent,
          selectedAgent: m.selected_agent,
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

/**
 * Executes an analytical task with the Engineering AI Agent (FastAPI StateGraph Orchestrator).
 * Scopes analysis to authenticated tenant, with optional project, repository, and developer context.
 */
export async function sendEngineeringAgentMessage(
  conversationIdOrOptions: string | SendMessageOptions,
  maybeUserMessage?: string,
  maybeContext?: { projectId?: string; repositoryId?: string; developerId?: string }
): Promise<{ success: boolean; data: ChatMessageItem }> {
  let opts: SendMessageOptions;
  if (typeof conversationIdOrOptions === 'object') {
    opts = conversationIdOrOptions;
  } else {
    opts = {
      conversationId: conversationIdOrOptions,
      userMessage: maybeUserMessage || '',
      projectId: maybeContext?.projectId,
      repositoryId: maybeContext?.repositoryId,
      developerId: maybeContext?.developerId,
    };
  }

  const { conversationId, userMessage, projectId, repositoryId, developerId, agentMode, parameters } = opts;

  try {
    const requestPayload: Record<string, any> = {
      message: userMessage,
      conversation_id: conversationId,
    };

    if (projectId) requestPayload.project_id = projectId;
    if (repositoryId) requestPayload.repository_id = repositoryId;
    if (developerId) requestPayload.developer_id = developerId;
    if (agentMode) requestPayload.agent_mode = agentMode;
    if (parameters && Object.keys(parameters).length > 0) {
      requestPayload.parameters = parameters;
    }

    const res = await fetchAiApi<any>('/engineering-agent/chat', {
      method: 'POST',
      body: JSON.stringify(requestPayload),
    });

    const data = res.data || res;
    const assistantMsg: ChatMessageItem = {
      id: data.message_id || `ast-${Date.now()}`,
      role: 'assistant',
      content: data.response || data.answer || 'No response generated.',
      timestamp: new Date().toISOString(),
      detectedIntent: data.detected_intent,
      selectedAgent: data.selected_agent,
      metrics: data.metrics || [],
      artifacts: data.artifacts || [],
      toolsExecuted: data.tools_executed || [],
      executionTimeMs: data.execution_time_ms || 0,
      sources: data.sources || [],
      actions: (data.actions || []).map((act: any) => ({
        label: act.label,
        href: act.href || act.target,
        target: act.target,
        type: act.action_type || act.action || act.type || 'link',
      })),
    };

    return { success: true, data: assistantMsg };
  } catch (err: any) {
    const errorContent = err.message || 'Failed to connect to FastAPI Engineering Agent.';
    const errorMsg: ChatMessageItem = {
      id: `err-${Date.now()}`,
      role: 'assistant',
      content: `⚠️ Error: ${errorContent}`,
      timestamp: new Date().toISOString(),
      isError: true,
      failedPrompt: userMessage,
      metrics: [{ label: 'Status', value: 'API Error', color: 'text-rose-400' }],
    };
    return { success: false, data: errorMsg };
  }
}
