import { query } from "@/lib/db";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supportEmail } from "./support-contact";

// REQ-205: the support inbox. Mail sent to the public support address
// (lib/support-contact.ts) is received by Resend, which POSTs an
// `email.received` webhook to /api/inbound/email. The webhook carries
// metadata only, so this fetches the message through Resend's API and
// forwards it, as plain text, to SUPPORT_FORWARD_TO (an environment variable;
// no address is written in the code).
//
// Verified against Resend's docs on 2026-11-09:
//   - webhook signing is Svix's: headers svix-id, svix-timestamp and
//     svix-signature ("v1,<base64>" entries, space separated); the signed
//     content is `${id}.${timestamp}.${rawBody}`, HMAC-SHA256 keyed with the
//     base64 part of the signing secret (after "whsec_").
//     https://resend.com/docs/webhooks/verify-webhooks-requests
//   - GET https://api.resend.com/emails/receiving/{email_id}
//     https://resend.com/docs/api-reference/emails/retrieve-received-email
//   - event shape: https://resend.com/docs/dashboard/receiving/create-receiving-webhook
//
// Privacy: message bodies, subjects and addresses are never logged; only the
// received-email id and a stage name. Fails closed: no signing secret, no
// forward address, or a forward address on the support address's own domain
// (a forwarding loop) all answer 503 and send nothing.

export const MAX_WEBHOOK_BYTES = 64 * 1024;
export const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;
export const MAX_FORWARDED_TEXT_CHARS = 100_000;
export const FORWARD_MARKER_HEADER = "X-Ascendra-Forwarded";
export const INBOUND_RATE_LIMIT = { max: 120, windowMinutes: 60 } as const;
const RESEND_API = "https://api.resend.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADDRESS = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

type Env = Record<string, string | undefined>;

// True only for a correctly signed, recent webhook. Never throws.
export function verifyResendWebhook(
  rawBody: string,
  headers: { get(name: string): string | null },
  secret: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!secret) return false;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return false;
  if (!/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TIMESTAMP_TOLERANCE_SECONDS) return false;
  const key = Buffer.from(secret.trim().replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  for (const entry of signatures.split(" ")) {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) continue;
    const got = Buffer.from(sig, "base64");
    if (got.length === expected.length && timingSafeEqual(got, expected)) return true;
  }
  return false;
}

export interface InboundConfig {
  apiKey: string;
  forwardTo: string;
  from: string;
}

// null means "not configured": the route answers 503 and sends nothing.
export function inboundConfig(env: Env = process.env): InboundConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const forwardTo = env.SUPPORT_FORWARD_TO?.trim();
  if (!apiKey || !forwardTo || forwardTo.length > 254 || !ADDRESS.test(forwardTo)) return null;
  const domain = (a: string) => a.slice(a.lastIndexOf("@") + 1).toLowerCase();
  // Forwarding to the address that receives would loop for ever.
  if (domain(forwardTo) === domain(supportEmail(env))) return null;
  // Same default as lib/email.ts getFrom().
  return { apiKey, forwardTo, from: env.EMAIL_FROM?.trim() || "onboarding@resend.dev" };
}

export interface ReceivedEvent {
  emailId: string;
}

// The event we act on, or null for anything else (other event types, a
// malformed body). Called only after the signature has been verified.
export function receivedEvent(rawBody: string): ReceivedEvent | null {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const b = body as { type?: unknown; data?: { email_id?: unknown } } | null;
  if (b?.type !== "email.received") return null;
  const id = b.data?.email_id;
  return typeof id === "string" && UUID.test(id) ? { emailId: id } : null;
}

interface ReceivedEmail {
  from?: unknown;
  to?: unknown;
  subject?: unknown;
  text?: unknown;
  html?: unknown;
  headers?: unknown;
  authentication?: { spf?: unknown; dkim?: unknown; dmarc?: unknown } | null;
  attachments?: unknown;
}

const clean = (v: unknown, max: number): string =>
  (typeof v === "string" ? v : "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, max);

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n");
}

export function senderAddress(from: unknown): string | null {
  const s = clean(from, 400);
  const angle = /<([^<>]+)>\s*$/.exec(s);
  const addr = (angle ? angle[1] : s).trim();
  return addr.length <= 254 && ADDRESS.test(addr) ? addr : null;
}

// What goes to the support mailbox. Plain text only: the sender is a stranger,
// so their HTML (tracking images, links dressed up as buttons) is not passed
// on, and their attachments are listed by name, not forwarded.
export function buildForward(email: ReceivedEmail, cfg: InboundConfig) {
  const from = clean(email.from, 400);
  const subject = clean(email.subject, 300).replace(/[\r\n]+/g, " ").trim() || "(no subject)";
  const to = Array.isArray(email.to) ? email.to.map((t) => clean(t, 254)).join(", ") : "";
  const a = email.authentication ?? null;
  const auth = a ? `SPF ${clean(a.spf, 20)}, DKIM ${clean(a.dkim, 20)}, DMARC ${clean(a.dmarc, 20)}` : "not reported";
  const atts = Array.isArray(email.attachments) ? (email.attachments as { filename?: unknown }[]) : [];
  const names = atts.slice(0, 10).map((x) => clean(x?.filename, 120) || "(unnamed)");
  let body = typeof email.text === "string" && email.text.trim() ? email.text : typeof email.html === "string" ? htmlToText(email.html) : "";
  body = clean(body.replace(/\r\n/g, "\n"), MAX_FORWARDED_TEXT_CHARS).replace(/[\u0000]/g, "");
  const text = [
    "Support email received by Ascendra.",
    `From: ${from}`,
    `To: ${to}`,
    `Sender checks: ${auth}`,
    atts.length ? `Attachments not forwarded (${atts.length}): ${names.join(", ")}` : "Attachments: none",
    "",
    body || "(empty message)",
  ].join("\n");
  const reply = senderAddress(email.from);
  return {
    from: cfg.from,
    to: [cfg.forwardTo],
    subject: `[Support] ${subject}`,
    text,
    ...(reply ? { reply_to: [reply] } : {}),
    headers: { [FORWARD_MARKER_HEADER]: "1" },
  };
}

export type ForwardOutcome =
  | { ok: true }
  | { ok: false; stage: "fetch" | "send" | "loop"; status: number | null };

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

async function timed<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fn(c.signal);
  } finally {
    clearTimeout(t);
  }
}

// Fetches the received message and sends it on. `fetchImpl` is injectable for
// tests; production uses global fetch.
export async function forwardReceivedEmail(
  emailId: string,
  cfg: InboundConfig,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<ForwardOutcome> {
  let email: ReceivedEmail;
  try {
    const res = await timed(10_000, (signal) =>
      fetchImpl(`${RESEND_API}/emails/receiving/${encodeURIComponent(emailId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, Accept: "application/json" },
        signal,
      })
    );
    if (!res.ok) return { ok: false, stage: "fetch", status: res.status };
    email = (await res.json()) as ReceivedEmail;
  } catch {
    return { ok: false, stage: "fetch", status: null };
  }
  const hdrs = (email.headers ?? {}) as Record<string, unknown>;
  if (Object.keys(hdrs).some((k) => k.toLowerCase() === FORWARD_MARKER_HEADER.toLowerCase())) {
    return { ok: false, stage: "loop", status: null };
  }
  try {
    const res = await timed(10_000, (signal) =>
      fetchImpl(`${RESEND_API}/emails`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildForward(email, cfg)),
        signal,
      })
    );
    return res.ok ? { ok: true } : { ok: false, stage: "send", status: res.status };
  } catch {
    return { ok: false, stage: "send", status: null };
  }
}

// REQ-219 (FAIL-1116): replay protection by Svix delivery id (`svix-id`, part
// of the signed content, so it can't be changed without breaking the
// signature). A signed delivery stays acceptable for the signature's
// timestamp window, and Resend retries a delivery we answered with a failure;
// either forwarded the same message to the mailbox again.
//
//   claim:    insert the id; a row that exists and was already forwarded, or
//             was claimed less than CLAIM_STALE_MINUTES ago and is still in
//             flight, makes this delivery a duplicate (answered 200, nothing
//             forwarded). A claim that never finished (the function died) is
//             taken over after the stale window, so a message is never lost.
//   release:  a delivery that FAILED (rate limit, forward error) gives its
//             claim back so Resend's retry is processed.
//   done:     marks a forwarded delivery (kept for the retention window).
// Table: inbound_email_events (migration 075), purged after 7 days.
export const CLAIM_STALE_MINUTES = 5;
const SVIX_ID = /^[A-Za-z0-9_.:=-]{1,256}$/;

export function validDeliveryId(id: string | null): id is string {
  return typeof id === "string" && SVIX_ID.test(id);
}

export async function claimInboundDelivery(svixId: string): Promise<boolean> {
  const rows = await query<{ svix_id: string }>(
    `insert into inbound_email_events (svix_id) values ($1)
     on conflict (svix_id) do update set claimed_at = now()
       where inbound_email_events.forwarded_at is null
         and inbound_email_events.claimed_at < now() - make_interval(mins => $2)
     returning svix_id`,
    [svixId, CLAIM_STALE_MINUTES]
  );
  return rows.length > 0;
}

export async function releaseInboundDelivery(svixId: string): Promise<void> {
  await query(`delete from inbound_email_events where svix_id = $1 and forwarded_at is null`, [svixId]);
}

export async function completeInboundDelivery(svixId: string): Promise<void> {
  await query(`update inbound_email_events set forwarded_at = now() where svix_id = $1`, [svixId]);
}
