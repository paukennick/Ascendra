import { queryOne, withTransaction } from "@/lib/db";
import { recordEvent } from "@/lib/events";
import { termsState, type ClientContext, type TermsState } from "@/lib/legal";
import { studyNoticeState, type StudyNoticeState } from "@/lib/study-notice";

// REQ-119 (Audit 3 product M2): the first-run flow for a brand-new learner
// (pick a goal or "just exploring", optional exam date, optional placement,
// then a clear first step). learner_onboarding (migration 048) records that
// it is done; every account that existed before 048 is marked done, so only
// new learners see it. Skipping counts as done: it is offered once, never
// forced.

export interface FirstRunState {
  needed: boolean;
  completedAt: string | null;
  goalTrackId: string | null;
  justExploring: boolean;
}

export async function firstRunState(userId: string): Promise<FirstRunState> {
  const row = await queryOne<{ first_run_completed_at: Date | null; goal_track_id: string | null; just_exploring: boolean }>(
    `select first_run_completed_at, goal_track_id, just_exploring from learner_onboarding where user_id = $1`,
    [userId]
  );
  return {
    needed: !row?.first_run_completed_at,
    completedAt: row?.first_run_completed_at ? new Date(row.first_run_completed_at).toISOString() : null,
    goalTrackId: row?.goal_track_id ?? null,
    justExploring: row?.just_exploring ?? false,
  };
}

// The first completion wins: a second call (a retry, a second phone) leaves
// the first goal and time in place and records no second event.
export async function completeFirstRun(
  userId: string,
  goal: { trackId: string | null; justExploring: boolean }
): Promise<FirstRunState> {
  await withTransaction(async (tx) => {
    const done = await tx.queryOne<{ user_id: string }>(
      `insert into learner_onboarding (user_id, first_run_completed_at, goal_track_id, just_exploring)
       values ($1, now(), $2, $3)
       on conflict (user_id) do update
         set first_run_completed_at = now(), goal_track_id = excluded.goal_track_id, just_exploring = excluded.just_exploring
         where learner_onboarding.first_run_completed_at is null
       returning user_id`,
      [userId, goal.trackId, goal.justExploring]
    );
    if (done) {
      await recordEvent(userId, "first_run_completed", { trackId: goal.trackId }, (sql, p) => tx.query(sql, p));
    }
  });
  return firstRunState(userId);
}

export interface OnboardingState {
  terms: TermsState;
  firstRun: FirstRunState;
  // REQ-165: whether the learner has accepted the current study notice (the
  // one disclaimer for all content plus the AI data disclosure). The app
  // asks for it at launch, after the Terms and before first run.
  notice: StudyNoticeState;
}

// REQ-175: `ctx.legacy` (a request without the app-version header) lets the
// previous Terms version satisfy the terms gate; see lib/legal.ts.
export async function onboardingState(userId: string, ctx: ClientContext = { legacy: false }): Promise<OnboardingState> {
  return { terms: await termsState(userId, ctx), firstRun: await firstRunState(userId), notice: await studyNoticeState(userId) };
}
