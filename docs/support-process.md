# Support and feedback process

How Ascendra handles what learners send in. Requests are stored in
`support_requests` and emailed to `SUPPORT_EMAIL` (falls back to
`EMAIL_FROM`) with the learner's address as reply-to.

## Kinds

| Kind | Sent from | Carries |
|---|---|---|
| `content_report` | "Report a problem with this lesson" on every lesson | objective ID, lesson step, reason, details |
| `ticket` | Support → Submit a ticket; also "Report this reply" under a coach reply (REQ-165), with the subject "Coach reply report: <reason>" and the reply in the body | subject, details, optional course |
| `course_request` | Support → Request a course | course name, optional source URL |

Each account can send 10 requests an hour.

Two more ways in, outside `support_requests` (REQ-228: added to this page,
which predated them):

- **"Report a problem with this question"** under an answered question
  (REQ-114) goes to `POST /api/items/report`, is stored in `item_flags`, and
  reaches a person through the content review queue (`docs/content-review.md`).
- **Email to the public support address** (REQ-205, `lib/inbound-email.ts`):
  Resend receives it and posts a signed webhook to `/api/inbound/email`, which
  forwards the message as plain text to `SUPPORT_FORWARD_TO`. Each delivery is
  forwarded once (its `svix-id` is recorded in `inbound_email_events`,
  REQ-219); a failed forward can still be retried by Resend.

## Triage order

1. **Lesson reports flagged "Unsafe or outdated clinical content"**, on any
   nursing, critical-care, emergency medical services, physical therapy or
   mental health course. Same day.
2. **Account and security problems** (can't sign in, lost two-factor, data
   requests). Within 2 business days.
3. **Other lesson reports.** Within 5 business days.
4. **Tickets and course requests.** Within 10 business days.

[Response times are targets for the owner to confirm.]

## Fixing a reported lesson

1. Find the objective from the report's objective ID and check the claim
   against the course's cited sources (header of the course file in
   `backend/supabase/seed/tracks/`) and `docs/source-reliability-standard.md`.
2. If the lesson is wrong, fix it through `npm run lessons:fix` (the
   "Lesson fixes" workflow against production; `lib/lesson-fixes.ts`,
   REQ-187), never ad-hoc SQL: `void` confirms its checks wrong (answers
   graded against them are voided and mastery recomputed) and the next visit
   writes a replacement through the checked pipeline. If the **objective** is
   wrong, fix it in the course file in place (same unit and position; never
   reorder) and re-seed.
3. Set the request to `resolved` with an `admin_note` saying what changed,
   or `declined` with the reason. The learner sees both under Support.
4. If the same mistake could be in other lessons, search `lesson_content`
   for it and treat each the same way.

## Data and privacy requests

Learners can export or delete their own data in the app. For anything else
(correction, objection, a question about the Privacy Policy), reply within
30 days. Account deletion is immediate and also removes the sign-in log
(see `docs/legal/data-inventory.md`).
