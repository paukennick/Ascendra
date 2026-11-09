import { query, queryOne } from "@/lib/db";
import { UserFacingError } from "@/lib/http";

// REQ-165 (Nick, 2026-11-09): ONE notice, accepted once, that covers all of
// Ascendra -- lessons, questions, labs, sims and the AI coach -- and says
// what is sent to the AI provider (Google Play User Data policy, which since
// July 2026 says plainly that it covers third-party AI). It replaces the
// per-course disclaimers (track_acknowledgements, 012) and the per-family
// clinical / fitness lab acknowledgement (lab_disclaimer_acknowledgements,
// 051). Those tables are kept as the record of what was accepted then, but
// nothing reads them to gate any more: everyone, including those who
// accepted them, accepts this notice once.
//
// Recorded as a 'study_notice' row in legal_acceptances (migration 059):
// one per learner and version, the first time kept. The text lives in
// mobile/src/lib/studyNotice.ts, which carries the same version (a mobile
// test checks they match). Bump it when the meaning changes: every learner
// is asked once more on their next launch.
export const STUDY_NOTICE_VERSION = "2026-11-09";

export interface StudyNoticeState {
  currentVersion: string;
  acceptedAt: string | null;
  needed: boolean;
}

export function isCurrentStudyNoticeVersion(v: unknown): boolean {
  return v === STUDY_NOTICE_VERSION;
}

// SQL: has the learner whose id is in `userParam` (e.g. "$1") accepted the
// current notice? For the queries that used to check track_acknowledgements
// inline. The version is a constant of this file, never request input.
export function studyNoticeAcceptedSql(userParam: string): string {
  return `exists (select 1 from legal_acceptances sn
                   where sn.user_id = ${userParam} and sn.document = 'study_notice' and sn.version = '${STUDY_NOTICE_VERSION}')`;
}

export async function studyNoticeState(userId: string): Promise<StudyNoticeState> {
  const row = await queryOne<{ accepted_at: Date }>(
    `select accepted_at from legal_acceptances where user_id = $1 and document = 'study_notice' and version = $2`,
    [userId, STUDY_NOTICE_VERSION]
  );
  return {
    currentVersion: STUDY_NOTICE_VERSION,
    acceptedAt: row ? new Date(row.accepted_at).toISOString() : null,
    needed: !row,
  };
}

export async function hasAcceptedStudyNotice(userId: string): Promise<boolean> {
  return !(await studyNoticeState(userId)).needed;
}

// Idempotent: a repeat (a retry, a second phone) keeps the first row.
export async function recordStudyNoticeAcceptance(userId: string): Promise<void> {
  await query(
    `insert into legal_acceptances (user_id, document, version, source) values ($1, 'study_notice', $2, 'prompt')
     on conflict (user_id, document, version) do nothing`,
    [userId, STUDY_NOTICE_VERSION]
  );
}

export const STUDY_NOTICE_REQUIRED_MESSAGE =
  "Before you start, read and accept Ascendra's study notice. It opens when you go back to Home (update the app if you don't see it).";

// Server-side gate for clinical content (courses that used to carry their
// own disclaimer, and clinical / fitness labs): 403 with a code the app
// recognises. The app asks for the notice at launch, so a learner meets
// this only with an app older than the notice or by calling the API directly.
export async function requireStudyNotice(userId: string): Promise<void> {
  if (await hasAcceptedStudyNotice(userId)) return;
  throw new UserFacingError(STUDY_NOTICE_REQUIRED_MESSAGE, 403, {
    code: "study_notice_required",
    noticeVersion: STUDY_NOTICE_VERSION,
  });
}
