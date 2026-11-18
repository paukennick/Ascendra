import { query, queryOne, withTransaction } from "@/lib/db";
import { UserFacingError } from "@/lib/http";
import { ownerEmails } from "@/lib/account-access-config";
import { accessFor, LIST_COLS, toItem, type Actor, type GrantListItem, type ListRow } from "@/lib/account-access";
import {
  NOT_A_REVIEWER_MESSAGE,
  RATINGS,
  TEXTS,
  type FeedbackInput,
  type MarkInput,
  type RatingKey,
  type TextKey,
} from "@/lib/reviewers-config";

// REQ-331 (Nick, 2026-11-17): reviewers -- the database side. The rules are in
// lib/reviewers-config.ts.
//
// Marking an address as a reviewer puts a mark on its access grant
// (account_access, migration 056/088): an existing live grant keeps its dates
// and note, and a new one is created when there is none. Unmarking takes away
// what marking gave: the mark always, and the grant too when marking created
// it (reviewer_added_access). Every change is in the audit trail
// (account_access_events reviewer_on / reviewer_off).
//
// Like unrestricted access, being a reviewer never lets anyone see another
// learner's data: a reviewer reads and edits only their own feedback, and only
// owners read everyone's (the owner-only Reviewer feedback screen).

type Env = NodeJS.ProcessEnv;

export class ReviewerError extends UserFacingError {
  constructor(message: string, status = 400) {
    super(message, status);
    this.name = "ReviewerError";
  }
}

// ---------------------------------------------------------------------------
// Who may use the feedback form
// ---------------------------------------------------------------------------

// A live reviewer grant, or an owner (so the owner can try the form before
// sending it to reviewers; Nick decides, see REQ-331).
export async function reviewerAccess(userId: string, env: Env = process.env): Promise<{ owner: boolean; areas: string[] } | null> {
  const a = await accessFor(userId, env);
  if (a?.level === "owner") return { owner: true, areas: [] };
  if (a?.grant?.reviewer) return { owner: false, areas: a.grant.reviewer.areas };
  return null;
}

export async function requireReviewer(userId: string, env: Env = process.env): Promise<{ owner: boolean; areas: string[] }> {
  const r = await reviewerAccess(userId, env);
  if (!r) throw new ReviewerError(NOT_A_REVIEWER_MESSAGE, 403);
  return r;
}

// ---------------------------------------------------------------------------
// Owner: mark, unmark, list
// ---------------------------------------------------------------------------

export async function reviewerCategories(): Promise<{ slug: string; name: string }[]> {
  return query<{ slug: string; name: string }>(`select slug, name from education_categories order by sort_order, slug`);
}

export async function listReviewers(): Promise<GrantListItem[]> {
  const rows = await query<ListRow>(
    `select ${LIST_COLS} from account_access a left join app_users gb on gb.id = a.granted_by
      where a.revoked_at is null and a.reviewer_at is not null order by a.reviewer_at desc, a.id`
  );
  return rows.map((r) => toItem(r));
}

export async function markReviewer(input: MarkInput, actor: Actor, env: Env = process.env): Promise<GrantListItem> {
  const email = input.email.toLowerCase();
  if (ownerEmails(env).has(email)) {
    throw new ReviewerError("That address is an owner. Owners already have every course and can open the reviewer form.", 409);
  }
  if (input.areas.length) {
    const known = await query<{ slug: string }>(`select slug from education_categories where slug = any($1::text[])`, [input.areas]);
    const unknown = input.areas.filter((a) => !known.some((k) => k.slug === a));
    if (unknown.length) throw new ReviewerError(`Unknown course categories: ${unknown.join(", ")}`, 400);
  }
  const actorId = actor.via === "app" ? actor.userId : null;
  const id = await withTransaction(async (tx) => {
    // The same lock grantAccess takes, so a grant and a mark of one address never race.
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`account-access:${email}`]);
    const account = await tx.queryOne<{ id: string }>(
      `select id from app_users where lower(email) = $1 and email_verified_at is not null limit 1`,
      [email]
    );
    const live = await tx.queryOne<{ id: string; user_id: string | null; reviewer_at: Date | null; reviewer_added_access: boolean }>(
      `select id, user_id, reviewer_at, reviewer_added_access from account_access where email = $1 and revoked_at is null for update`,
      [email]
    );
    const detail = { areas: input.areas, note: input.note };
    if (live) {
      const userId = live.user_id ?? account?.id ?? null;
      await tx.query(
        `update account_access set reviewer_at = coalesce(reviewer_at, now()), reviewer_by = $2, reviewer_areas = $3, reviewer_note = $4,
                user_id = $5, claimed_at = case when user_id is null and $5::uuid is not null then now() else claimed_at end, updated_at = now()
          where id = $1`,
        [live.id, actorId, input.areas, input.note, userId]
      );
      await tx.query(
        `insert into account_access_events (access_id, user_id, email, action, actor_id, via, detail) values ($1, $2, $3, 'reviewer_on', $4, $5, $6)`,
        [live.id, userId, email, actorId, actor.via, JSON.stringify({ ...detail, addedAccess: live.reviewer_at ? live.reviewer_added_access : false, changed: live.reviewer_at !== null })]
      );
      return live.id;
    }
    const row = await tx.queryOne<{ id: string }>(
      `insert into account_access (email, user_id, granted_by, claimed_at, reviewer_at, reviewer_by, reviewer_areas, reviewer_note, reviewer_added_access)
       values ($1, $2, $3, case when $2::uuid is null then null else now() end, now(), $3, $4, $5, true) returning id`,
      [email, account?.id ?? null, actorId, input.areas, input.note]
    );
    await tx.query(
      `insert into account_access_events (access_id, user_id, email, action, actor_id, via, detail) values ($1, $2, $3, 'reviewer_on', $4, $5, $6)`,
      [row!.id, account?.id ?? null, email, actorId, actor.via, JSON.stringify({ ...detail, addedAccess: true, changed: false })]
    );
    return row!.id;
  });
  const r = await queryOne<ListRow>(`select ${LIST_COLS} from account_access a left join app_users gb on gb.id = a.granted_by where a.id = $1`, [id]);
  return toItem(r!);
}

// Takes the mark off a live grant, by grant id. When marking created the grant,
// the grant ends too. Null when there is no such live reviewer grant.
export async function unmarkReviewer(
  grantId: string,
  actor: Actor
): Promise<{ id: string; email: string; accessEnded: boolean } | null> {
  const actorId = actor.via === "app" ? actor.userId : null;
  return withTransaction(async (tx) => {
    const row = await tx.queryOne<{ id: string; email: string; user_id: string | null; reviewer_added_access: boolean }>(
      `select id, email, user_id, reviewer_added_access from account_access
        where id = $1 and revoked_at is null and reviewer_at is not null for update`,
      [grantId]
    );
    if (!row) return null;
    const ended = row.reviewer_added_access;
    await tx.query(
      `update account_access set reviewer_at = null, reviewer_by = null, reviewer_areas = '{}', reviewer_note = null, reviewer_added_access = false,
              revoked_at = case when $2 then now() else revoked_at end, revoked_by = case when $2 then $3::uuid else revoked_by end, updated_at = now()
        where id = $1`,
      [row.id, ended, actorId]
    );
    await tx.query(
      `insert into account_access_events (access_id, user_id, email, action, actor_id, via, detail) values ($1, $2, $3, 'reviewer_off', $4, $5, $6)`,
      [row.id, row.user_id, row.email, actorId, actor.via, JSON.stringify({ accessEnded: ended })]
    );
    if (ended) {
      await tx.query(
        `insert into account_access_events (access_id, user_id, email, action, actor_id, via) values ($1, $2, $3, 'revoke', $4, $5)`,
        [row.id, row.user_id, row.email, actorId, actor.via]
      );
    }
    return { id: row.id, email: row.email, accessEnded: ended };
  });
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export interface Feedback {
  id: string;
  trackId: string | null;
  trackTitle: string | null;
  simId: string | null;
  simTitle: string | null;
  name: string | null;
  role: string | null;
  roleOther: string | null;
  areas: string[];
  tried: string[];
  ratings: Record<RatingKey, number | null>;
  texts: Record<TextKey, string | null>;
  recommend: string | null;
  followUp: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerFeedback extends Feedback {
  reviewerId: string;
  reviewerEmail: string;
}

const FEEDBACK_COLS = `f.id, f.user_id, f.track_id, st.title as track_title, f.sim_id, s.title as sim_title,
  f.reviewer_name, f.reviewer_role, f.reviewer_role_other, f.areas, f.tried,
  ${Object.values(RATINGS).map((c) => `f.${c}`).join(", ")},
  ${Object.values(TEXTS).map((c) => `f.${c}`).join(", ")},
  f.recommend, f.follow_up, f.created_at, f.updated_at`;
const FEEDBACK_FROM = `reviewer_feedback f
  left join subject_tracks st on st.id = f.track_id
  left join sims s on s.id = f.sim_id`;

type Row = Record<string, unknown>;

function toFeedback(r: Row): Feedback {
  const ratings = {} as Record<RatingKey, number | null>;
  for (const [k, c] of Object.entries(RATINGS) as [RatingKey, string][]) ratings[k] = (r[c] as number | null) ?? null;
  const texts = {} as Record<TextKey, string | null>;
  for (const [k, c] of Object.entries(TEXTS) as [TextKey, string][]) texts[k] = (r[c] as string | null) ?? null;
  return {
    id: r.id as string,
    trackId: (r.track_id as string | null) ?? null,
    trackTitle: (r.track_title as string | null) ?? null,
    simId: (r.sim_id as string | null) ?? null,
    simTitle: (r.sim_title as string | null) ?? null,
    name: (r.reviewer_name as string | null) ?? null,
    role: (r.reviewer_role as string | null) ?? null,
    roleOther: (r.reviewer_role_other as string | null) ?? null,
    areas: (r.areas as string[]) ?? [],
    tried: (r.tried as string[]) ?? [],
    ratings,
    texts,
    recommend: (r.recommend as string | null) ?? null,
    followUp: (r.follow_up as boolean | null) ?? null,
    createdAt: new Date(r.created_at as Date).toISOString(),
    updatedAt: new Date(r.updated_at as Date).toISOString(),
  };
}

// The course and sim a submission names: a course the reviewer can see (a
// catalog course or their own), and a sim in that course. A sim alone names
// its course. Retired sims stay linkable (they may be the thing reported).
async function resolveTarget(input: FeedbackInput, userId: string): Promise<{ trackId: string | null; simId: string | null }> {
  let trackId: string | null = null;
  if (input.trackId) {
    const t = await queryOne<{ id: string }>(`select id from subject_tracks where id = $1 and (user_id is null or user_id = $2)`, [input.trackId, userId]);
    if (!t) throw new ReviewerError("That course wasn't found.", 400);
    trackId = t.id;
  }
  if (!input.simId) return { trackId, simId: null };
  const s = await queryOne<{ id: string; track_id: string }>(
    `select s.id, cu.track_id from sims s
       join objectives o on o.id = s.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where s.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [input.simId, userId]
  );
  if (!s) throw new ReviewerError("That simulation wasn't found.", 400);
  if (trackId && s.track_id !== trackId) throw new ReviewerError("That simulation isn't in that course.", 400);
  return { trackId: s.track_id, simId: s.id };
}

// The titles a new form shows for the course and sim it was opened from (the
// app prefills "Areas looked at" with them). Same visibility as saving; a
// course or sim the reviewer can't see is simply left out. Titles only: a
// catalog course's title is public, and this opens nothing behind an 18+ gate.
export async function contextTitles(userId: string, trackId: string | null, simId: string | null): Promise<{ trackId: string | null; trackTitle: string | null; simId: string | null; simTitle: string | null }> {
  const none = { trackId: null, trackTitle: null, simId: null, simTitle: null };
  try {
    const t = await resolveTarget({ trackId, simId } as FeedbackInput, userId);
    const titles = await queryOne<{ track_title: string | null; sim_title: string | null }>(
      `select (select title from subject_tracks where id = $1) as track_title, (select title from sims where id = $2) as sim_title`,
      [t.trackId, t.simId]
    );
    return { trackId: t.trackId, trackTitle: titles?.track_title ?? null, simId: t.simId, simTitle: titles?.sim_title ?? null };
  } catch (err) {
    if (err instanceof ReviewerError) return none;
    throw err;
  }
}

function values(input: FeedbackInput): unknown[] {
  return [
    input.name,
    input.role,
    input.roleOther,
    input.areas,
    input.tried,
    ...(Object.keys(RATINGS) as RatingKey[]).map((k) => input.ratings[k]),
    ...(Object.keys(TEXTS) as TextKey[]).map((k) => input.texts[k]),
    input.recommend,
    input.followUp,
  ];
}
const VALUE_COLS = [
  "reviewer_name",
  "reviewer_role",
  "reviewer_role_other",
  "areas",
  "tried",
  ...Object.values(RATINGS),
  ...Object.values(TEXTS),
  "recommend",
  "follow_up",
];

export async function createFeedback(userId: string, input: FeedbackInput): Promise<Feedback> {
  const target = await resolveTarget(input, userId);
  const cols = ["user_id", "track_id", "sim_id", ...VALUE_COLS];
  const params = [userId, target.trackId, target.simId, ...values(input)];
  const row = await queryOne<{ id: string }>(
    `insert into reviewer_feedback (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    params
  );
  return (await getOwnFeedback(userId, row!.id))!;
}

// Only the reviewer's own row; null (a 404) for anyone else's.
export async function updateFeedback(userId: string, id: string, input: FeedbackInput): Promise<Feedback | null> {
  const target = await resolveTarget(input, userId);
  const cols = ["track_id", "sim_id", ...VALUE_COLS];
  const params = [target.trackId, target.simId, ...values(input), id, userId];
  const n = cols.length;
  const row = await queryOne<{ id: string }>(
    `update reviewer_feedback set ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")}, updated_at = now()
      where id = $${n + 1} and user_id = $${n + 2} returning id`,
    params
  );
  return row ? getOwnFeedback(userId, row.id) : null;
}

export async function getOwnFeedback(userId: string, id: string): Promise<Feedback | null> {
  const r = await queryOne<Row>(`select ${FEEDBACK_COLS} from ${FEEDBACK_FROM} where f.id = $1 and f.user_id = $2`, [id, userId]);
  return r ? toFeedback(r) : null;
}

export async function listOwnFeedback(userId: string): Promise<Feedback[]> {
  const rows = await query<Row>(`select ${FEEDBACK_COLS} from ${FEEDBACK_FROM} where f.user_id = $1 order by f.created_at desc, f.id desc limit 200`, [userId]);
  return rows.map(toFeedback);
}

// Owner: every submission, newest first, optionally for one reviewer and/or
// one course, and the filter choices (every reviewer and course that has
// feedback).
export async function listAllFeedback(filter: { reviewerId: string | null; trackId: string | null }): Promise<{
  feedback: OwnerFeedback[];
  reviewers: { id: string; label: string }[];
  courses: { id: string; title: string }[];
}> {
  const rows = await query<Row & { reviewer_email: string }>(
    `select ${FEEDBACK_COLS}, u.email as reviewer_email from ${FEEDBACK_FROM} join app_users u on u.id = f.user_id
      where ($1::uuid is null or f.user_id = $1) and ($2::uuid is null or f.track_id = $2)
      order by f.created_at desc, f.id desc limit 500`,
    [filter.reviewerId, filter.trackId]
  );
  const reviewers = await query<{ id: string; label: string }>(
    `select u.id, coalesce(nullif(trim(u.display_name), ''), u.email) as label
       from app_users u where exists (select 1 from reviewer_feedback f where f.user_id = u.id) order by 2, 1`
  );
  const courses = await query<{ id: string; title: string }>(
    `select st.id, st.title from subject_tracks st where exists (select 1 from reviewer_feedback f where f.track_id = st.id) order by st.title, st.id`
  );
  return {
    feedback: rows.map((r) => ({ ...toFeedback(r), reviewerId: r.user_id as string, reviewerEmail: r.reviewer_email })),
    reviewers,
    courses,
  };
}
