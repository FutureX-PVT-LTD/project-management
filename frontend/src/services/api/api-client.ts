/**
 * Centralized API Client for FutureX Frontend Application
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

// Module-level single-flight refresh promise to coordinate concurrent 401s
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refresh = async () => {
    // Another tab may have already refreshed while this tab waited for the lock.
    const current = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include', cache: 'no-store' });
    if (current.ok) return true;
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'FutureX' },
    });
    return response.ok;
  };
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('futurex-session-refresh', refresh);
  }
  return refresh();
}

interface CustomRequestInit extends RequestInit {
  _retry?: boolean;
}

async function request<T = any>(
  endpoint: string,
  options: CustomRequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const isFormData = options.body instanceof FormData;

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'FutureX',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Automatically attaches HTTP-only access & refresh cookies
  };

  try {
    const response = await fetch(url, config);

    // Endpoints that should NEVER trigger refresh attempts
    const isAuthBypassEndpoint =
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/logout') ||
      endpoint.includes('/auth/forgot-password') ||
      endpoint.includes('/auth/reset-password');

    // Handle 401 Unauthorized with single-flight mutex
    if (response.status === 401 && !isAuthBypassEndpoint && !options._retry) {
      options._retry = true;

      // Coordinate concurrent 401s through a single refresh request
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            return await refreshSession();
          } catch {
            return false;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const refreshSuccess = await refreshPromise;

      if (refreshSuccess) {
        // Retry the original request exactly once
        return await request<T>(endpoint, options);
      } else {
        // Refresh failed -> session is genuinely expired
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/forgot-password' && currentPath !== '/reset-password') {
            window.location.href = `/login?returnTo=${encodeURIComponent(currentPath)}`;
          }
        }
      }
    }

    return await handleResponse<T>(response);
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || 'Network request failed', 0);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const rawMessage =
      (isJson && data?.message) ||
      (isJson && data?.error) ||
      response.statusText ||
      'Request failed';
    const errorMessage =
      typeof rawMessage === 'object' && rawMessage !== null
        ? (rawMessage.message || rawMessage.code || JSON.stringify(rawMessage))
        : rawMessage;
    throw new ApiError(
      Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
      response.status,
      data,
    );
  }

  // If response matches standard ApiResponse envelope { success: true, data: T }
  if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
    return data.data as T;
  }

  return data as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export const api = apiClient;
