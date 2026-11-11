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
// REQ-220 (Nick, 2026-11-10): the rest of the app moved to US spelling; the
// Terms and Privacy text did not, so nobody is asked to re-accept for
// spelling. At the NEXT version update, convert mobile/src/content/legal.ts
// (and the app/(legal) screens) to US spelling with `toUsSpelling`
// (lib/us-spelling.ts) and remove the legal entries from SPELLING_EXCLUDED
// in lib/us-spelling-scope.ts, so lib/us-spelling.test.ts covers them.
export const LEGAL_VERSIONS = {
  terms: "2026-11-10",
  privacy: "2026-11-10",
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
  terms: "2026-11-09",
  privacy: "2026-11-09",
} as const;
export const UNDECLARED_LEGAL_VERSIONS = {
  terms: "2026-11-09",
  privacy: "2026-11-09",
} as const;
export const LEGACY_LEGAL_VERSIONS = {
  terms: "2026-11-07",
  privacy: "2026-11-07",
} as const;

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
const CURRENT_GEN = gen(LEGAL_VERSIONS);
const PREVIOUS_GEN = gen(PREVIOUS_LEGAL_VERSIONS);
const UNDECLARED_GEN = gen(UNDECLARED_LEGAL_VERSIONS);
const LEGACY_GEN = gen(LEGACY_LEGAL_VERSIONS);

// The generations this client may accept, newest first. Only an ABSENT
// header widens what is accepted: a garbled or unknown X-Ascendra-Legal
// gets the current version and nothing else, so it can never widen it.
function acceptableGenerations(ctx: ClientContext): Generation[] {
  const out: Generation[] = [CURRENT_GEN];
  const declared = ctx.declared;
  if (typeof declared === "string") {
    if (declared === PREVIOUS_GEN.version) out.push(PREVIOUS_GEN);
  } else if (ctx.legacy) {
    out.push(PREVIOUS_GEN, UNDECLARED_GEN, LEGACY_GEN);
  } else {
    out.push(UNDECLARED_GEN);
  }
  return out.filter((g, i) => out.findIndex((x) => x.version === g.version) === i);
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
  const g = [CURRENT_GEN, PREVIOUS_GEN, UNDECLARED_GEN, LEGACY_GEN].find((x) => x.version === version);
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
  const latest = await queryOne<{ version: string; accepted_at: Date }>(
    `select version, accepted_at from legal_acceptances
      where user_id = $1 and document = 'terms' order by accepted_at desc, version desc limit 1`,
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
