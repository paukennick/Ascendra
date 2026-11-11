// REQ-166: verified group discounts -- the groups, the published percentage
// for each, and the switches. Pure (no database, no network): every value is
// read from the environment per call, like lib/billing-config.ts.
//
// Nick, 2026-11-09: standard published discounts only -- the same discount
// for everyone in a group, never per-person pricing, and no failure or
// retake discount. Verified by a third party (lib/discount-providers.ts).
// Approved groups: military and veterans, first responders, nurses, and
// students (all personal plans). Teachers are configurable and OFF by
// default, and cover a personal plan for the teacher's own study only --
// using Ascendra with a class is a separate school arrangement, not built.
//
// THE SWITCHES. The feature is available only when ALL of these hold:
//   - BILLING_ENABLED is on (lib/billing-config.ts): with plans off nobody
//     pays, so there is nothing to discount and nothing is shown;
//   - VERIFIED_DISCOUNTS_ENABLED is on (unset = off);
//   - at least one verification provider is configured (credentials set);
//   - at least one group is enabled AND has a published percentage.
// Otherwise every route answers { available: false } and the app shows
// nothing.
//
// Env:
//   VERIFIED_DISCOUNTS_ENABLED          the switch
//   VERIFIED_DISCOUNT_GROUPS            comma list overriding the default
//                                       enabled set, e.g. "military,nurse"
//   DISCOUNT_PERCENT_<GROUP>            the published percentage, 1-25
//                                       (REQ-170: at most 25%, Nick 2026-11-09)
//                                       (no default: Nick sets the numbers;
//                                       a group without one isn't offered)
//   STRIPE_COUPON_<GROUP>               the Stripe coupon id for the web
//   PLAY_OFFER_<GROUP>                  the Google Play developer-determined
//                                       offer id (default verified-<group>)
//   VERIFIED_DISCOUNT_VALID_DAYS        how long a verification lasts unless
//                                       the provider says sooner (default 365)

import { billingEnabled } from "./billing-config";

type Env = Record<string, string | undefined>;

const OFF = new Set(["", "0", "false", "off", "no"]);

export type DiscountGroup = "military" | "responder" | "nurse" | "student" | "teacher";
export const DISCOUNT_GROUPS: readonly DiscountGroup[] = ["military", "responder", "nurse", "student", "teacher"];

export interface GroupInfo {
  // What the learner reads.
  label: string;
  // Who counts, in plain words (what the provider checks).
  who: string;
  // On unless VERIFIED_DISCOUNT_GROUPS says otherwise.
  defaultEnabled: boolean;
  // An extra line shown with the group (and in its terms).
  note?: string;
}

export const TEACHER_NOTE =
  "The teacher discount is for a personal plan for your own study and professional development. It doesn't cover using Ascendra with a class or a school.";

export const GROUP_INFO: Record<DiscountGroup, GroupInfo> = {
  military: { label: "Military and veterans", who: "Serving members, veterans, retirees and military families", defaultEnabled: true },
  responder: { label: "First responders", who: "Firefighters, EMTs, police officers and 911 dispatchers", defaultEnabled: true },
  nurse: { label: "Nurses", who: "Registered, licensed practical and vocational nurses, nursing assistants and nurse practitioners", defaultEnabled: true },
  student: { label: "Students", who: "Students enrolled at an accredited college or university", defaultEnabled: true },
  // Nick, 2026-11-09: off by default; personal use only.
  teacher: { label: "Teachers", who: "PreK-12 teachers and school staff, and college or university faculty", defaultEnabled: false, note: TEACHER_NOTE },
};

export function isDiscountGroup(v: unknown): v is DiscountGroup {
  return typeof v === "string" && (DISCOUNT_GROUPS as readonly string[]).includes(v);
}

export function discountsSwitchOn(env: Env = process.env): boolean {
  const raw = env.VERIFIED_DISCOUNTS_ENABLED?.trim().toLowerCase();
  return raw !== undefined && !OFF.has(raw);
}

// The groups switched on (before checking for a percentage).
export function enabledGroups(env: Env = process.env): DiscountGroup[] {
  const raw = env.VERIFIED_DISCOUNT_GROUPS;
  if (raw === undefined || raw.trim() === "") return DISCOUNT_GROUPS.filter((g) => GROUP_INFO[g].defaultEnabled);
  const want = new Set(raw.split(",").map((s) => s.trim().toLowerCase()));
  return DISCOUNT_GROUPS.filter((g) => want.has(g));
}

// The published percentage for a group, or null when none is set (or it is
// not a whole number from 1 to MAX_DISCOUNT_PERCENT).
//
// REQ-170 (Nick, 2026-11-09): verified discounts are capped at 25%. A
// larger setting is REJECTED, not clamped: the group is then not offered
// (and `npm run discounts:codes -- --config` says why), because a clamped
// 25% would no longer match the Stripe coupon and store offers set up for
// the larger number. With the AI cap at half the yearly take, 25% keeps
// every plan's worst case positive (docs/billing.md, "Margins").
export const MAX_DISCOUNT_PERCENT = 25;
export function discountPercent(group: DiscountGroup, env: Env = process.env): number | null {
  const raw = env[`DISCOUNT_PERCENT_${group.toUpperCase()}`]?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= MAX_DISCOUNT_PERCENT ? n : null;
}

// Groups whose percentage is set but refused (not a whole number from 1 to
// MAX_DISCOUNT_PERCENT), for the operator report.
export function rejectedPercents(env: Env = process.env): Array<{ group: DiscountGroup; value: string }> {
  return DISCOUNT_GROUPS.flatMap((g) => {
    const raw = env[`DISCOUNT_PERCENT_${g.toUpperCase()}`]?.trim();
    return raw && discountPercent(g, env) === null ? [{ group: g, value: raw }] : [];
  });
}

export interface OfferedGroup {
  id: DiscountGroup;
  label: string;
  who: string;
  percent: number;
  note: string | null;
}

// Enabled groups with a published percentage, optionally limited to the
// groups some configured provider can verify.
export function offeredGroups(env: Env = process.env, verifiable?: ReadonlySet<string>): OfferedGroup[] {
  const out: OfferedGroup[] = [];
  for (const g of enabledGroups(env)) {
    const percent = discountPercent(g, env);
    if (percent === null) continue;
    if (verifiable && !verifiable.has(g)) continue;
    out.push({ id: g, label: GROUP_INFO[g].label, who: GROUP_INFO[g].who, percent, note: GROUP_INFO[g].note ?? null });
  }
  return out;
}

export function stripeCouponFor(group: DiscountGroup, env: Env = process.env): string | null {
  return env[`STRIPE_COUPON_${group.toUpperCase()}`]?.trim() || null;
}

export function playOfferFor(group: DiscountGroup, env: Env = process.env): string {
  const raw = env[`PLAY_OFFER_${group.toUpperCase()}`]?.trim();
  return raw && /^[a-z0-9][a-z0-9-]{0,62}$/.test(raw) ? raw : `verified-${group}`;
}

export function validDays(env: Env = process.env): number {
  const n = Number(env.VERIFIED_DISCOUNT_VALID_DAYS);
  return Number.isInteger(n) && n >= 1 && n <= 3660 ? n : 365;
}

// The verification's end: the provider's own end when it gives an earlier
// one, otherwise VERIFIED_DISCOUNT_VALID_DAYS (a year) from now.
export function expiryFor(now: Date, providerExpiresAt: Date | null | undefined, env: Env = process.env): Date {
  const ours = new Date(now.getTime() + validDays(env) * 24 * 3600 * 1000);
  if (providerExpiresAt && providerExpiresAt.getTime() > now.getTime() && providerExpiresAt < ours) return providerExpiresAt;
  return ours;
}

// Billing on, the switch on, and something to offer. Providers are checked
// by lib/verified-discounts.ts (discountsAvailable), which adds that test.
export function discountsConfigured(env: Env = process.env): boolean {
  return billingEnabled(env) && discountsSwitchOn(env) && offeredGroups(env).length > 0;
}

// What the learner reads before verifying. Kept here so the app and the
// docs say the same thing.
export const WHAT_WE_CHECK =
  "We ask a verification service to confirm that you belong to the group you choose. You sign in with that service, not with us, and it does the checking.";
export const WHAT_WE_STORE =
  "We keep only the result: which group you were verified for, which service checked it, when, when it needs renewing (usually a year), and the service's reference number for you so one verification can't be used on many accounts. We never see or keep your documents, ID or service details. You can remove it any time here, and it is deleted with your account.";
export const DISCOUNT_TERMS = [
  "Discounts are published and the same for everyone in a group.",
  "A verified discount is for a personal plan for your own study.",
  "Verification lasts a year (or less if the verification service says so); renew it to keep the discount on new purchases.",
  "One discount at a time: if you're verified for more than one group, you get the largest.",
];
export const CLASS_CONTACT_LINE = "Using Ascendra with a class? Contact us";

// The support address for the "with a class" line, or null.
export function supportEmail(env: Env = process.env): string | null {
  const v = env.SUPPORT_EMAIL?.trim();
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}
