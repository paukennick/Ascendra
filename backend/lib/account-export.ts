// REQ-090: what GET /api/account/export returns, as one table of
// section -> query. It used to be eight queries unpacked positionally into
// seven names, so from "mastery" onward every section held the previous
// table's rows (favorites under "mastery", mastery under "attempts", ...)
// and study sessions were dropped. Keying each query by its own section
// name makes that kind of shift impossible.
//
// Every query is scoped to the caller's own user_id ($1).

export const EXPORT_SECTIONS = {
  profile: "select id, email, display_name, created_at from app_users where id = $1",
  tracks: "select * from subject_tracks where user_id = $1",
  favorites: "select track_id, created_at from course_favorites where user_id = $1",
  mastery: "select * from mastery where user_id = $1",
  attempts: "select * from attempts where user_id = $1 order by created_at asc",
  errorLog: "select * from error_log where user_id = $1 order by created_at asc",
  chatMessages: "select * from chat_messages where user_id = $1 order by created_at asc",
  studySessions: "select * from study_sessions where user_id = $1 order by started_at asc",
  // Missing from the export until REQ-090.
  lessonProgress: "select * from lesson_progress where user_id = $1 order by updated_at asc",
  courseAcknowledgements: "select * from track_acknowledgements where user_id = $1 order by acknowledged_at asc",
  supportRequests: "select * from support_requests where user_id = $1 order by created_at asc",
  // REQ-097 (FAIL-187): which Solo items the learner revealed the choices for.
  lessonHintReveals: "select * from lesson_hint_reveals where user_id = $1 order by revealed_at asc",
} as const;

export type ExportSection = keyof typeof EXPORT_SECTIONS;

type QueryFn = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

export async function buildAccountExport(userId: string, run: QueryFn) {
  const names = Object.keys(EXPORT_SECTIONS) as ExportSection[];
  const rows = await Promise.all(names.map((n) => run(EXPORT_SECTIONS[n], [userId])));
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  names.forEach((n, i) => {
    out[n] = n === "profile" ? rows[i][0] ?? null : rows[i];
  });
  return out;
}
