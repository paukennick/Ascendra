// REQ-166: verified group discounts -- the database side. What a learner is
// verified for, starting and finishing a verification, the discount to apply
// at Stripe checkout, the Google Play offer to buy, and App Store offer codes
// from the pool. Config and copy: lib/verified-discounts-config.ts.
// Providers and the browser round trip: lib/discount-providers.ts.
//
// Every entry point checks discountsAvailable() first and touches no table
// while it is false (the default: no provider is registered in REQ-166).

import { query, queryOne, withTransaction } from "./db";
import { UserFacingError } from "./http";
import { billingEnabled, planById } from "./billing-config";
import {
  CLASS_CONTACT_LINE,
  DISCOUNT_TERMS,
  GROUP_INFO,
  WHAT_WE_CHECK,
  WHAT_WE_STORE,
  discountsConfigured,
  expiryFor,
  isDiscountGroup,
  offeredGroups,
  playOfferFor,
  stripeCouponFor,
  supportEmail,
  type DiscountGroup,
  type OfferedGroup,
} from "./verified-discounts-config";
import {
  configuredProviders,
  pkceChallenge,
  pkceVerifier,
  providerById,
  providerForGroup,
  readState,
  returnUrl,
  signState,
  verifiableGroups,
  type ReturnTo,
} from "./discount-providers";

type Env = Record<string, string | undefined>;

export const NOT_AVAILABLE = "Verified discounts aren't available right now.";

// Groups on offer right now: enabled, with a published percentage, and
// verifiable by a configured provider.
export function availableGroups(env: Env = process.env): OfferedGroup[] {
  if (!discountsConfigured(env)) return [];
  return offeredGroups(env, verifiableGroups(env));
}

export function discountsAvailable(env: Env = process.env): boolean {
  return availableGroups(env).length > 0;
}

export interface Verification {
  group: DiscountGroup;
  label: string;
  provider: string;
  verifiedAt: string;
  expiresAt: string;
  live: boolean;
}

async function verificationsFor(userId: string, now = new Date()): Promise<Verification[]> {
  const rows = await query<{ group_id: string; provider: string; verified_at: Date; expires_at: Date }>(
    `select group_id, provider, verified_at, expires_at from verified_discounts where user_id = $1 order by verified_at asc, id asc`,
    [userId]
  );
  return rows
    .filter((r) => isDiscountGroup(r.group_id))
    .map((r) => ({
      group: r.group_id as DiscountGroup,
      label: GROUP_INFO[r.group_id as DiscountGroup].label,
      provider: r.provider,
      verifiedAt: r.verified_at.toISOString(),
      expiresAt: r.expires_at.toISOString(),
      live: r.expires_at > now,
    }));
}

export interface ActiveDiscount {
  group: DiscountGroup;
  label: string;
  percent: number;
  expiresAt: string;
  // Web: a Stripe coupon is configured for the group.
  web: boolean;
  // Google Play: the developer-determined offer id to buy.
  playOfferId: string;
  // App Store: offer codes are handed out per plan (POST /api/discounts/offer-code).
  appStoreCodes: boolean;
}

// The largest published discount among the learner's live verifications for
// groups on offer now. null when none (or the feature is off).
export async function activeDiscount(userId: string, env: Env = process.env, now = new Date()): Promise<ActiveDiscount | null> {
  const groups = availableGroups(env);
  if (!groups.length) return null;
  const byId = new Map(groups.map((g) => [g.id, g]));
  let best: ActiveDiscount | null = null;
  for (const v of await verificationsFor(userId, now)) {
    const g = byId.get(v.group);
    if (!v.live || !g) continue;
    if (best && best.percent >= g.percent) continue;
    best = {
      group: g.id,
      label: g.label,
      percent: g.percent,
      expiresAt: v.expiresAt,
      web: Boolean(stripeCouponFor(g.id, env)),
      playOfferId: playOfferFor(g.id, env),
      appStoreCodes: true,
    };
  }
  return best;
}

// GET /api/discounts. Only { available: false } while the feature is off.
export async function discountStatus(userId: string, env: Env = process.env) {
  const groups = availableGroups(env);
  if (!groups.length) return { available: false as const };
  const teacher = groups.some((g) => g.id === "teacher");
  const email = supportEmail(env);
  return {
    available: true as const,
    groups: groups.map((g) => ({ ...g, provider: providerForGroup(g.id, env)?.label ?? null })),
    verifications: await verificationsFor(userId),
    active: await activeDiscount(userId, env),
    whatWeCheck: WHAT_WE_CHECK,
    whatWeStore: WHAT_WE_STORE,
    terms: [...DISCOUNT_TERMS, ...(teacher ? [GROUP_INFO.teacher.note!] : [])],
    // Nick, 2026-11-09: shown wherever the teacher group is.
    classContact: teacher && email ? { line: CLASS_CONTACT_LINE, email } : null,
  };
}

// POST /api/discounts/verify -> the provider's URL.
export function startVerification(userId: string, group: unknown, returnTo: unknown, env: Env = process.env): { url: string; provider: string } {
  if (!discountsAvailable(env)) throw new UserFacingError(NOT_AVAILABLE, 404);
  if (!isDiscountGroup(group) || !availableGroups(env).some((g) => g.id === group)) {
    throw new UserFacingError("That group isn't offered a discount.", 400);
  }
  const provider = providerForGroup(group, env);
  if (!provider) throw new UserFacingError(NOT_AVAILABLE, 404);
  const rt: ReturnTo = returnTo === "web" ? "web" : "app";
  const state = signState({ userId, group, provider: provider.id, returnTo: rt }, env);
  const parsed = readState(state, env)!;
  const url = provider.authorizationUrl({ group, state, codeChallenge: pkceChallenge(pkceVerifier(parsed, env)) }, env);
  return { url, provider: provider.id };
}

export type FinishResult = "verified" | "not_verified" | "failed" | "taken" | "expired";

// The provider-specific callback route calls this with the query string it
// received and redirects to the URL it answers. Never throws.
export async function finishVerification(
  providerId: string,
  params: URLSearchParams,
  env: Env = process.env
): Promise<{ result: FinishResult; redirect: string }> {
  let state: ReturnType<typeof readState> = null;
  try {
    state = readState(params.get("state"), env);
  } catch {
    state = null;
  }
  // Without a valid state we don't know the account or the client; the app
  // is the common case and its page explains a failure.
  if (!state || state.provider !== providerId) return { result: "expired", redirect: returnUrl("app", "expired", env) };
  const done = (result: FinishResult) => ({ result, redirect: returnUrl(state!.returnTo, result, env) });
  if (params.get("error")) return done("not_verified"); // the learner declined or the provider refused
  const code = params.get("code");
  const provider = providerById(providerId, env);
  if (!code || !provider || !discountsAvailable(env) || !isDiscountGroup(state.group)) return done("failed");
  try {
    const outcome = await provider.complete({ code, codeVerifier: pkceVerifier(state, env), group: state.group }, env);
    if (!outcome.subject || !outcome.verifiedGroups.includes(state.group)) return done("not_verified");
    const r = await recordVerification({
      userId: state.userId,
      group: state.group,
      provider: provider.id,
      subject: outcome.subject,
      providerExpiresAt: outcome.expiresAt ?? null,
    }, env);
    return done(r);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[discounts] verification failed", providerId, (err as Error)?.message ?? "");
    return done("failed");
  }
}

// Store ONLY the result. "taken" when this provider identity is already
// verified for the group on another account.
export async function recordVerification(
  v: { userId: string; group: DiscountGroup; provider: string; subject: string; providerExpiresAt: Date | null },
  env: Env = process.env,
  now = new Date()
): Promise<"verified" | "taken"> {
  const subject = String(v.subject).slice(0, 200);
  const expires = expiryFor(now, v.providerExpiresAt, env);
  return withTransaction(async (tx) => {
    // Serialise per identity so two accounts can't race for it.
    await tx.query("select pg_advisory_xact_lock(hashtext($1))", [`verified-discount:${v.provider}:${subject}:${v.group}`]);
    const other = await tx.query<{ user_id: string }>(
      "select user_id from verified_discounts where provider = $1 and provider_subject = $2 and group_id = $3 and user_id <> $4",
      [v.provider, subject, v.group, v.userId]
    );
    if (other.length) return "taken" as const;
    await tx.query(
      `insert into verified_discounts (user_id, group_id, provider, provider_subject, verified_at, expires_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (user_id, group_id) do update
         set provider = excluded.provider, provider_subject = excluded.provider_subject,
             verified_at = excluded.verified_at, expires_at = excluded.expires_at, updated_at = now()`,
      [v.userId, v.group, v.provider, subject, now, expires]
    );
    return "verified" as const;
  });
}

// DELETE /api/discounts/verifications: the learner removes theirs. Works
// whether or not the feature is on (it is their data).
export async function removeVerifications(userId: string): Promise<number> {
  const rows = await query("delete from verified_discounts where user_id = $1 returning id", [userId]);
  return rows.length;
}

// ---------------------------------------------------------------------------
// Applying the discount
// ---------------------------------------------------------------------------

// Web: the Stripe coupon to put on this learner's checkout, or null.
export async function stripeCouponForUser(userId: string, env: Env = process.env): Promise<string | null> {
  if (!billingEnabled(env) || !discountsAvailable(env)) return null;
  const d = await activeDiscount(userId, env);
  return d ? stripeCouponFor(d.group, env) : null;
}

export interface IssuedCode {
  code: string;
  productId: string;
  expiresAt: string;
  // The redemption link (App Store Connect's example link + the code), when
  // APP_STORE_OFFER_REDEEM_URL is set.
  redeemUrl: string | null;
}

export const NO_CODES = "We've run out of discount codes for this plan for now. Please try again in a few days, or ask us for help.";

// App Store: hand the verified learner a one-time offer code for the plan's
// product, from the pool. The same unexpired code is answered again if they
// already have one for that product, so asking twice never spends two. A
// code must have at least a day left to be handed out.
export async function issueAppStoreCode(userId: string, planId: unknown, env: Env = process.env, now = new Date()): Promise<IssuedCode> {
  if (!discountsAvailable(env)) throw new UserFacingError(NOT_AVAILABLE, 404);
  const plan = typeof planId === "string" ? planById(planId, env) : null;
  if (!plan) throw new UserFacingError("That plan doesn't exist.", 400);
  const d = await activeDiscount(userId, env, now);
  if (!d) throw new UserFacingError("Verify for a discount first.", 403);
  const productId = plan.appStoreProductId;
  const minExpiry = new Date(now.getTime() + 24 * 3600 * 1000);
  const row = await withTransaction(async (tx) => {
    await tx.query("select pg_advisory_xact_lock(hashtext($1))", [`offer-code:${userId}:${productId}`]);
    const mine = await tx.query<{ code: string; expires_at: Date }>(
      `select code, expires_at from discount_offer_codes
        where store = 'app_store' and issued_to = $1 and product_id = $2 and group_id = $3 and expires_at > $4
        order by issued_at desc limit 1`,
      [userId, productId, d.group, now]
    );
    if (mine.length) return mine[0];
    const next = await tx.query<{ code: string; expires_at: Date }>(
      `update discount_offer_codes set issued_to = $1, issued_at = $5
        where id = (select id from discount_offer_codes
                     where store = 'app_store' and group_id = $2 and product_id = $3 and issued_at is null and expires_at > $4
                     order by expires_at asc, created_at asc limit 1 for update skip locked)
        returning code, expires_at`,
      [userId, d.group, productId, minExpiry, now]
    );
    return next[0] ?? null;
  });
  if (!row) throw new UserFacingError(NO_CODES, 409);
  const prefix = env.APP_STORE_OFFER_REDEEM_URL?.trim();
  return {
    code: row.code,
    productId,
    expiresAt: row.expires_at.toISOString(),
    redeemUrl: prefix && /^https:\/\/apps\.apple\.com\//.test(prefix) ? `${prefix}${encodeURIComponent(row.code)}` : null,
  };
}

// ---------------------------------------------------------------------------
// The code pool (npm run discounts:codes)
// ---------------------------------------------------------------------------

// One code per line, or Apple's downloaded CSV (the first column is the
// code; a header line is skipped). Codes are letters and digits only.
export function parseCodeFile(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const first = line.split(",")[0]?.trim().replace(/^"|"$/g, "") ?? "";
    if (/^[A-Za-z0-9]{1,64}$/.test(first) && !/^(code|codes|offer ?code)$/i.test(first)) out.add(first);
  }
  return [...out];
}

export async function importCodes(
  opts: { group: DiscountGroup; productId: string; expiresAt: Date; codes: string[] }
): Promise<{ added: number; skipped: number }> {
  if (!opts.codes.length) return { added: 0, skipped: 0 };
  const rows = await query(
    `insert into discount_offer_codes (store, group_id, product_id, code, expires_at)
     select 'app_store', $1, $2, c, $3 from unnest($4::text[]) as c
     on conflict (store, code) do nothing returning id`,
    [opts.group, opts.productId, opts.expiresAt, opts.codes]
  );
  return { added: rows.length, skipped: opts.codes.length - rows.length };
}

export async function codePoolStatus(now = new Date()) {
  return query<{ group_id: string; product_id: string; free: string; issued: string; next_expiry: Date | null }>(
    `select group_id, product_id,
            count(*) filter (where issued_at is null and expires_at > $1)::text as free,
            count(*) filter (where issued_at is not null)::text as issued,
            min(expires_at) filter (where issued_at is null and expires_at > $1) as next_expiry
       from discount_offer_codes group by group_id, product_id order by group_id, product_id`,
    [now]
  );
}

// For `npm run billing:config`-style checks: which settings are present
// (never their values).
export function discountOperatorConfig(env: Env = process.env) {
  const set = (k: string) => (env[k]?.trim() ? "set" : "missing");
  return {
    available: discountsAvailable(env),
    switchOn: env.VERIFIED_DISCOUNTS_ENABLED ?? "(unset)",
    providers: configuredProviders(env).map((p) => p.id),
    groups: offeredGroups(env).map((g) => ({
      group: g.id,
      percent: g.percent,
      verifiable: verifiableGroups(env).has(g.id),
      [`STRIPE_COUPON_${g.id.toUpperCase()}`]: set(`STRIPE_COUPON_${g.id.toUpperCase()}`),
      playOffer: playOfferFor(g.id, env),
    })),
    APP_STORE_OFFER_REDEEM_URL: set("APP_STORE_OFFER_REDEEM_URL"),
  };
}

export async function existingVerificationCount(): Promise<number> {
  const r = await queryOne<{ n: string }>("select count(*)::text as n from verified_discounts");
  return Number(r?.n ?? 0);
}
