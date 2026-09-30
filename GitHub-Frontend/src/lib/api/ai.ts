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

export interface ConversationSummary {
  id: string;
  title: string;
  project_id?: string | null;
  repository_id?: string | null;
  developer_id?: string | null;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
  messages_count?: number;
}

export interface ConversationThread {
  id: string;
  title: string;
  updatedAt: string;
  createdAt?: string;
  messages: ChatMessageItem[];
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  isPinned?: boolean;
}

export interface SendMessageOptions {
  conversationId?: string;
  userMessage: string;
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  agentMode?: string;
  parameters?: Record<string, any>;
}

export interface SendMessageResult {
  success: boolean;
  conversationId: string;
  data: ChatMessageItem;
}

export const MOCK_CONVERSATIONS: ConversationThread[] = [];

/**
 * List all persistent engineering agent conversations for authenticated user & organization.
 * Ordered by updated_at DESC for ChatGPT-style recency.
 */
export async function listEngineeringConversations(limit = 50, offset = 0): Promise<ConversationThread[]> {
  try {
    const res = await fetchAiApi<{ success: boolean; conversations: any[] }>(
      `/engineering-agent/conversations?limit=${limit}&offset=${offset}`
    );
    if (res && res.conversations) {
      return res.conversations.map((c) => ({
        id: c.id,
        title: c.title || 'New Engineering Analysis',
        updatedAt: c.updated_at || c.created_at || new Date().toISOString(),
        createdAt: c.created_at || new Date().toISOString(),
        projectId: c.project_id || undefined,
        repositoryId: c.repository_id || undefined,
        developerId: c.developer_id || undefined,
        isPinned: Boolean(c.is_pinned),
        messages: [],
      }));
    }
    return [];
  } catch (err) {
    console.warn('[AI API] Failed to list engineering conversations:', err);
    throw err;
  }
}

/**
 * Fetch a single persistent engineering conversation with full ordered messages (created_at ASC).
 */
export async function getEngineeringConversation(conversationId: string): Promise<ConversationThread | null> {
  try {
    const res = await fetchAiApi<{ success: boolean; conversation: any }>(
      `/engineering-agent/conversations/${conversationId}`
    );
    if (res && res.conversation) {
      const c = res.conversation;
      return {
        id: c.id,
        title: c.title || 'New Engineering Analysis',
        updatedAt: c.updated_at || c.created_at || new Date().toISOString(),
        createdAt: c.created_at || new Date().toISOString(),
        projectId: c.project_id || undefined,
        repositoryId: c.repository_id || undefined,
        developerId: c.developer_id || undefined,
        isPinned: Boolean(c.is_pinned),
        messages: (c.messages || []).map((m: any) => ({
          id: m.id || `msg-${Date.now()}`,
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content || '',
          timestamp: m.created_at || new Date().toISOString(),
          detectedIntent: m.detected_intent,
          selectedAgent: m.selected_agent,
          metrics: m.metrics || [],
          artifacts: m.artifacts || [],
          actions: (m.actions || []).map((act: any) => ({
            label: act.label,
            href: act.href || act.target,
            target: act.target,
            type: act.action_type || act.action || act.type || 'link',
          })),
          toolsExecuted: m.tools_executed || [],
          executionTimeMs: m.execution_time_ms || 0,
        })),
      };
    }
    return null;
  } catch (err) {
    console.warn(`[AI API] Failed to get engineering conversation ${conversationId}:`, err);
    throw err;
  }
}

/**
 * Explicitly create a new persistent engineering conversation session.
 */
export async function createEngineeringConversation(
  title = 'New Engineering Analysis',
  projectId?: string,
  repositoryId?: string,
  developerId?: string
): Promise<ConversationThread | null> {
  try {
    const payload: Record<string, any> = { title };
    if (projectId) payload.project_id = projectId;
    if (repositoryId) payload.repository_id = repositoryId;
    if (developerId) payload.developer_id = developerId;

    const res = await fetchAiApi<{ success: boolean; conversation: any }>(
      '/engineering-agent/conversations',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    if (res && res.conversation) {
      const c = res.conversation;
      return {
        id: c.id,
        title: c.title || title,
        updatedAt: c.updated_at || new Date().toISOString(),
        createdAt: c.created_at || new Date().toISOString(),
        projectId: c.project_id || undefined,
        repositoryId: c.repository_id || undefined,
        developerId: c.developer_id || undefined,
        isPinned: Boolean(c.is_pinned),
        messages: [],
      };
    }
    return null;
  } catch (err) {
    console.warn('[AI API] Failed to create engineering conversation:', err);
    throw err;
  }
}

/**
 * Rename an existing engineering conversation title.
 */
export async function renameEngineeringConversation(
  conversationId: string,
  title: string
): Promise<ConversationThread | null> {
  try {
    const res = await fetchAiApi<{ success: boolean; conversation: any }>(
      `/engineering-agent/conversations/${conversationId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }
    );
    if (res && res.conversation) {
      const c = res.conversation;
      return {
        id: c.id,
        title: c.title || title,
        updatedAt: c.updated_at || new Date().toISOString(),
        createdAt: c.created_at || new Date().toISOString(),
        projectId: c.project_id || undefined,
        repositoryId: c.repository_id || undefined,
        developerId: c.developer_id || undefined,
        isPinned: Boolean(c.is_pinned),
        messages: [],
      };
    }
    return null;
  } catch (err) {
    console.warn(`[AI API] Failed to rename engineering conversation ${conversationId}:`, err);
    throw err;
  }
}

/**
 * Soft-delete an engineering conversation.
 */
export async function deleteEngineeringConversation(conversationId: string): Promise<boolean> {
  try {
    const res = await fetchAiApi<{ success: boolean }>(
      `/engineering-agent/conversations/${conversationId}`,
      {
        method: 'DELETE',
      }
    );
    return Boolean(res?.success);
  } catch (err) {
    console.warn(`[AI API] Failed to delete engineering conversation ${conversationId}:`, err);
    throw err;
  }
}

// Backward-compatibility aliases for existing callers
export const fetchUserConversations = listEngineeringConversations;
export const fetchConversationDetails = getEngineeringConversation;
export const createNewConversationApi = createEngineeringConversation;
export const deleteConversationApi = deleteEngineeringConversation;

/**
 * Executes an analytical task with the Engineering AI Agent (FastAPI StateGraph Orchestrator).
 * Scopes analysis to authenticated tenant and persists user/assistant messages to PostgreSQL.
 */
export async function sendEngineeringAgentMessage(
  conversationIdOrOptions?: string | SendMessageOptions,
  maybeUserMessage?: string,
  maybeContext?: { projectId?: string; repositoryId?: string; developerId?: string }
): Promise<SendMessageResult> {
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
    };

    if (conversationId) requestPayload.conversation_id = conversationId;
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
    const returnedConvId = data.conversation_id || conversationId || '';

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

    return { success: true, conversationId: returnedConvId, data: assistantMsg };
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
    return { success: false, conversationId: conversationId || '', data: errorMsg };
  }
}
