import { query, queryOne, withTransaction } from "@/lib/db";
import { isActive } from "@/lib/progress-sql";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { sendServiceEmail } from "@/lib/email";
import { logEmailFailure } from "@/lib/email-errors";
import { hasFeature } from "@/lib/entitlements";
import { objectiveReadiness, readinessParams, rollupReadiness, weightsAreExamBlueprint } from "@/lib/readiness";
import { utcDay } from "@/lib/review-scheduler";
import { daysBetween, shortCourseName, shortTopic } from "@/lib/reminder-plan";
import { changesInWindow, examChangePeriodKey, type ExamChange } from "@/lib/exam-changes";
import {
  countdownEmail,
  digestEmail,
  examChangeEmail,
  isoWeek,
  PREF_COLUMN,
  unsubscribeToken,
  weekLabel,
  type DigestCourse,
  type ReadinessLine,
  type Rendered,
  type ServiceEmailKind,
} from "@/lib/service-email-copy";

// REQ-197: the three service emails, sent by the daily cron
// (/api/cron/service-emails). Shared rules, all enforced here:
//   - a per-learner switch for each kind (email_preferences, migration 063;
//     no row = exam notices and countdown on, digest OFF);
//   - only to a verified address (app_users.email_verified_at);
//   - once per learner, kind and period: the service_email_log row is
//     claimed BEFORE the send, so overlapping or retried runs never send
//     twice. A failed send is retried on a later run, at most 3 tries;
//   - every email carries a signed unsubscribe link and List-Unsubscribe /
//     List-Unsubscribe-Post headers;
//   - small batches with a pause between sends, and a per-address daily cap
//     that is separate from the sign-in mail limit (lib/auth/mailLimit.ts),
//     so service mail can never use up a learner's password-reset budget;
//   - the digest refuses to run without MAIL_POSTAL_ADDRESS and
//     DIGEST_EMAIL_FROM.

export function serviceEmailsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env.SERVICE_EMAILS_ENABLED ?? "").trim().toLowerCase() === "true";
}

export const SERVICE_MAIL_EVENT = "service_mail_to";
export const SERVICE_MAIL_LIMIT = { max: 3, windowMinutes: 24 * 60 };
export const DEFAULT_BATCH = 25;
export const SEND_GAP_MS = 600;
export const MAX_ATTEMPTS = 3;
// Countdown windows: a missed cron day still sends, a late exam date skips
// the 14-day mail rather than sending it at 9 days.
export const COUNTDOWN_WINDOWS = [
  { label: "d14", from: 12, to: 14 },
  { label: "d3", from: 1, to: 3 },
] as const;

export interface EmailPreferences {
  examChanges: boolean;
  examCountdown: boolean;
  weeklyDigest: boolean;
}

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = { examChanges: true, examCountdown: true, weeklyDigest: false };

const prefSql = (kind: ServiceEmailKind) =>
  `coalesce(ep.${PREF_COLUMN[kind]}, ${kind === "weekly_digest" ? "false" : "true"})`;

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getEmailPreferences(userId: string): Promise<EmailPreferences> {
  const row = await queryOne<{ exam_changes: boolean; exam_countdown: boolean; weekly_digest: boolean }>(
    `select exam_changes, exam_countdown, weekly_digest from email_preferences where user_id = $1`,
    [userId]
  );
  if (!row) return { ...DEFAULT_EMAIL_PREFERENCES };
  return { examChanges: row.exam_changes, examCountdown: row.exam_countdown, weeklyDigest: row.weekly_digest };
}

export async function setEmailPreferences(userId: string, next: Partial<EmailPreferences>): Promise<EmailPreferences> {
  const cur = await getEmailPreferences(userId);
  const v = { ...cur, ...next };
  await query(
    `insert into email_preferences (user_id, exam_changes, exam_countdown, weekly_digest, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (user_id) do update
       set exam_changes = excluded.exam_changes, exam_countdown = excluded.exam_countdown,
           weekly_digest = excluded.weekly_digest, updated_at = now()`,
    [userId, v.examChanges, v.examCountdown, v.weeklyDigest]
  );
  return v;
}

// From a signed link. Idempotent; an account deleted since the mail was sent
// is simply not there (nothing to turn off).
export async function unsubscribe(userId: string, kind: ServiceEmailKind): Promise<boolean> {
  const exists = await queryOne(`select 1 from app_users where id = $1`, [userId]);
  if (!exists) return false;
  const key = { exam_change: "examChanges", exam_countdown: "examCountdown", weekly_digest: "weeklyDigest" } as const;
  await setEmailPreferences(userId, { [key[kind]]: false });
  return true;
}

export function validatePreferences(body: unknown): { ok: true; value: Partial<EmailPreferences> } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Send the email choices as JSON." };
  const out: Partial<EmailPreferences> = {};
  for (const k of ["examChanges", "examCountdown", "weeklyDigest"] as const) {
    const v = (body as Record<string, unknown>)[k];
    if (v === undefined) continue;
    if (typeof v !== "boolean") return { ok: false, error: `${k} must be true or false.` };
    out[k] = v;
  }
  if (!Object.keys(out).length) return { ok: false, error: "Nothing to change." };
  return { ok: true, value: out };
}

// ---------------------------------------------------------------------------
// Send log (idempotency)
// ---------------------------------------------------------------------------

// Claims (learner, kind, period). True when this run may send: a new row,
// or a failed one with tries left.
export async function claimSend(userId: string, kind: ServiceEmailKind, periodKey: string): Promise<boolean> {
  const row = await queryOne(
    `insert into service_email_log (user_id, kind, period_key) values ($1, $2, $3)
     on conflict (user_id, kind, period_key) do update
       set status = 'sending', attempts = service_email_log.attempts + 1
       where service_email_log.status = 'failed' and service_email_log.attempts < $4
     returning id`,
    [userId, kind, periodKey, MAX_ATTEMPTS]
  );
  return !!row;
}

async function markSent(userId: string, kind: ServiceEmailKind, periodKey: string) {
  await query(
    `update service_email_log set status = 'sent', sent_at = now() where user_id = $1 and kind = $2 and period_key = $3`,
    [userId, kind, periodKey]
  );
}

// `refund`: the send never started (address over its daily cap), so the try
// does not count against the three.
async function markFailed(userId: string, kind: ServiceEmailKind, periodKey: string, refund = false) {
  await query(
    `update service_email_log set status = 'failed', attempts = greatest(1, attempts - $4::int)
      where user_id = $1 and kind = $2 and period_key = $3`,
    [userId, kind, periodKey, refund ? 1 : 0]
  );
}

// ---------------------------------------------------------------------------
// Readiness for the countdown and digest
// ---------------------------------------------------------------------------

export interface CourseStanding {
  readiness: ReadinessLine;
  weakest: string[];
}

// The same live computation as lib/readiness.ts courseReadiness, plus the
// objective titles so the weakest three can be named. The percentage is
// only given when the learner's plan includes the readiness score (Free
// sees "unconfirmed" in the app, so the email says the same) and there is
// enough evidence for the app to show a score.
export async function courseStanding(userId: string, trackId: string): Promise<CourseStanding> {
  const units = await query<{ id: string; title: string; weight: number | null }>(
    `select id, title, weight from course_units cu where track_id = $1 and ${isActive("cu")} order by sort_order`,
    [trackId]
  );
  const objectives = await withTransaction((tx) =>
    tx.query("select set_config('jit', 'off', true)").then(() =>
      tx.query<{
        title: string;
        unit_id: string;
        weighted_accuracy: number | null;
        readiness_score: number | null;
        status: string | null;
        kept: string | null;
        recheck_due: boolean | null;
        retention: number | null;
      }>(
        `select o.title, o.unit_id, d.weighted_accuracy, d.readiness_score, d.status::text as status,
                rs.kept, rs.recheck_due, rs.retention
           from objectives o
           join course_units cu on cu.id = o.unit_id
           left join lateral mastery_detail($2, o.id) d on true
           left join lateral review_state($2, o.id) rs on true
          where cu.track_id = $1 and ${isActive("cu")} and ${isActive("o")}`,
        [trackId, userId]
      )
    )
  );
  const params = await readinessParams();
  const inputs = objectives.map((o) => ({
    title: o.title,
    unitId: o.unit_id,
    weightedAccuracy: o.weighted_accuracy,
    readinessScore: o.readiness_score,
    status: o.status,
    kept: o.kept,
    recheckDue: o.recheck_due,
    retention: o.retention,
  }));
  const roll = rollupReadiness(units, inputs, params, await weightsAreExamBlueprint(trackId));
  const scored = roll.status === "building" || roll.status === "ready";
  const allowed = await hasFeature(userId, "readiness");
  const weakest = inputs
    .filter((o) => o.weightedAccuracy != null)
    .map((o) => ({ title: o.title, r: objectiveReadiness(o, params) }))
    .sort((a, b) => a.r - b.r || a.title.localeCompare(b.title))
    .slice(0, 3)
    .map((o) => shortTopic(o.title));
  return {
    readiness: scored && allowed ? { percent: roll.readinessPercent, ready: roll.status === "ready" } : { percent: null, ready: false },
    weakest,
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

interface Recipient {
  userId: string;
  email: string;
}

export interface RunOptions {
  now?: Date;
  batch?: number;
  gapMs?: number;
  env?: Record<string, string | undefined>;
  sleep?: (ms: number) => Promise<void>;
}

export interface KindResult {
  candidates: number;
  sent: number;
  failed: number;
  skipped: number;
  refused?: string;
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function baseUrl(env: Record<string, string | undefined>): string {
  return (env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function unsubscribeUrls(userId: string, kind: ServiceEmailKind, env: Record<string, string | undefined> = process.env) {
  const t = encodeURIComponent(unsubscribeToken(userId, kind, env));
  const base = baseUrl(env);
  return { page: `${base}/unsubscribe?token=${t}`, oneClick: `${base}/api/email/unsubscribe?token=${t}` };
}

export function unsubscribeHeaders(oneClickUrl: string): Record<string, string> {
  return { "List-Unsubscribe": `<${oneClickUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

// Claim, cap, send, record. Returns what happened, never throws for one
// learner's failure.
async function deliver(
  r: Recipient,
  kind: ServiceEmailKind,
  periodKey: string,
  render: (unsubscribeUrl: string) => Promise<Rendered | null>,
  opts: { from?: string; env: Record<string, string | undefined> }
): Promise<"sent" | "failed" | "skipped"> {
  if (!(await claimSend(r.userId, kind, periodKey))) return "skipped";
  try {
    await consumeRateLimit(SERVICE_MAIL_EVENT, r.email, SERVICE_MAIL_LIMIT, { userId: r.userId });
  } catch (err) {
    if (err instanceof RateLimitError) {
      await markFailed(r.userId, kind, periodKey, true);
      return "skipped";
    }
    throw err;
  }
  const urls = unsubscribeUrls(r.userId, kind, opts.env);
  try {
    const mail = await render(urls.page);
    if (!mail) {
      // Nothing to say after all (e.g. no activity): release the claim so a
      // later run in the same period may still send if that changes.
      await query(`delete from service_email_log where user_id = $1 and kind = $2 and period_key = $3 and status = 'sending'`, [
        r.userId,
        kind,
        periodKey,
      ]);
      return "skipped";
    }
    await sendServiceEmail(kind, {
      from: opts.from,
      to: r.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: unsubscribeHeaders(urls.oneClick),
    });
    await markSent(r.userId, kind, periodKey);
    return "sent";
  } catch (err) {
    logEmailFailure(`cron/service-emails:${kind}`, err);
    await markFailed(r.userId, kind, periodKey);
    return "failed";
  }
}

async function runBatch<T extends Recipient>(
  items: T[],
  batch: number,
  gapMs: number,
  sleep: (ms: number) => Promise<void>,
  one: (item: T) => Promise<"sent" | "failed" | "skipped">
): Promise<KindResult> {
  const res: KindResult = { candidates: items.length, sent: 0, failed: 0, skipped: 0 };
  let attempted = 0;
  for (const item of items) {
    if (attempted >= batch) break;
    const outcome = await one(item);
    res[outcome]++;
    if (outcome !== "skipped") {
      attempted++;
      if (gapMs > 0) await sleep(gapMs);
    }
  }
  return res;
}

// Learners studying a course: a study plan, a favourite (My courses) or any
// mastery row on one of its objectives.
const ENROLLED_SQL = (u: string, t: string) => `(
  exists (select 1 from study_plans sp where sp.user_id = ${u} and sp.track_id = ${t})
  or exists (select 1 from course_favorites cf where cf.user_id = ${u} and cf.track_id = ${t})
  or exists (select 1 from mastery m join objectives o on o.id = m.objective_id join course_units cu on cu.id = o.unit_id
              where m.user_id = ${u} and cu.track_id = ${t}))`;

// Not yet sent or claimed for this period (a failed row with tries left is
// picked up again).
const OPEN_SQL = (kind: ServiceEmailKind, periodExpr: string) => `not exists (
  select 1 from service_email_log l where l.user_id = u.id and l.kind = '${kind}' and l.period_key = ${periodExpr}
     and (l.status <> 'failed' or l.attempts >= ${MAX_ATTEMPTS}))`;

export async function examChangeRecipients(change: ExamChange): Promise<(Recipient & { trackId: string; courseTitle: string })[]> {
  const rows = await query<{ user_id: string; email: string; track_id: string; title: string }>(
    `select u.id as user_id, u.email, st.id as track_id, st.title
       from subject_tracks st
       join app_users u on true
       left join email_preferences ep on ep.user_id = u.id
      where st.code = $1 and st.user_id is null
        and u.email_verified_at is not null
        and ${prefSql("exam_change")}
        and ${ENROLLED_SQL("u.id", "st.id")}
        and ${OPEN_SQL("exam_change", "$2")}
      order by u.id`,
    [change.trackCode, examChangePeriodKey(change)]
  );
  return rows.map((r) => ({ userId: r.user_id, email: r.email, trackId: r.track_id, courseTitle: r.title }));
}

export interface CountdownRecipient extends Recipient {
  trackId: string;
  courseTitle: string;
  shortName: string;
  examDate: string;
  daysLeft: number;
  periodKey: string;
}

export async function countdownRecipients(today: string): Promise<CountdownRecipient[]> {
  const rows = await query<{
    user_id: string;
    email: string;
    track_id: string;
    title: string;
    exam_date: string;
    credential_name: string | null;
    provider_name: string | null;
    exam_code: string | null;
  }>(
    `select u.id as user_id, u.email, st.id as track_id, st.title, to_char(sp.exam_date, 'YYYY-MM-DD') as exam_date,
            c.name as credential_name, cp.name as provider_name, ce.exam_code
       from study_plans sp
       join app_users u on u.id = sp.user_id
       join subject_tracks st on st.id = sp.track_id
       left join credential_exams ce on ce.id = st.credential_exam_id
       left join credentials c on c.id = ce.credential_id
       left join credential_providers cp on cp.id = c.provider_id
       left join email_preferences ep on ep.user_id = u.id
      where sp.exam_date between $1::date + 1 and $1::date + 14
        and (st.user_id is null or st.user_id = u.id)
        and u.email_verified_at is not null
        and ${prefSql("exam_countdown")}
      order by sp.exam_date, u.id`,
    [today]
  );
  const out: CountdownRecipient[] = [];
  for (const r of rows) {
    const daysLeft = daysBetween(today, r.exam_date);
    const w = COUNTDOWN_WINDOWS.find((x) => daysLeft >= x.from && daysLeft <= x.to);
    if (!w) continue;
    out.push({
      userId: r.user_id,
      email: r.email,
      trackId: r.track_id,
      courseTitle: r.title,
      shortName: shortCourseName({
        credentialName: r.credential_name,
        providerName: r.provider_name,
        examCode: r.exam_code,
        trackTitle: r.title,
      }),
      examDate: r.exam_date,
      daysLeft,
      periodKey: `${r.track_id}:${r.exam_date}:${w.label}`,
    });
  }
  const open = await query<{ user_id: string; period_key: string }>(
    `select user_id, period_key from service_email_log
      where kind = 'exam_countdown' and user_id = any($1::uuid[]) and (status <> 'failed' or attempts >= $2)`,
    [[...new Set(out.map((o) => o.userId))], MAX_ATTEMPTS]
  );
  const done = new Set(open.map((o) => `${o.user_id}|${o.period_key}`));
  return out.filter((o) => !done.has(`${o.userId}|${o.periodKey}`));
}

export async function digestRecipients(today: string): Promise<Recipient[]> {
  const rows = await query<{ user_id: string; email: string }>(
    `select u.id as user_id, u.email
       from app_users u
       join email_preferences ep on ep.user_id = u.id
      where ep.weekly_digest
        and u.email_verified_at is not null
        and exists (select 1 from attempts a where a.user_id = u.id
                     and a.created_at >= ($1::date - 7)::timestamp at time zone 'UTC'
                     and a.created_at < ($1::date)::timestamp at time zone 'UTC')
        and ${OPEN_SQL("weekly_digest", "$2")}
      order by u.id`,
    [today, isoWeek(today)]
  );
  return rows.map((r) => ({ userId: r.user_id, email: r.email }));
}

export async function digestCourses(userId: string, today: string): Promise<DigestCourse[]> {
  const rows = await query<{ track_id: string; title: string; answered: string; correct: string; due: string }>(
    `with a as (
       select coalesce(cu.track_id, cu2.track_id) as track_id, a.verdict
         from attempts a
         left join course_units cu on cu.id = a.unit_id
         left join objectives o on o.id = a.objective_id
         left join course_units cu2 on cu2.id = o.unit_id
        where a.user_id = $1 and a.verdict is not null
          and a.created_at >= ($2::date - 7)::timestamp at time zone 'UTC'
          and a.created_at < ($2::date)::timestamp at time zone 'UTC'
     )
     select st.id as track_id, st.title,
            count(*) as answered, count(*) filter (where a.verdict = 'correct') as correct,
            (select count(*) from review_schedule rs join objectives o on o.id = rs.objective_id
               join course_units cu on cu.id = o.unit_id
              where rs.user_id = $1 and cu.track_id = st.id and rs.due_on <= $2::date + 6
                and ${isActive("o")} and ${isActive("cu")}) as due
       from a join subject_tracks st on st.id = a.track_id
      where st.user_id is null or st.user_id = $1
      group by st.id, st.title
      order by count(*) desc, st.title`,
    [userId, today]
  );
  const out: DigestCourse[] = [];
  for (const r of rows) {
    const standing = await courseStanding(userId, r.track_id);
    out.push({
      courseTitle: r.title,
      answered: Number(r.answered),
      correct: Number(r.correct),
      dueNextWeek: Number(r.due),
      readiness: standing.readiness,
    });
  }
  return out;
}

export function digestRefusal(env: Record<string, string | undefined>): string | null {
  const missing = ["MAIL_POSTAL_ADDRESS", "DIGEST_EMAIL_FROM"].filter((k) => !(env[k] ?? "").trim());
  return missing.length ? `${missing.join(" and ")} not set` : null;
}

export async function runServiceEmails(opts: RunOptions = {}): Promise<Record<ServiceEmailKind, KindResult>> {
  const env = opts.env ?? process.env;
  const now = opts.now ?? new Date();
  const today = utcDay(now);
  const batch = opts.batch ?? (Number(env.SERVICE_EMAIL_BATCH) > 0 ? Math.floor(Number(env.SERVICE_EMAIL_BATCH)) : DEFAULT_BATCH);
  const gap = opts.gapMs ?? SEND_GAP_MS;
  const sleep = opts.sleep ?? realSleep;
  const postal = (env.MAIL_POSTAL_ADDRESS ?? "").trim() || null;

  // 1. Exam change notices: one batch shared by every change in its window.
  const changeItems: (Recipient & { change: ExamChange; courseTitle: string })[] = [];
  for (const change of changesInWindow(today)) {
    for (const r of await examChangeRecipients(change)) changeItems.push({ ...r, change });
  }
  const exam_change = await runBatch(changeItems, batch, gap, sleep, (r) =>
    deliver(
      r,
      "exam_change",
      examChangePeriodKey(r.change),
      async (unsubscribeUrl) =>
        examChangeEmail({ change: r.change, courseTitle: r.courseTitle, unsubscribeUrl, postalAddress: postal }),
      { env }
    )
  );

  // 2. Countdown at 14 and 3 days.
  const exam_countdown = await runBatch(await countdownRecipients(today), batch, gap, sleep, (r) =>
    deliver(
      r,
      "exam_countdown",
      r.periodKey,
      async (unsubscribeUrl) => {
        const s = await courseStanding(r.userId, r.trackId);
        return countdownEmail({
          courseTitle: r.courseTitle,
          shortName: r.shortName,
          examDate: r.examDate,
          daysLeft: r.daysLeft,
          readiness: s.readiness,
          weakest: s.weakest,
          unsubscribeUrl,
          postalAddress: postal,
        });
      },
      { env }
    )
  );

  // 3. Weekly digest: opt-in, and only with a postal address and its own sender.
  let weekly_digest: KindResult;
  const refused = digestRefusal(env);
  if (refused) {
    weekly_digest = { candidates: 0, sent: 0, failed: 0, skipped: 0, refused };
  } else {
    const week = isoWeek(today);
    weekly_digest = await runBatch(await digestRecipients(today), batch, gap, sleep, (r) =>
      deliver(
        r,
        "weekly_digest",
        week,
        async (unsubscribeUrl) => {
          const courses = await digestCourses(r.userId, today);
          if (!courses.length) return null;
          return digestEmail({ weekLabel: weekLabel(today), courses, unsubscribeUrl, postalAddress: postal });
        },
        { env, from: env.DIGEST_EMAIL_FROM!.trim() }
      )
    );
  }
  return { exam_change, exam_countdown, weekly_digest };
}
