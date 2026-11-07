import { query, queryOne } from "@/lib/db";

// REQ-119 (Audit 3 product H5): which version of the Terms of Service and
// Privacy Policy an account accepted, and when (migration 048).
//
// One version string covers both documents: change it whenever either page
// changes in a way people should agree to again, and every account is asked
// once, on its next launch, with one tap. The app carries the same string in
// mobile/src/lib/legal.ts (a mobile test checks they match).
export const CURRENT_TERMS_VERSION = "2026-11-07";

export type TermsSource = "register" | "google_signup" | "prompt";

export function isCurrentTermsVersion(v: unknown): boolean {
  return v === CURRENT_TERMS_VERSION;
}

export async function recordTermsAcceptance(userId: string, version: string, source: TermsSource): Promise<void> {
  await query(
    `insert into terms_acceptances (user_id, terms_version, source) values ($1, $2, $3)
     on conflict (user_id, terms_version) do nothing`,
    [userId, version, source]
  );
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

export interface TermsState {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  needsAcceptance: boolean;
}

export async function termsState(userId: string): Promise<TermsState> {
  const latest = await queryOne<{ terms_version: string; accepted_at: Date }>(
    `select terms_version, accepted_at from terms_acceptances where user_id = $1 order by accepted_at desc limit 1`,
    [userId]
  );
  const current = await queryOne<{ ok: boolean }>(
    `select true as ok from terms_acceptances where user_id = $1 and terms_version = $2`,
    [userId, CURRENT_TERMS_VERSION]
  );
  return {
    currentVersion: CURRENT_TERMS_VERSION,
    acceptedVersion: latest?.terms_version ?? null,
    acceptedAt: latest ? new Date(latest.accepted_at).toISOString() : null,
    needsAcceptance: !current,
  };
}
