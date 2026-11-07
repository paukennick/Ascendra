// REQ-113 (Audit 3 mobile H5): what Home's review card says.
//
// It used to count the old error log (/api/errors?due=1), so a learner who
// rarely misses -- whose objectives come back on the 1/3/7/21/60-day
// schedule from /api/review/today -- never saw the daily review on Home, and
// when both counts existed they disagreed with the Review hub's
// "N for today". The card is now driven by the same numbers as the hub.

import type { ReviewToday } from "@/types";
import { plural, t } from "./i18n.ts";

export interface HomeReviewCard {
  title: string;
  line: string;
  a11y: string;
}

// null when there is nothing to do today (the card is hidden).
export function homeReviewCard(today: Pick<ReviewToday, "forToday" | "unitChecks"> | null): HomeReviewCard | null {
  if (!today) return null;
  const parts: string[] = [];
  if (today.forToday > 0) parts.push(t("home.review.forToday", { count: today.forToday }));
  const checks = today.unitChecks?.length ?? 0;
  if (checks > 0) parts.push(plural("home.review.unitChecks", checks));
  if (!parts.length) return null;
  const line = parts.join(" · ");
  return { title: t("home.review.title"), line, a11y: t("home.review.a11y", { line }) };
}
