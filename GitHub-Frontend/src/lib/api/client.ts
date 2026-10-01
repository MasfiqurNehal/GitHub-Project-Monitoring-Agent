export type AgentErrorCategory =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'LLM_ERROR'
  | 'TOOL_ERROR'
  | 'DATABASE_ERROR'
  | 'AGENT_EXECUTION_ERROR'
  | 'UNKNOWN_ERROR';

export class TypedAgentError extends Error {
  category: AgentErrorCategory;
  statusCode?: number;
  rawDetails?: string;

  constructor(
    category: AgentErrorCategory,
    userFriendlyMessage: string,
    statusCode?: number,
    rawDetails?: string
  ) {
    super(userFriendlyMessage);
    this.name = 'TypedAgentError';
    this.category = category;
    this.statusCode = statusCode;
    this.rawDetails = rawDetails;
  }
}

export function classifyAgentError(err: any, statusCode?: number): TypedAgentError {
  const errMsg = (err?.message || (typeof err === 'string' ? err : 'Unknown error')).toLowerCase();
  const rawDetails = err?.stack || err?.message || String(err);

  if (statusCode === 401 || statusCode === 403 || errMsg.includes('unauthorized') || errMsg.includes('forbidden') || errMsg.includes('auth')) {
    return new TypedAgentError(
      'AUTH_ERROR',
      'Authentication session expired or unauthorized. Please re-authenticate.',
      statusCode || 401,
      rawDetails
    );
  }

  if (statusCode === 422 || errMsg.includes('validation') || errMsg.includes('unprocessable') || errMsg.includes('invalid argument')) {
    return new TypedAgentError(
      'VALIDATION_ERROR',
      'The requested query parameters could not be validated.',
      statusCode || 422,
      rawDetails
    );
  }

  if (statusCode === 504 || statusCode === 408 || errMsg.includes('timeout') || errMsg.includes('timed out') || errMsg.includes('aborted')) {
    return new TypedAgentError(
      'TIMEOUT_ERROR',
      'The agent operation timed out while communicating with external services.',
      statusCode || 504,
      rawDetails
    );
  }

  if (errMsg.includes('llm') || errMsg.includes('openai') || errMsg.includes('betopia') || errMsg.includes('gemini') || errMsg.includes('model unavailable') || errMsg.includes('quota')) {
    return new TypedAgentError(
      'LLM_ERROR',
      'The configured AI reasoning provider encountered a service error.',
      statusCode || 502,
      rawDetails
    );
  }

  if (errMsg.includes('github') || errMsg.includes('repository not found') || errMsg.includes('tool failed') || errMsg.includes('express')) {
    return new TypedAgentError(
      'TOOL_ERROR',
      'A required telemetry or GitHub tool could not retrieve live data.',
      statusCode || 502,
      rawDetails
    );
  }

  if (errMsg.includes('database') || errMsg.includes('neon') || errMsg.includes('postgres') || errMsg.includes('connection pool')) {
    return new TypedAgentError(
      'DATABASE_ERROR',
      'A database connection error occurred while retrieving project telemetry.',
      statusCode || 500,
      rawDetails
    );
  }

  if (errMsg.includes('failed to fetch') || errMsg.includes('networkerror') || errMsg.includes('connection refused') || errMsg.includes('cors')) {
    return new TypedAgentError(
      'NETWORK_ERROR',
      'Unable to connect to the AI agent service. Please check network connectivity.',
      statusCode || 0,
      rawDetails
    );
  }

  return new TypedAgentError(
    'AGENT_EXECUTION_ERROR',
    err?.message || 'An unexpected error occurred during agent execution.',
    statusCode || 500,
    rawDetails
  );
}

export class ApiError extends Error {
  status: number;
  code?: string;
  category?: AgentErrorCategory;

  constructor(message: string, status: number, code?: string, category?: AgentErrorCategory) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.category = category;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access. Please log in or re-authenticate.') {
    super(message, 401, 'UNAUTHORIZED', 'AUTH_ERROR');
    this.name = 'UnauthorizedError';
  }
}

export class AccessDeniedError extends ApiError {
  constructor(message = 'Repository or resource access denied.') {
    super(message, 403, 'FORBIDDEN', 'AUTH_ERROR');
    this.name = 'AccessDeniedError';
  }
}

export class SyncInProgressError extends ApiError {
  constructor(message = 'Synchronization is currently in progress.') {
    super(message, 409, 'SYNC_IN_PROGRESS', 'AGENT_EXECUTION_ERROR');
    this.name = 'SyncInProgressError';
  }
}


const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/$/, '');

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data: T; message?: string; error?: string }> {
  const url = getApiUrl(endpoint);
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options?.headers,
      },
    });

    // If 401 Unauthorized, attempt transparent token refresh once
    if (response.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const storedRefreshToken = localStorage.getItem('refresh_token');
      if (storedRefreshToken) {
        try {
          const refreshRes = await fetch(getApiUrl('/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });
          const refreshBody = await refreshRes.json();
          if (refreshRes.ok && refreshBody?.data?.accessToken) {
            localStorage.setItem('auth_token', refreshBody.data.accessToken);
            if (refreshBody.data.refreshToken) {
              localStorage.setItem('refresh_token', refreshBody.data.refreshToken);
            }
            // Retry original request with fresh token
            response = await fetch(url, {
              ...options,
              headers: {
                ...defaultHeaders,
                Authorization: `Bearer ${refreshBody.data.accessToken}`,
                ...options?.headers,
              },
            });
          }
        } catch (e) {
          // Token refresh failed, continue with original 401
        }
      }
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        typeof body.error === 'string'
          ? body.error
          : (body.error?.message || body.message || `API request failed with status ${response.status}`);
      
      if (response.status === 401) {
        throw new UnauthorizedError(errorMessage);
      }
      if (response.status === 403) {
        throw new AccessDeniedError(errorMessage);
      }
      if (response.status === 409 || response.status === 202) {
        throw new SyncInProgressError(errorMessage);
      }

      throw new ApiError(errorMessage, response.status, body.code);
    }

    return body;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network connection error', 500);
  }
}

const AI_API_BASE_URL = (
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ||
  process.env.NEXT_PUBLIC_AI_API_URL ||
  'http://localhost:8000/api/v1'
).replace(/\/$/, '').replace(/\/api$/, '/api/v1');

export function getAiApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${AI_API_BASE_URL}${cleanEndpoint}`;
}

export async function fetchAiApi<T>(
  endpoint: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const url = getAiApiUrl(endpoint);
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const timeoutMs = options?.timeoutMs || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Link caller signal if provided
  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...defaultHeaders,
        ...options?.headers,
      },
    });

    clearTimeout(timeoutId);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        typeof body.detail === 'string'
          ? body.detail
          : typeof body.error === 'string'
          ? body.error
          : (body.error?.message || body.message || `AI API failed with status ${response.status}`);

      const typedErr = classifyAgentError(errorMessage, response.status);
      if (response.status === 401) {
        throw new UnauthorizedError(typedErr.message);
      }
      throw new ApiError(typedErr.message, response.status, body.code, typedErr.category);
    }

    return body;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new TypedAgentError(
        'TIMEOUT_ERROR',
        `AI Agent request timed out after ${timeoutMs / 1000}s.`,
        504,
        'Client AbortController timeout triggered'
      );
      throw new ApiError(timeoutErr.message, 504, 'REQUEST_TIMEOUT', 'TIMEOUT_ERROR');
    }
    if (err instanceof ApiError || err instanceof TypedAgentError) {
      throw err;
    }
    const typedErr = classifyAgentError(err);
    throw new ApiError(typedErr.message, 500, undefined, typedErr.category);
  }
}

