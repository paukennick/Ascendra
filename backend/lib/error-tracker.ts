// REQ-118 (Audit 3 MEDIUM-10): one place where server errors go besides the
// log. Errors only reached console.error with a request id, so nobody heard
// about a 500 unless a learner wrote in.
//
// Sentry-ready without an SDK or account: with ERROR_TRACKER_DSN unset this
// does nothing. Set it to a Sentry DSN (https://<key>@<host>/<project id>)
// and each reported error is sent to Sentry's store endpoint with a plain
// fetch (no dependency), fire-and-forget with a 2 s timeout. Swapping in
// @sentry/nextjs later means changing only this file.
//
// What is sent: the error's name, message (first 500 chars) and stack, the
// request id, the route, and the environment. Never the request body,
// headers, tokens or the learner's id.

export interface ErrorContext {
  requestId?: string;
  route?: string;
}

export interface ParsedDsn {
  storeUrl: string;
  publicKey: string;
}

export function parseDsn(dsn: string | undefined): ParsedDsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+/, "").split("/").pop();
    if (!u.username || !projectId || !/^\d+$/.test(projectId)) return null;
    const prefix = u.pathname.replace(/\/?[^/]*$/, "");
    return { storeUrl: `${u.protocol}//${u.host}${prefix}/api/${projectId}/store/`, publicKey: u.username };
  } catch {
    return null;
  }
}

export function errorEvent(err: unknown, ctx: ErrorContext = {}) {
  const e = err instanceof Error ? err : new Error(String(err));
  return {
    platform: "node",
    level: "error",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tags: { requestId: ctx.requestId ?? null, route: ctx.route ?? null },
    exception: {
      values: [{ type: e.name, value: e.message.slice(0, 500), stacktrace: { raw: (e.stack ?? "").slice(0, 4000) } }],
    },
  };
}

type Transport = (url: string, init: RequestInit) => Promise<unknown>;
let transport: Transport = (url, init) => fetch(url, init);

// Test seam.
export function setErrorTransport(next: Transport | null): void {
  transport = next ?? ((url, init) => fetch(url, init));
}

// Never throws and never delays the response.
export function reportError(err: unknown, ctx: ErrorContext = {}): void {
  const dsn = parseDsn(process.env.ERROR_TRACKER_DSN);
  if (!dsn) return;
  try {
    const body = JSON.stringify(errorEvent(err, ctx));
    void Promise.resolve(
      transport(dsn.storeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=ascendra/1, sentry_key=${dsn.publicKey}`,
        },
        body,
        signal: AbortSignal.timeout(2_000),
      })
    ).catch(() => {});
  } catch {
    // reporting must never break the request
  }
}
