// Thin fetch wrapper for the Next.js backend. Base URL comes from EXPO_PUBLIC_API_URL,
// set in .env.local for local dev or in eas.json for production builds — see mobile/.env.example.

import { httpErrorMessage, isNetworkFailure, NETWORK_MESSAGE, parseBody } from "../lib/errorMessage.ts";
import { isTermsRequired, LEGAL_VERSION_HEADER, TERMS_VERSION } from "../lib/legal.ts";
import { isSignedOutAuthRoute, refreshOutcome, type RefreshResult } from "../lib/sessionStore.ts";
import { isStudyNoticeRequired, studyNoticeGate } from "../lib/studyNotice.ts";
import { askMatureConfirmation, hasMatureContentHandler, MatureContentDeclinedError, matureRefusalCategory } from "../lib/matureContent.ts";
import { APP_PLATFORM_HEADER, APP_VERSION, APP_VERSION_HEADER, appHeaders, readUpdateRequired, type AppIdentity, type UpdateRequired } from "../lib/appVersion.ts";

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
let refreshAccessToken: (() => Promise<RefreshResult>) | null = null;
let onAuthExpired: (() => void) | null = null;
let setAccessToken: ((token: string) => void) | null = null;

export function registerAuthHooks(hooks: {
  getAccessToken: () => string | null;
  refresh: () => Promise<RefreshResult>;
  onAuthExpired: () => void;
  setAccessToken?: (token: string) => void;
}): void {
  getAccessToken = hooks.getAccessToken;
  refreshAccessToken = hooks.refresh;
  onAuthExpired = hooks.onAuthExpired;
  setAccessToken = hooks.setAccessToken ?? null;
}

// REQ-122: a request refused because of the learner's plan (402) or a used-up
// allowance (429 with `allowance` / `aiPaused`) is also handed to the billing
// provider, which shows the gentle upgrade sheet -- only while paid plans
// are on. Screens still get the ApiError and show its message as before.
let onBillingRefusal: ((status: number, data: unknown) => void) | null = null;

export function registerBillingHook(hook: ((status: number, data: unknown) => void) | null): void {
  onBillingRefusal = hook;
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
// REQ-146 (FAIL-530): the protocol this app speaks, sent on every request
// (native and web) as X-Ascendra-Client. Protocol 1: the lesson payload's
// soloChoices is always empty and the Solo choices come from
// POST /api/objectives/:id/hint. A request without the header is treated as
// an app build from before this (no hint flow) and is sent the Solo choices
// in the lesson, with the hint recorded (backend/lib/client-protocol.ts).
// Protocol 2 (REQ-189): the app also renders interactive lab parts; below
// 2 the server writes their options into the step text instead
// (backend/lib/client-protocol.ts LAB_INTERACTIVE_PROTOCOL).
// Raise it only together with the server's own check.
export const CLIENT_PROTOCOL_HEADER = "X-Ascendra-Client";
export const CLIENT_PROTOCOL = 2;

// REQ-175: the app build, sent on every request (src/lib/appVersion.ts).
// src/updates/appIdentity.ts fills in the build and platform when the app
// loads; until then (and in tests) the version alone is sent, so a request
// is never mistaken for a pre-header build.
let identityHeaders: Record<string, string> = { [APP_VERSION_HEADER]: `${APP_VERSION}+unknown` };

export function setAppIdentity(identity: AppIdentity): void {
  identityHeaders = appHeaders(identity);
}

// REQ-192: the web app's refresh token is an httpOnly cookie the server
// sets on /api/auth/refresh (backend/lib/auth/refreshCookie.ts), so web
// requests carry credentials (the Expo dev server is cross-origin; the
// deployed app is same-origin). Native never sends cookies.
export function isWebClient(): boolean {
  return identityHeaders[APP_PLATFORM_HEADER] === "web";
}

// REQ-175: the server answers 426 { code: "update_required" } when this
// build is below MIN_APP_VERSION. The root layout registers this to show the
// "Update required" screen; the request still throws its ApiError.
let onUpdateRequired: ((info: UpdateRequired) => void) | null = null;

export function registerUpdateRequiredHook(hook: ((info: UpdateRequired) => void) | null): void {
  onUpdateRequired = hook;
}

// REQ-217 (FAIL-1061): the server says the study notice is not accepted; the
// onboarding provider registers this to reload its state (which opens the notice).
let onStudyNoticeRequired: (() => void) | null = null;

export function registerStudyNoticeRequiredHook(hook: (() => void) | null): void {
  onStudyNoticeRequired = hook;
}

// REQ-226 (FAIL-1241): the server says the Terms and Privacy Policy are not
// accepted (403 terms_required). Same shape as the study notice above: the
// onboarding provider registers this to reload the launch state, whose gate
// opens the Terms screen. The request is not retried; the screen still gets
// its ApiError.
let onTermsRequired: (() => void) | null = null;

export function registerTermsRequiredHook(hook: (() => void) | null): void {
  onTermsRequired = hook;
}

export const DEFAULT_TIMEOUT_MS = 15_000;
export const MODEL_TIMEOUT_MS = 180_000;

// REQ-113 (Audit 3 mobile M7): the request never reached a server (offline,
// DNS, refused). Its message is the calm one screens show as they are.
export class NetworkError extends Error {
  friendly = true;
  cause: unknown;
  constructor(cause: unknown) {
    super(NETWORK_MESSAGE);
    this.name = "NetworkError";
    this.cause = cause;
  }
}

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
  /^\/api\/labs\/[^/?]+\/submit(?:$|\?)/, // REQ-123: a lab step is graded
  /^\/api\/sims\/runs\/[^/?]+\/reasoning(?:$|\?)/, // REQ-190: a sim's written reasoning is graded
];

export function requestTimeoutMs(path: string, override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) return override;
  return MODEL_ROUTES.some((r) => r.test(path)) ? MODEL_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

export interface RequestOptions {
  // Milliseconds before the request is abandoned with RequestTimeoutError.
  timeoutMs?: number;
  // REQ-190: extra request headers (the sim routes read x-sim-caps).
  headers?: Record<string, string>;
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
      ...(isWebClient() ? { credentials: "include" as const } : {}),
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        [CLIENT_PROTOCOL_HEADER]: String(CLIENT_PROTOCOL),
        ...identityHeaders,
        [LEGAL_VERSION_HEADER]: TERMS_VERSION,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    // The body read is inside the timeout too: a stalled body hangs just as
    // surely as a stalled connect.
    text = await res.text();
  } catch (err) {
    if (timedOut) throw new RequestTimeoutError(timeoutMs);
    if (isNetworkFailure(err)) throw new NetworkError(err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
  // REQ-113 (Audit 3 mobile M7): parsed inside the error handling. A captive
  // Wi-Fi page or a proxy's HTML error used to throw a raw SyntaxError here,
  // losing the status (so 401 refresh and 429 never ran).
  const body = parseBody(text);
  if (!res.ok || !body.ok) {
    const data = body.ok ? body.data : null;
    // A 2xx that isn't our JSON is a page from something in between (a
    // portal), not our server: reported as a 502-like failure.
    const status = res.ok ? 502 : res.status;
    const err = new ApiError(httpErrorMessage(status, data, body.ok), status, data);
    if (!body.ok) (err as ApiError & { unreadable?: boolean }).unreadable = true;
    const update = readUpdateRequired(status, data);
    if (update && onUpdateRequired) {
      try {
        onUpdateRequired(update);
      } catch {
        /* the screen must never break the request's own error handling */
      }
    }
    if (isStudyNoticeRequired(status, data) && onStudyNoticeRequired) {
      try {
        onStudyNoticeRequired();
      } catch {
        /* never let the reload break the request's own error handling */
      }
    }
    if (isTermsRequired(status, data) && onTermsRequired) {
      try {
        onTermsRequired();
      } catch {
        /* never let the reload break the request's own error handling */
      }
    }
    if ((status === 402 || status === 429) && data && onBillingRefusal) {
      try {
        onBillingRefusal(status, data);
      } catch {
        /* never let the sheet break the request's own error handling */
      }
    }
    throw err;
  }
  const data = body.data;
  const reissued = reissuedAccessToken(data);
  if (reissued) setAccessToken?.(reissued);
  return data as T;
}

export function isReauthRefusal(data: unknown): boolean {
  return !!data && typeof data === "object" && (data as { reauthRequired?: unknown }).reauthRequired === true;
}

// One silent refresh-and-retry on a 401, except for the routes a signed-out
// person calls (isSignedOutAuthRoute: a 401 from login is just "wrong
// password", and retrying refresh's own 401 would recurse). REQ-217
// (FAIL-1042): the other /api/auth/ routes -- logout-all, unlock, sessions --
// need the session and do refresh. A timeout is never retried here: the
// screen's own Retry decides, reusing any idempotency key.
//
// REQ-217 (FAIL-1041): when the refresh fails, only a 401 from it (the server
// ended the session) signs the device out. Anything else -- offline, a
// timeout, a 5xx -- throws that failure to the screen, which shows its calm
// message and a retry, and the session stays.
//
// REQ-224: a 403 { code: "mature_content_required" } (a mental health course
// opened or started without the 18+ confirmation) shows the mature-content
// notice and, once it is confirmed and recorded, sends the request once more.
// Closing the notice throws MatureContentDeclinedError; nothing else is sent.
async function request<T>(
  path: string,
  options: RequestInit = {},
  opts: RequestOptions = {},
  alreadyRetried = false,
  matureAsked = false
): Promise<T> {
  const timeoutMs = requestTimeoutMs(path, opts.timeoutMs);
  // REQ-165: the study notice (with its AI data disclosure) comes before the first request
  // that sends the learner's own text to the AI provider.
  if (!alreadyRetried) await studyNoticeGate(options.method, path);
  try {
    return await rawRequest<T>(path, opts.headers ? { ...options, headers: { ...(options.headers as Record<string, string> | undefined), ...opts.headers } } : options, timeoutMs);
  } catch (err) {
    // REQ-177: a 401 that says "confirm it's you" (wrong password or code,
    // lib/auth/reauth.ts) is about what was typed, not the session. Refreshing
    // and resending it spent a second try from the 10-per-15-minutes budget
    // and rotated the refresh token for nothing.
    const canRetry =
      err instanceof ApiError &&
      err.status === 401 &&
      !isReauthRefusal(err.data) &&
      !alreadyRetried &&
      refreshAccessToken &&
      !isSignedOutAuthRoute(path);
    if (canRetry) {
      const result = await refreshAccessToken!();
      const outcome = refreshOutcome(result);
      if (outcome === "refreshed") {
        return request<T>(path, options, opts, true, matureAsked);
      }
      if (outcome === "expired") {
        onAuthExpired?.();
      } else if (typeof result === "object" && result.error instanceof Error) {
        throw result.error;
      }
    }
    const mature = err instanceof ApiError ? matureRefusalCategory(err.status, err.data) : null;
    if (mature && !matureAsked && hasMatureContentHandler() && !path.startsWith("/api/mature-content")) {
      if (!(await askMatureConfirmation(mature, path.startsWith("/api/intake") ? "intake" : "course"))) throw new MatureContentDeclinedError();
      return request<T>(path, options, opts, alreadyRetried, true);
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
