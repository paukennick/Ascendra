import { foundingConfig, playFoundingOffer, stripeFoundingCoupon } from "@/lib/billing-config";
import { foundingStatus, holdSeat } from "@/lib/founding";
import { activeDiscount } from "@/lib/verified-discounts";

// REQ-170: the one discount a learner gets. Discounts never stack (REQ-166):
// a verified group discount and the founding-member discount are compared
// and only the larger applies (a tie goes to the verified one, so it
// doesn't use up a founding seat). Neither changes the AI cap.

export interface ChosenDiscount {
  kind: "verified" | "founding";
  percent: number;
  stripeCoupon: string | null;
  playOfferId: string;
}

// What the learner would get, without holding a seat (GET /api/billing/me).
export async function bestDiscount(userId: string, env: NodeJS.ProcessEnv = process.env): Promise<ChosenDiscount | null> {
  const verified = await activeDiscount(userId, env);
  const founding = await foundingStatus(userId, env);
  const foundingPct = founding && founding.state !== "full" ? founding.percent : 0;
  if (verified && verified.percent >= foundingPct) {
    return { kind: "verified", percent: verified.percent, stripeCoupon: null, playOfferId: verified.playOfferId };
  }
  if (foundingPct > 0) return { kind: "founding", percent: foundingPct, stripeCoupon: stripeFoundingCoupon(env), playOfferId: playFoundingOffer(env) };
  return null;
}

// At checkout: the same choice, and a founding seat is held (under a lock)
// only when the founding discount is the one used. Returns the Stripe coupon
// to apply, or null for none.
export async function checkoutCoupon(
  userId: string,
  verifiedCoupon: string | null,
  env: NodeJS.ProcessEnv = process.env
): Promise<{ coupon: string | null; founding: boolean }> {
  const verified = await activeDiscount(userId, env);
  const cfg = foundingConfig(env);
  const foundingCoupon = stripeFoundingCoupon(env);
  if (cfg.enabled && foundingCoupon && (!verified || cfg.percent > verified.percent)) {
    const pct = await holdSeat(userId, env);
    if (pct !== null && (!verified || pct > verified.percent)) return { coupon: foundingCoupon, founding: true };
  }
  return { coupon: verifiedCoupon, founding: false };
}
