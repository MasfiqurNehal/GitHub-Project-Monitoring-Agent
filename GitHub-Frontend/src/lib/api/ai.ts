import { fetchAiApi, getAiApiUrl, AgentErrorCategory, TypedAgentError, classifyAgentError } from './client';

export type { AgentErrorCategory };

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
  start_time?: number;
  end_time?: number;
  error?: string;
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
  errorCategory?: AgentErrorCategory;
  rawErrorDetails?: string;
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
  onProgress?: (stage: string, tool?: string) => void;
}


export interface SendMessageResult {
  success: boolean;
  conversationId: string;
  data: ChatMessageItem;
}

export const MOCK_CONVERSATIONS: ConversationThread[] = [];

// Module-level in-memory caches for fast navigation without redundant network roundtrips (Part 15 & 16)
let _cachedSummaries: ConversationThread[] | null = null;
const _conversationMessageCache = new Map<string, ConversationThread>();

export function getCachedSummaries(): ConversationThread[] | null {
  return _cachedSummaries;
}

export function setCachedSummaries(summaries: ConversationThread[]) {
  _cachedSummaries = summaries;
}

export function getCachedConversationMessages(conversationId: string): ConversationThread | null {
  return _conversationMessageCache.get(conversationId) || null;
}

export function setCachedConversationMessages(conversationId: string, thread: ConversationThread) {
  _conversationMessageCache.set(conversationId, thread);
}

export function invalidateConversationCache(conversationId?: string) {
  if (conversationId) {
    _conversationMessageCache.delete(conversationId);
    if (_cachedSummaries) {
      _cachedSummaries = _cachedSummaries.filter((c) => c.id !== conversationId);
    }
  } else {
    _conversationMessageCache.clear();
    _cachedSummaries = null;
  }
}

/**
 * List all persistent engineering agent conversations for authenticated user & organization.
 * Returns lightweight summaries without fetching full message histories.
 * Ordered by updated_at DESC for ChatGPT-style recency.
 */
export async function listEngineeringConversations(
  limit = 50,
  offset = 0,
  options?: { forceFresh?: boolean; signal?: AbortSignal }
): Promise<ConversationThread[]> {
  if (!options?.forceFresh && _cachedSummaries && _cachedSummaries.length > 0) {
    return _cachedSummaries;
  }

  try {
    const res = await fetchAiApi<{ success: boolean; conversations: any[] }>(
      `/engineering-agent/conversations?limit=${limit}&offset=${offset}`,
      { signal: options?.signal }
    );
    if (res && res.conversations) {
      const summaries = res.conversations.map((c) => ({
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
      _cachedSummaries = summaries;
      return summaries;
    }
    return [];
  } catch (err) {
    console.warn('[AI API] Failed to list engineering conversations:', err);
    throw err;
  }
}

/**
 * Fetch a single persistent engineering conversation with full ordered messages (created_at ASC).
 * Uses in-memory caching to avoid redundant roundtrips on repeated tab/conversation switches.
 */
export async function getEngineeringConversation(
  conversationId: string,
  options?: { forceFresh?: boolean; signal?: AbortSignal }
): Promise<ConversationThread | null> {
  if (!options?.forceFresh && _conversationMessageCache.has(conversationId)) {
    return _conversationMessageCache.get(conversationId)!;
  }

  try {
    const res = await fetchAiApi<{ success: boolean; conversation: any }>(
      `/engineering-agent/conversations/${conversationId}`,
      { signal: options?.signal }
    );
    if (res && res.conversation) {
      const c = res.conversation;
      const thread: ConversationThread = {
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
      _conversationMessageCache.set(conversationId, thread);
      return thread;
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
 * Supports real-time Server-Sent Events (SSE) streaming with transparent JSON fallback.
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

  const { conversationId, userMessage, projectId, repositoryId, developerId, agentMode, parameters, onProgress } = opts;

  // Try streaming execution first if onProgress callback provided (Part 12)
  if (onProgress) {
    try {
      return await streamEngineeringAgentMessage(opts);
    } catch (streamErr) {
      console.warn('[AI API] SSE Streaming encountered an issue, falling back to standard JSON:', streamErr);
    }
  }

  try {
    if (onProgress) onProgress('Understanding request...');

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

    if (onProgress && (projectId || repositoryId)) {
      onProgress('Resolving project context...');
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

    if (onProgress) onProgress('Completed.');
    return { success: true, conversationId: returnedConvId, data: assistantMsg };
  } catch (err: any) {
    const classified = classifyAgentError(err);
    const errorMsg: ChatMessageItem = {
      id: `err-${Date.now()}`,
      role: 'assistant',
      content: `⚠️ **Error (${classified.category}):** ${classified.message}`,
      timestamp: new Date().toISOString(),
      isError: true,
      errorCategory: classified.category,
      rawErrorDetails: classified.rawDetails,
      failedPrompt: userMessage,
      metrics: [{ label: 'Status', value: classified.category.replace('_', ' '), color: 'text-rose-400' }],
    };
    return { success: false, conversationId: conversationId || '', data: errorMsg };
  }
}

/**
 * Executes an analytical task with progressive Server-Sent Events (SSE) streaming (Part 12).
 */
export async function streamEngineeringAgentMessage(
  opts: SendMessageOptions
): Promise<SendMessageResult> {
  const { conversationId, userMessage, projectId, repositoryId, developerId, agentMode, parameters, onProgress } = opts;
  const url = getAiApiUrl('/engineering-agent/chat/stream');
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const requestPayload: Record<string, any> = {
    message: userMessage,
  };
  if (conversationId) requestPayload.conversation_id = conversationId;
  if (projectId) requestPayload.project_id = projectId;
  if (repositoryId) requestPayload.repository_id = repositoryId;
  if (developerId) requestPayload.developer_id = developerId;
  if (agentMode) requestPayload.agent_mode = agentMode;
  if (parameters && Object.keys(parameters).length > 0) requestPayload.parameters = parameters;

  if (onProgress) onProgress('Understanding request...');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => '');
    throw classifyAgentError(errText || `Streaming failed with status ${response.status}`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponseData: any = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const chunk of lines) {
      if (!chunk.trim()) continue;
      const eventMatch = chunk.match(/^event:\s*(.+)$/m);
      const dataMatch = chunk.match(/^data:\s*(.+)$/m);

      const eventType = eventMatch ? eventMatch[1].trim() : 'message';
      let eventData: any = {};
      try {
        if (dataMatch) eventData = JSON.parse(dataMatch[1].trim());
      } catch (e) {}

      if (eventType === 'agent_started' && onProgress) {
        onProgress('Understanding request...');
      } else if (eventType === 'context_resolved' && onProgress) {
        onProgress('Resolving project context...');
      } else if (eventType === 'intent_detected' && onProgress) {
        onProgress(`Intent: ${eventData.intent || 'Selected'}`, eventData.selected_agent);
      } else if (eventType === 'tool_completed' && onProgress) {
        onProgress(`Querying GitHub data...`, eventData.tool);
      } else if (eventType === 'llm_completed' && onProgress) {
        onProgress('Generating response...');
      } else if (eventType === 'response_completed') {
        finalResponseData = eventData;
      } else if (eventType === 'error') {
        throw new Error(eventData.error || 'Streaming error');
      }
    }
  }

  if (finalResponseData) {
    const data = finalResponseData;
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

    if (onProgress) onProgress('Completed.');
    return { success: true, conversationId: returnedConvId, data: assistantMsg };
  }

  throw new Error('Streaming stream finished without a response_completed event.');
}

