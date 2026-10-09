# Learning engine / AI coaching / catalog / ops review (2026-10-09)

Read-only review produced by a delegated review agent against master @ f8d9a15, after the 2026-10-08 sweep (REQ-073..085). Items shipped in that sweep are excluded. Priority is by impact on learning outcome and on cost/risk, not by effort.

The short version: the app is a well-built single-pass tutor. Each objective is taught once from a one-line title, graded once, and the result is recorded forever. Missing is what makes a prep product predictive of a pass: memory that fades and is retested, questions the learner has not already seen, grading that knows the answer, and instrumentation that says whether the AI is doing a good job.

## Tier 1 -- fix first (these undermine the core promise)

1. **Mastery is "last answer wins" with no time dimension.** `backend/lib/mastery.ts:62-80` `suggestStatus`: one correct free-response answer -> Independent (line 77) regardless of difficulty, confidence, or prior misses; one incorrect open answer -> Introduced (line 79) even after ten correct ones. Nothing decays: `mastery.updated_at` exists (`001_init.sql:131`) but no reader uses it. `isProficient` (line 29) needs only 2 attempts at 85%, so 2-for-2 is Transfer-ready. The weighted readiness number (`mobile/src/lib/progress.ts:15`) is built on a signal both too generous and too brittle. Needed: a stability/recency term (half-life on `updated_at`), difficulty-weighted evidence, demotion only after repeated misses.

2. **Every learner gets the same two questions forever, and review retests the same ones.** `lesson_content` is keyed `objective_id unique` (`001_init.sql:70`), no user or version. Review's "Open lesson" (`mobile/app/(app)/review.tsx:30`) re-serves the identical cached question whose answer the learner was already shown, so a day-7 "pass" measures recognition of the item, not recall; REQ-084's auto-advance (`grading-service.ts:105-118`) then clears the entry. No question bank, no unseen-first selection, no difficulty tag. `pbq_scenarios` (many per unit, `fresh=1`) is the right shape; objectives need the same.

3. **Regenerate is global, unlimited, and rewrites what everyone sees.** `POST /api/objectives/:id/lesson` has no `checkRateLimit`, spends two Sonnet calls (`lesson-generation.ts:539,569`), and upserts the single shared row, so one learner's Regenerate replaces the lesson under every other learner mid-course. `prefetch-next` is likewise unlimited and can be driven down the whole catalog (~5,200 objectives). Needed: per-user rate limit and daily AI budget on both routes, and per-user or versioned regeneration.

4. **Free-response grading has no answer key and trusts the client for its context.** `gradeFreeResponsePrompt` (`prompts.ts:308`) receives only `taughtText`, `question`, `answer`; `taughtText` is whatever the client posts (`grade/route.ts:66`). The cached row holds the correct choice and `fadeWhy`/`soloWhy` but the grader never sees them. MC: `grade/route.ts:36-40` accepts `correctIndex` from the request and never checks it against `lesson_content`, so mastery is trivially gameable and any client bug silently mis-grades. Needed: server looks up the lesson row by objective + stage, passes the canonical answer/rationale to the grader, computes MC correctness itself.

5. **Lessons are generated from a one-line title with no blueprint to stay inside.** Lesson prompts (`prompts.ts:173-175, 282-284`) send track, unit and objective titles only. `gate_description`, sibling objectives, `official_objectives_url`, `question_format`, `passing_score_policy`, `recommended_experience` are all in the DB and never reach a prompt or the client. The "stay inside the published blueprint" instruction (`prompts.ts:37-39`) has no blueprint attached; for NCLEX/AWS content this is the main hallucination surface, with no citation or post-generation check. Cheapest win: include the unit's objective list and gate text in both lesson prompts.

## Tier 2 -- learning engine gaps

6. **No unit check / mock exam.** `attempt_kind` has `unitcheck` and `quiz` (`001_init.sql:139`); `gate_description` is seeded on every unit; `mastery/route.ts` comments reference a unit-check screen that does not exist. No timed, mixed-domain, `exam_domains`-weighted run even though `credential_exams` stores `duration_minutes` and `question_format`. The single feature a cert-prep learner expects most.
7. **No adaptive path, no weak-spot targeting, no interleaving.** Sequencing is purely sort order (`prefetch-next/route.ts`). "Needs review" exists in rollups but nothing routes to it.
8. **Confidence is stored and never read** (`grading-service.ts:66`). Confident-and-wrong is the strongest cheap signal for review priority.
9. **Review schedule ignores time since last seen.** `error_log` only receives wrong answers; a correct-first-time objective is never scheduled. Fixed 1/7/21 regardless of how the review went; `next_review_at` computed in server-local time.
10. **`lab_prompt` is seeded (Security+) and never rendered.**
11. **Study sessions never end.** Nothing calls `PATCH /api/sessions`, so `ended_at` is always null; no time-on-task or streak.
12. **MC-only study reads as 0% mastery and 0% readiness** by design; no MC->open progression nudge beyond the done-screen sentence.

## Tier 3 -- AI coaching

13. **No learner state in chat or grading.** `chat/route.ts` sends the last 40 turns only; no mastery, error_log, recent attempts or open objective. Disputes go to chat (Haiku); even if the coach agrees, `attempts.verdict` and mastery are never corrected. No re-grade endpoint.
14. **No "explain differently" / hint ladder.** Only Regenerate, which (item 3) replaces the shared lesson.
15. **No streaming** anywhere; chat capped at 1200 output tokens.
16. **Distractor/position quality unchecked.** Schema enforces 4 choices but not distinctness; both prompt examples show `"fadeCorrectIndex": 0` (`prompts.ts:290,294`); the lesson screen does no shuffle. No duplicate-choice or answer-in-stem check.
17. **No AI observability.** `lib/anthropic.ts` discards `res.usage`; nothing records model, tokens, latency, stop_reason, or failed generations. `serverError` returns raw error text to the client. No per-user or global spend cap; rate limits exist only on grade/chat/pbq.
18. **No eval harness.** No golden objectives -> lessons set, no grader agreement check, no regression on prompt edits.

## Tier 4 -- content / catalog

19. **The original 9 tracks can never be verified.** `data.ts` sets no `sourceUrl`; `review-context/route.ts` selects `where st.source_url is not null`, so the quarterly agent skips them and they show "Unverified" permanently.
20. **Seed is keyed by `sort_order`, so inserting or removing an objective mid-unit silently re-labels existing ids.** `seed.ts:360-384` matches by position and updates titles in place, never deletes; mastery, attempts, error_log and `lesson_content` (never invalidated on title change) stay attached to the old id. Needed: stable per-objective keys in seed data plus cache invalidation on title change.
21. **User-created courses are empty shells.** `POST /api/courses` exists; no route adds units or objectives; no mobile UI calls it. `course_request` tickets land in `support_requests` with no admin route.
22. **No content versioning.** One `content_format`; `credential_exams` is versioned but a track points at one exam id with no migration path when an exam revises.
23. **Review agent findings are write-only.** `content_review_findings` has no reader.
24. **No learner-side content feedback.** No "report this question" tied to the `lesson_content` row.

## Tier 5 -- account / ops

25. **No product analytics/events.** Only `auth_events`, used for rate limiting, growing unbounded with no cleanup.
26. **GDPR export is partial.** Omits `support_requests`, `track_acknowledgements`, `auth_events`, OAuth links, MFA metadata; no record that a deletion happened.
27. **No admin surface** (support queue, findings, user lookup, AI spend).
28. **No reminders.** No `expo-notifications`, no email digest; the 1/7/21 schedule depends on opening the app that day.
29. **No goal/exam-date onboarding.**
30. **Tests/CI**: no route-level or DB tests, so items 4 and 20 would not be caught.

## Suggested first sprint (highest leverage per effort)

1. Server-side MC grading + canonical answer passed to the open grader (item 4).
2. Rate-limit and per-user budget on lesson POST and prefetch; stop regenerate overwriting the shared row (item 3).
3. Pass unit objectives + gate text into lesson prompts (item 5).
4. Log usage/latency/model per Anthropic call into a table (item 17).
5. Per-objective question bank with unseen-first selection (item 2), which makes spaced review a real retest and unlocks a mock exam (item 6).
6. Recency/stability term in `suggestStatus` plus confidence-weighted review priority (items 1, 8).
