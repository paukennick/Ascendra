import { query } from "@/lib/db";

// REQ-093: current versions of the Terms of Service and Privacy Policy.
//
// The text itself lives in mobile/src/content/legal.ts; these must match the
// `version` fields there (lib/legal.test.ts checks). Bump a version when the
// meaning changes, not for a typo: every user who accepted an older version
// is asked to accept again the next time they open the app.
export const LEGAL_VERSIONS = {
  terms: "2026-11-04",
  privacy: "2026-11-04",
} as const;

export type LegalDocument = keyof typeof LEGAL_VERSIONS;
export const LEGAL_DOCUMENTS = Object.keys(LEGAL_VERSIONS) as LegalDocument[];

// Records acceptance of the given documents at their current versions.
// Idempotent: accepting the same version twice keeps the first timestamp.
export async function recordAcceptance(userId: string, documents: LegalDocument[]): Promise<void> {
  for (const doc of documents) {
    await query(
      `insert into legal_acceptances (user_id, document, version) values ($1, $2, $3)
       on conflict (user_id, document, version) do nothing`,
      [userId, doc, LEGAL_VERSIONS[doc]]
    );
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

// True only when the client says it showed exactly the current versions.
export function acceptsCurrentVersions(body: unknown): boolean {
  const b = body as { termsVersion?: unknown; privacyVersion?: unknown } | null;
  return b?.termsVersion === LEGAL_VERSIONS.terms && b?.privacyVersion === LEGAL_VERSIONS.privacy;
}
