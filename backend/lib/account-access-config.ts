// REQ-144: unrestricted access -- the pure parts (no database), so they run
// under `npm test`. The database side is lib/account-access.ts.
//
// Two levels, owner implying unrestricted:
//   - owner: an account whose VERIFIED email is in OWNER_EMAILS (comma-
//     separated, any case). A server setting rather than a row, so the app
//     can never remove an owner, and no SQL is needed to make one. An
//     unverified account with an owner's address is not an owner: anyone
//     can type an address into the sign-up form.
//   - unrestricted: a live grant in account_access (migration 056), given by
//     an owner in Settings > Access or with `npm run access:grant`.
//
// What unrestricted lifts: every plan feature, course and lab whatever the
// tier and whether or not BILLING_ENABLED is on; plan allowances; the
// per-tier monthly AI cap (an owner has its own monthly safety cap,
// ownerMonthlyCapUsd below); and it raises the daily AI budget to a SAFETY
// CEILING (below) instead of removing it. It also gives early access to
// features behind switches that are off for everyone else (EARLY_ACCESS
// below). It never lifts sign-in, MFA, rate limits, access checks on other
// learners' data, disclaimers or acknowledgements.

type Env = Record<string, string | undefined>;

export type AccessLevel = "owner" | "unrestricted";

export function ownerEmails(env: Env = process.env): Set<string> {
  return new Set(
    (env.OWNER_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"))
  );
}

export function isOwnerEmail(email: string | null | undefined, verified: boolean, env: Env = process.env): boolean {
  if (!email || !verified) return false;
  return ownerEmails(env).has(email.trim().toLowerCase());
}

export interface LiveGrant {
  id: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

// Whether a grant applies at `now`: not revoked, not past its end.
export function grantIsLive(g: LiveGrant | null | undefined, now = new Date()): boolean {
  if (!g || g.revokedAt) return false;
  return g.expiresAt === null || g.expiresAt.getTime() > now.getTime();
}

export function resolveLevel(
  account: { email: string; verified: boolean } | null,
  grant: LiveGrant | null,
  env: Env = process.env,
  now = new Date()
): AccessLevel | null {
  if (!account) return null;
  if (isOwnerEmail(account.email, account.verified, env)) return "owner";
  return grantIsLive(grant, now) ? "unrestricted" : null;
}

// ---------------------------------------------------------------------------
// The AI safety ceiling
// ---------------------------------------------------------------------------
//
// Unrestricted accounts are not "unlimited spend". The everyday budget
// (AI_DAILY_BUDGET_USD, $0.50) is raised for them to this ceiling over the
// same rolling 24 hours: 40 times a learner's budget, far beyond any real
// study day (a heavy learner's day is about $0.15), yet a hard stop on a
// runaway loop, a leaked token or a misbehaving client. At the ceiling the
// coach and lesson regenerate pause like the budget, it is logged, and the
// owners are emailed (once a day per account). Grading never stops.
// AI_UNRESTRICTED_DAILY_CEILING_USD overrides it; it cannot be switched off
// ("off" or 0 fall back to the default) -- that is the point of a ceiling.

export const DEFAULT_UNRESTRICTED_CEILING_USD = 20;

export function unrestrictedCeilingUsd(env: Env = process.env): number {
  const raw = env.AI_UNRESTRICTED_DAILY_CEILING_USD?.trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) return DEFAULT_UNRESTRICTED_CEILING_USD;
  return n;
}

// The owner's monthly AI safety cap (Nick, 2026-11-09). Owners skip every
// plan gate, but not unlimited spend: over a calendar month (UTC) their coach
// chat and lesson regenerate pause at this many dollars of model spend, the
// same pause and message as a plan's monthly cap (lib/entitlements.ts
// aiAllowanceStatus). Grading and review never stop. Unlike the plan caps it
// applies whether or not BILLING_ENABLED is on: it is a safety stop, like
// the daily ceiling above, not a plan limit. OWNER_MONTHLY_AI_CAP_USD
// overrides it; it cannot be switched off ("off", 0 or junk fall back to the
// default). Granted (non-owner) unrestricted accounts are not affected here.

export const DEFAULT_OWNER_MONTHLY_CAP_USD = 35;

export function ownerMonthlyCapUsd(env: Env = process.env): number {
  const raw = env.OWNER_MONTHLY_AI_CAP_USD?.trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) return DEFAULT_OWNER_MONTHLY_CAP_USD;
  return n;
}

export const CEILING_REACHED_MESSAGE =
  "You've reached today's safety ceiling for AI use. The coach and new lesson versions pause until it " +
  "refills over the next 24 hours, and the account owner has been told. Lessons, practice, grading and " +
  "review keep working.";

// ---------------------------------------------------------------------------
// Early access: features behind a switch that is off for everyone else
// ---------------------------------------------------------------------------
//
// Each entry is a server switch and how to read whether it is on for
// everyone. featureEnabledFor(userId, flag) (lib/account-access.ts) is true
// when it is on, or when it is off and the account is owner or
// unrestricted. To give a new switch early access (for example
// SIMS_ENABLED, docs/sims.md on feature/sim-engine-design), add it here and
// read it through featureEnabledFor(user.id, "sims") on the server instead
// of reading the env directly. A switch meant as an emergency stop for
// EVERYONE (a broken or unsafe feature) should not be listed here.

const OFF_WORDS = new Set(["", "0", "false", "off", "no"]);

function switchOn(raw: string | undefined, defaultOn: boolean): boolean {
  if (raw === undefined) return defaultOn;
  return !OFF_WORDS.has(raw.trim().toLowerCase());
}

export const EARLY_ACCESS = {
  // REQ-125: labs still waiting for expert review are served unless
  // LABS_SERVE_UNREVIEWED is set off. Off: only unrestricted accounts see
  // them (each still with its disclaimer and acknowledgement).
  labs_unreviewed: { env: "LABS_SERVE_UNREVIEWED", defaultOn: true },
} as const satisfies Record<string, { env: string; defaultOn: boolean }>;

export type EarlyAccessFlag = keyof typeof EARLY_ACCESS;

export function switchOnForEveryone(flag: EarlyAccessFlag, env: Env = process.env): boolean {
  const f = EARLY_ACCESS[flag];
  const raw = env[f.env];
  // An empty value means off for a default-off switch and, as before
  // REQ-144, on for LABS_SERVE_UNREVIEWED (lib/labs.ts servedReviewStatuses).
  if (raw !== undefined && raw.trim() === "" && f.defaultOn) return true;
  return switchOn(raw, f.defaultOn);
}

// ---------------------------------------------------------------------------
// Grant input (the app's form and the CLI)
// ---------------------------------------------------------------------------

export const NOTE_MAX = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  return e.length >= 3 && e.length <= 320 && EMAIL_RE.test(e) ? e : null;
}

// "YYYY-MM-DD" -> the end of that day (UTC); an ISO time -> itself.
export function parseUntil(v: unknown, now = new Date()): Date | null | string {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string") return "until must be a date (YYYY-MM-DD)";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T23:59:59.999Z`) : new Date(v);
  if (Number.isNaN(d.getTime())) return "until must be a date (YYYY-MM-DD)";
  if (d.getTime() <= now.getTime()) return "until must be in the future";
  return d;
}

export interface GrantInput {
  email: string;
  until: Date | null;
  note: string | null;
}

export function parseGrantInput(body: unknown, now = new Date()): GrantInput | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = normalizeEmail(b.email);
  if (!email) return "email must be an email address";
  const until = parseUntil(b.until, now);
  if (typeof until === "string") return until;
  if (b.note !== undefined && b.note !== null && typeof b.note !== "string") return "note must be text";
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
  if (note && note.length > NOTE_MAX) return `note must be at most ${NOTE_MAX} characters`;
  // eslint-disable-next-line no-control-regex
  if (note && /[\u0000]/.test(note)) return "note contains characters that can't be stored";
  return { email, until, note };
}

// `npm run access:grant -- ...`
export type AccessCliArgs =
  | { mode: "list" }
  | { mode: "grant"; email: string; until: Date | null; note: string | null }
  | { mode: "revoke"; email: string };

export function parseAccessArgs(argv: string[], now = new Date()): AccessCliArgs {
  let email: string | null = null;
  let until: string | null = null;
  let note: string | null = null;
  let revoke = false;
  let list = false;
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${k} needs a value`);
      return v;
    };
    if (k === "--email") email = val();
    else if (k === "--until") until = val();
    else if (k === "--note") note = val();
    else if (k === "--revoke") revoke = true;
    else if (k === "--list") list = true;
    else throw new Error(`Unknown option ${k}`);
  }
  if (list) {
    if (email || revoke || until || note) throw new Error("--list takes no other options");
    return { mode: "list" };
  }
  if (!email) throw new Error("Give --email <address> (or --list)");
  if (revoke) {
    if (until || note) throw new Error("--revoke takes only --email");
    const e = normalizeEmail(email);
    if (!e) throw new Error("--email must be an email address");
    return { mode: "revoke", email: e };
  }
  const parsed = parseGrantInput({ email, until, note }, now);
  if (typeof parsed === "string") throw new Error(parsed);
  return { mode: "grant", ...parsed };
}

// ---------------------------------------------------------------------------
// REQ-201: inviting an AI pilot group -- several addresses at once
// ---------------------------------------------------------------------------
//
// POST /api/access/grants also takes { emails, until?, note? }: addresses
// separated by commas, semicolons, spaces or new lines (or an array), at most
// BULK_GRANT_MAX, each given the same end date and note. Every address must
// be valid or nothing is granted. Each one is an ordinary grant (audited,
// renewing a live one rather than duplicating it).

export const BULK_GRANT_MAX = 50;
// One unit of the owner's access-change rate limit per this many addresses,
// so a bulk invite can't hand out more per hour than GRANT_LIMIT allows x 10.
export const BULK_GRANT_PER_RATE_UNIT = 10;

export function splitEmailList(v: unknown): string[] {
  const parts = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : typeof v === "string" ? [v] : [];
  return parts
    .flatMap((p) => p.split(/[\s,;]+/))
    .map((p) => p.trim())
    .filter(Boolean);
}

export interface BulkGrantInput {
  emails: string[];
  until: Date | null;
  note: string | null;
}

export function parseBulkGrantInput(body: unknown, now = new Date()): BulkGrantInput | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const raw = splitEmailList(b.emails);
  if (!raw.length) return "emails must list at least one email address";
  const bad = raw.filter((e) => !normalizeEmail(e));
  if (bad.length) return `Not an email address: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? ` and ${bad.length - 3} more` : ""}`;
  const emails = [...new Set(raw.map((e) => normalizeEmail(e)!))];
  if (emails.length > BULK_GRANT_MAX) return `At most ${BULK_GRANT_MAX} addresses at a time`;
  // The end date and note are checked exactly as for one address.
  const one = parseGrantInput({ email: emails[0], until: b.until, note: b.note }, now);
  if (typeof one === "string") return one;
  return { emails, until: one.until, note: one.note };
}
