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

export const EXPORT_PAGE_ROWS = 5_000;

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
} as const;

export type ExportSection = keyof typeof EXPORT_SECTIONS;

export function isExportSection(v: unknown): v is ExportSection {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(EXPORT_SECTIONS, v);
}

type QueryFn = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

// One page of one section: up to `limit` rows from `offset`, and the offset
// of the next page if there is one.
export async function exportSectionPage(
  userId: string,
  section: ExportSection,
  run: QueryFn,
  offset = 0,
  limit = EXPORT_PAGE_ROWS
): Promise<{ rows: Record<string, unknown>[]; nextOffset: number | null }> {
  const rows = await run(`${EXPORT_SECTIONS[section]} limit $2 offset $3`, [userId, limit + 1, offset]);
  const more = rows.length > limit;
  return { rows: more ? rows.slice(0, limit) : rows, nextOffset: more ? offset + limit : null };
}

// The first page of every section. Sequential on purpose: the route passes
// a single transaction's query function, and one connection runs one query
// at a time anyway.
export async function buildAccountExport(userId: string, run: QueryFn, limit = EXPORT_PAGE_ROWS) {
  const names = Object.keys(EXPORT_SECTIONS) as ExportSection[];
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  const more: Record<string, { nextOffset: number }> = {};
  for (const n of names) {
    const page = await exportSectionPage(userId, n, run, 0, limit);
    out[n] = n === "profile" ? page.rows[0] ?? null : page.rows;
    if (page.nextOffset !== null) more[n] = { nextOffset: page.nextOffset };
  }
  out.more = more;
  return out;
}
