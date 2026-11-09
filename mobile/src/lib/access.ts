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
