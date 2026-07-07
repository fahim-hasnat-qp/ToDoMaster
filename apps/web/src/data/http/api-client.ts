import { config } from '@/core/config';
import { AppError } from '@/core/result';

/**
 * Thin fetch wrapper: injects the access token, retries once with a refreshed
 * token on 401, and throws AppError on failure. Deliberately NOT a generic
 * HTTP library — this app talks to exactly one backend with one auth scheme.
 *
 * Circular-dependency note: this client needs the current access token and a
 * way to refresh it, but auth-store.ts needs to make HTTP calls — broken via
 * `setAuthAccessors`, called once from auth-store's module init. Avoids an
 * import cycle between the two files.
 */

interface AuthAccessors {
  getAccessToken: () => string | null;
  refreshTokens: () => Promise<boolean>;
}

let auth: AuthAccessors | null = null;

export function setAuthAccessors(accessors: AuthAccessors): void {
  auth = accessors;
}

async function request<T>(path: string, init: RequestInit, isRetry = false): Promise<T> {
  const token = auth?.getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });

  if (response.status === 401 && !isRetry && auth) {
    const refreshed = await auth.refreshTokens();
    if (refreshed) return request<T>(path, init, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AppError(
      response.status === 401 ? 'UNAUTHORIZED' : 'UNKNOWN',
      typeof body.message === 'string' ? body.message : `Request failed (${response.status})`,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
