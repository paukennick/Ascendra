// REQ-090: what GET /api/account/export returns, as one table of
// section -> query. It used to be eight queries unpacked positionally into
// seven names, so from "mastery" onward every section held the previous
// table's rows (favorites under "mastery", mastery under "attempts", ...)
// and study sessions were dropped. Keying each query by its own section
// name makes that kind of shift impossible.
//
// Every query is scoped to the caller's own user_id ($1).
//
// REQ-098: bounded. The export used to load every row of every section into
// memory at once (40k attempts measured at 89 MB of JSON and 175 MB of heap),
// with the eleven queries on separate pooled connections. Each section now
// returns at most EXPORT_PAGE_ROWS rows; a section with more is listed under
// `more` with the offset to ask for next (GET /api/account/export?section=
// attempts&offset=5000). Every query has a total order so pages don't skip
// or repeat rows. The route runs the queries one after another on one
// connection inside a read-only REPEATABLE READ transaction, so a first
// page is one consistent snapshot.
//
// REQ-118 (Audit 3 HIGH-3): 5,000-row pages pretty-printed made the first
// page 6 MB for a 5k-attempt learner, over Vercel's 4.5 MB cap on a
// function response, so the export failed for exactly the most engaged
// learners. Pages are now 500 rows AND at most EXPORT_PAGE_BYTES of JSON
// (a page ends early at the row that would cross it; at least one row per
// page). The first-page response stops adding sections once it holds
// EXPORT_RESPONSE_BYTES; the sections left out are listed under `more` with
// nextOffset 0, which the app already follows (mobile/src/lib/accountExport.ts).
// The route sends compact JSON. Worst case per response is therefore about
// EXPORT_RESPONSE_BYTES + one page.

export const EXPORT_PAGE_ROWS = 500;
export const EXPORT_PAGE_BYTES = 1_000_000;
export const EXPORT_RESPONSE_BYTES = 2_000_000;

// REQ-112: tables with a user_id that are deliberately NOT in the export, and
// why. lib/integration-guard.dbtest.ts fails when a table with a user_id is
// in neither list, so a new per-learner table cannot be forgotten again.
export const EXPORT_EXCLUDED_TABLES: Record<string, string> = {
  password_reset_tokens: "credential hashes",
  email_verification_tokens: "credential hashes",
  email_change_tokens: "credential hashes",
  login_challenges: "short-lived MFA challenges",
  mfa_backup_codes: "credential hashes",
  oauth_accounts: "sign-in provider links (credentials)",
  ai_calls: "operational cost and latency log (no learner content)",
  lesson_content_overrides: "generated lesson text, not learner input (pre-existing exclusion)",
  pbq_generation_claims: "a minutes-long generation lease, no content",
  mastery_backup_029: "rollback backup, dropped after 30 days",
  error_log_backup_029: "rollback backup, dropped after 30 days",
  mastery_backup_031: "rollback backup, dropped after 30 days",
  mastery_backup_041: "rollback backup, dropped after 30 days",
  mastery_backup_045: "rollback backup, dropped after 30 days",
  grading_claims: "a seconds-long grading lease (REQ-117), no content",
};

export const EXPORT_SECTIONS = {
  profile: "select id, email, display_name, created_at from app_users where id = $1",
  tracks: "select * from subject_tracks where user_id = $1 order by created_at asc, id asc",
  favorites: "select track_id, created_at from course_favorites where user_id = $1 order by created_at asc, track_id asc",
  mastery: "select * from mastery where user_id = $1 order by id asc",
  attempts: "select * from attempts where user_id = $1 order by created_at asc, id asc",
  errorLog: "select * from error_log where user_id = $1 order by created_at asc, id asc",
  chatMessages: "select * from chat_messages where user_id = $1 order by created_at asc, id asc",
  studySessions: "select * from study_sessions where user_id = $1 order by started_at asc, id asc",
  // Missing from the export until REQ-090.
  lessonProgress: "select * from lesson_progress where user_id = $1 order by updated_at asc, objective_id asc",
  courseAcknowledgements:
    "select * from track_acknowledgements where user_id = $1 order by acknowledged_at asc, id asc",
  supportRequests: "select * from support_requests where user_id = $1 order by created_at asc, id asc",
  // REQ-109: sprints and mock exams, and each question's saved answer.
  examSessions: "select * from exam_sessions where user_id = $1 order by created_at asc, id asc",
  examSessionItems:
    "select si.* from exam_session_items si join exam_sessions s on s.id = si.session_id where s.user_id = $1 order by s.created_at asc, s.id asc, si.position asc",
  // REQ-111: what the learner has misdiagnosed, and refreshers opened.
  misconceptions: "select * from learner_misconceptions where user_id = $1 order by created_at asc, id asc",
  prerequisiteRefreshers: "select * from prerequisite_refreshers where user_id = $1 order by opened_at asc, id asc",
  // REQ-110: study plans, placement checks with their answered items, and
  // Quiz me turns. Each has a total order (REQ-098 paging).
  studyPlans: "select * from study_plans where user_id = $1 order by track_id asc",
  placementChecks: `select pc.*, coalesce((select json_agg(pi order by pi.seq) from placement_items pi where pi.placement_id = pc.id and pi.correct is not null), '[]') as items
                      from placement_checks pc where pc.user_id = $1 order by pc.started_at asc, pc.id asc`,
  coachQuizTurns: `select t.*, i.question, i.objective_id from coach_quiz_turns t join coach_quiz_items i on i.id = t.item_id
                    where t.user_id = $1 order by t.created_at asc, t.id asc`,
  // REQ-108: the review loop.
  reviewSchedule: "select * from review_schedule where user_id = $1 order by enrolled_at asc, objective_id asc",
  reviewLog: "select * from review_log where user_id = $1 order by reviewed_at asc, id asc",
  reviewSessions: "select * from review_sessions where user_id = $1 order by created_at asc, id asc",
  reviewSessionItems:
    "select si.* from review_session_items si join review_sessions s on s.id = si.session_id where s.user_id = $1 order by s.created_at asc, s.id asc, si.position asc",
  termCoverage: "select * from learner_term_coverage where user_id = $1 order by first_correct_at asc, objective_id asc, term asc",
  // REQ-101 / FAIL-236: when the learner finished or cleared each lesson
  // position (migration 032) -- their activity, missed from the export.
  lessonProgressTombstones:
    "select * from lesson_progress_tombstones where user_id = $1 order by cleared_at asc, objective_id asc",
  // REQ-097 (FAIL-187): which Solo items the learner revealed the choices for.
  lessonHintReveals: "select * from lesson_hint_reveals where user_id = $1 order by revealed_at asc, objective_id asc, item_key asc",
  // REQ-114: questions the learner reported (and key-suspect grades on their
  // answers). Their own input; the automated re-check rows have no user.
  itemReports:
    "select id, item_kind, item_id, question, source, reason, note, created_at from item_flags where user_id = $1 order by created_at asc, id asc",
  // REQ-119 (migration 048): Terms/Privacy acceptances, the first-run
  // record, learning events and reported exam results.
  termsAcceptances: "select * from terms_acceptances where user_id = $1 order by accepted_at asc, terms_version asc",
  onboarding: "select * from learner_onboarding where user_id = $1 order by user_id asc",
  learnerEvents: "select * from learner_events where user_id = $1 order by created_at asc, id asc",
  examOutcomes: "select * from exam_outcomes where user_id = $1 order by exam_date asc, id asc",
  // REQ-123 (migration 050): lab runs and every graded step with the
  // learner's answers. A finished run's attempt is also under attempts.
  labRuns: "select * from lab_runs where user_id = $1 order by started_at asc, id asc",
  labRunSteps: "select * from lab_run_steps where user_id = $1 order by created_at asc, run_id asc, step_index asc",
  // REQ-116 (audit 3, low): the learner's own sign-in log and devices, with
  // the IP addresses recorded. Events are matched by user id or by the
  // account's address (events before sign-in carry only the address).
  // Sessions leave out the token hash. Kept for 90 days (lib/auth/retention.ts).
  signInEvents: `select event_type, ip, created_at from auth_events
                  where user_id = $1 or identifier = (select email from app_users where id = $1)
                  order by created_at asc, id asc`,
  sessions: `select id, device_label, user_agent, ip, created_at, last_used_at, expires_at, revoked_at
               from refresh_tokens where user_id = $1 order by created_at asc, id asc`,
} as const;

export type ExportSection = keyof typeof EXPORT_SECTIONS;

export function isExportSection(v: unknown): v is ExportSection {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(EXPORT_SECTIONS, v);
}

type QueryFn = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

// One page of one section: up to `limit` rows (and about `maxBytes` of JSON)
// from `offset`, and the offset of the next page if there is one.
export async function exportSectionPage(
  userId: string,
  section: ExportSection,
  run: QueryFn,
  offset = 0,
  limit = EXPORT_PAGE_ROWS,
  maxBytes = EXPORT_PAGE_BYTES
): Promise<{ rows: Record<string, unknown>[]; nextOffset: number | null; bytes: number }> {
  const rows = await run(`${EXPORT_SECTIONS[section]} limit $2 offset $3`, [userId, limit + 1, offset]);
  let bytes = 0;
  let take = 0;
  for (; take < Math.min(rows.length, limit); take++) {
    const size = Buffer.byteLength(JSON.stringify(rows[take]), "utf8") + 1;
    if (take > 0 && bytes + size > maxBytes) break;
    bytes += size;
  }
  const more = rows.length > take;
  return { rows: rows.slice(0, take), nextOffset: more ? offset + take : null, bytes };
}

// The first page of every section. Sequential on purpose: the route passes
// a single transaction's query function, and one connection runs one query
// at a time anyway.
export async function buildAccountExport(
  userId: string,
  run: QueryFn,
  limit = EXPORT_PAGE_ROWS,
  budget: { pageBytes: number; responseBytes: number } = { pageBytes: EXPORT_PAGE_BYTES, responseBytes: EXPORT_RESPONSE_BYTES }
) {
  const names = Object.keys(EXPORT_SECTIONS) as ExportSection[];
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  const more: Record<string, { nextOffset: number }> = {};
  let total = 0;
  for (const n of names) {
    // Over the response budget: the rest of the sections come as pages.
    // profile is first and always included.
    if (n !== "profile" && total >= budget.responseBytes) {
      more[n] = { nextOffset: 0 };
      continue;
    }
    const page = await exportSectionPage(userId, n, run, 0, limit, budget.pageBytes);
    total += page.bytes;
    out[n] = n === "profile" ? page.rows[0] ?? null : page.rows;
    if (page.nextOffset !== null) more[n] = { nextOffset: page.nextOffset };
  }
  out.more = more;
  return out;
}
