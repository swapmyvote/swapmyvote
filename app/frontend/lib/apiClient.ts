import { CSRF_HEADER, csrfToken } from "@/lib/csrf";
import type { ApiErrorBody } from "@/types/api";

const API_ROOT = "/api/v1";

/**
 * A non-2xx response from /api/v1, carrying the server's error convention:
 * `{ error: { code, messages, fields } }`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly messages: string[];
  readonly fields: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody | null) {
    const messages = body?.error?.messages ?? [];
    super(messages[0] || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error?.code ?? "unknown_error";
    this.messages = messages;
    this.fields = body?.error?.fields ?? {};
  }

  /** True when the user is not (or no longer) logged in. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function parseBody(response: Response): Promise<unknown> {
  // 204s and error pages from outside the API (a proxy, say) have no JSON.
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (method !== "GET") {
    const token = csrfToken();
    if (token) {
      headers[CSRF_HEADER] = token;
    }
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers,
    // The Devise session cookie is what authenticates us; the SPA is served
    // same-origin during the migration, so no CORS credentials mode needed.
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const parsed = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, parsed as ApiErrorBody | null);
  }

  return parsed as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};
