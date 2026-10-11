import { API_URL } from '../config';

const TOKEN_KEY = 'supportToken';

export const session = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetwork() {
    return this.status === 0;
  }
}

export const NETWORK_MESSAGE = 'Network error — check your connection and try again.';

let unauthorizedHandler: (() => void) | null = null;

/** Registered by the auth context: any 401 on an authenticated call ends the session. */
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

interface ErrorBody {
  success?: false;
  error?: { code?: string; message?: string | string[] };
  message?: string | string[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function errorFrom(status: number, body: unknown): ApiError {
  const b: ErrorBody = isObject(body) ? body : {};
  const raw = b.error?.message ?? b.message;
  const message = Array.isArray(raw) ? raw.join(', ') : raw;
  return new ApiError(status, b.error?.code ?? `HTTP_${status}`, message || `Request failed (${status})`);
}

export async function request<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  const token = session.get();
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', NETWORK_MESSAGE);
  }

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok || !isObject(json) || json.success !== true) {
    const err = errorFrom(res.ok ? 500 : res.status, json);
    if (err.status === 401 && token) unauthorizedHandler?.();
    throw err;
  }
  return json.data as T;
}

/** Builds "?a=1&b=2" from defined, non-empty values. */
export function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
