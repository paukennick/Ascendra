// Thin fetch wrapper for the Next.js backend. Base URL comes from EXPO_PUBLIC_API_URL,
// set in .env.local for local dev or in eas.json for production builds — see mobile/.env.example.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

if (!BASE_URL && __DEV__) {
  // eslint-disable-next-line no-console
  console.warn(
    "EXPO_PUBLIC_API_URL is not set — API calls will fail. Set it in mobile/.env.local (see mobile/.env.example)."
  );
}

// Thrown on any non-2xx response. `data` is the parsed JSON body (if any),
// so callers can read extra fields beyond `message` — e.g. login's
// { error, emailVerificationRequired: true } on a 403.
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Registered once by AuthProvider (see src/auth/AuthContext.tsx) so this
// module can attach/refresh tokens without importing AuthContext directly —
// AuthContext itself needs to call `api.post(...)`, so a direct import here
// would be circular.
let getAccessToken: (() => string | null) | null = null;
let refreshAccessToken: (() => Promise<boolean>) | null = null;
let onAuthExpired: (() => void) | null = null;

export function registerAuthHooks(hooks: {
  getAccessToken: () => string | null;
  refresh: () => Promise<boolean>;
  onAuthExpired: () => void;
}): void {
  getAccessToken = hooks.getAccessToken;
  refreshAccessToken = hooks.refresh;
  onAuthExpired = hooks.onAuthExpired;
}

async function rawRequest<T>(path: string, options: RequestInit): Promise<T> {
  const token = getAccessToken?.();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.error ?? `Request to ${path} failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

// One silent refresh-and-retry on a 401, never for /api/auth/* itself
// (a 401 from login is just "wrong password", not "needs a refresh", and
// retrying refresh's own 401 would recurse).
async function request<T>(path: string, options: RequestInit = {}, alreadyRetried = false): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    const canRetry =
      err instanceof ApiError && err.status === 401 && !alreadyRetried && refreshAccessToken && !path.startsWith("/api/auth/");
    if (canRetry) {
      const refreshed = await refreshAccessToken!();
      if (refreshed) {
        return request<T>(path, options, true);
      }
      onAuthExpired?.();
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
