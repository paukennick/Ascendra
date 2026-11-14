import { createHash } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { courseCategoryOf } from "@/lib/billing-config";
import { UserFacingError } from "@/lib/http";
import { lessonServableSql } from "@/lib/item-quality";
import { levelState } from "@/lib/learner-level";
import { getLessonFor, type LessonRow, type LessonSource } from "@/lib/lesson-store";

// REQ-262 (levels phase 2, migration 083): beginner lesson variants, BUILT BUT
// SWITCHED OFF. This is the ONE place that decides which version of a lesson a
// learner is served and which version's answer key an answer is graded
// against. Every caller that serves or grades a lesson goes through
// resolveLesson; none of them reads lesson_content_variants itself.
//
// Nothing in this module calls a model (the lesson, grade and hint routes
// import it, and a route that can reach the model is a listed, gated thing:
// lib/ai-spend-gate.test.ts). Writing variants is lib/beginner-variants.ts.
//
// WHAT A BEGINNER VERSION IS (design section 5). The standard lesson, plus
// Teach in 3 to 5 small steps with a quick check after each (teach_steps), and
// possibly a Guided item written in smaller steps. Its Solo check is the
// standard Solo check byte for byte, so the bar and the key are the same at
// every level. teach and teach_cards are the standard lesson's.
//
// WHEN IT IS SERVED (all of these):
//   1. the course's switch is on (subject_tracks.beginner_variants, default
//      false; no course is on);
//   2. the course is not clinical and is a catalog course (never a learner's
//      own course): clinical courses never get beginner versions, whatever the
//      switch says (isClinicalCourse below; generation refuses them too);
//   3. a variant is stored for the objective, is not pulled (item_status), and
//      was written from the standard lesson as it is now (source_lesson_hash:
//      a corrected standard lesson silently retires its variant);
//   4. the app declares it can show Teach steps (X-Ascendra-Client >= 3,
//      lib/client-protocol.ts); an older build is served the standard lesson;
//   5. the learner's level for the lesson's unit is New (lib/learner-level.ts
//      levelState().effective);
//   6. the learner has not regenerated this lesson (their own override is
//      their choice and wins).
// Otherwise the learner gets exactly what getLessonFor returns, as before.
//
// WHICH KEY AN ANSWER USES. The app says which version it showed
// (`lessonVariant: "new"` on the grade, hint and report requests; absent means
// the standard lesson). The server grades against THAT version -- it does not
// decide again from the level, which may have changed since the lesson opened
// -- and records it on the attempt (attempts.lesson_variant). If the version
// named is no longer available (the switch went off, the variant was pulled
// or went stale) the answer is refused with a 409 telling the learner to
// reload, rather than graded against a different question's key.

export const BEGINNER_LEVEL = "new" as const;

// The version names, as the app sends them: attempts.lesson_variant stores
// 'new' for a beginner version and null for the standard lesson.
export type LessonVersion = "standard" | "beginner";
export const VARIANT_WIRE = "new" as const;

export function versionOfWire(v: unknown): LessonVersion | null {
  if (v === undefined || v === null || v === "standard") return "standard";
  if (v === VARIANT_WIRE) return "beginner";
  return null;
}
export const wireOfVersion = (v: LessonVersion): typeof VARIANT_WIRE | null => (v === "beginner" ? VARIANT_WIRE : null);

// ---------------------------------------------------------------------------
// Which courses may have a beginner version
// ---------------------------------------------------------------------------

// Design section 5, "Which courses first": the phase 2 launch set (about 625
// objectives), by catalog code. LISTED, NOT SWITCHED ON: no course has
// subject_tracks.beginner_variants true, and nothing here sets it. Turning one
// on is a decision for Nick and a one-line update (docs/beginner-variants.md).
export const BEGINNER_LAUNCH_SET: readonly { code: string; title: string }[] = [
  { code: "PYTHON", title: "Python" },
  { code: "JAVASCRIPT", title: "JavaScript" },
  { code: "CMPCBS", title: "Computer Science Degree Foundations" },
  { code: "TECHPLUS", title: "CompTIA Tech+" },
  { code: "APLUS_CORE1", title: "CompTIA A+ Core 1" },
  { code: "APLUS_CORE2", title: "CompTIA A+ Core 2" },
  { code: "NETWORKPLUS", title: "CompTIA Network+" },
  { code: "SECPLUS", title: "CompTIA Security+" },
  { code: "AWSCLF", title: "AWS Certified Cloud Practitioner" },
  { code: "AZ900", title: "Microsoft Azure Fundamentals (AZ-900)" },
  { code: "GCPCDL", title: "Google Cloud Digital Leader" },
  { code: "CAPM", title: "CAPM" },
];

// Clinical courses (CCRN, the ABPTS specialties, NPTE, EPPP, NCE, NCMHCE, CNA,
// EMR, EMT and the rest of nursing, PT, EMS and mental health) never get
// beginner versions (design section 5: their learners already work in the
// field, and entry-level clinical courses get a standard lesson written for
// newcomers instead). "Clinical" is the billing plan's own category
// (lib/billing-config.ts courseCategoryOf), so a clinical category added there
// is covered here without a second list.
export function isClinicalCourse(categorySlug: string | null | undefined, subcategorySlug?: string | null): boolean {
  return courseCategoryOf(categorySlug, subcategorySlug) === "clinical";
}

export interface TrackFacts {
  // a learner's own course (subject_tracks.user_id set): never
  ownedByLearner: boolean;
  categorySlug: string | null;
  subcategorySlug: string | null;
}

// Whether a course can have beginner versions at all, switch aside.
export function beginnerAllowed(t: TrackFacts): boolean {
  return !t.ownedByLearner && !isClinicalCourse(t.categorySlug, t.subcategorySlug);
}

// Thrown by anything that would WRITE a beginner version for a course that
// can't have one (generation, a script). Not a UserFacingError: it is a
// programming or operations mistake, never something a learner caused.
export class BeginnerVariantRefused extends Error {
  constructor(readonly why: "clinical" | "own_course" | "switch_off") {
    super(
      why === "clinical"
        ? "Clinical courses never get beginner lesson versions."
        : why === "own_course"
          ? "A learner's own course never gets beginner lesson versions."
          : "This course's beginner_variants switch is off."
    );
    this.name = "BeginnerVariantRefused";
  }
}

export function assertBeginnerAllowed(t: TrackFacts): void {
  if (t.ownedByLearner) throw new BeginnerVariantRefused("own_course");
  if (isClinicalCourse(t.categorySlug, t.subcategorySlug)) throw new BeginnerVariantRefused("clinical");
}

// ---------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------

export interface TeachStepCheck {
  question: string;
  choices: string[];
  // position in `choices` as stored (the writer's shuffled order). The check
  // is a quick formative one, shown with instant feedback; it is not graded,
  // recorded as an attempt, or evidence for mastery, so the key travels with it.
  correctIndex: number;
  // one reason per choice, same order; says why a wrong option is wrong
  reasons: string[];
}

export interface TeachStep {
  title: string;
  // a plain explanation of the one idea, in everyday words
  plain: string;
  // one everyday example
  example: string;
  // then the precise term, in the exam's wording
  precise: string;
  check: TeachStepCheck;
}

export const MIN_STEPS = 3;
export const MAX_STEPS = 5;

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

// The steps from a stored row (or anything), or null when it isn't a usable
// list of 3 to 5 well-formed steps. Strict on purpose: a malformed variant is
// not served.
export function parseTeachSteps(v: unknown): TeachStep[] | null {
  if (!Array.isArray(v) || v.length < MIN_STEPS || v.length > MAX_STEPS) return null;
  const out: TeachStep[] = [];
  for (const s of v) {
    if (!s || typeof s !== "object") return null;
    const o = s as Record<string, unknown>;
    const c = o.check as Record<string, unknown> | undefined;
    if (!isStr(o.title) || !isStr(o.plain) || !isStr(o.example) || !isStr(o.precise) || !c || typeof c !== "object") return null;
    if (!isStr(c.question) || !Array.isArray(c.choices) || !c.choices.every(isStr) || c.choices.length < 3 || c.choices.length > 4) return null;
    if (!Number.isInteger(c.correctIndex) || (c.correctIndex as number) < 0 || (c.correctIndex as number) >= c.choices.length) return null;
    if (!Array.isArray(c.reasons) || c.reasons.length !== c.choices.length || !c.reasons.every(isStr)) return null;
    out.push({
      title: o.title,
      plain: o.plain,
      example: o.example,
      precise: o.precise,
      check: { question: c.question, choices: c.choices as string[], correctIndex: c.correctIndex as number, reasons: c.reasons as string[] },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Staleness: the standard lesson a variant was written from
// ---------------------------------------------------------------------------

// sha256 over everything a variant copies from, or must stay consistent with,
// the standard lesson: its text and cards, and its whole Solo check (question,
// choices, key, explanation, reasons). A change to any of them makes the
// stored variant stale and it is no longer served.
export function standardLessonHash(
  r: Pick<
    LessonRow,
    "guess_prompt" | "teach" | "teach_cards" | "fade_problem" | "fade_choices" | "fade_why" | "solo_check" | "solo_choices" | "solo_correct_index" | "solo_why" | "solo_option_reasons"
  >
): string {
  const canonical = JSON.stringify([
    r.guess_prompt ?? "",
    r.teach ?? "",
    r.teach_cards ?? null,
    r.fade_problem ?? "",
    r.fade_choices ?? null,
    r.fade_why ?? "",
    r.solo_check ?? "",
    r.solo_choices ?? null,
    r.solo_correct_index ?? null,
    r.solo_why ?? "",
    r.solo_option_reasons ?? null,
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Reading a variant
// ---------------------------------------------------------------------------

export interface VariantRow extends LessonRow {
  teach_steps: unknown;
  source_lesson_hash: string;
}

const VARIANT_COLUMNS = `guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
  solo_check, solo_choices, solo_correct_index, solo_why, fade_option_reasons, solo_option_reasons, teach_cards, model, generated_at,
  teach_steps, source_lesson_hash`;

interface TrackRow {
  switch_on: boolean;
  user_id: string | null;
  cat: string | null;
  sub: string | null;
  track_id: string;
  unit_id: string;
}

// The objective's course facts in one read, for the switch and the rules.
async function trackOf(objectiveId: string): Promise<TrackRow | null> {
  return queryOne<TrackRow>(
    `select st.beginner_variants as switch_on, st.user_id, ec.slug as cat, es.slug as sub, st.id as track_id, o.unit_id
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       left join education_subcategories es on es.id = st.subcategory_id
       left join education_categories ec on ec.id = es.category_id
      where o.id = $1`,
    [objectiveId]
  );
}

// The stored beginner variant for the objective if it can be served: not
// pulled, and written from the standard lesson as it is now.
async function servableVariant(objectiveId: string, standard: LessonRow): Promise<{ row: VariantRow; steps: TeachStep[] } | null> {
  const rows = await query<VariantRow>(
    `select ${VARIANT_COLUMNS} from lesson_content_variants v
      where v.objective_id = $1 and v.level = 'new' and ${lessonServableSql("v")}`,
    [objectiveId]
  );
  const row = rows[0];
  if (!row) return null;
  if (row.source_lesson_hash !== standardLessonHash(standard)) return null;
  const steps = parseTeachSteps(row.teach_steps);
  if (!steps) return null;
  return { row, steps };
}

// ---------------------------------------------------------------------------
// The resolver
// ---------------------------------------------------------------------------

export interface ResolvedLesson {
  row: LessonRow;
  // where the standard lesson came from; a beginner version is always built on
  // the shared lesson, so "shared"
  source: LessonSource;
  version: LessonVersion;
  teachSteps: TeachStep[] | null;
}

export type LessonRequest =
  // Which version to show this learner now (the lesson route).
  | { serve: { variantAware: boolean } }
  // The version the app says it showed (grade, hint, report).
  | { answered: LessonVersion };

export class LessonVersionUnavailableError extends UserFacingError {
  constructor() {
    super("This lesson was updated while you had it open. Reload it to carry on; your place is kept.", 409, {
      code: "lesson_changed",
      retryable: true,
    });
    this.name = "LessonVersionUnavailableError";
  }
}

// `standard` lets a caller that already read the lesson (getLessonFor) hand it
// in, so the common path costs no extra read.
export async function resolveLesson(
  userId: string,
  objectiveId: string,
  request: LessonRequest,
  standard?: { row: LessonRow; source: LessonSource } | null
): Promise<ResolvedLesson | null> {
  const found = standard === undefined ? await getLessonFor(userId, objectiveId) : standard;
  const asStandard = (): ResolvedLesson | null => (found ? { row: found.row, source: found.source, version: "standard", teachSteps: null } : null);

  if ("answered" in request) {
    if (request.answered === "standard") return asStandard();
    // The app showed a beginner version: grade against exactly that one, or
    // say the lesson changed. Eligibility is checked again; the level is not.
    const variant = found ? await variantIfAllowed(objectiveId, found.row) : null;
    if (!variant) throw new LessonVersionUnavailableError();
    return { row: variant.row, source: "shared", version: "beginner", teachSteps: variant.steps };
  }

  if (!found || found.source === "override" || !request.serve.variantAware) return asStandard();
  const variant = await variantIfAllowed(objectiveId, found.row);
  if (!variant) return asStandard();
  // The learner's level for this lesson's unit decides it, last and only now:
  // the level reads are the expensive part and nothing above them is on yet.
  const track = await trackOf(objectiveId);
  if (!track) return asStandard();
  const level = (await levelState(userId, track.track_id, track.unit_id)).effective;
  if (level !== BEGINNER_LEVEL) return asStandard();
  return { row: variant.row, source: "shared", version: "beginner", teachSteps: variant.steps };
}

// The variant when the course's switch is on, the course may have one, and a
// servable one is stored; otherwise null. One read when the switch is off.
async function variantIfAllowed(objectiveId: string, standard: LessonRow) {
  const track = await trackOf(objectiveId);
  if (!track || track.switch_on !== true) return null;
  if (!beginnerAllowed({ ownedByLearner: track.user_id !== null, categorySlug: track.cat, subcategorySlug: track.sub })) return null;
  return servableVariant(objectiveId, standard);
}

// The beginner row as a payload for the app: Teach steps beside the lesson.
export function beginnerFields(r: ResolvedLesson): { version: "beginner"; teachSteps: TeachStep[] } | Record<string, never> {
  return r.version === "beginner" && r.teachSteps ? { version: "beginner", teachSteps: r.teachSteps } : {};
}
