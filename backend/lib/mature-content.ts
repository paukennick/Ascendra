import { query, queryOne, withTransaction } from "@/lib/db";
import { ageOn, parseDateOfBirth, DATE_OF_BIRTH_PROBLEM_MESSAGES, type DateOfBirthProblem } from "@/lib/date-of-birth";
import { MINIMUM_AGE } from "@/lib/age-confirmation";
import { supportEmail } from "@/lib/support-contact";

// REQ-224 (Nick, 2026-11-10): the mental health courses (EPPP first, then NCE,
// NCMHCE, ASWB Clinical and the Washington psychology jurisprudence course)
// include frank clinical material -- suicide risk, abuse, violence, trauma --
// where the exam tests it. This is separate from the study notice
// (lib/study-notice.ts), which everyone accepts, and from the 16+ sign-up
// confirmation (migration 070).
//
// REQ-259 (Nick, 2026-11-13, "lighter version"): the confirmation is now PER
// COURSE, with a date of birth asked once:
//
//   1. Opening or starting ANY mental health course the learner has not
//      acknowledged (at the current notice version) is refused with 403
//      "mature_content_required", even if they acknowledged another one.
//      The gate is the same SQL (matureContentNeededSql) in the same places
//      as before; it now reads mature_course_acknowledgements (migration
//      081) by course. The old per-category rows (mature_content_confirmations,
//      077) are kept for the record and no longer count.
//   2. The FIRST acknowledgement of an account also needs a date of birth
//      (stored on app_users, once; later courses do not ask again). The
//      server computes age from it in UTC date terms (lib/date-of-birth.ts).
//      Under 18 the course stays locked; the learner cannot enter a new date
//      (they are told to contact support).
//   3. Every acknowledgement carries the attestation -- "I confirm the
//      information I've given is true to the best of my knowledge, and I'm
//      18 or older" -- recorded with its timestamp and the notice version.
//   4. A date of birth below the account minimum (MINIMUM_AGE, 16) also
//      alerts the owners for review (lib/age-review.ts). Nothing is deleted.
//
// mobile/src/lib/matureContent.ts holds the text and the same version; a
// mobile test checks they match. Bump the version when the notice's meaning
// or wording changes: everyone is asked again the next time they open a
// mental health course (their date of birth is kept, not asked again).
export const MATURE_CONTENT_NOTICE_VERSION = "2026-11-13";
export const MATURE_CONTENT_MIN_AGE = 18;

// education_categories slugs whose courses are gated. Kept in step with the
// check constraint on mature_content_confirmations.category_slug (077).
export const MATURE_CATEGORIES = ["mental-health"] as const;
export type MatureCategory = (typeof MATURE_CATEGORIES)[number];

// Where the acknowledgement was asked: the intake form's course picker, or a
// course opened/started (the API client's backstop). 081's check lists both.
export const MATURE_SOURCES = ["intake", "course"] as const;
export type MatureSource = (typeof MATURE_SOURCES)[number];

export const MATURE_CONTENT_REQUIRED_CODE = "mature_content_required";
export const MATURE_CONTENT_REQUIRED_MESSAGE =
  "This course includes frank clinical material for adults. Confirm you're 18 or older to open it (update the app if you don't see the notice).";
export const MATURE_NOTICE_OUTDATED_MESSAGE =
  "This notice has been updated. Close it and open the course again to read the current version.";
export const ATTESTATION_REQUIRED_CODE = "attestation_required";
export const ATTESTATION_REQUIRED_MESSAGE = "Tick the box to confirm the information you've given is true and that you're 18 or older.";
export const DATE_OF_BIRTH_REQUIRED_CODE = "date_of_birth_required";
export const DATE_OF_BIRTH_INVALID_CODE = "date_of_birth_invalid";
export const MATURE_UNDERAGE_CODE = "mature_content_underage";
export function matureUnderageMessage(): string {
  return (
    `This course is for learners who are ${MATURE_CONTENT_MIN_AGE} or older, so it stays locked on this account. ` +
    `That's based on the date of birth on your account, which can't be changed in the app. ` +
    `If it's wrong, contact ${supportEmail()} and we'll look at it.`
  );
}

// REQ-327 (Nick, 2026-11-17): what an acknowledgement covers
// (mature_course_acknowledgements.scope, migration 087). "course": a whole
// mental health course (REQ-259). "sims": the 18+ simulations of a course
// outside the mental health category -- a sim document marked `mature: true`
// (lib/sim/schema.ts) is refused without it, the rest of the course is not.
// Same attestation, same date of birth asked once, same under-18 and under-16
// rules. One "sims" acknowledgement covers every 18+ sim of that course at the
// current notice version, as one course acknowledgement covers every lesson of
// a mental health course.
export const MATURE_SCOPES = ["course", "sims"] as const;
export type MatureScope = (typeof MATURE_SCOPES)[number];
export function isMatureScope(s: unknown): s is MatureScope {
  return typeof s === "string" && (MATURE_SCOPES as readonly string[]).includes(s);
}

export const MATURE_SIM_REQUIRED_MESSAGE =
  "This simulation covers a sensitive topic and is for adults. Confirm you're 18 or older to open it (update the app if you don't see the notice).";
export function matureSimUnderageMessage(): string {
  return (
    `This simulation is for learners who are ${MATURE_CONTENT_MIN_AGE} or older, so it stays locked on this account. ` +
    `That's based on the date of birth on your account, which can't be changed in the app. ` +
    `If it's wrong, contact ${supportEmail()} and we'll look at it.`
  );
}

// The 403 a mature sim answers without an acknowledgement: the course gate's
// shape (code, trackId, noticeVersion, minAge) plus scope "sims" and the sim,
// so the app shows the sims notice for THAT course and retries. `category` is
// the course's category slug, or null.
export function matureSimRequiredBody(trackId: string, simId: string, category: string | null) {
  return {
    code: MATURE_CONTENT_REQUIRED_CODE,
    scope: "sims" as const,
    category,
    trackId,
    simId,
    noticeVersion: MATURE_CONTENT_NOTICE_VERSION,
    minAge: MATURE_CONTENT_MIN_AGE,
  };
}

// SQL: true when the sim aliased `sim` is 18+ -- ANY of its versions'
// documents says `"mature": true`. Any, not only the served one: a flag added
// to a case that was already published makes a new version, while an older
// approved version of the same content may still be the one served or pinned
// to an open run. To unmark a sim, retire it and register a new one.
export function matureSimSql(sim: string): string {
  return `exists(select 1 from sim_versions msv where msv.sim_id = ${sim}.id and msv.document @> '{"mature": true}'::jsonb)`;
}

// SQL: true when the learner in `userParam` has NOT acknowledged the 18+ sims
// of the course whose id is `trackExpr` at the current version. A course
// acknowledgement (a mental health course) covers its sims too.
export function matureSimAckMissingSql(trackExpr: string, userParam: string): string {
  return `not exists (select 1 from mature_course_acknowledgements mca
                       where mca.user_id = ${userParam} and mca.track_id = ${trackExpr}
                         and mca.notice_version = '${MATURE_CONTENT_NOTICE_VERSION}' and mca.scope in ('course', 'sims'))`;
}

export function isMatureCategory(slug: unknown): slug is MatureCategory {
  return typeof slug === "string" && (MATURE_CATEGORIES as readonly string[]).includes(slug);
}

export function isMatureSource(s: unknown): s is MatureSource {
  return typeof s === "string" && (MATURE_SOURCES as readonly string[]).includes(s);
}

// The body the 403 carries, so the app can show the notice for THAT course
// and retry.
export function matureContentRequiredBody(category: MatureCategory, trackId: string) {
  return {
    code: MATURE_CONTENT_REQUIRED_CODE,
    category,
    trackId,
    noticeVersion: MATURE_CONTENT_NOTICE_VERSION,
    minAge: MATURE_CONTENT_MIN_AGE,
  };
}

// SQL: the mature category of the track aliased `track` if the learner in
// `userParam` has NOT acknowledged THAT course at the current version, else
// null. For queries that already read the track row (GET /api/courses/:id),
// so the gate costs no extra round trip. The slugs and version are constants
// of this file, never request input.
export function matureContentNeededSql(track: string, userParam: string): string {
  const slugs = MATURE_CATEGORIES.map((s) => `'${s}'`).join(", ");
  return `(select ec.slug
             from education_subcategories esc join education_categories ec on ec.id = esc.category_id
            where esc.id = ${track}.subcategory_id and ec.slug in (${slugs})
              and not exists (select 1 from mature_course_acknowledgements mca
                               where mca.user_id = ${userParam} and mca.track_id = ${track}.id
                                 and mca.notice_version = '${MATURE_CONTENT_NOTICE_VERSION}'
                                 and mca.scope = 'course'))`;
}

export type AgeStatus = "unknown" | "adult" | "under_18";

export interface MatureState {
  noticeVersion: string;
  minAge: number;
  // Whether a date of birth is on file: the first prompt asks for one, later
  // ones do not.
  dateOfBirthOnFile: boolean;
  // From the stored date of birth, now. Never the date or the age itself.
  ageStatus: AgeStatus;
  // Courses this account has acknowledged at the current notice version.
  acknowledgedTrackIds: string[];
  // REQ-327: courses whose 18+ sims this account has acknowledged (scope
  // "sims") at the current notice version.
  acknowledgedSimTrackIds: string[];
}

export function ageStatusOf(dateOfBirth: string | null, now: Date = new Date()): AgeStatus {
  if (!dateOfBirth) return "unknown";
  return ageOn(dateOfBirth, now) >= MATURE_CONTENT_MIN_AGE ? "adult" : "under_18";
}

export async function matureContentState(userId: string, now: Date = new Date()): Promise<MatureState> {
  const user = await queryOne<{ dob: string | null }>(`select date_of_birth::text as dob from app_users where id = $1`, [userId]);
  const rows = await query<{ track_id: string; scope: MatureScope }>(
    `select track_id, scope from mature_course_acknowledgements where user_id = $1 and notice_version = $2 order by attested_at asc, track_id asc`,
    [userId, MATURE_CONTENT_NOTICE_VERSION]
  );
  return {
    noticeVersion: MATURE_CONTENT_NOTICE_VERSION,
    minAge: MATURE_CONTENT_MIN_AGE,
    dateOfBirthOnFile: !!user?.dob,
    ageStatus: ageStatusOf(user?.dob ?? null, now),
    acknowledgedTrackIds: rows.filter((r) => r.scope === "course").map((r) => r.track_id),
    acknowledgedSimTrackIds: rows.filter((r) => r.scope === "sims").map((r) => r.track_id),
  };
}

// The gated category of a course the caller can see, or null when it is not a
// mental health course or not visible to them.
export async function matureCategoryOfTrack(trackId: string, userId: string): Promise<{ id: string; category: MatureCategory | null } | null> {
  const row = await queryOne<{ id: string; slug: string | null }>(
    `select st.id, (select ec.slug from education_subcategories esc join education_categories ec on ec.id = esc.category_id
                     where esc.id = st.subcategory_id) as slug
       from subject_tracks st where st.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [trackId, userId]
  );
  if (!row) return null;
  return { id: row.id, category: isMatureCategory(row.slug) ? row.slug : null };
}

// REQ-327: a visible course OUTSIDE the mental health category that has at
// least one live 18+ sim, for the accept route's "sims" scope; null when the
// course is not visible. `hasMatureSims` false or `category` mental health
// means there is nothing to acknowledge at this scope.
export async function matureSimsOfTrack(
  trackId: string,
  userId: string
): Promise<{ id: string; category: string | null; hasMatureSims: boolean } | null> {
  const row = await queryOne<{ id: string; slug: string | null; has: boolean }>(
    `select st.id,
            (select ec.slug from education_subcategories esc join education_categories ec on ec.id = esc.category_id
              where esc.id = st.subcategory_id) as slug,
            exists(select 1 from sims s join objectives o on o.id = s.objective_id join course_units cu on cu.id = o.unit_id
                    where cu.track_id = st.id and s.retired_at is null and ${matureSimSql("s")}) as has
       from subject_tracks st where st.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [trackId, userId]
  );
  if (!row) return null;
  return { id: row.id, category: row.slug, hasMatureSims: row.has };
}

export type AcknowledgeResult =
  | { kind: "recorded"; dateOfBirthStored: boolean }
  | { kind: "date_of_birth_required" }
  | { kind: "date_of_birth_invalid"; problem: DateOfBirthProblem; message: string }
  // The age computed from the stored date of birth is under 18. Nothing is
  // recorded for the course. `belowMinimum` (under MINIMUM_AGE) and
  // `newlyStored` (this request stored the date) tell the route whether to
  // alert the owners: only when both are true, so once per account.
  | { kind: "underage"; belowMinimum: boolean; newlyStored: boolean; email: string };

// POST /api/mature-content/accept's work, in one transaction with the account
// row locked: two requests at once (two phones) cannot write two dates of
// birth. The caller has already checked the notice version, the attestation
// and that `trackId` is a visible mental health course.
//
// The date of birth is read from the account. Only when there is none is
// `dateOfBirth` (request input) used, validated and stored; one already on
// file is never replaced, and a value sent alongside it is ignored -- the
// learner cannot change it through this flow. Under 18 the date, if new, is
// still stored (it was given and attested), the course stays locked and no
// acknowledgement is written.
export async function acknowledgeMatureCourse(input: {
  userId: string;
  trackId: string;
  source: MatureSource;
  dateOfBirth: unknown;
  // REQ-327: "course" (default) or "sims". The caller has checked the course
  // fits the scope.
  scope?: MatureScope;
  now?: Date;
}): Promise<AcknowledgeResult> {
  const scope: MatureScope = input.scope ?? "course";
  const now = input.now ?? new Date();
  return withTransaction(async (tx) => {
    const user = await tx.queryOne<{ dob: string | null; email: string }>(
      `select date_of_birth::text as dob, email from app_users where id = $1 for update`,
      [input.userId]
    );
    if (!user) throw new Error("account not found");
    let dob = user.dob;
    let newlyStored = false;
    if (!dob) {
      const parsed = parseDateOfBirth(input.dateOfBirth, now);
      if (!parsed.ok) {
        return parsed.problem === "missing"
          ? { kind: "date_of_birth_required" as const }
          : { kind: "date_of_birth_invalid" as const, problem: parsed.problem, message: DATE_OF_BIRTH_PROBLEM_MESSAGES[parsed.problem] };
      }
      await tx.query(
        `update app_users set date_of_birth = $2::date, date_of_birth_entered_at = $3 where id = $1 and date_of_birth is null`,
        [input.userId, parsed.iso, now]
      );
      dob = parsed.iso;
      newlyStored = true;
    }
    const age = ageOn(dob, now);
    if (age < MATURE_CONTENT_MIN_AGE) return { kind: "underage" as const, belowMinimum: age < MINIMUM_AGE, newlyStored, email: user.email };
    // Idempotent: a repeat (a retry, a second phone) keeps the first row.
    // REQ-327: one row per course and version, so a course acknowledgement
    // for a course that has a "sims" row (it moved into the mental health
    // category) widens that row to the course, with this attestation's time
    // and source; the course gate reads course rows only, so doing nothing
    // there would ask forever. A "sims" acknowledgement never narrows a
    // course row (which already covers the sims).
    await tx.query(
      `insert into mature_course_acknowledgements as m (user_id, track_id, notice_version, min_age, source, attested_at, scope)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (user_id, track_id, notice_version) do update
         set scope = excluded.scope, source = excluded.source, attested_at = excluded.attested_at
         where excluded.scope = 'course' and m.scope <> 'course'`,
      [input.userId, input.trackId, MATURE_CONTENT_NOTICE_VERSION, MATURE_CONTENT_MIN_AGE, input.source, now, scope]
    );
    return { kind: "recorded" as const, dateOfBirthStored: newlyStored };
  });
}

export interface UnackedMatureTrack {
  trackId: string;
  category: MatureCategory;
}

// The gated courses among these tracks that the learner has not acknowledged
// (one query), for routes that take several tracks at once (the intake
// targets). Unknown ids are simply absent.
export async function unackedMatureTracks(userId: string, trackIds: string[]): Promise<UnackedMatureTrack[]> {
  if (!trackIds.length) return [];
  const rows = await query<{ id: string; needed: string | null }>(
    `select st.id, ${matureContentNeededSql("st", "$1")} as needed
       from subject_tracks st where st.id = any($2::uuid[])`,
    [userId, trackIds]
  );
  const out: UnackedMatureTrack[] = [];
  for (const r of rows) if (isMatureCategory(r.needed)) out.push({ trackId: r.id, category: r.needed });
  return out;
}
