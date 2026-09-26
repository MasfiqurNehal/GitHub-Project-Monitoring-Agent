export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access. Please log in or re-authenticate.') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class AccessDeniedError extends ApiError {
  constructor(message = 'Repository or resource access denied.') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'AccessDeniedError';
  }
}

export class SyncInProgressError extends ApiError {
  constructor(message = 'Synchronization is currently in progress.') {
    super(message, 409, 'SYNC_IN_PROGRESS');
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
  options?: RequestInit
): Promise<T> {
  const url = getAiApiUrl(endpoint);
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options?.headers,
      },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        typeof body.detail === 'string'
          ? body.detail
          : typeof body.error === 'string'
          ? body.error
          : (body.error?.message || body.message || `AI API failed with status ${response.status}`);

      if (response.status === 401) {
        throw new UnauthorizedError(errorMessage);
      }
      throw new ApiError(errorMessage, response.status, body.code);
    }

    return body;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'AI Service connection error', 500);
  }
}
