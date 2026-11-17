// REQ-319: an unbranded course (backend/lib/unbranded.ts) names neither its
// exam nor its exam body. So that learners still know which exam it is, the
// course view sends the exam's published facts (GET /api/courses/:id ->
// exam.facts) and the course page shows them at the top. Pure, so it is
// tested without React (examFacts.test.ts).

export interface ExamFactsPayload {
  heading: string;
  questions: string | null;
  minutes: number | null;
  time: string | null;
  delivery: "adaptive" | "linear" | null;
  passing: string | null;
  eligibility: string | null;
  domains: { name: string; weightPercent: number | null }[];
  // Only while the body's reference switch is on (backend REFERENCE_LINE_ON).
  reference?: { line: string; disclaimer: string } | null;
}

export interface ExamFactRow {
  label: string;
  value: string;
}

const DELIVERY: Record<"adaptive" | "linear", string> = {
  adaptive: "Adaptive: each question is chosen from how you answered the last ones, and the exam can end early",
  linear: "Linear: every candidate answers the full set of questions",
};

export function examFactRows(f: ExamFactsPayload): ExamFactRow[] {
  const rows: ExamFactRow[] = [];
  if (f.questions) rows.push({ label: "Questions", value: f.questions });
  if (f.time) rows.push({ label: "Time", value: f.time });
  if (f.delivery) rows.push({ label: "Format", value: DELIVERY[f.delivery] });
  if (f.passing) rows.push({ label: "Passing standard", value: f.passing });
  if (f.eligibility) rows.push({ label: "Eligibility", value: f.eligibility });
  return rows;
}

export function domainLine(d: { name: string; weightPercent: number | null }): string {
  return d.weightPercent != null ? `${d.name}: ${d.weightPercent}%` : d.name;
}

// The facts block from the course view's exam, or null for a course that
// has none (every branded course, and an older server).
export function examFactsOf(exam: unknown): ExamFactsPayload | null {
  if (!exam || typeof exam !== "object") return null;
  const f = (exam as { facts?: unknown }).facts;
  if (!f || typeof f !== "object") return null;
  const x = f as Partial<ExamFactsPayload>;
  if (typeof x.heading !== "string" || !Array.isArray(x.domains)) return null;
  return x as ExamFactsPayload;
}
