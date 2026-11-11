import { UserFacingError } from "@/lib/http";
import { billingEnabled, planById, type PlanInfo } from "@/lib/billing-config";

// REQ-122: web checkout through Stripe Checkout and the Stripe billing
// portal, called with fetch (no Stripe SDK). STRIPE_SECRET_KEY comes from the
// environment only; without it these answer 409 with a plain message. Tests
// replace global fetch -- no request ever reaches Stripe from a test.

const STRIPE_API = "https://api.stripe.com/v1";

export const NOT_ENABLED = "Paid plans aren't available yet.";
export const NOT_CONFIGURED = "Paying on the web isn't set up yet. Please try again later, or subscribe in the Ascendra app.";

function form(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function stripePost(path: string, params: Record<string, string>, key: string, idempotencyKey?: string): Promise<any> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: form(params),
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  if (!res.ok || !body) {
    // eslint-disable-next-line no-console
    console.error("[billing] Stripe call failed", path, res.status, body?.error?.type ?? "", body?.error?.code ?? "");
    throw new UserFacingError("We couldn't open checkout just now. Nothing was charged. Please try again in a moment.", 409);
  }
  return body;
}

function requireKey(env: NodeJS.ProcessEnv): string {
  if (!billingEnabled(env)) throw new UserFacingError(NOT_ENABLED, 404);
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new UserFacingError(NOT_CONFIGURED, 409);
  return key;
}

function returnUrl(env: NodeJS.ProcessEnv, which: "success" | "cancel" | "portal"): string {
  const base = (env.BILLING_WEB_RETURN_URL ?? env.APP_URL ?? "").replace(/\/$/, "");
  if (!base) throw new UserFacingError(NOT_CONFIGURED, 409);
  return which === "success" ? `${base}/plans?checkout=success` : which === "cancel" ? `${base}/plans?checkout=cancel` : `${base}/settings`;
}

export async function createCheckoutSession(
  opts: { userId: string; email: string; planId: string; idempotencyKey?: string; coupon?: string | null },
  env: NodeJS.ProcessEnv = process.env
): Promise<{ url: string; plan: PlanInfo }> {
  const key = requireKey(env);
  const plan = planById(opts.planId, env);
  if (!plan) throw new UserFacingError("That plan doesn't exist.", 400);
  const price = env[plan.stripePriceEnv]?.trim();
  if (!price) throw new UserFacingError(NOT_CONFIGURED, 409);
  const session = await stripePost(
    "/checkout/sessions",
    {
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      client_reference_id: opts.userId,
      customer_email: opts.email,
      "metadata[user_id]": opts.userId,
      "metadata[tier]": plan.tier,
      "metadata[family]": plan.family,
      "metadata[plan]": plan.period,
      // The subscription's own metadata is what its webhook events carry.
      "subscription_data[metadata][user_id]": opts.userId,
      "subscription_data[metadata][tier]": plan.tier,
      "subscription_data[metadata][family]": plan.family,
      "subscription_data[metadata][plan]": plan.period,
      success_url: returnUrl(env, "success"),
      cancel_url: returnUrl(env, "cancel"),
      // REQ-166: a verified group discount is a published Stripe coupon,
      // applied here. Discounts never stack: Stripe takes either a coupon or
      // the promotion-code box, so with a verified coupon the box is left
      // out, and without one it is offered as before.
      ...(opts.coupon ? { "discounts[0][coupon]": opts.coupon } : { allow_promotion_codes: "true" }),
    },
    key,
    opts.idempotencyKey
  );
  if (typeof session.url !== "string") throw new UserFacingError("We couldn't open checkout just now. Nothing was charged.", 409);
  return { url: session.url, plan };
}

export async function createPortalSession(customer: string, env: NodeJS.ProcessEnv = process.env): Promise<{ url: string }> {
  const key = requireKey(env);
  const s = await stripePost("/billing_portal/sessions", { customer, return_url: returnUrl(env, "portal") }, key);
  if (typeof s.url !== "string") throw new UserFacingError("We couldn't open subscription settings just now.", 409);
  return { url: s.url };
}
