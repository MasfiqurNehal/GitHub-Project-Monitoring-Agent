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

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
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
      const errorMessage = body.error || body.message || `API request failed with status ${response.status}`;
      
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
