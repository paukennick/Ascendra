// REQ-118 (Audit 3 MEDIUM-10): one place where server errors go besides the
// log. Errors only reached console.error with a request id, so nobody heard
// about a 500 unless a learner wrote in.
//
// Sentry-ready without an SDK or account: with ERROR_TRACKER_DSN unset this
// does nothing. Set it to a Sentry DSN (https://<key>@<host>/<project id>)
// and each reported error is sent to Sentry's store endpoint with a plain
// fetch (no dependency) with a 2 s timeout. Swapping in @sentry/nextjs later
// means changing only this file.
//
// FAIL-945: the send used to be fire-and-forget (`void fetch(...)`). On
// Vercel a function is frozen as soon as its response is out, so the request
// was often never sent and the error was lost exactly when it mattered. It is
// now handed to Next's after() (node_modules/next/dist/docs/01-app/03-api-
// reference/04-functions/after.md), which keeps the invocation alive until
// the work finishes without delaying the response. Outside a request (a
// script, a test) after() throws and the send runs immediately instead.
//
// What is sent: the error's name, message (first 500 chars, e-mail addresses
// masked) and stack, the request id, the route, and the environment. Never
// the request body, headers, tokens or the learner's id.

import { after } from "next/server";
import { maskEmails } from "./error-summary";

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
      values: [{ type: e.name, value: maskEmails(e.message).slice(0, 500), stacktrace: { raw: maskEmails(e.stack ?? "").slice(0, 4000) } }],
    },
  };
}

type Transport = (url: string, init: RequestInit) => Promise<unknown>;
let transport: Transport = (url, init) => fetch(url, init);

// Test seam.
export function setErrorTransport(next: Transport | null): void {
  transport = next ?? ((url, init) => fetch(url, init));
}

// Test seam: how work is kept alive past the response. Default: Next's after().
type Scheduler = (task: () => Promise<unknown>) => void;
let schedule: Scheduler = (task) => after(task);
export function setErrorScheduler(next: Scheduler | null): void {
  schedule = next ?? ((task) => after(task));
}

// The send itself, as a promise that never rejects. instrumentation.ts awaits
// it (Next's documented contract for onRequestError is to await async work).
export function sendErrorReport(err: unknown, ctx: ErrorContext = {}): Promise<void> {
  const dsn = parseDsn(process.env.ERROR_TRACKER_DSN);
  if (!dsn) return Promise.resolve();
  try {
    const body = JSON.stringify(errorEvent(err, ctx));
    return Promise.resolve(
      transport(dsn.storeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=ascendra/1, sentry_key=${dsn.publicKey}`,
        },
        body,
        signal: AbortSignal.timeout(2_000),
      })
    ).then(
      () => undefined,
      () => undefined
    );
  } catch {
    return Promise.resolve(); // reporting must never break the request
  }
}

// REQ-211: the owner's "Send a test error" button. Sends one labelled event
// and waits for Sentry's answer, so the owner learns whether reports arrive
// (reportError() never says). Never throws.
export const TEST_ERROR_MESSAGE = "Ascendra error-tracker test (sent by the owner from Settings > Access). Safe to resolve.";

export class ErrorTrackerTestError extends Error {
  constructor() {
    super(TEST_ERROR_MESSAGE);
    this.name = "ErrorTrackerTest";
  }
}

export async function sendTestErrorReport(
  ctx: ErrorContext = {}
): Promise<{ configured: boolean; delivered: boolean; status: number | null }> {
  const dsn = parseDsn(process.env.ERROR_TRACKER_DSN);
  if (!dsn) return { configured: false, delivered: false, status: null };
  try {
    const res = await transport(dsn.storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=ascendra/1, sentry_key=${dsn.publicKey}`,
      },
      body: JSON.stringify(errorEvent(new ErrorTrackerTestError(), ctx)),
      signal: AbortSignal.timeout(5_000),
    });
    const status = typeof (res as Response | undefined)?.status === "number" ? (res as Response).status : null;
    return { configured: true, delivered: status !== null && status >= 200 && status < 300, status };
  } catch {
    return { configured: true, delivered: false, status: null };
  }
}

// Never throws and never delays the response.
export function reportError(err: unknown, ctx: ErrorContext = {}): void {
  if (!parseDsn(process.env.ERROR_TRACKER_DSN)) return;
  const task = () => sendErrorReport(err, ctx);
  try {
    schedule(task);
  } catch {
    // No request to attach to (a script, a test): send now.
    void task();
  }
}
