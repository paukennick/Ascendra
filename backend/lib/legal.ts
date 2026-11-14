import { query, queryOne } from "@/lib/db";
import { isLegacyClient } from "@/lib/client-version";

// Which versions of the Terms of Service and Privacy Policy an account
// accepted, how, and when. One table: legal_acceptances (migration 027,
// line B's REQ-093), one row per document and version, never overwritten,
// with the `source` column line A's REQ-119 recorded (migration 052 adds
// it and moves any rows from 048's terms_acceptances, which it drops).
//
// The text lives in mobile/src/content/legal.ts. LEGAL_VERSIONS must match
// the `version` fields there (lib/legal.test.ts checks). Bump a version when
// the meaning changes, not for a typo: every account that accepted an older
// version is asked once, on its next launch, with one tap.
//
// REQ-220 / REQ-260: the legal text moved to US spelling with the
// 2026-11-13 version and is now covered by lib/us-spelling.test.ts.
//
// REQ-261: 2026-11-14 bumps the Privacy Policy alone (website analytics); the
// Terms stay 2026-11-13. The two documents have had their own version since
// REQ-093, the newer one is the single string (CURRENT_TERMS_VERSION), and an
// account that accepted the Terms at 2026-11-13 is asked for the Privacy Policy
// only (`pending` is ["privacy"]).
export const LEGAL_VERSIONS = {
  terms: "2026-11-13",
  privacy: "2026-11-14",
} as const;

// REQ-175 / REQ-205: the generations of the text that installed builds still
// carry. A build can only ever show the text it was built with, and no OTA is
// possible (EXPO_TOKEN unset), so each generation can be accepted by the
// builds that carry it, and is recorded exactly as sent -- never as the
// current version. Which generation a request belongs to is read from its
// headers (legalContext below):
//   - PREVIOUS_LEGAL_VERSIONS: the version right before the current one. A
//     build that sends X-Ascendra-Legal: <this> may accept it. When
//     LEGAL_VERSIONS is bumped, move its old values here.
//   - UNDECLARED_LEGAL_VERSIONS: builds that send X-Ascendra-App but not
//     X-Ascendra-Legal (REQ-175 up to REQ-205). Frozen: never change it.
//   - LEGACY_LEGAL_VERSIONS: builds that send neither header (before
//     REQ-175; "legacy clients"). Frozen: never change it.
export const PREVIOUS_LEGAL_VERSIONS = {
  terms: "2026-11-13",
  privacy: "2026-11-13",
} as const;
export const UNDECLARED_LEGAL_VERSIONS = {
  terms: "2026-11-09",
  privacy: "2026-11-09",
} as const;
export const LEGACY_LEGAL_VERSIONS = {
  terms: "2026-11-07",
  privacy: "2026-11-07",
} as const;

// REQ-219 (FAIL-1108): generations older than PREVIOUS_LEGAL_VERSIONS that
// installed builds still declare, newest first. REQ-261: the 2026-11-10 pair,
// which PREVIOUS_LEGAL_VERSIONS held until the 2026-11-14 Privacy Policy.
export const EARLIER_LEGAL_VERSIONS: readonly { terms: string; privacy: string }[] = [
  { terms: "2026-11-10", privacy: "2026-11-10" },
];

export type LegalDocument = keyof typeof LEGAL_VERSIONS;
export const LEGAL_DOCUMENTS = Object.keys(LEGAL_VERSIONS) as LegalDocument[];

// REQ-119's single version string, which the app sends at sign-up and on
// the launch prompt: the newer of the two documents' versions. Accepting it
// accepts both documents at their current versions. The app carries the
// same string in mobile/src/lib/legal.ts (a mobile test checks they match).
export const CURRENT_TERMS_VERSION: string = [...Object.values(LEGAL_VERSIONS)].sort().at(-1)!;
export const PREVIOUS_TERMS_VERSION: string = [...Object.values(PREVIOUS_LEGAL_VERSIONS)].sort().at(-1)!;

// Request header a build sends with the legal version its text carries
// (mobile/src/lib/legal.ts TERMS_VERSION). Added by REQ-205, because the
// X-Ascendra-App header says nothing about which text a build shows.
export const LEGAL_VERSION_HEADER = "X-Ascendra-Legal";

// REQ-175 / REQ-205: who is agreeing. `legacy` is true only for a request
// without the app-version header (lib/client-version.ts isLegacyClient).
// `declared` is the X-Ascendra-Legal value; null when the header is absent.
export interface ClientContext {
  legacy: boolean;
  declared?: string | null;
}
// A client that shows the current text: the default, and what the current app sends.
export const CURRENT_CLIENT: ClientContext = { legacy: false, declared: CURRENT_TERMS_VERSION };
const HEADERED = CURRENT_CLIENT;

export function legalContext(req: Request | { headers: Headers }): ClientContext {
  return { legacy: isLegacyClient(req), declared: req.headers.get(LEGAL_VERSION_HEADER) };
}

interface Generation {
  version: string;
  docs: Record<LegalDocument, string>;
}
const single = (docs: Record<LegalDocument, string>) => [...Object.values(docs)].sort().at(-1)!;
const gen = (docs: Record<LegalDocument, string>): Generation => ({ version: single(docs), docs: { ...docs } });
// REQ-219 (FAIL-1108): the texts installed builds carry, as a set, so the
// rule below can be exercised against a bumped set. PREVIOUS_LEGAL_VERSIONS
// held only the one version before the current one, so the next bump moved it
// out and stranded every build that declared it. `previous` is a list, newest
// first: at a bump, push the old PREVIOUS_LEGAL_VERSIONS onto the front of
// EARLIER_LEGAL_VERSIONS (below) and move the old LEGAL_VERSIONS into
// PREVIOUS_LEGAL_VERSIONS.
export interface GenerationSet {
  current: Generation;
  previous: Generation[];
  undeclared: Generation;
  legacy: Generation;
}
export function generationSet(
  current: Record<LegalDocument, string>,
  previous: readonly Record<LegalDocument, string>[],
  undeclared: Record<LegalDocument, string>,
  legacy: Record<LegalDocument, string>
): GenerationSet {
  return { current: gen(current), previous: previous.map(gen), undeclared: gen(undeclared), legacy: gen(legacy) };
}
const GENERATIONS: GenerationSet = generationSet(
  LEGAL_VERSIONS,
  [PREVIOUS_LEGAL_VERSIONS, ...EARLIER_LEGAL_VERSIONS],
  UNDECLARED_LEGAL_VERSIONS,
  LEGACY_LEGAL_VERSIONS
);

// The generations this client may accept, newest first. Only an ABSENT
// header widens what is accepted: a garbled or unknown X-Ascendra-Legal
// gets the current version and nothing else, so it can never widen it. A
// build declaring one of the previous versions accepts exactly that one.
export function acceptableGenerationsIn(ctx: ClientContext, set: GenerationSet): Generation[] {
  const out: Generation[] = [set.current];
  const declared = ctx.declared;
  if (typeof declared === "string") {
    const match = set.previous.find((g) => g.version === declared);
    if (match) out.push(match);
  } else if (ctx.legacy) {
    out.push(...set.previous, set.undeclared, set.legacy);
  } else {
    out.push(set.undeclared);
  }
  return out.filter((g, i) => out.findIndex((x) => x.version === g.version) === i);
}
function acceptableGenerations(ctx: ClientContext): Generation[] {
  return acceptableGenerationsIn(ctx, GENERATIONS);
}

// The single-string versions this client may accept.
export function acceptableTermsVersions(ctx: ClientContext = HEADERED): string[] {
  return acceptableGenerations(ctx).map((g) => g.version);
}

export function isAcceptableTermsVersion(v: unknown, ctx: ClientContext = HEADERED): v is string {
  return typeof v === "string" && acceptableTermsVersions(ctx).includes(v);
}

// The per-document versions a single-string version stands for.
function versionsFor(version: string): Record<LegalDocument, string> {
  const g = [GENERATIONS.current, ...GENERATIONS.previous, GENERATIONS.undeclared, GENERATIONS.legacy].find((x) => x.version === version);
  if (!g) throw new Error(`not a known terms version: ${version}`);
  return { ...g.docs };
}

function acceptableDocVersions(doc: LegalDocument, ctx: ClientContext): string[] {
  return [...new Set(acceptableGenerations(ctx).map((g) => g.docs[doc]))];
}

export type TermsSource = "register" | "google_signup" | "prompt";

export function isCurrentTermsVersion(v: unknown): boolean {
  return v === CURRENT_TERMS_VERSION;
}

// True only when the client says it showed exactly the current versions
// (REQ-093's per-document form).
export function acceptsCurrentVersions(body: unknown): boolean {
  const b = body as { termsVersion?: unknown; privacyVersion?: unknown } | null;
  return b?.termsVersion === LEGAL_VERSIONS.terms && b?.privacyVersion === LEGAL_VERSIONS.privacy;
}

// REQ-175: REQ-093's per-document form for a given client. Returns the
// versions to record, one per document, exactly as the client sent them, or
// null when either is missing or not acceptable for this client.
export function acceptedDocumentVersions(
  body: unknown,
  ctx: ClientContext = HEADERED
): Record<LegalDocument, string> | null {
  const b = body as { termsVersion?: unknown; privacyVersion?: unknown } | null;
  const sent = { terms: b?.termsVersion, privacy: b?.privacyVersion };
  for (const doc of LEGAL_DOCUMENTS) {
    const v = sent[doc];
    if (typeof v !== "string" || !acceptableDocVersions(doc, ctx).includes(v)) return null;
  }
  return sent as Record<LegalDocument, string>;
}

// The version a sign-up request agreed to, in either client form:
// `acceptedTermsVersion` (REQ-119) or `termsVersion` + `privacyVersion`
// (REQ-093). Undefined when neither was sent or either is out of date.
// REQ-175: an older build's matching pair stands for its generation's
// single-string version.
export function signupAcceptedVersion(body: unknown, ctx: ClientContext = HEADERED): string | undefined {
  const b = body as { acceptedTermsVersion?: unknown } | null;
  if (typeof b?.acceptedTermsVersion === "string") return b.acceptedTermsVersion;
  if (acceptsCurrentVersions(body)) return CURRENT_TERMS_VERSION;
  const docs = acceptedDocumentVersions(body, ctx);
  if (!docs) return undefined;
  return acceptableGenerations(ctx).find((g) => LEGAL_DOCUMENTS.every((d) => docs[d] === g.docs[d]))?.version;
}

// Records acceptance of the given documents, at their current versions
// unless `versions` names the exact versions the person saw (REQ-175).
// Idempotent: accepting the same version twice keeps the first row.
export async function recordAcceptance(
  userId: string,
  documents: LegalDocument[] = LEGAL_DOCUMENTS,
  source: TermsSource = "prompt",
  versions: Record<LegalDocument, string> = LEGAL_VERSIONS
): Promise<void> {
  for (const doc of documents) {
    await query(
      `insert into legal_acceptances (user_id, document, version, source) values ($1, $2, $3, $4)
       on conflict (user_id, document, version) do nothing`,
      [userId, doc, versions[doc], source]
    );
  }
}

// Records both documents at the versions `version` stands for. Throws when
// this client may not accept that version (REQ-175: only a legacy client
// may accept the previous one).
export async function recordTermsAcceptance(
  userId: string,
  version: string,
  source: TermsSource,
  ctx: ClientContext = HEADERED
): Promise<void> {
  if (!isAcceptableTermsVersion(version, ctx)) throw new Error(`not an acceptable terms version: ${version}`);
  await recordAcceptance(userId, LEGAL_DOCUMENTS, source, versionsFor(version));
}

// Sign-up paths: the person ticked "I agree" (email) or saw the agreement
// line under "Continue with Google". Recorded only when the app sent the
// current version; an older app (or none sent) leaves no record, and the
// account is asked on its next launch instead. Best effort: a failure here
// must not fail creating the account -- the launch prompt catches it.
export async function recordSignupTermsAcceptance(
  userId: string,
  acceptedVersion: unknown,
  source: Exclude<TermsSource, "prompt">,
  ctx: ClientContext = HEADERED
): Promise<boolean> {
  if (!isAcceptableTermsVersion(acceptedVersion, ctx)) return false;
  try {
    await recordTermsAcceptance(userId, acceptedVersion, source, ctx);
    return true;
  } catch (err) {
    console.warn("terms acceptance not recorded at sign-up:", (err as Error).message);
    return false;
  }
}

// Documents whose current version this user has not accepted yet.
// REQ-175: for a legacy client the previous version also counts, so an old
// build that can only show the previous text stops asking once it is
// accepted; the same account on an updated app is asked for the current one.
export async function pendingAcceptance(userId: string, ctx: ClientContext = HEADERED): Promise<LegalDocument[]> {
  const rows = await query<{ document: LegalDocument; version: string }>(
    `select document, version from legal_acceptances where user_id = $1`,
    [userId]
  );
  return pendingFromRows(rows, ctx);
}

// The pure rule behind pendingAcceptance, for callers that already hold the
// account's acceptance rows (requireUser reads them with the account).
export function pendingFromRows(rows: { document: string; version: string }[], ctx: ClientContext = HEADERED): LegalDocument[] {
  return LEGAL_DOCUMENTS.filter(
    (d) => !rows.some((r) => r.document === d && acceptableDocVersions(d, ctx).includes(r.version))
  );
}

export interface TermsState {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  needsAcceptance: boolean;
  // REQ-093: which documents changed since this account last agreed.
  pending: LegalDocument[];
}

export async function termsState(userId: string, ctx: ClientContext = HEADERED): Promise<TermsState> {
  // REQ-261: the newest acceptance of either document, as the single string
  // `currentVersion` is (the newer of the two). It read the Terms row alone
  // while the two always moved together; after the Privacy-only 2026-11-14
  // bump an account that had agreed to everything would have shown
  // 2026-11-13 against a current 2026-11-14. The app only asks whether it is set.
  const latest = await queryOne<{ version: string; accepted_at: Date }>(
    `select version, accepted_at from legal_acceptances
      where user_id = $1 order by accepted_at desc, version desc limit 1`,
    [userId]
  );
  const pending = await pendingAcceptance(userId, ctx);
  return {
    currentVersion: CURRENT_TERMS_VERSION,
    acceptedVersion: latest?.version ?? null,
    acceptedAt: latest ? new Date(latest.accepted_at).toISOString() : null,
    needsAcceptance: pending.length > 0,
    pending,
  };
}
