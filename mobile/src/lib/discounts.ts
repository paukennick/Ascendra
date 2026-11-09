// REQ-166: verified group discounts on the phone and web -- the pure parts,
// so they run under node --test. The server decides everything: GET
// /api/discounts says whether discounts are offered at all (only with paid
// plans on, the feature switched on and a verification provider live), the
// published percentage for each group, what is checked and stored, and this
// learner's verification and discount. While it says { available: false }
// the app shows no discount row, link or screen content.

export type DiscountGroupId = "military" | "responder" | "nurse" | "student" | "teacher";

export interface DiscountGroup {
  id: DiscountGroupId;
  label: string;
  who: string;
  percent: number;
  note: string | null;
  provider: string | null;
}

export interface DiscountVerification {
  group: DiscountGroupId;
  label: string;
  provider: string;
  verifiedAt: string;
  expiresAt: string;
  live: boolean;
}

export interface ActiveDiscount {
  group: DiscountGroupId;
  label: string;
  percent: number;
  expiresAt: string;
  web: boolean;
  playOfferId: string;
  appStoreCodes: boolean;
}

export interface DiscountStatus {
  available: boolean;
  groups: DiscountGroup[];
  verifications: DiscountVerification[];
  active: ActiveDiscount | null;
  whatWeCheck: string;
  whatWeStore: string;
  terms: string[];
  classContact: { line: string; email: string } | null;
}

export const DISCOUNTS_OFF: DiscountStatus = {
  available: false,
  groups: [],
  verifications: [],
  active: null,
  whatWeCheck: "",
  whatWeStore: "",
  terms: [],
  classContact: null,
};

// Anything that isn't a well-formed answer with available === true is "off".
export function parseDiscountStatus(data: unknown): DiscountStatus {
  if (!data || typeof data !== "object") return DISCOUNTS_OFF;
  const d = data as Partial<DiscountStatus>;
  if (d.available !== true || !Array.isArray(d.groups) || d.groups.length === 0) return DISCOUNTS_OFF;
  return {
    ...DISCOUNTS_OFF,
    ...d,
    available: true,
    verifications: Array.isArray(d.verifications) ? d.verifications : [],
    terms: Array.isArray(d.terms) ? d.terms : [],
    active: d.active && typeof d.active === "object" ? d.active : null,
    classContact: d.classContact && typeof d.classContact === "object" ? d.classContact : null,
  } as DiscountStatus;
}

export function shortDate(iso: string, locale?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

// "Military and veterans: 20% off, verified until Nov 9, 2027"
export function activeLine(a: ActiveDiscount | null, locale?: string): string {
  if (!a) return "";
  return `${a.label}: ${a.percent}% off, verified until ${shortDate(a.expiresAt, locale)}`;
}

// The Settings row value.
export function settingsRowValue(s: DiscountStatus): string {
  if (s.active) return `${s.active.percent}% off`;
  return "Verify for a discount";
}

// What the ?verify= result the provider sends the learner back with means.
export function verifyResultMessage(result: string | null | undefined): { ok: boolean; text: string } | null {
  switch (result) {
    case "verified":
      return { ok: true, text: "You're verified. Your discount applies to plans you choose from now on." };
    case "not_verified":
      return { ok: false, text: "The verification service couldn't confirm that group, so no discount was added. Nothing was stored." };
    case "taken":
      return { ok: false, text: "That verification is already linked to another Ascendra account. Each verification can be used on one account." };
    case "expired":
      return { ok: false, text: "That verification link expired. Please start again from this page." };
    case "failed":
      return { ok: false, text: "We couldn't finish the verification just now. Nothing was stored. Please try again in a moment." };
    default:
      return null;
  }
}

// Google Play: RevenueCat names a subscription option "basePlanId:offerId".
// The option for the learner's developer-determined offer, or null (then the
// regular price is bought, never a different discount).
export function playOptionFor<T extends { id: string }>(options: readonly T[] | null | undefined, offerId: string | null | undefined): T | null {
  if (!options || !offerId) return null;
  return options.find((o) => o.id.split(":")[1] === offerId) ?? null;
}

// One line under the plan list on the plans screen.
export function plansDiscountLine(s: DiscountStatus, platform: string): string | null {
  if (!s.available || !s.active) return null;
  const p = s.active.percent;
  if (platform === "ios") return `Your ${p}% ${s.active.label.toLowerCase()} discount: get your App Store offer code on the discount page, then redeem it.`;
  if (platform === "android") return `Your ${p}% ${s.active.label.toLowerCase()} discount is applied when you choose a plan.`;
  return s.active.web
    ? `Your ${p}% ${s.active.label.toLowerCase()} discount is applied at checkout.`
    : `Your ${p}% discount isn't available on the web yet. You can use it in the app.`;
}
