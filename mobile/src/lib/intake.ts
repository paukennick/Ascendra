// REQ-169: the intake form ("what do you want to learn") -- the pure parts,
// so they run under node --test. The server owns the answers and any plan
// suggestion (GET/PUT /api/intake); this file holds the wording, the
// choices and turning a form into the request body.
//
// Nick, 2026-11-09: the answers personalise the study plan and suggest a
// plan and length. They never change a price, and nothing on the form may
// look like it does: no prices appear on the form, and where a suggestion is
// shown it says the price is the same published one for everyone.

export type Goal = "pass_exam" | "new_skill" | "career_change" | "keep_current" | "exploring";
export type Experience = "new" | "some" | "experienced" | "retake";
export type UseFor = "personal" | "work" | "teaching";
export type PlanScope = "it_cloud" | "pm" | "fitness" | "all_access" | "clinical";
export type PlanPeriod = "monthly" | "quarterly" | "yearly";

export const MAX_TARGETS = 5;

export const GOAL_CHOICES: Array<{ id: Goal; label: string }> = [
  { id: "pass_exam", label: "Pass an exam" },
  { id: "new_skill", label: "Learn a new skill" },
  { id: "career_change", label: "Change careers" },
  { id: "keep_current", label: "Stay current or renew" },
  { id: "exploring", label: "Just exploring" },
];

export const EXPERIENCE_CHOICES: Array<{ id: Experience; label: string }> = [
  { id: "new", label: "New to it" },
  { id: "some", label: "Some experience" },
  { id: "experienced", label: "Experienced" },
  { id: "retake", label: "Retaking the exam" },
];

export const USE_CHOICES: Array<{ id: UseFor; label: string }> = [
  { id: "personal", label: "For myself" },
  { id: "work", label: "For work" },
  { id: "teaching", label: "Teaching a class" },
];

export const HOURS_CHOICES = [2, 5, 8, 12, 20];

export interface IntakeTarget {
  trackId: string;
  title: string;
  examDate: string | null;
}

export interface PlanSuggestion {
  scopes: PlanScope[];
  period: PlanPeriod | null;
  reason: string;
}

export interface IntakeView {
  answered: boolean;
  skipped: boolean;
  goal: Goal | null;
  experience: Experience | null;
  weeklyHours: number | null;
  useFor: UseFor | null;
  targets: IntakeTarget[];
  updatedAt: string | null;
  suggestPlacement: boolean;
  planSuggestion: PlanSuggestion | null;
  classContact: { line: string; email: string | null } | null;
}

export interface IntakeForm {
  goal: Goal | null;
  experience: Experience | null;
  weeklyHours: number | null;
  useFor: UseFor | null;
  targets: IntakeTarget[];
}

export const EMPTY_FORM: IntakeForm = { goal: null, experience: null, weeklyHours: null, useFor: null, targets: [] };

export function formFromView(v: IntakeView | null | undefined): IntakeForm {
  if (!v) return { ...EMPTY_FORM, targets: [] };
  return {
    goal: v.goal,
    experience: v.experience,
    weeklyHours: v.weeklyHours,
    useFor: v.useFor,
    targets: v.targets.map((t) => ({ trackId: t.trackId, title: t.title, examDate: t.examDate })),
  };
}

export function addTarget(form: IntakeForm, t: { id: string; title: string }): IntakeForm {
  if (form.targets.some((x) => x.trackId === t.id) || form.targets.length >= MAX_TARGETS) return form;
  return { ...form, targets: [...form.targets, { trackId: t.id, title: t.title, examDate: null }] };
}

export function removeTarget(form: IntakeForm, trackId: string): IntakeForm {
  return { ...form, targets: form.targets.filter((t) => t.trackId !== trackId) };
}

export function setExamDate(form: IntakeForm, trackId: string, examDate: string | null): IntakeForm {
  return { ...form, targets: form.targets.map((t) => (t.trackId === trackId ? { ...t, examDate } : t)) };
}

// The PUT /api/intake body.
export function intakeBody(form: IntakeForm, today: string) {
  return {
    goal: form.goal,
    experience: form.experience,
    weeklyHours: form.weeklyHours,
    useFor: form.useFor,
    targets: form.targets.map((t) => ({ trackId: t.trackId, examDate: t.examDate })),
    today,
  };
}

export function parseIntakeView(data: unknown): IntakeView | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<IntakeView>;
  if (!Array.isArray(d.targets)) return null;
  return {
    answered: d.answered === true,
    skipped: d.skipped === true,
    goal: d.goal ?? null,
    experience: d.experience ?? null,
    weeklyHours: typeof d.weeklyHours === "number" ? d.weeklyHours : null,
    useFor: d.useFor ?? null,
    targets: d.targets,
    updatedAt: d.updatedAt ?? null,
    suggestPlacement: d.suggestPlacement === true,
    planSuggestion: d.planSuggestion && Array.isArray(d.planSuggestion.scopes) ? d.planSuggestion : null,
    classContact: d.classContact && typeof d.classContact.line === "string" ? d.classContact : null,
  };
}

// The Settings row's one line.
export function intakeSummary(v: IntakeView | null): string {
  if (!v || !v.answered) return "Not filled in";
  if (!v.targets.length) return GOAL_CHOICES.find((g) => g.id === v.goal)?.label ?? "Saved";
  const first = v.targets[0].title;
  return v.targets.length > 1 ? `${first} and ${v.targets.length - 1} more` : first;
}

// What the suggestion card says under the server's reason. Fixed wording:
// the suggestion picks a published plan; it is never a price for you.
export const SUGGESTION_NOTE =
  "This only suggests a plan. Every plan has one published price, the same for everyone, and your answers never change it.";

// Where "See this plan" goes: the plans screen opened on the suggested
// plan and length.
export function suggestionLink(s: PlanSuggestion): { pathname: "/plans"; params: Record<string, string> } {
  return { pathname: "/plans", params: { scope: s.scopes[0], ...(s.period ? { period: s.period } : {}) } };
}

export const PRIVACY_LINE =
  "We use these answers to set up your study plan and suggest where to start. You can change them any time in Settings > Study profile.";
