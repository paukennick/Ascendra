// REQ-235: Settings > Access "Hold rates" (owner only) -- the pure parts, so
// they run under node --test. The server (GET /api/access/hold-rates,
// backend/lib/hold-rates.ts) counts; this only parses and words the counts.
// Counts only: no claims, no content, no learner.

export type HoldKind = "lesson" | "review" | "exam" | "quiz" | "comparison" | "pbq" | "unit_check";
export type HoldReasonKey = "writer_unsure" | "checker_disagreed" | "content_rule";

export interface HoldKindRow {
  kind: HoldKind;
  stored7: number;
  held7: number;
  stored30: number;
  held30: number;
}

export interface HoldRateCourse {
  code: string;
  title: string;
  kinds: HoldKindRow[];
  topReasons: { reason: HoldReasonKey; n: number }[];
}

export interface HoldRateReport {
  asOf: string;
  courses: HoldRateCourse[];
}

const KIND_LABEL: Record<HoldKind, string> = {
  lesson: "Lessons",
  review: "Review questions",
  exam: "Practice exam items",
  quiz: "Quiz-me questions",
  comparison: "Comparison cards",
  pbq: "Scenario tasks (PBQ)",
  unit_check: "Unit checks",
};

const REASON_LABEL: Record<HoldReasonKey, string> = {
  writer_unsure: "writer not confident",
  checker_disagreed: "fact-check picked another answer",
  content_rule: "broke a content rule",
};

const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

// Anything malformed is dropped rather than shown wrong; an older server
// (no route) is an error the screen shows, not an empty report.
export function parseHoldRates(v: unknown): HoldRateReport {
  const o = (v ?? {}) as Record<string, unknown>;
  const courses = Array.isArray(o.courses) ? o.courses : [];
  return {
    asOf: typeof o.asOf === "string" ? o.asOf : "",
    courses: courses
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object" && typeof (c as { code?: unknown }).code === "string")
      .map((c) => ({
        code: c.code as string,
        title: typeof c.title === "string" ? c.title : (c.code as string),
        kinds: (Array.isArray(c.kinds) ? c.kinds : [])
          .filter((k): k is Record<string, unknown> => !!k && typeof k === "object" && typeof (k as { kind?: unknown }).kind === "string" && (k as { kind: string }).kind in KIND_LABEL)
          .map((k) => ({ kind: k.kind as HoldKind, stored7: count(k.stored7), held7: count(k.held7), stored30: count(k.stored30), held30: count(k.held30) })),
        topReasons: (Array.isArray(c.topReasons) ? c.topReasons : [])
          .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && typeof (r as { reason?: unknown }).reason === "string" && (r as { reason: string }).reason in REASON_LABEL)
          .map((r) => ({ reason: r.reason as HoldReasonKey, n: count(r.n) })),
      })),
  };
}

// "3 of 40 held (8%)": held over everything written (stored + held).
export function holdLine(stored: number, held: number): string {
  const written = stored + held;
  if (!written) return "nothing generated";
  const pct = Math.round((held / written) * 100);
  return `${held} of ${written} held (${pct}%)`;
}

export function kindLine(k: HoldKindRow): string {
  return `${KIND_LABEL[k.kind]}: 7 days ${holdLine(k.stored7, k.held7)}; 30 days ${holdLine(k.stored30, k.held30)}`;
}

export function reasonsLine(c: Pick<HoldRateCourse, "topReasons">): string | null {
  const top = c.topReasons.filter((r) => r.n > 0).slice(0, 3);
  if (!top.length) return null;
  return `Top reasons (30 days): ${top.map((r) => `${REASON_LABEL[r.reason]} ${r.n}`).join(", ")}`;
}
