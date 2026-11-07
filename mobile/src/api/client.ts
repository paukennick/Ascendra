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
let setAccessToken: ((token: string) => void) | null = null;

export function registerAuthHooks(hooks: {
  getAccessToken: () => string | null;
  refresh: () => Promise<boolean>;
  onAuthExpired: () => void;
  setAccessToken?: (token: string) => void;
}): void {
  getAccessToken = hooks.getAccessToken;
  refreshAccessToken = hooks.refresh;
  onAuthExpired = hooks.onAuthExpired;
  setAccessToken = hooks.setAccessToken ?? null;
}

// REQ-116 (audit 3): changing the password and turning on two-factor now
// end every other session and every access token already issued, this
// device's included; the server sends this device a fresh `accessToken`
// (with no `refreshToken` -- the device keeps its session). Login and
// refresh responses carry both and are handled by AuthContext itself.
export function reissuedAccessToken(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { accessToken?: unknown; refreshToken?: unknown };
  return typeof d.accessToken === "string" && d.accessToken && d.refreshToken === undefined ? d.accessToken : null;
}

// No request used to have a timeout, so a hung connection (weak signal, a
// captive portal) left a screen spinning forever with nothing to retry.
// Every call now gives up after a bounded wait and throws
// RequestTimeoutError, an ordinary Error whose message the screens already
// show beside their Retry/Submit buttons. Routes that wait on the model get
// a longer default (see requestTimeoutMs below); any call can pass its own.
// Audit 2 (mobile) item 7, client half: FAIL-061.
export const DEFAULT_TIMEOUT_MS = 15_000;
export const MODEL_TIMEOUT_MS = 180_000;

export class RequestTimeoutError extends Error {
  timeoutMs: number;
  constructor(timeoutMs: number) {
    super("The server took too long to respond. Check your connection and try again.");
    this.name = "RequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

// Routes whose backend handler calls the model (app/api/chat, pbq, grade,
// objectives/:id/lesson[/...], objectives/:id/guess-feedback). These
// legitimately take tens of seconds; the 15 s default would cut them off.
const MODEL_ROUTES: readonly RegExp[] = [
  /^\/api\/chat(?:$|\?)/,
  /^\/api\/pbq(?:$|\?)/,
  /^\/api\/grade(?:$|\?)/,
  /^\/api\/objectives\/[^/?]+\/lesson(?:$|[/?])/,
  /^\/api\/objectives\/[^/?]+\/guess-feedback(?:$|\?)/,
  // FAIL-234 (integration): model-backed routes added by the feature
  // branches after this list was written. Each would otherwise be cut off
  // at 15 s while the server was still generating or grading.
  /^\/api\/exam\/sessions(?:$|\?)/, // REQ-109: creating a sprint/mock writes missing bank items
  /^\/api\/objectives\/[^/?]+\/lab\/(?:questions|report)(?:$|\?)/, // REQ-106
  /^\/api\/objectives\/[^/?]+\/explain-back(?:$|\?)/, // REQ-111
  /^\/api\/review\/sessions(?:$|\?)/, // REQ-108: preparing today's questions
  /^\/api\/review\/sessions\/[^/?]+\/items\/[^/?]+\/answer(?:$|\?)/, // REQ-108: typed answers are graded
  /^\/api\/units\/[^/?]+\/check(?:$|\?)/, // REQ-108: unit check written and graded
  /^\/api\/coach\/quiz(?:$|\?)/, // REQ-110: first ask of an objective writes its question
];

export function requestTimeoutMs(path: string, override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) return override;
  return MODEL_ROUTES.some((r) => r.test(path)) ? MODEL_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

export interface RequestOptions {
  // Milliseconds before the request is abandoned with RequestTimeoutError.
  timeoutMs?: number;
}

async function rawRequest<T>(path: string, options: RequestInit, timeoutMs: number): Promise<T> {
  const token = getAccessToken?.();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  let res: Response;
  let text: string;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    // The body read is inside the timeout too: a stalled body hangs just as
    // surely as a stalled connect.
    text = await res.text();
  } catch (err) {
    if (timedOut) throw new RequestTimeoutError(timeoutMs);
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.error ?? `Request to ${path} failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }
  const reissued = reissuedAccessToken(data);
  if (reissued) setAccessToken?.(reissued);
  return data as T;
}

// One silent refresh-and-retry on a 401, never for /api/auth/* itself
// (a 401 from login is just "wrong password", not "needs a refresh", and
// retrying refresh's own 401 would recurse). A timeout is never retried
// here: the screen's own Retry decides, reusing any idempotency key.
async function request<T>(
  path: string,
  options: RequestInit = {},
  opts: RequestOptions = {},
  alreadyRetried = false
): Promise<T> {
  const timeoutMs = requestTimeoutMs(path, opts.timeoutMs);
  try {
    return await rawRequest<T>(path, options, timeoutMs);
  } catch (err) {
    const canRetry =
      err instanceof ApiError && err.status === 401 && !alreadyRetried && refreshAccessToken && !path.startsWith("/api/auth/");
    if (canRetry) {
      const refreshed = await refreshAccessToken!();
      if (refreshed) {
        return request<T>(path, options, opts, true);
      }
      onAuthExpired?.();
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { method: "GET" }, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }, opts),
  delete: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }, opts),
};
