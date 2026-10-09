# Learner-side UX / navigation / logic review (2026-10-09)

Read-only review produced by a delegated review agent against master @ f8d9a15, after the 2026-10-08 sweep (REQ-073..085). Items shipped in that sweep are excluded. Paths are under `mobile/` unless noted. Each item: title, why it matters, refs, effort (S/M/L).

## A. Navigation

A1. No bottom tab bar; Review is unreachable except when something is due. Home/Explore/Review are top-level destinations but the only route into Review is Home's "Review due" card, which renders only when dueCount > 0 (`app/(app)/index.tsx:129-144`). The Sidebar has no Review entry (`src/components/Sidebar.tsx:123` is the only global link). The "All scheduled" filter on Review (`app/(app)/review.tsx:108`) is therefore invisible until a miss comes due. A 3-tab bar (Home / Explore / Review with due badge) replaces the "Browse all courses" pseudo-card (`index.tsx:146-159`), which is navigation chrome dressed as a card. Effort: M.

A2. Four different meanings of "review" are visible to a learner. "Review" screen = spaced-repetition queue; unit badge "N to review" = mastery status "Needs review" (`course/[trackId]/index.tsx:230-232`, `backend/lib/progress-sql.ts:43`); "Review unit" button = replay a finished unit (`index.tsx:270`); "Review due" badge on CourseCard = content-freshness status of the course (`src/components/CourseCard.tsx:14`). The last is the worst: a learner sees "Review due" on a course card and thinks they have homework. Rename freshness badges (e.g. "Verified / Check pending / Source unverified") and the mastery badge ("N weak"). Effort: S.

A3. Lesson "Back to course" pushes instead of popping. `lesson/[objectiveId].tsx:312` uses `router.push`, so after three lessons the stack is Course>Lesson>Course>Lesson>Course. Use `router.back()` when the previous route is the dashboard, or `dismissTo`. Effort: S.

A4. Home hero and Sidebar disagree about where "continue" lands. Home's "Continue studying" arrow goes to the dashboard (`index.tsx:124`), where the learner taps "Continue studying" again (`course/[trackId]/index.tsx:174-188`). Sidebar rows go through a ChoiceSheet straight into a lesson and never offer the dashboard (`Sidebar.tsx:94-96, 232-246`). The hero should go straight to the next objective with a secondary "Open course" link. Effort: S.

A5. Sidebar "Start from the beginning" does not start anything over. It opens unit 1 / objective 1 (`Sidebar.tsx:73-80`) with mastery intact. Rename to "Open first lesson" or actually offer a reset. Effort: S.

A6. Double titles on nearly every screen. Stack header shows the title; the body repeats it as an H1: dashboard (`course/[trackId]/index.tsx:124,152`); "Mastery" + "Mastery matrix" (`progress.tsx:33`, `_layout.tsx:28`); "History" + "Answer history" (`history.tsx:34`); "PBQ Simulator" + "PBQ simulator" (`pbq.tsx:108`); Home large title + H1 greeting + subtitle (`index.tsx:103-104`, `_layout.tsx:15`). Choose header or in-body, not both. Effort: S.

A7. Lesson error state is a dead end. `lesson/[objectiveId].tsx:152-158` renders only an ErrorBanner: no retry, no back. This is where a gated course's 403 lands when a learner arrives via Review's "Open lesson" or History before acknowledging the disclaimer (`backend/app/api/objectives/[id]/lesson/route.ts:67`; the gate UI lives only on the dashboard, `course/[trackId]/index.tsx:137-146`). Detect 403 and route to the dashboard gate; add Retry for everything else. Effort: S.

A8. Chat never surfaces a load failure. `chat.tsx:25-28` has no `.catch`, so a failed history fetch leaves the spinner forever while the input still works. Effort: S.

A9. Deep links into a lesson lose their context. The lesson relies on `unitId` and `objectiveTitle` route params (`lesson/[objectiveId].tsx:25-30`). A bare `/course/x/lesson/y` shows "Lesson" as the title and grades with `unitId` undefined, so the attempt and error_log row get `unit_id` null; Review then hides "Open lesson" (`review.tsx:144`; track_id is derived via the unit join in `backend/app/api/errors/route.ts:30-35`) and groups the card under "Other". The lesson GET should return the objective's title and unit. Effort: M.

A10. Per-course Review does not exist though the API supports it. `GET /api/errors` accepts `trackId` (`backend/app/api/errors/route.ts:14,21`) but the dashboard quick actions (`course/[trackId]/index.tsx:36-41`) and Sidebar never link to it, and the dashboard shows no due count. Add "Review (N due)" to quick actions. Effort: S.

A11. Header patterns differ per hub. Home: menu left, settings right (`index.tsx:87-90`). Dashboard: custom chevron + menu, no settings (`course/[trackId]/index.tsx:125-130`), which drops iOS's native back label and swipe. Keep the native back on the dashboard and put menu on the right until a tab bar exists. Effort: S.

## B. Logic / flow bugs and confusing states

B1. Peeking at a course makes it your "Continue studying" course. Opening a dashboard fires `POST /api/sessions` immediately (`course/[trackId]/index.tsx:69-71`), which sets `last_studied_at`, which drives Home's hero (`index.tsx:75-79`) and Sidebar's Recent. Start the session on first lesson open (or first graded attempt), not on dashboard mount. Effort: S.

B2. Any multiple-choice attempt demotes an Independent objective. `backend/lib/mastery.ts:72-74`: if lastFormat is "mc", status becomes Guided (correct) or Introduced (wrong), unconditionally. A learner at Independent who re-opens a lesson from Review and answers the fade MC correctly drops to Guided; Review's recommended path therefore lowers mastery. Make status monotonic for correct answers, or skip fade when the objective is already Independent. Effort: M.

B3. Duplicate Review cards for one objective. Every non-correct verdict inserts a new error_log row (`backend/lib/grading-service.ts:121-138`) with no check for an open row on the same objective; missing fade and solo in one sitting yields two near-identical cards. Upsert per (user, objective) or collapse in the UI. Effort: S.

B4. Confidence carries over from guided to solo. One `confidence` state is shared by both CheckStep instances (`lesson/[objectiveId].tsx:37, 250-251, 269-270`) and never reset between steps. Reset on step change. Effort: S.

B5. Solo step forgets the "free response" choice it just told you to make. After a correct MC on fade the copy says "Answer the solo check in free response" (`lesson:635-640`), but CheckStep's `mode` resets to "mc" on the new instance (`lesson:486`). Default solo to "open", or lift mode to the parent. Effort: S.

B6. "Regenerate lesson" has no busy state and no error handling. `lesson/[objectiveId].tsx:331-347` awaits a ~20s POST with the button enabled and no try/catch. Effort: S.

B7. Same progress bar, different meaning per screen. CourseCard and the dashboard hero fill with `percent_progress` (`CourseCard.tsx:61`, `course/[trackId]/index.tsx:163`), while the Mastery screen fills with `percent_complete` (`progress.tsx:40`). With value-based colour (`ui.tsx:414-418`) the same course reads green 80% on the card and amber 20% on Mastery. One metric on the bar, the other as a secondary number. Effort: S.

B8. No way to recover from a failed load except leaving the screen. ErrorBanner is text only (`ui.tsx:453-460`). Add an optional `onRetry` and wire it to each screen's `load()`. Effort: S.

B9. Pull-to-refresh only on Home. `Screen` is a plain ScrollView with no RefreshControl (`ui.tsx:39-49`). Review especially needs it. Effort: S.

B10. Study sessions are opened and never closed. `PATCH /api/sessions` is never invoked from the client, so `ended_at` is always null and study time / streaks can never be computed. Effort: M.

B11. Dead History filters. KINDS includes "unitcheck" and "lab" (`history.tsx:10`) and nothing produces either; chips render raw codes ("pbq", "mc"). Effort: S.

B12. Lesson loading is a 20-second spinner with no shape (`lesson:164`); same for PBQ generation (`pbq.tsx:136`). No skeleton, no time estimate, no cancel. Effort: S.

B13. Explore header is heavy: search + ~17 category chips wrapping to 3 rows + a second chip row, with "All" appearing twice (`explore.tsx:146,160`). Collapse freshness into a "Hide unverified" toggle; make categories a horizontal scroller. Effort: S.

B14. "Unverified" is shown but never explained (`CourseCard.tsx:12-16`). FAQ entry plus a tap on the badge. Effort: S.

B15. Account export shares raw JSON as a text message (`account.tsx:166-167`). Write a file and share that. Effort: S.

B16. Idle banner button is a no-op by design (`app/_layout.tsx:58-63`); relies on window listeners in `AuthContext.tsx:365-368`. Give it a real reset callback. Effort: S.

B17. Web layout has no max width (`ui.tsx:598`). Add maxWidth ~720 and center. Effort: S.

B18. Portrait-locked, including tablets (`app.json:12`); Sidebar's PANEL_WIDTH is computed once at module load (`Sidebar.tsx:16`). Effort: M.

B19. No font-scaling guards; fixed-width stepper items (`lesson:721`), quick-action columns (`course/[trackId]/index.tsx:192`), 11px labels clip at accessibility sizes. Effort: S.

B20. Header icon buttons have no accessibility labels (`ui.tsx:288-315`). Effort: S.

## C. High-value use cases not yet served

C1. Quick re-check from Review (flashcard mode). "Open lesson" replays four steps, two of which can demote (B2), to re-check one question. Serve the stored solo/fade question directly from the Review card, grade with stage "review", offer the full lesson only if missed again. Biggest lift for the spaced-review loop. Refs: `review.tsx:144-157`, lesson CheckStep 459-680. Effort: M.

C2. Exam date and plan. Readiness % exists (`src/lib/progress.ts`) but no target date, so it cannot say "on pace" or "N objectives/day". One field per favorite and one line of arithmetic on the dashboard hero. Effort: M.

C3. Per-domain weak spot ranked by exam impact. examReadiness already has weight × unmastered share per unit (`progress.ts:22-25`); surface the top 2-3 units by shortfall on the dashboard and sort Mastery by it (`progress.tsx:48`). Effort: S.

C4. Study time / streak. Blocked by B10. A quiet "3 days in a row · 42 min this week" line on Home. No flame. Effort: M.

C5. PBQ parity with lessons. No confidence picker on PBQ (`pbq.tsx:172-192`), past scenarios not tappable and show missed parts but not feedback (`pbq.tsx:219-232`), and a correct PBQ does not touch mastery (`grading-service.ts:71-72`) though it is the only Transfer-ready evidence the rubric describes (`mastery.ts:19`). Effort: M.

C6. Share progress. A single "readiness card" image from the dashboard. Low priority. Effort: M.

## D. Other

D1. Settings screen is correctly boring. `account.tsx:255-260` "Google · Connected · Disconnect" as a whole-row tap is the one ambiguous control.

D2. Lesson back-gesture mid-flow silently discards the step; dashboard "Continue" re-enters at guess. Persist step per objective for the session. Effort: S.

D3. Chat from the in-lesson follow-up posts without `unitId` (`lesson:561`) while "Ask the coach about this" passes it (`lesson:228-231`). Effort: S.

D4. Home empty state "tap Browse all courses above" sits directly under the Browse card. Redundant once a tab bar exists.

## Top 10 overall

1. B2 -- MC attempts demote Independent objectives; Review's recommended path lowers mastery. (M)
2. A1 -- Add a 3-tab bar; Review is otherwise unreachable until something is due. (M)
3. C1 -- Quick re-check from Review instead of replaying the whole lesson. (M)
4. B1 -- Opening a dashboard rewrites "Continue studying"; start sessions on study, not on view. (S)
5. A2 -- Four meanings of "review"; rename the freshness and mastery badges. (S)
6. A7 + A8 -- Lesson error dead end (incl. 403 gate) and chat's silent load failure. (S)
7. B7 -- One progress bar, two metrics; pick one and label the other. (S)
8. B4 + B5 -- Confidence bleeds into solo; solo forgets free-response mode. (S)
9. B3 -- Duplicate Review cards per objective. (S)
10. C3 -- Weak-spot ranking by exam weight on the dashboard; the math already exists. (S)

Cheap and visible honourable mentions: A3, A6, B8/B9, B17.
