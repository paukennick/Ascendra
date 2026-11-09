import { query, queryOne } from "@/lib/db";

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
export const LEGAL_VERSIONS = {
  terms: "2026-11-09",
  privacy: "2026-11-09",
} as const;

export type LegalDocument = keyof typeof LEGAL_VERSIONS;
export const LEGAL_DOCUMENTS = Object.keys(LEGAL_VERSIONS) as LegalDocument[];

// REQ-119's single version string, which the app sends at sign-up and on
// the launch prompt: the newer of the two documents' versions. Accepting it
// accepts both documents at their current versions. The app carries the
// same string in mobile/src/lib/legal.ts (a mobile test checks they match).
export const CURRENT_TERMS_VERSION: string = [...Object.values(LEGAL_VERSIONS)].sort().at(-1)!;

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

// The version a sign-up request agreed to, in either client form:
// `acceptedTermsVersion` (REQ-119) or `termsVersion` + `privacyVersion`
// (REQ-093). Undefined when neither was sent or either is out of date.
export function signupAcceptedVersion(body: unknown): string | undefined {
  const b = body as { acceptedTermsVersion?: unknown } | null;
  if (typeof b?.acceptedTermsVersion === "string") return b.acceptedTermsVersion;
  return acceptsCurrentVersions(body) ? CURRENT_TERMS_VERSION : undefined;
}

// Records acceptance of the given documents at their current versions.
// Idempotent: accepting the same version twice keeps the first row.
export async function recordAcceptance(
  userId: string,
  documents: LegalDocument[] = LEGAL_DOCUMENTS,
  source: TermsSource = "prompt"
): Promise<void> {
  for (const doc of documents) {
    await query(
      `insert into legal_acceptances (user_id, document, version, source) values ($1, $2, $3, $4)
       on conflict (user_id, document, version) do nothing`,
      [userId, doc, LEGAL_VERSIONS[doc], source]
    );
  }
}

export async function recordTermsAcceptance(userId: string, version: string, source: TermsSource): Promise<void> {
  if (!isCurrentTermsVersion(version)) throw new Error(`not the current terms version: ${version}`);
  await recordAcceptance(userId, LEGAL_DOCUMENTS, source);
}

// Sign-up paths: the person ticked "I agree" (email) or saw the agreement
// line under "Continue with Google". Recorded only when the app sent the
// current version; an older app (or none sent) leaves no record, and the
// account is asked on its next launch instead. Best effort: a failure here
// must not fail creating the account -- the launch prompt catches it.
export async function recordSignupTermsAcceptance(
  userId: string,
  acceptedVersion: unknown,
  source: Exclude<TermsSource, "prompt">
): Promise<boolean> {
  if (!isCurrentTermsVersion(acceptedVersion)) return false;
  try {
    await recordTermsAcceptance(userId, CURRENT_TERMS_VERSION, source);
    return true;
  } catch (err) {
    console.warn("terms acceptance not recorded at sign-up:", (err as Error).message);
    return false;
  }
}

// Documents whose current version this user has not accepted yet.
export async function pendingAcceptance(userId: string): Promise<LegalDocument[]> {
  const rows = await query<{ document: LegalDocument; version: string }>(
    `select document, version from legal_acceptances where user_id = $1`,
    [userId]
  );
  return LEGAL_DOCUMENTS.filter((d) => !rows.some((r) => r.document === d && r.version === LEGAL_VERSIONS[d]));
}

export interface TermsState {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  needsAcceptance: boolean;
  // REQ-093: which documents changed since this account last agreed.
  pending: LegalDocument[];
}

export async function termsState(userId: string): Promise<TermsState> {
  const latest = await queryOne<{ version: string; accepted_at: Date }>(
    `select version, accepted_at from legal_acceptances
      where user_id = $1 and document = 'terms' order by accepted_at desc, version desc limit 1`,
    [userId]
  );
  const pending = await pendingAcceptance(userId);
  return {
    currentVersion: CURRENT_TERMS_VERSION,
    acceptedVersion: latest?.version ?? null,
    acceptedAt: latest ? new Date(latest.accepted_at).toISOString() : null,
    needsAcceptance: pending.length > 0,
    pending,
  };
}
