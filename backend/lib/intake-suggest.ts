import {
  billingEnabled,
  familiesForScope,
  familyPrice,
  PLAN_PERIODS,
  SCOPE_NAME,
  type CourseCategory,
  type PlanFamily,
  type PlanPeriod,
  type PlanScope,
} from "@/lib/billing-config";

// REQ-169: the intake form's plan suggestion. Pure (no database).
//
// Nick, 2026-11-09: the answers personalise the study plan and SUGGEST a
// category plan and a length. They never change a price -- one published
// price per plan for everyone (New York and Connecticut personalised-pricing
// laws) -- so this only picks among the published plans, from two facts:
// which categories the learner's courses are in, and how far away the exam
// is. Nothing about the learner's experience, goal, weekly time or use is an
// input, and the output carries no price of its own: the app shows the
// plan's ordinary published price beside it, the same one everyone sees.
// While plans are off there is no suggestion at all.

export interface SuggestTarget {
  category: CourseCategory | "own";
  examDate: string | null; // YYYY-MM-DD
}

export interface PlanSuggestion {
  // The plan(s) that cover the courses: one scope, or all-access and the
  // clinical add-on together.
  scopes: PlanScope[];
  // The length that covers the time to the exam for the least money at the
  // published prices, or null without an exam date.
  period: PlanPeriod | null;
  // Why, in the learner's words.
  reason: string;
}

const DAY = 86_400_000;

export function monthsUntil(examDate: string, today: string): number | null {
  const days = (Date.parse(`${examDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY;
  if (!Number.isFinite(days) || days <= 0) return null;
  return Math.max(1, Math.ceil(days / 30.44));
}

// The cheapest way to keep a plan for `months`, renewing as needed, at the
// published prices. Ties go to the shorter commitment.
export function cheapestPeriod(family: PlanFamily, months: number, env: Record<string, string | undefined> = process.env): PlanPeriod | null {
  let best: { period: PlanPeriod; cost: number } | null = null;
  for (const period of PLAN_PERIODS) {
    const usd = familyPrice(family, period, env);
    if (usd === null) continue;
    const len = period === "monthly" ? 1 : period === "quarterly" ? 3 : 12;
    const cost = Math.ceil(months / len) * usd;
    if (!best || cost < best.cost - 0.005) best = { period, cost };
  }
  return best?.period ?? null;
}

function scopesFor(categories: Set<CourseCategory>): PlanScope[] {
  const clinical = categories.has("clinical");
  const others = [...categories].filter((c) => c !== "clinical");
  if (!others.length) return clinical ? ["clinical"] : [];
  const one = others.length === 1 && others[0] !== "other" ? (others[0] as PlanScope) : "all_access";
  if (!clinical) return [one];
  // Clinical with anything else: all-access and the clinical add-on.
  return ["all_access", "clinical"];
}

function list(names: string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function suggestPlan(
  input: { targets: SuggestTarget[]; useFor: string | null; today: string },
  env: Record<string, string | undefined> = process.env
): PlanSuggestion | null {
  if (!billingEnabled(env)) return null;
  // Teaching a class is a separate school arrangement (not built): no
  // personal plan is suggested; the app shows the class contact line.
  if (input.useFor === "teaching") return null;
  const categories = new Set(input.targets.map((t) => t.category).filter((c): c is CourseCategory => c !== "own"));
  const scopes = scopesFor(categories);
  if (!scopes.length) return null;
  const dates = input.targets.map((t) => t.examDate).filter((d): d is string => !!d).sort();
  const months = dates.length ? monthsUntil(dates[dates.length - 1], input.today) : null;
  // The length is chosen on the main plan (the first scope's Plus, or its
  // only family); the prices compared are the published ones.
  const family = familiesForScope(scopes[0])[0];
  const period = months !== null ? cheapestPeriod(family, months, env) : null;
  const plan = scopes[1] ? `${SCOPE_NAME[scopes[0]]} with the clinical add-on` : SCOPE_NAME[scopes[0]];
  const why =
    scopes[0] === "all_access"
      ? "your courses are in more than one area"
      : `your course${input.targets.length > 1 ? "s are" : " is"} in ${list(scopes.map((s) => SCOPE_NAME[s]))}`;
  const when =
    months === null
      ? ""
      : ` Your exam is about ${months} month${months === 1 ? "" : "s"} away, and ${
          period === "monthly" ? "paying monthly" : period === "quarterly" ? "the 3-month plan" : "the yearly plan"
        } covers that for the least at the published price.`;
  return { scopes, period, reason: `${plan} fits: ${why}.${when}` };
}
