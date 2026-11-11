// REQ-144: unrestricted access on the phone -- the pure parts, so they run
// under node --test. The server decides everything: GET /api/auth/me says
// whether this account is "owner" or "unrestricted"; the owner-only Access
// screen talks to /api/access/grants, which checks again on every request.

export type AccessLevel = "owner" | "unrestricted";

export interface AccountAccess {
  level: AccessLevel;
  grantedBy: string | null;
  expiresAt: string | null;
}

export interface AccessGrant {
  id: string;
  email: string;
  status: "active" | "waiting" | "ended";
  grantedAt: string;
  grantedBy: string | null;
  expiresAt: string | null;
  note: string | null;
  claimedAt: string | null;
}

export interface AccessHistoryItem {
  at: string;
  action: "grant" | "change" | "revoke" | "claim" | "ceiling_reached";
  email: string;
  by: string | null;
  detail: Record<string, unknown>;
}

export interface AccessList {
  owners: { email: string; hasAccount: boolean }[];
  grants: AccessGrant[];
  history: AccessHistoryItem[];
}

// Anything that isn't a well-formed level from the server is "no access"
// (an older server sends nothing at all).
export function parseAccess(v: unknown): AccountAccess | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  if (a.level !== "owner" && a.level !== "unrestricted") return null;
  return {
    level: a.level,
    grantedBy: typeof a.grantedBy === "string" ? a.grantedBy : null,
    expiresAt: typeof a.expiresAt === "string" ? a.expiresAt : null,
  };
}

// Settings > Access is for owners only. Unrestricted accounts cannot grant.
export function showAccessSettings(user: { access?: unknown } | null | undefined): boolean {
  return parseAccess(user?.access)?.level === "owner";
}

export function hasUnrestricted(user: { access?: unknown } | null | undefined): boolean {
  return parseAccess(user?.access) !== null;
}

function shortDate(iso: string, locale?: string): string {
  return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

// What Settings and Plans show as the plan: "Unrestricted access, granted
// by Nick" (until a date, when it has one); "Owner, unrestricted access".
export function accessPlanLine(access: AccountAccess | null | undefined, locale?: string): string {
  if (!access) return "";
  if (access.level === "owner") return "Owner, unrestricted access";
  const by = access.grantedBy ? `, granted by ${access.grantedBy}` : "";
  const until = access.expiresAt ? ` until ${shortDate(access.expiresAt, locale)}` : "";
  return `Unrestricted access${by}${until}`;
}

export const UNRESTRICTED_NOTE =
  "Every course, lab and feature is open to you, with no daily or monthly counts. A high daily safety limit on AI use still applies.";

export function grantStatusLine(g: AccessGrant, locale?: string): string {
  const until = g.expiresAt ? (g.status === "ended" ? `ended ${shortDate(g.expiresAt, locale)}` : `until ${shortDate(g.expiresAt, locale)}`) : "no end date";
  const state = g.status === "waiting" ? "Waiting for sign-up" : g.status === "ended" ? "Ended" : "Active";
  return `${state}, ${until}`;
}

const ACTION_WORD: Record<AccessHistoryItem["action"], string> = {
  grant: "given to",
  change: "changed for",
  revoke: "removed from",
  claim: "applied to the new account of",
  ceiling_reached: "AI safety limit reached by",
};

export function historyLine(h: AccessHistoryItem, locale?: string): string {
  const by = h.by ? ` by ${h.by}` : "";
  return `${shortDate(h.at, locale)}: ${h.action === "ceiling_reached" ? ACTION_WORD[h.action] : `Access ${ACTION_WORD[h.action]}`} ${h.email}${by}`;
}

// The grant form, checked before sending (the server checks again).
export function grantFormProblem(email: string, until: string | null, note: string, today: string): string | null {
  const e = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "Enter an email address.";
  if (until !== null && until !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(until) || until < today)) return "The end date must be today or later.";
  if (note.trim().length > 500) return "Keep the note under 500 characters.";
  return null;
}

// ---------------------------------------------------------------------------
// REQ-201: inviting an AI pilot group, and who has full AI
// ---------------------------------------------------------------------------

export const BULK_GRANT_MAX = 50;

// Addresses typed or pasted into the grant form: commas, semicolons, spaces
// or new lines between them; duplicates (any case) dropped.
export function emailList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim();
    if (!e || seen.has(e.toLowerCase())) continue;
    seen.add(e.toLowerCase());
    out.push(e);
  }
  return out;
}

// The form check for one or more addresses (the server checks again).
export function bulkFormProblem(text: string, until: string | null, note: string, today: string): string | null {
  const emails = emailList(text);
  if (!emails.length) return "Enter an email address.";
  if (emails.length > BULK_GRANT_MAX) return `Up to ${BULK_GRANT_MAX} addresses at a time.`;
  const bad = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (bad.length) return `Not an email address: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? ` and ${bad.length - 3} more` : ""}.`;
  return grantFormProblem(emails[0], until, note, today);
}

export type AiMode = "all" | "granted" | "paid";

export function parseAiMode(v: unknown): AiMode {
  return v === "granted" || v === "paid" ? v : "all";
}

// What the Access screen says about AI for the server's AI_ACCESS_MODE.
export function aiModeLine(mode: AiMode): string {
  if (mode === "granted") return "AI pilot is on: the coach, new lesson versions and unlimited AI grading are for owners and the people listed here. Everyone else has every course, with AI grading for a few typed answers a day.";
  if (mode === "paid") return "AI follows the paid plans. The people listed here and owners always have full AI.";
  return "AI is open to every learner. Access given here also keeps full AI if the AI pilot is turned on.";
}

// One grant's AI access: full while it is active, from sign-up while it
// waits, none once it has ended.
export function grantAiLine(g: Pick<AccessGrant, "status">): string {
  if (g.status === "active") return "Full AI access";
  if (g.status === "waiting") return "Full AI access once they sign up";
  return "No AI pilot access (ended)";
}

export interface BulkGrantResult {
  email: string;
  outcome: "granted" | "owner";
}

export function bulkResultLine(results: BulkGrantResult[]): string {
  const given = results.filter((r) => r.outcome === "granted").length;
  const owners = results.filter((r) => r.outcome === "owner").length;
  return `Access given to ${given} address${given === 1 ? "" : "es"}.` + (owners ? ` ${owners} already ${owners === 1 ? "is an owner" : "are owners"}.` : "");
}

// REQ-211: what "Send a test error" reports back to the owner.
export interface ErrorTrackerTestResult {
  configured: boolean;
  delivered: boolean;
  status: number | null;
}

export function errorTrackerTestLine(r: ErrorTrackerTestResult): string {
  if (!r.configured) return "Error tracking is off: ERROR_TRACKER_DSN isn't set (or isn't a valid Sentry DSN) in Vercel.";
  if (r.delivered) return "Sent. A test error should appear in Sentry within a minute.";
  if (r.status === 401 || r.status === 403) return `Sentry refused it (${r.status}). Check the DSN in Vercel.`;
  return r.status ? `Sentry didn't accept it (${r.status}). Try again later.` : "Couldn't reach Sentry. Try again later.";
}
