import { query, queryOne, withTransaction } from "@/lib/db";
import { courseCategoryOf, type CourseCategory } from "@/lib/billing-config";
import { isDateOnly } from "@/lib/study-plan";
import { MAX_DAYS_AHEAD, MAX_WEEKLY_HOURS, MIN_WEEKLY_HOURS } from "@/lib/study-plan-store";
import { suggestPlan, type PlanSuggestion } from "@/lib/intake-suggest";
import { CLASS_CONTACT_LINE, supportEmail } from "@/lib/verified-discounts-config";

// REQ-169: the intake form -- "what do you want to learn". Shown once in the
// first run (skippable) and editable any time in Settings > Study profile.
//
// It asks for a goal, the course(s)/exam(s) the learner is preparing for,
// each with an optional exam date, their experience, weekly study time and,
// optionally, what they'll use it for. The answers:
//   - set up the study plan: each named course's plan gets its exam date and
//     a share of the weekly hours (study_plans, the same row the course's
//     own plan screen edits);
//   - suggest whether to start with the quick placement check (some
//     experience, experienced, or a retake);
//   - with plans on, suggest a category plan and a length
//     (lib/intake-suggest.ts). That suggestion never changes a price.
// "Teaching a class" shows the class contact line instead of a plan.
//
// Every query is scoped to the caller's user_id. Rows are deleted with the
// account (migration 060, on delete cascade) and are in the account export.

export const GOALS = ["pass_exam", "new_skill", "career_change", "keep_current", "exploring"] as const;
export const EXPERIENCE = ["new", "some", "experienced", "retake"] as const;
export const USES = ["personal", "work", "teaching"] as const;
export type Goal = (typeof GOALS)[number];
export type Experience = (typeof EXPERIENCE)[number];
export type UseFor = (typeof USES)[number];
export const MAX_TARGETS = 5;

export interface IntakeTargetInput {
  trackId: string;
  examDate: string | null;
}

export interface IntakeInput {
  goal: Goal | null;
  experience: Experience | null;
  weeklyHours: number | null;
  useFor: UseFor | null;
  targets: IntakeTargetInput[];
  // Write the exam dates and hours into each course's study plan (default true).
  applyToPlan: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function oneOf<T extends string>(v: unknown, allowed: readonly T[], name: string): T | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) throw new IntakeInputError(`${name} must be one of ${allowed.join(", ")}`);
  return v as T;
}

export class IntakeInputError extends Error {}

// Validates the PUT body. Throws IntakeInputError with a message for the learner.
export function parseIntake(body: unknown, today: string): IntakeInput {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const goal = oneOf(b.goal, GOALS, "goal");
  const experience = oneOf(b.experience, EXPERIENCE, "experience");
  const useFor = oneOf(b.useFor, USES, "useFor");
  let weeklyHours: number | null = null;
  if (b.weeklyHours !== null && b.weeklyHours !== undefined && b.weeklyHours !== "") {
    const h = typeof b.weeklyHours === "string" ? Number(b.weeklyHours) : b.weeklyHours;
    if (typeof h !== "number" || !Number.isFinite(h) || h < MIN_WEEKLY_HOURS || h > MAX_WEEKLY_HOURS) {
      throw new IntakeInputError(`weeklyHours must be between ${MIN_WEEKLY_HOURS} and ${MAX_WEEKLY_HOURS}`);
    }
    weeklyHours = Math.round(h * 2) / 2;
  }
  const raw = b.targets ?? [];
  if (!Array.isArray(raw)) throw new IntakeInputError("targets must be a list");
  if (raw.length > MAX_TARGETS) throw new IntakeInputError(`Pick up to ${MAX_TARGETS} courses.`);
  const seen = new Set<string>();
  const targets: IntakeTargetInput[] = [];
  for (const t of raw) {
    const r = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
    if (typeof r.trackId !== "string" || !UUID.test(r.trackId)) throw new IntakeInputError("Each course needs a valid id.");
    const id = r.trackId.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    let examDate: string | null = null;
    if (r.examDate !== null && r.examDate !== undefined && r.examDate !== "") {
      if (!isDateOnly(r.examDate)) throw new IntakeInputError("examDate must be a date like 2027-03-15");
      const days = (Date.parse(`${r.examDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
      if (days < 0) throw new IntakeInputError("That exam date has already passed. Pick a date from today on.");
      if (days > MAX_DAYS_AHEAD) throw new IntakeInputError("That exam date is more than three years away.");
      examDate = r.examDate as string;
    }
    targets.push({ trackId: id, examDate });
  }
  return { goal, experience, weeklyHours, useFor, targets, applyToPlan: b.applyToPlan !== false };
}

// Each course gets an even share of the weekly hours, in half hours, at
// least the plan's minimum.
export function hoursPerCourse(weeklyHours: number, courses: number): number {
  if (courses <= 1) return weeklyHours;
  return Math.max(MIN_WEEKLY_HOURS, Math.round((weeklyHours / courses) * 2) / 2);
}

// Placement is worth offering to anyone who already knows some of it.
export function suggestsPlacement(experience: Experience | null): boolean {
  return experience === "some" || experience === "experienced" || experience === "retake";
}

export interface IntakeTarget {
  trackId: string;
  title: string;
  examDate: string | null;
  category: CourseCategory | "own";
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
  // REQ-169: with plans on only; never a price.
  planSuggestion: PlanSuggestion | null;
  // "Teaching a class": the existing contact line (REQ-166), when a
  // support address is configured.
  classContact: { line: string; email: string | null } | null;
}

async function targetsFor(userId: string): Promise<IntakeTarget[]> {
  const rows = await query<{ track_id: string; title: string; exam_date: string | null; owner: string | null; cat: string | null; sub: string | null }>(
    `select t.track_id, st.title, to_char(t.exam_date, 'YYYY-MM-DD') as exam_date, st.user_id as owner, ec.slug as cat, es.slug as sub
       from learner_intake_targets t
       join subject_tracks st on st.id = t.track_id and (st.user_id is null or st.user_id = t.user_id)
       left join education_subcategories es on es.id = st.subcategory_id
       left join education_categories ec on ec.id = es.category_id
      where t.user_id = $1
      order by t.position asc, t.created_at asc`,
    [userId]
  );
  return rows.map((r) => ({
    trackId: r.track_id,
    title: r.title,
    examDate: r.exam_date,
    category: r.owner ? ("own" as const) : courseCategoryOf(r.cat, r.sub),
  }));
}

export async function intakeFor(userId: string, today: string, env: NodeJS.ProcessEnv = process.env): Promise<IntakeView> {
  const row = await queryOne<{
    goal: Goal | null;
    experience: Experience | null;
    weekly_hours: string | null;
    use_for: UseFor | null;
    skipped: boolean;
    updated_at: Date;
  }>(`select goal, experience, weekly_hours, use_for, skipped, updated_at from learner_intake where user_id = $1`, [userId]);
  const targets = row ? await targetsFor(userId) : [];
  const useFor = row?.use_for ?? null;
  return {
    answered: !!row && !row.skipped,
    skipped: row?.skipped ?? false,
    goal: row?.goal ?? null,
    experience: row?.experience ?? null,
    weeklyHours: row?.weekly_hours != null ? Number(row.weekly_hours) : null,
    useFor,
    targets,
    updatedAt: row ? new Date(row.updated_at).toISOString() : null,
    suggestPlacement: suggestsPlacement(row?.experience ?? null),
    planSuggestion: row && !row.skipped ? suggestPlan({ targets, useFor, today }, env) : null,
    classContact: useFor === "teaching" ? { line: CLASS_CONTACT_LINE, email: supportEmail(env) } : null,
  };
}

// Saves the answers (replacing the previous ones) and, unless applyToPlan is
// false, writes each named course's exam date and share of the weekly hours
// into its study plan. Course ids must already be checked visible by the
// caller (the route does, with lib/visibility.ts).
export async function saveIntake(userId: string, input: IntakeInput): Promise<void> {
  await withTransaction(async (tx) => {
    await tx.query(
      `insert into learner_intake (user_id, goal, experience, weekly_hours, use_for, skipped, updated_at)
       values ($1, $2, $3, $4, $5, false, now())
       on conflict (user_id) do update set goal = excluded.goal, experience = excluded.experience,
         weekly_hours = excluded.weekly_hours, use_for = excluded.use_for, skipped = false, updated_at = now()`,
      [userId, input.goal, input.experience, input.weeklyHours, input.useFor]
    );
    await tx.query(`delete from learner_intake_targets where user_id = $1`, [userId]);
    for (const [i, t] of input.targets.entries()) {
      await tx.query(
        `insert into learner_intake_targets (user_id, track_id, exam_date, position) values ($1, $2, $3::date, $4)`,
        [userId, t.trackId, t.examDate, i]
      );
    }
    if (input.applyToPlan) {
      for (const t of input.targets) {
        // Only what the learner answered: no hours given keeps the plan's own.
        await tx.query(
          `insert into study_plans (user_id, track_id, exam_date, weekly_hours)
           values ($1, $2, $3::date, coalesce($4::numeric, 5))
           on conflict (user_id, track_id) do update set exam_date = excluded.exam_date,
             weekly_hours = coalesce($4::numeric, study_plans.weekly_hours), updated_at = now()`,
          [userId, t.trackId, t.examDate, input.weeklyHours === null ? null : hoursPerCourse(input.weeklyHours, input.targets.length)]
        );
      }
    }
  });
}

// "Skip for now": remembered so the first run doesn't ask again; answers
// already given are kept.
export async function skipIntake(userId: string): Promise<void> {
  await query(
    `insert into learner_intake (user_id, skipped) values ($1, true) on conflict (user_id) do nothing`,
    [userId]
  );
}
