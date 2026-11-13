import { query, queryOne, withTransaction, type TxClient } from "@/lib/db";
import { recordEvent } from "@/lib/events";
import {
  effectiveLevel,
  isLevel,
  levelAbove,
  LEVEL_UP_WINDOW,
  meetsLevelUp,
  suggestedLevel,
  type AccountExperience,
  type CourseGoal,
  type FirstTry,
  type Level,
  type SuggestionReason,
} from "@/lib/learner-level-rules";

// REQ-252 (levels phase 1A, migration 078): the learner's per-course goal and
// level, per-unit overrides, and level changes with their notice and undo.
// The pure rules are in lib/learner-level-rules.ts.
//
// Every query is scoped to the caller's user_id; course and unit ids are
// checked visible by the routes (lib/visibility.ts) before they get here.

export interface UnitLevelView {
  unitId: string;
  title: string;
  level: Level | null; // the override, or null when the unit follows the course
  source: "self" | "auto" | null;
}

export interface LevelChangeView {
  id: string;
  unitId: string | null;
  unitTitle: string | null;
  fromLevel: Level;
  toLevel: Level;
  reason: "learner" | "mastery";
  createdAt: string;
}

export interface LevelState {
  trackId: string;
  trackCode: string;
  // The level-aware lesson flow is switched on for this course (078).
  levelFlow: boolean;
  // Whether the learner has answered (or skipped) the start-of-course question.
  answered: boolean;
  goal: CourseGoal | null;
  courseLevel: Level | null;
  courseLevelSource: "default" | "self" | "auto" | null;
  suggestion: { level: Level; reason: SuggestionReason };
  units: UnitLevelView[];
  // The level the lesson in `unitId` uses (or the course's, without a unit).
  effective: Level;
  // Automatic changes not yet acknowledged: shown with Undo until they are.
  notices: LevelChangeView[];
}

type Run = Pick<TxClient, "query" | "queryOne">;
const plain: Run = { query, queryOne };

async function experienceOf(run: Run, userId: string): Promise<AccountExperience | null> {
  const row = await run.queryOne<{ experience: AccountExperience | null }>(
    `select experience from learner_intake where user_id = $1`,
    [userId]
  );
  return row?.experience ?? null;
}

export async function levelState(userId: string, trackId: string, unitId: string | null = null, run: Run = plain): Promise<LevelState> {
  const track = await run.queryOne<{ code: string; level_flow: boolean }>(
    `select code, level_flow from subject_tracks where id = $1`,
    [trackId]
  );
  const profile = await run.queryOne<{ goal: CourseGoal | null; level: Level; level_source: "default" | "self" | "auto"; answered_at: Date | null }>(
    `select goal, level, level_source, answered_at from learner_course_profiles where user_id = $1 and track_id = $2`,
    [userId, trackId]
  );
  const suggestion = suggestedLevel(profile?.goal ?? null, await experienceOf(run, userId));
  const units = await run.query<{ id: string; title: string; level: Level | null; source: "self" | "auto" | null }>(
    `select cu.id, cu.title, l.level, l.source
       from course_units cu
       left join learner_unit_levels l on l.unit_id = cu.id and l.user_id = $1
      where cu.track_id = $2 and cu.retired_at is null
      order by cu.sort_order asc`,
    [userId, trackId]
  );
  const notices = await run.query<{
    id: string;
    unit_id: string | null;
    unit_title: string | null;
    from_level: Level;
    to_level: Level;
    reason: "learner" | "mastery";
    created_at: Date;
  }>(
    `select c.id, c.unit_id, cu.title as unit_title, c.from_level, c.to_level, c.reason, c.created_at
       from learner_level_changes c
       left join course_units cu on cu.id = c.unit_id
      where c.user_id = $1 and c.track_id = $2 and c.reason = 'mastery'
        and c.seen_at is null and c.undone_at is null
      order by c.created_at asc
      limit 5`,
    [userId, trackId]
  );
  const unitLevel = unitId ? (units.find((u) => u.id === unitId)?.level ?? null) : null;
  return {
    trackId,
    trackCode: track?.code ?? "",
    levelFlow: track?.level_flow === true,
    answered: !!profile?.answered_at,
    goal: profile?.goal ?? null,
    courseLevel: profile?.level ?? null,
    courseLevelSource: profile?.level_source ?? null,
    suggestion,
    units: units.map((u) => ({ unitId: u.id, title: u.title, level: u.level, source: u.source })),
    effective: effectiveLevel(unitLevel, profile?.level ?? null, suggestion.level),
    notices: notices.map((n) => ({
      id: n.id,
      unitId: n.unit_id,
      unitTitle: n.unit_title,
      fromLevel: n.from_level,
      toLevel: n.to_level,
      reason: n.reason,
      createdAt: new Date(n.created_at).toISOString(),
    })),
  };
}

export class LevelInputError extends Error {}

export interface ProfileInput {
  // undefined = leave as it is; null = clear (goal only).
  goal?: CourseGoal | null;
  level?: Level;
  skip?: boolean;
}

// Locks (creating if needed) the learner's row for this course, so two level
// writes for one learner and course run one after the other.
async function lockProfile(tx: TxClient, userId: string, trackId: string): Promise<{ goal: CourseGoal | null; level: Level; level_source: string; answered_at: Date | null }> {
  const suggestion = suggestedLevel(null, await experienceOf(tx, userId));
  await tx.query(
    `insert into learner_course_profiles (user_id, track_id, level, level_source)
     values ($1, $2, $3, 'default') on conflict (user_id, track_id) do nothing`,
    [userId, trackId, suggestion.level]
  );
  const row = await tx.queryOne<{ goal: CourseGoal | null; level: Level; level_source: string; answered_at: Date | null }>(
    `select goal, level, level_source, answered_at from learner_course_profiles
      where user_id = $1 and track_id = $2 for update`,
    [userId, trackId]
  );
  return row!;
}

// Saves the goal answer and/or the course level. A level the learner picks is
// 'self'; answering the goal without picking a level stores the suggestion
// for that goal. Both mark the question answered, as does skip.
export async function saveCourseProfile(userId: string, trackId: string, input: ProfileInput): Promise<void> {
  await withTransaction(async (tx) => {
    const before = await lockProfile(tx, userId, trackId);
    const goal = input.goal === undefined ? before.goal : input.goal;
    let level = before.level;
    let source = before.level_source;
    if (input.level) {
      level = input.level;
      source = "self";
    } else if (input.goal !== undefined && before.level_source === "default") {
      level = suggestedLevel(goal, await experienceOf(tx, userId)).level;
    }
    await tx.query(
      `update learner_course_profiles
          set goal = $3, level = $4, level_source = $5, answered_at = coalesce(answered_at, now()), updated_at = now()
        where user_id = $1 and track_id = $2`,
      [userId, trackId, goal, level, source]
    );
    if (input.goal !== undefined && input.goal !== before.goal && goal) {
      await recordEvent(userId, "course_goal_set", { trackId, detail: { goal } }, (sql, p) => tx.query(sql, p));
    }
    if (level !== before.level) {
      await tx.query(
        `insert into learner_level_changes (user_id, track_id, unit_id, from_level, to_level, reason, seen_at)
         values ($1, $2, null, $3, $4, 'learner', now())`,
        [userId, trackId, before.level, level]
      );
      await recordEvent(
        userId,
        "level_changed",
        { trackId, detail: { from: before.level, to: level, reason: "learner", scope: "course" } },
        (sql, p) => tx.query(sql, p)
      );
    }
  });
}

// The learner sets (level) or clears (null) a unit's own level.
export async function setUnitLevel(userId: string, trackId: string, unitId: string, level: Level | null): Promise<void> {
  await withTransaction(async (tx) => {
    const profile = await lockProfile(tx, userId, trackId);
    const prior = await tx.queryOne<{ level: Level; source: "self" | "auto" }>(
      `select level, source from learner_unit_levels where user_id = $1 and unit_id = $2`,
      [userId, unitId]
    );
    const fromLevel = prior?.level ?? profile.level;
    const toLevel = level ?? profile.level;
    if (level === null) {
      await tx.query(`delete from learner_unit_levels where user_id = $1 and unit_id = $2`, [userId, unitId]);
    } else {
      await tx.query(
        `insert into learner_unit_levels (user_id, unit_id, track_id, level, source, updated_at)
         values ($1, $2, $3, $4, 'self', now())
         on conflict (user_id, unit_id) do update set level = excluded.level, source = 'self', updated_at = now()`,
        [userId, unitId, trackId, level]
      );
    }
    if (fromLevel !== toLevel || (prior === null) !== (level === null)) {
      await tx.query(
        `insert into learner_level_changes (user_id, track_id, unit_id, from_level, to_level, reason, prior_unit_level, prior_unit_source, seen_at)
         values ($1, $2, $3, $4, $5, 'learner', $6, $7, now())`,
        [userId, trackId, unitId, fromLevel, toLevel, prior?.level ?? null, prior?.source ?? null]
      );
      await recordEvent(
        userId,
        "level_changed",
        { trackId, detail: { from: fromLevel, to: toLevel, reason: "learner", scope: "unit" } },
        (sql, p) => tx.query(sql, p)
      );
    }
  });
}

// The learner's first lesson solo answer on each of their most recent
// objectives in this unit, newest first, counting only answers given after
// `since`. One row per objective; a voided answer never counts.
export const FIRST_TRIES_SQL = `
  select f.verdict, f.assisted
    from (
      select distinct on (a.objective_id) a.objective_id, a.verdict::text as verdict, a.assisted, a.created_at
        from attempts a
        join objectives o on o.id = a.objective_id
       where a.user_id = $1 and o.unit_id = $2
         and a.kind = 'lesson' and a.stage = 'solo' and a.voided_at is null
       order by a.objective_id, a.created_at asc, a.id asc
    ) f
   where f.created_at > $3
   order by f.created_at desc
   limit $4`;

export async function recentFirstTries(run: Run, userId: string, unitId: string, since: Date): Promise<FirstTry[]> {
  const rows = await run.query<{ verdict: string; assisted: boolean }>(FIRST_TRIES_SQL, [userId, unitId, since, LEVEL_UP_WINDOW]);
  return rows.map((r) => ({ verdict: r.verdict, assisted: r.assisted === true }));
}

// After a solo answer: if this unit's recent first tries cross the threshold
// (lib/learner-level-rules.ts), move the unit up one level, record the change
// for its notice and undo, and return it. Null when nothing changed.
export async function checkLevelUp(userId: string, trackId: string, unitId: string): Promise<LevelChangeView | null> {
  return withTransaction(async (tx) => {
    const profile = await lockProfile(tx, userId, trackId);
    const unit = await tx.queryOne<{ level: Level; source: "self" | "auto"; title: string | null }>(
      `select l.level, l.source, (select title from course_units where id = $2) as title
         from learner_unit_levels l where l.user_id = $1 and l.unit_id = $2`,
      [userId, unitId]
    );
    const current = effectiveLevel(unit?.level ?? null, profile.level, profile.level);
    const up = levelAbove(current);
    if (!up) return null;
    // Only evidence after the last change to this unit's level (the unit's
    // own, or the whole course's) counts -- an undo is never overridden by
    // the answers it already saw.
    const last = await tx.queryOne<{ at: Date | null }>(
      `select max(greatest(created_at, coalesce(undone_at, created_at))) as at
         from learner_level_changes
        where user_id = $1 and track_id = $2 and (unit_id = $3 or unit_id is null)`,
      [userId, trackId, unitId]
    );
    const since = last?.at ?? new Date(0);
    if (!meetsLevelUp(await recentFirstTries(tx, userId, unitId, since))) return null;
    await tx.query(
      `insert into learner_unit_levels (user_id, unit_id, track_id, level, source, updated_at)
       values ($1, $2, $3, $4, 'auto', now())
       on conflict (user_id, unit_id) do update set level = excluded.level, source = 'auto', updated_at = now()`,
      [userId, unitId, trackId, up]
    );
    const change = await tx.queryOne<{ id: string; created_at: Date }>(
      `insert into learner_level_changes (user_id, track_id, unit_id, from_level, to_level, reason, prior_unit_level, prior_unit_source)
       values ($1, $2, $3, $4, $5, 'mastery', $6, $7) returning id, created_at`,
      [userId, trackId, unitId, current, up, unit?.level ?? null, unit?.source ?? null]
    );
    await recordEvent(
      userId,
      "level_changed",
      { trackId, detail: { from: current, to: up, reason: "mastery", scope: "unit" } },
      (sql, p) => tx.query(sql, p)
    );
    const title = unit?.title ?? (await tx.queryOne<{ title: string }>(`select title from course_units where id = $1`, [unitId]))?.title ?? null;
    return {
      id: change!.id,
      unitId,
      unitTitle: title,
      fromLevel: current,
      toLevel: up,
      reason: "mastery",
      createdAt: new Date(change!.created_at).toISOString(),
    };
  });
}

export class LevelChangeError extends Error {
  constructor(message: string, readonly status: 404 | 409) {
    super(message);
  }
}

// "OK" on a notice (seen) or "Undo" (puts the unit back exactly as it was).
// Only an automatic change can be undone, and only while it is the latest
// change to that unit's level -- undoing an older one would overwrite a
// newer choice.
export async function actOnLevelChange(userId: string, trackId: string, changeId: string, action: "seen" | "undo"): Promise<void> {
  await withTransaction(async (tx) => {
    await lockProfile(tx, userId, trackId);
    const c = await tx.queryOne<{
      id: string;
      unit_id: string | null;
      from_level: Level;
      to_level: Level;
      reason: string;
      prior_unit_level: Level | null;
      prior_unit_source: "self" | "auto" | null;
      undone_at: Date | null;
    }>(
      `select id, unit_id, from_level, to_level, reason, prior_unit_level, prior_unit_source, undone_at
         from learner_level_changes where id = $1 and user_id = $2 and track_id = $3 for update`,
      [changeId, userId, trackId]
    );
    if (!c) throw new LevelChangeError("Level change not found", 404);
    if (action === "seen") {
      await tx.query(`update learner_level_changes set seen_at = coalesce(seen_at, now()) where id = $1`, [c.id]);
      return;
    }
    if (c.undone_at) return; // already undone: a repeat is a no-op
    if (c.reason !== "mastery" || !c.unit_id) throw new LevelChangeError("Only an automatic level change can be undone.", 409);
    const newer = await tx.queryOne<{ id: string }>(
      `select id from learner_level_changes
        where user_id = $1 and track_id = $2 and (unit_id = $3 or unit_id is null) and id <> $4
          and created_at > (select created_at from learner_level_changes where id = $4)
        limit 1`,
      [userId, trackId, c.unit_id, c.id]
    );
    if (newer) throw new LevelChangeError("This level has been changed again since. Change it in the course's level settings.", 409);
    if (c.prior_unit_level && isLevel(c.prior_unit_level)) {
      await tx.query(
        `insert into learner_unit_levels (user_id, unit_id, track_id, level, source, updated_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (user_id, unit_id) do update set level = excluded.level, source = excluded.source, updated_at = now()`,
        [userId, c.unit_id, trackId, c.prior_unit_level, c.prior_unit_source ?? "self"]
      );
    } else {
      await tx.query(`delete from learner_unit_levels where user_id = $1 and unit_id = $2`, [userId, c.unit_id]);
    }
    await tx.query(`update learner_level_changes set undone_at = now(), seen_at = coalesce(seen_at, now()) where id = $1`, [c.id]);
    await recordEvent(
      userId,
      "level_changed",
      { trackId, detail: { from: c.to_level, to: c.from_level, reason: "undo", scope: "unit" } },
      (sql, p) => tx.query(sql, p)
    );
  });
}
