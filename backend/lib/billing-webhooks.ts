import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { query, queryOne, withTransaction, type TxClient } from "@/lib/db";
import { isUuid } from "@/lib/visibility";
import {
  isPlanFamily,
  isPlanScope,
  planForEntitlementId,
  planForStoreProduct,
  planForStripePrice,
  planRank,
  PLAN_FAMILIES,
  type PaidTier,
  type PlanFamily,
  type PlanPeriod,
  type PlanScope,
  type StoreProductPlan,
} from "@/lib/billing-config";

// REQ-122: the payment providers tell us what each learner has paid for.
//
// RevenueCat (App Store and Google Play) and Stripe (the web) each post
// events to their own webhook route. Both land here and update ONE table,
// entitlements, which lib/entitlements.ts reads.
//
// Every event is:
//   - authenticated: RevenueCat by the Authorization header value set in its
//     dashboard (REVENUECAT_WEBHOOK_AUTH), Stripe by its signature on the raw
//     body (STRIPE_WEBHOOK_SECRET), both compared in constant time;
//   - recorded once: billing_events is unique on (provider, event_id), so a
//     redelivery is answered 200 and changes nothing;
//   - order-safe: each entitlement keeps the provider time of the newest
//     event applied (last_event_at); an older event that arrives late is
//     logged as 'stale' and changes nothing.
// The event log keeps ids, type, times and the outcome only, never the
// payload.
//
// DOWNGRADES (Nick, 2026-11-07, decision 6). A learner who moves to a lower
// plan (Pro to Plus) or cancels keeps what they paid for until the end of
// the period they paid for; the lower tier applies only from then. Upgrades
// apply at once. A cancellation already worked that way (status 'canceled'
// keeps access to period_end). A change of tier on the SAME subscription
// (Stripe's subscription.updated with a cheaper price; a store event that
// lands on the row with a lower product) used to overwrite the row's tier at
// once. Now, when the stored row is a higher tier with paid time left, that
// paid time is kept as a separate "held" entitlement row (external_id
// 'held:<the subscription's id>', status 'canceled', period_end = the paid
// period's end), and the subscription's own row takes the new tier. The
// learner's tier is the highest among rows that give access, so they keep
// the higher plan until the held row ends (plus the usual 24-hour grace).
// Out of order: a higher-tier event that arrives AFTER the newer lower-tier
// one is stale for the subscription's row, but its paid period is still
// held, so the result doesn't depend on delivery order. A refund or a
// revocation of the subscription ends its held row too.

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

// Constant time for any lengths: compares SHA-256 digests.
export function safeEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a, "utf8").digest();
  const db = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(da, db) && a.length === b.length;
}

export function revenueCatAuthorized(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  // RevenueCat sends exactly the value configured in its dashboard; accept it
  // with or without a "Bearer " prefix on either side.
  const strip = (s: string) => s.trim().replace(/^Bearer\s+/i, "");
  return safeEqual(strip(header), strip(secret));
}

export const STRIPE_TOLERANCE_SECONDS = 300;

// Stripe's documented scheme (https://docs.stripe.com/webhooks#verify-manually):
// the Stripe-Signature header is "t=<unix seconds>,v1=<hex>[,v1=<hex>...]";
// the expected v1 is HMAC-SHA256(secret, "<t>.<raw body>") in hex; reject a
// timestamp outside the tolerance (replay protection).
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  tolerance = STRIPE_TOLERANCE_SECONDS
): { ok: true; timestamp: number } | { ok: false; reason: string } {
  if (!header || !secret) return { ok: false, reason: "missing signature" };
  let t: number | null = null;
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t" && /^\d+$/.test(v)) t = Number(v);
    else if (k === "v1" && /^[0-9a-f]+$/i.test(v)) sigs.push(v.toLowerCase());
  }
  if (t === null || !sigs.length) return { ok: false, reason: "malformed signature" };
  if (Math.abs(nowSeconds - t) > tolerance) return { ok: false, reason: "timestamp outside tolerance" };
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest("hex");
  const match = sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s, "hex"), Buffer.from(expected, "hex")));
  return match ? { ok: true, timestamp: t } : { ok: false, reason: "signature mismatch" };
}

// For tests and docs: the header Stripe would send for this body.
export function stripeSignatureHeader(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest("hex")}`;
}

// ---------------------------------------------------------------------------
// Shared: the event log and one entitlement upsert
// ---------------------------------------------------------------------------

type Outcome = "applied" | "stale" | "ignored" | "unmatched" | "duplicate";

export interface ApplyResult {
  outcome: Outcome;
  eventId: string;
}

interface EntitlementChange {
  userId: string;
  source: "revenuecat" | "stripe";
  externalId: string;
  tier: PaidTier;
  // REQ-170: the category plan (null only for an unknown product line)
  family: PlanFamily | null;
  scope: PlanScope | null;
  plan: PlanPeriod | null;
  productId: string | null;
  status: "active" | "canceled" | "billing_issue" | "expired" | "refunded" | "revoked";
  periodEnd: Date | null;
  store?: string | null;
  customerRef?: string | null;
}

// Claims the event id (false = already received) inside the caller's transaction.
async function claimEvent(
  tx: TxClient,
  provider: "revenuecat" | "stripe",
  eventId: string,
  eventType: string,
  userId: string | null,
  occurredAt: Date | null
): Promise<boolean> {
  const row = await tx.queryOne<{ id: string }>(
    `insert into billing_events (provider, event_id, event_type, user_id, occurred_at, outcome)
     values ($1, $2, $3, (select id from app_users where id = $4::uuid), $5, 'pending')
     on conflict (provider, event_id) do nothing returning id`,
    [provider, eventId, eventType.slice(0, 80), userId && isUuid(userId) ? userId : null, occurredAt]
  );
  return row !== null;
}

async function setOutcome(tx: TxClient, provider: string, eventId: string, outcome: Outcome, detail: Record<string, unknown> = {}) {
  await tx.query(`update billing_events set outcome = $3, detail = $4 where provider = $1 and event_id = $2`, [
    provider,
    eventId,
    outcome,
    JSON.stringify(detail),
  ]);
}

export const HELD_PREFIX = "held:";
export const heldExternalId = (externalId: string) => `${HELD_PREFIX}${externalId}`;
const PAID_UP = new Set(["active", "canceled"]);
const ENDS_NOW = new Set(["refunded", "revoked"]);

// Keeps a higher tier's paid period as the subscription's held row
// (created, or extended to the later end and the higher tier).
async function holdPaidPeriod(
  tx: TxClient,
  c: Pick<EntitlementChange, "userId" | "source" | "externalId" | "store" | "customerRef">,
  tier: PaidTier,
  family: PlanFamily | null,
  scope: PlanScope | null,
  plan: string | null,
  productId: string | null,
  periodEnd: Date,
  eventId: string,
  at: Date
): Promise<void> {
  await tx.query(
    `insert into entitlements (user_id, tier, source, external_id, product_id, plan, status, period_end, store, customer_ref,
                               last_event_at, last_event_id, note, family, scope)
     values ($1, $2, $3, $4, $5, $6, 'canceled', $7, $8, $9, $10, $11, 'kept to the end of the paid period after a downgrade', $12, $13)
     on conflict (source, external_id) do update
        set tier = case when entitlements.tier = 'pro' or excluded.tier = 'pro' then 'pro' else 'plus' end,
            -- REQ-170: the held plan is the higher-ranked of the two
            family = case when $14::int >= coalesce($15::int, 0) then excluded.family else entitlements.family end,
            scope = case when $14::int >= coalesce($15::int, 0) then excluded.scope else entitlements.scope end,
            period_end = greatest(entitlements.period_end, excluded.period_end),
            last_event_at = greatest(entitlements.last_event_at, excluded.last_event_at),
            updated_at = now()
      where entitlements.status not in ('refunded', 'revoked')`,
    [
      c.userId,
      tier,
      c.source,
      heldExternalId(c.externalId),
      productId,
      plan,
      periodEnd,
      c.store ?? null,
      c.customerRef ?? null,
      at,
      eventId,
      family,
      scope,
      planRank(family, tier),
      await heldRank(tx, c.source, c.externalId),
    ]
  );
}

async function heldRank(tx: TxClient, source: string, externalId: string): Promise<number | null> {
  const row = await tx.queryOne<{ family: string | null; tier: PaidTier }>(
    `select family, tier from entitlements where source = $1 and external_id = $2`,
    [source, heldExternalId(externalId)]
  );
  return row ? planRank(isPlanFamily(row.family) ? row.family : null, row.tier) : null;
}

// A refund or revocation of a subscription ends the paid time held from it.
async function endHeld(tx: TxClient, source: string, externalId: string, status: string, eventId: string, at: Date) {
  if (!ENDS_NOW.has(status)) return;
  await tx.query(
    `update entitlements set status = $3, last_event_at = $4, last_event_id = $5, updated_at = now()
      where source = $1 and external_id = $2 and status not in ('refunded', 'revoked')`,
    [source, heldExternalId(externalId), status, at, eventId]
  );
}

// Applies the change unless the stored row already reflects a newer event.
async function upsertEntitlement(tx: TxClient, c: EntitlementChange, eventId: string, at: Date): Promise<"applied" | "stale"> {
  const existing = await tx.queryOne<{
    id: string;
    last_event_at: Date | null;
    tier: PaidTier;
    family: string | null;
    scope: string | null;
    status: string;
    period_end: Date | null;
    plan: string | null;
    product_id: string | null;
    customer_ref: string | null;
  }>(
    `select id, last_event_at, tier, family, scope, status, period_end, plan, product_id, customer_ref
       from entitlements where source = $1 and external_id = $2 for update`,
    [c.source, c.externalId]
  );
  // REQ-170: "higher" is the plan's rank (all-access over a category's Pro
  // over its Plus); a row without a family ranks by tier.
  const newRank = planRank(c.family, c.tier);
  const oldFamily = existing && isPlanFamily(existing.family) ? existing.family : null;
  const oldScope = existing && isPlanScope(existing.scope) ? existing.scope : null;
  const oldRank = existing ? planRank(oldFamily, existing.tier) : 0;
  if (existing?.last_event_at && new Date(existing.last_event_at).getTime() > at.getTime()) {
    // Decision 6, out of order: an older event for a HIGHER tier than the
    // newer stored state, with paid time left, is a period the learner paid
    // for before downgrading. Keep it, as in-order delivery would have.
    if (
      newRank > oldRank &&
      PAID_UP.has(c.status) &&
      ["active", "canceled", "billing_issue"].includes(existing.status) &&
      c.periodEnd &&
      c.periodEnd.getTime() > Date.now()
    ) {
      await holdPaidPeriod(tx, { ...c, customerRef: c.customerRef ?? existing.customer_ref }, c.tier, c.family, c.scope, c.plan, c.productId, c.periodEnd, eventId, at);
    }
    return "stale";
  }
  // Decision 6, in order: a lower tier on a subscription whose higher tier
  // is still paid up keeps the higher tier to the paid period's end.
  if (
    existing &&
    newRank < oldRank &&
    PAID_UP.has(existing.status) &&
    !ENDS_NOW.has(c.status) &&
    existing.period_end &&
    new Date(existing.period_end).getTime() > at.getTime()
  ) {
    await holdPaidPeriod(
      tx,
      { ...c, customerRef: c.customerRef ?? existing.customer_ref },
      existing.tier,
      oldFamily,
      oldScope,
      existing.plan,
      existing.product_id,
      new Date(existing.period_end),
      eventId,
      at
    );
  }
  await endHeld(tx, c.source, c.externalId, c.status, eventId, at);
  await tx.query(
    `insert into entitlements (user_id, tier, source, external_id, product_id, plan, status, period_end, store, customer_ref,
                               last_event_at, last_event_id, family, scope)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     on conflict (source, external_id) do update
        set user_id = excluded.user_id, tier = excluded.tier, product_id = excluded.product_id, plan = excluded.plan,
            family = excluded.family, scope = excluded.scope,
            status = excluded.status, period_end = excluded.period_end,
            store = coalesce(excluded.store, entitlements.store),
            customer_ref = coalesce(excluded.customer_ref, entitlements.customer_ref),
            last_event_at = excluded.last_event_at, last_event_id = excluded.last_event_id, updated_at = now()`,
    [
      c.userId,
      c.tier,
      c.source,
      c.externalId,
      c.productId,
      c.plan,
      c.status,
      c.periodEnd,
      c.store ?? null,
      c.customerRef ?? null,
      at,
      eventId,
      c.family,
      c.scope,
    ]
  );
  return "applied";
}

// Status-only change on an existing row (no tier/plan known from the event).
async function updateStatus(
  tx: TxClient,
  source: "revenuecat" | "stripe",
  where: { externalId?: string; customerRef?: string },
  status: EntitlementChange["status"],
  eventId: string,
  at: Date,
  periodEnd?: Date | null
): Promise<"applied" | "stale" | "unmatched"> {
  const rows = await tx.query<{ id: string; last_event_at: Date | null }>(
    where.externalId
      ? `select id, last_event_at from entitlements where source = $1 and external_id = $2 for update`
      : `select id, last_event_at from entitlements where source = $1 and customer_ref = $2
           and status in ('active', 'canceled', 'billing_issue') for update`,
    [source, where.externalId ?? where.customerRef]
  );
  if (!rows.length) return "unmatched";
  let applied = false;
  for (const r of rows) {
    if (r.last_event_at && new Date(r.last_event_at).getTime() > at.getTime()) continue;
    await tx.query(
      `update entitlements set status = $2, period_end = coalesce($3, period_end), last_event_at = $4, last_event_id = $5, updated_at = now()
        where id = $1`,
      [r.id, status, periodEnd ?? null, at, eventId]
    );
    applied = true;
  }
  if (applied && where.externalId) await endHeld(tx, source, where.externalId, status, eventId, at);
  return applied ? "applied" : "stale";
}

// ---------------------------------------------------------------------------
// RevenueCat
// ---------------------------------------------------------------------------

// https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
export interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  new_product_id?: string;
  entitlement_ids?: string[] | null;
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
  store?: string;
  environment?: string;
  original_transaction_id?: string;
  transaction_id?: string;
  cancel_reason?: string;
  expiration_reason?: string;
  transferred_from?: string[];
  transferred_to?: string[];
}

const RC_ACCESS_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
  "REFUND_REVERSED",
]);
// Logged only: PRODUCT_CHANGE is the notice of a change; the change itself
// arrives as its own event (RevenueCat's event flows): an App Store upgrade
// or same-length crossgrade with a RENEWAL for the new product at once, a
// Google Play change with an INITIAL_PURCHASE (the app asks Play for
// DEFERRED replacement on a downgrade, src/billing/purchases.ts), and a
// downgrade with a RENEWAL at the period end. Whichever way a lower tier
// lands early, upsertEntitlement holds the paid higher tier to its end
// (decision 6). TEST is the dashboard's test button; the rest don't change
// access.
const RC_LOG_ONLY = new Set(["PRODUCT_CHANGE", "TEST", "SUBSCRIPTION_PAUSED", "INVOICE_ISSUANCE", "VIRTUAL_CURRENCY_TRANSACTION", "EXPERIMENT_ENROLLMENT"]);

// The learner this event is for: the first uuid among app_user_id, original
// and aliases that is an account (the app logs in to RevenueCat with the
// account id; anonymous $RCAnonymousID values are skipped).
async function rcUserId(tx: TxClient, e: RevenueCatEvent): Promise<string | null> {
  const ids = [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? [])].filter((v): v is string => isUuid(v));
  for (const id of ids) {
    const row = await tx.queryOne<{ id: string }>(`select id from app_users where id = $1`, [id]);
    if (row) return row.id;
  }
  return null;
}

// REQ-170: the product id names the plan; the entitlement ids (one per plan
// family) are the fallback for a product id we don't recognise.
function rcTier(e: RevenueCatEvent): StoreProductPlan | null {
  const fromProduct = planForStoreProduct(e.product_id);
  if (fromProduct) return fromProduct;
  let best: StoreProductPlan | null = null;
  for (const id of e.entitlement_ids ?? []) {
    const p = planForEntitlementId(id);
    if (p && (!best || planRank(p.family, p.tier) > planRank(best.family, best.tier))) best = p;
  }
  return best;
}

export async function applyRevenueCatEvent(e: RevenueCatEvent): Promise<ApplyResult> {
  if (!e || typeof e.id !== "string" || !e.id || typeof e.type !== "string") throw new Error("malformed RevenueCat event");
  const at = new Date(typeof e.event_timestamp_ms === "number" ? e.event_timestamp_ms : Date.now());
  return withTransaction(async (tx) => {
    const userId = await rcUserId(tx, e);
    if (!(await claimEvent(tx, "revenuecat", e.id, e.type, userId, at))) return { outcome: "duplicate", eventId: e.id };
    const done = async (outcome: Outcome, detail: Record<string, unknown> = {}) => {
      await setOutcome(tx, "revenuecat", e.id, outcome, { environment: e.environment ?? null, store: e.store ?? null, ...detail });
      return { outcome, eventId: e.id } as ApplyResult;
    };

    if (RC_LOG_ONLY.has(e.type)) return done("ignored");

    if (e.type === "TRANSFER") {
      // The purchase moved to another app user id. Access leaves the old
      // accounts now; the new account gets it from its next event (or a
      // restore in the app, which RevenueCat reports as a purchase/renewal).
      let changed = 0;
      for (const from of (e.transferred_from ?? []).filter(isUuid)) {
        const r = await tx.query(
          `update entitlements set status = 'revoked', last_event_at = $2, last_event_id = $3, updated_at = now()
            where user_id = $1 and source = 'revenuecat' and status in ('active', 'canceled', 'billing_issue')
              and (last_event_at is null or last_event_at <= $2) returning id`,
          [from, at, e.id]
        );
        changed += r.length;
      }
      return done(changed ? "applied" : "unmatched", { transferredTo: (e.transferred_to ?? []).filter(isUuid) });
    }

    const externalId = e.original_transaction_id || (e.app_user_id && e.product_id ? `${e.app_user_id}:${e.product_id}` : null);
    if (!externalId) return done("unmatched", { reason: "no transaction id" });
    const plan = rcTier(e);
    const expires = typeof e.expiration_at_ms === "number" ? new Date(e.expiration_at_ms) : null;

    if (RC_ACCESS_EVENTS.has(e.type) || e.type === "CANCELLATION" || e.type === "BILLING_ISSUE") {
      let status: EntitlementChange["status"] = "active";
      let periodEnd = expires;
      if (e.type === "CANCELLATION") {
        // CUSTOMER_SUPPORT is RevenueCat's reason for a refund: access ends now.
        status = e.cancel_reason === "CUSTOMER_SUPPORT" ? "refunded" : "canceled";
      } else if (e.type === "BILLING_ISSUE") {
        status = "billing_issue";
        const grace = typeof e.grace_period_expiration_at_ms === "number" ? new Date(e.grace_period_expiration_at_ms) : null;
        if (grace && (!periodEnd || grace > periodEnd)) periodEnd = grace;
      }
      if (!userId || !plan) {
        // Can't create a row; a status change on a known row still applies.
        if (status !== "active") {
          const r = await updateStatus(tx, "revenuecat", { externalId }, status, e.id, at, periodEnd);
          return done(r, { reason: !userId ? "unknown app user" : "unknown product" });
        }
        return done("unmatched", { reason: !userId ? "unknown app user" : "unknown product", productId: e.product_id ?? null });
      }
      const r = await upsertEntitlement(
        tx,
        {
          userId,
          source: "revenuecat",
          externalId,
          tier: plan.tier,
          family: plan.family,
          scope: plan.scope,
          plan: plan.period,
          productId: e.product_id ?? null,
          status,
          periodEnd,
          store: e.store ?? null,
        },
        e.id,
        at
      );
      return done(r, { tier: plan.tier, status });
    }

    if (e.type === "EXPIRATION") {
      const r = await updateStatus(tx, "revenuecat", { externalId }, "expired", e.id, at, expires);
      return done(r, { reason: e.expiration_reason ?? null });
    }

    return done("ignored", { reason: "unhandled type" });
  });
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------

export interface StripeEvent {
  id: string;
  type: string;
  created: number; // unix seconds
  data: { object: Record<string, any> };
}

function stripeSubStatus(sub: Record<string, any>): EntitlementChange["status"] {
  switch (sub.status) {
    case "active":
    case "trialing":
      return sub.cancel_at_period_end || sub.cancel_at ? "canceled" : "active";
    case "past_due":
    case "unpaid":
      return "billing_issue";
    default:
      // canceled, incomplete, incomplete_expired, paused
      return "expired";
  }
}

// Decision 6: a subscription deleted (cancelled at once, from the portal or
// the dashboard) while the current period is paid up keeps access to that
// period's end -- status 'canceled', as a cancel-at-period-end does. One
// deleted for non-payment or a dispute (cancellation_details.reason), one
// that was already in a billing retry, refunded or revoked, or one whose
// period has ended, ends now as before.
async function stripeDeletedStatus(tx: TxClient, sub: Record<string, any>, at: Date): Promise<EntitlementChange["status"]> {
  const reason = sub.cancellation_details?.reason;
  if (reason === "payment_failed" || reason === "payment_disputed") return "expired";
  const end = subPeriodEnd(sub);
  if (!end || end.getTime() <= at.getTime()) return "expired";
  const row = await tx.queryOne<{ status: string }>(`select status from entitlements where source = 'stripe' and external_id = $1`, [sub.id]);
  if (row && !PAID_UP.has(row.status)) return row.status === "billing_issue" ? "expired" : (row.status as EntitlementChange["status"]);
  return "canceled";
}

function subPeriodEnd(sub: Record<string, any>): Date | null {
  // Newer API versions moved current_period_end onto each item.
  const secs = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return typeof secs === "number" ? new Date(secs * 1000) : null;
}

function idOf(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string") return (v as { id: string }).id;
  return null;
}

export async function applyStripeEvent(e: StripeEvent, env: NodeJS.ProcessEnv = process.env): Promise<ApplyResult> {
  if (!e || typeof e.id !== "string" || typeof e.type !== "string" || !e.data?.object) throw new Error("malformed Stripe event");
  const at = new Date((typeof e.created === "number" ? e.created : Math.floor(Date.now() / 1000)) * 1000);
  const obj = e.data.object;
  const metaUser = obj.metadata?.user_id ?? obj.client_reference_id ?? null;
  return withTransaction(async (tx) => {
    let userId: string | null = null;
    if (isUuid(metaUser)) userId = (await tx.queryOne<{ id: string }>(`select id from app_users where id = $1`, [metaUser]))?.id ?? null;
    if (!(await claimEvent(tx, "stripe", e.id, e.type, userId, at))) return { outcome: "duplicate", eventId: e.id };
    const done = async (outcome: Outcome, detail: Record<string, unknown> = {}) => {
      await setOutcome(tx, "stripe", e.id, outcome, { livemode: obj.livemode ?? null, ...detail });
      return { outcome, eventId: e.id } as ApplyResult;
    };

    if (e.type === "customer.subscription.created" || e.type === "customer.subscription.updated" || e.type === "customer.subscription.deleted") {
      const priceId = obj.items?.data?.[0]?.price?.id ?? null;
      const byPrice = planForStripePrice(priceId, env);
      // REQ-170: the price names the plan; the subscription's own metadata
      // (set at checkout) is the fallback.
      const metaFamily = isPlanFamily(obj.metadata?.family) ? (obj.metadata.family as PlanFamily) : null;
      const family: PlanFamily | null = byPrice?.family ?? metaFamily;
      // A bare tier (no plan family) is never enough: a row without a scope
      // would open every course.
      const tier: PaidTier | null = family ? PLAN_FAMILIES[family].tier : null;
      const plan: PlanPeriod | null = ["monthly", "quarterly", "yearly"].includes(obj.metadata?.plan) ? obj.metadata.plan : byPrice?.period ?? null;
      const status = e.type === "customer.subscription.deleted" ? await stripeDeletedStatus(tx, obj, at) : stripeSubStatus(obj);
      if (!userId || !tier) {
        if (status !== "active") {
          const r = await updateStatus(tx, "stripe", { externalId: obj.id }, status, e.id, at, subPeriodEnd(obj));
          return done(r, { reason: !userId ? "no user_id metadata" : "unknown price" });
        }
        return done("unmatched", { reason: !userId ? "no user_id metadata" : "unknown price", priceId });
      }
      const r = await upsertEntitlement(
        tx,
        {
          userId,
          source: "stripe",
          externalId: obj.id,
          tier,
          family,
          scope: family ? PLAN_FAMILIES[family].scope : null,
          plan,
          productId: priceId,
          status,
          periodEnd: subPeriodEnd(obj),
          store: "STRIPE",
          customerRef: idOf(obj.customer),
        },
        e.id,
        at
      );
      return done(r, { tier, status });
    }

    if (e.type === "invoice.payment_failed") {
      const subId = idOf(obj.subscription) ?? idOf(obj.parent?.subscription_details?.subscription);
      if (!subId) return done("unmatched", { reason: "no subscription" });
      return done(await updateStatus(tx, "stripe", { externalId: subId }, "billing_issue", e.id, at));
    }

    if (e.type === "charge.refunded") {
      // A full refund ends access now. A partial refund leaves it.
      const full = obj.refunded === true || (typeof obj.amount === "number" && obj.amount_refunded >= obj.amount);
      if (!full) return done("ignored", { reason: "partial refund" });
      const customer = idOf(obj.customer);
      if (!customer) return done("unmatched", { reason: "no customer" });
      return done(await updateStatus(tx, "stripe", { customerRef: customer }, "refunded", e.id, at));
    }

    // checkout.session.completed and the rest: the subscription events carry
    // everything we need, so these are logged only.
    return done("ignored");
  });
}

// For the billing portal: this learner's Stripe customer id, if any.
export async function stripeCustomerFor(userId: string): Promise<string | null> {
  const row = await queryOne<{ customer_ref: string }>(
    `select customer_ref from entitlements where user_id = $1 and source = 'stripe' and customer_ref is not null
      order by updated_at desc limit 1`,
    [userId]
  );
  return row?.customer_ref ?? null;
}

// Kept for scripts: how many events of each outcome (operator view).
export async function billingEventCounts(): Promise<Array<{ provider: string; outcome: string; n: number }>> {
  return query(`select provider, outcome, count(*)::int as n from billing_events group by 1, 2 order by 1, 2`);
}
