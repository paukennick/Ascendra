# Support and feedback process

How Ascendra handles what learners send in. Requests are stored in
`support_requests` and emailed to `SUPPORT_EMAIL` (falls back to
`EMAIL_FROM`) with the learner's address as reply-to.

## Kinds

| Kind | Sent from | Carries |
|---|---|---|
| `content_report` | "Report a problem with this lesson" on every lesson | objective ID, lesson step, reason, details |
| `ticket` | Support → Submit a ticket | subject, details, optional course |
| `course_request` | Support → Request a course | course name, optional source URL |

Each account can send 10 requests an hour.

## Triage order

1. **Lesson reports flagged "Unsafe or outdated clinical content"**, on any
   nursing, critical-care or physical therapy course. Same day.
2. **Account and security problems** (can't sign in, lost two-factor, data
   requests). Within 2 business days.
3. **Other lesson reports.** Within 5 business days.
4. **Tickets and course requests.** Within 10 business days.

[Response times are targets for the owner to confirm.]

## Fixing a reported lesson

1. Find the objective from the report's objective ID and check the claim
   against the course's cited sources (header of the course file in
   `backend/supabase/seed/tracks/`) and `docs/source-reliability-standard.md`.
2. If the lesson is wrong, back up and delete its `lesson_content` row; it
   regenerates on the next visit. If the **objective** is wrong, fix it in
   the course file in place (same unit and position; never reorder) and
   re-seed.
3. Set the request to `resolved` with an `admin_note` saying what changed,
   or `declined` with the reason. The learner sees both under Support.
4. If the same mistake could be in other lessons, search `lesson_content`
   for it and treat each the same way.

## Data and privacy requests

Learners can export or delete their own data in the app. For anything else
(correction, objection, a question about the Privacy Policy), reply within
30 days. Account deletion is immediate and also removes the sign-in log
(see `docs/legal/data-inventory.md`).
