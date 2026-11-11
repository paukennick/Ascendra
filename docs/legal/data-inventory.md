# Personal data inventory

What Ascendra stores about people, where it lives, how long it is kept, and
what account deletion and data export do with it. The Privacy Policy, the
delete-account page (`backend/app/delete-account/page.tsx`) and the Cookies
page (`mobile/src/content/legal.ts`) are written from this table, so **change
this file and those pages together**.

Rebuilt 2026-11-09 (REQ-205) from the table list of a database with every
migration applied (migrations 001-070) and the foreign keys into `app_users`,
not from memory: every table with a `user_id` column or a foreign key into
`app_users` is below, and `lib/legal-privacy-f4.dbtest.ts` fails when a new one
is missing from this file. Regenerate the list with:

```sql
select c.relname, string_agg(distinct a.attname || ':' || con.confdeltype, ',') as fk_to_app_users
  from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join pg_constraint con on con.conrelid = c.oid and con.contype = 'f' and con.confrelid = 'app_users'::regclass
  left join pg_attribute a on a.attrelid = c.oid and a.attnum = any (con.conkey)
 where c.relkind = 'r' group by 1 order by 1;   -- c = cascade, n = set null
```

## Database (Supabase, Postgres, region ca-central-1)

All tables have row-level security on and no access for Supabase's public
API roles (migration 026). Only the backend server reads and writes them.

"Account deletion" is `DELETE /api/account`: one transaction that purges the
sign-in log (`lib/auth/retention.ts`), erases report notes and their copies in
the content review queue (`lib/report-notes.ts`), then deletes the `app_users`
row, which cascades. "cascade" below means deleted by that; "set null" means the
row stays with its user link removed (and is listed under Kept after deletion).

### Account and sign-in

| Table | What it holds | Why | Kept while open | Kept after deletion | In export |
|---|---|---|---|---|---|
| `app_users` | email, display name, password hash, profile photo (small JPEG), MFA settings and encrypted TOTP secret, the newest "What's new" note dismissed, the age confirmation (`age_confirmed_at`, `age_confirmed_min`; no date of birth) | account and sign-in | while account open | nothing (row deleted) | yes (profile incl. photo and age confirmation; no secrets) |
| `oauth_accounts` | Google account ID and email | Google sign-in | while linked | nothing (cascade) | yes (provider, email) |
| `refresh_tokens` | session token hash, device label, user agent, IP address | keeping you signed in; session list | 30 days after the session ends (cron) | nothing (cascade) | yes (no hashes) |
| `auth_events` | event type, email or user ID as identifier, IP address | rate limits, security history | 90 days (cron) | nothing: **deleted explicitly** by `DELETE /api/account` (the FK only nulls `user_id`, and the identifier is the email) | yes (type, IP, time; rows by address only since the account was created) |
| `email_verification_tokens`, `password_reset_tokens`, `login_challenges` | token hashes, expiry; challenges also IP and user agent | one-time verification | 7 days after expiry (cron) | nothing (cascade) | no (secrets, short-lived) |
| `email_change_tokens` | token and cancel-link hashes, the requested new address, expiry, cancelled/used time | email change, and the "this wasn't me" cancel link to the old address | 30 days after expiry (cron; REQ-139) | nothing (cascade) | no (secrets, short-lived) |
| `mfa_backup_codes` | hashed backup codes | two-factor recovery | while MFA on | nothing (cascade) | no (secrets) |
| `legal_acceptances` | which Terms, Privacy and study-notice versions were accepted, how and when | record of consent | while account open | nothing (cascade) | yes |
| `track_acknowledgements`, `lab_disclaimer_acknowledgements` | which course / lab disclaimer version was accepted, when | history only since REQ-165 (the study notice is the gate) | while account open | nothing (cascade) | yes |
| `account_access`, `account_access_events` | an email address given unrestricted access (even before an account uses it), who gave it, dates, a note; the audit trail of grants and changes | owner-granted access | while account open | nothing for a claimed grant (cascade on `user_id`); `granted_by` / `revoked_by` / `actor_id` of other accounts are set null | yes (giver named, not their address) |
| `email_preferences`, `service_email_log` | on/off for exam change notices, exam countdown, weekly digest; which service email kind was sent for which period (no address, subject or body) | the learner's email choices; sending each at most once | while account open | nothing (cascade) | yes |

### Study

| Table | What it holds | Why | Kept while open | Kept after deletion | In export |
|---|---|---|---|---|---|
| `subject_tracks` (user-owned rows) | courses the user created | study | while account open | nothing (cascade) | yes |
| `course_favorites`, `free_course_choice`, `allowance_uses` | favourite courses; the one free course chosen; counted uses of a plan allowance | study, plan limits | while account open | nothing (cascade) | yes |
| `mastery`, `attempts`, `error_log`, `study_sessions`, `learner_term_coverage`, `learner_misconceptions`, `prerequisite_refreshers` | answers (the text typed), scores, review schedule, mistakes, session times, terms covered | teaching and progress | while account open | nothing (cascade) | yes |
| `review_schedule`, `review_log`, `review_sessions`, `review_session_items` | the review loop and each session's questions and answers | spaced review | while account open | nothing (cascade; items via their session) | yes |
| `exam_sessions`, `exam_session_items`, `exam_outcomes` | practice exams and each saved answer; an exam result the learner reported | practice, readiness | while account open | nothing (cascade) | yes |
| `study_plans`, `placement_checks`, `placement_items`, `coach_quiz_turns` | study plans, placement checks with answered items, Quiz me turns | planning and coaching | while account open | nothing (cascade) | yes |
| `lesson_progress`, `lesson_progress_tombstones`, `lesson_hint_reveals` | place in a lesson; when a lesson step was finished or cleared; which Solo choices were revealed | resume across devices | while account open | nothing (cascade) | yes |
| `learner_events`, `learner_onboarding` | learning milestones (no answer text); first-run state | checking Ascendra helps people learn | while account open | nothing (cascade) | yes |
| `learner_intake`, `learner_intake_targets` (REQ-169) | study-profile answers: goal, experience, weekly hours, what it's for, up to five courses with exam dates | setting up the study plan | while account open | nothing (cascade) | yes |
| `lab_runs`, `lab_run_steps` | lab runs and every graded step with the learner's answers | labs | while account open | nothing (cascade) | yes |
| `sim_runs`, `sim_run_commands`, `sim_run_reasoning` | sim runs, every command sent, written reasoning with its grade | sims | while account open | nothing (cascade; commands via their run) | yes |
| `chat_messages` | AI coach messages and replies | coach history | while account open | nothing (cascade) | yes |
| `support_requests` | tickets, course requests, lesson reports (may name an objective and step), coach-reply reports (quote the reply) | support and content fixes | while account open | nothing (cascade) | yes |
| `lesson_content_overrides`, `grading_claims`, `pbq_generation_claims` | a learner's generated lesson variant; seconds- to minutes-long leases | generation and grading | lease: minutes; override: while account open | nothing (cascade) | no (generated text, not learner input; no content) |
| `mastery_backup_029`, `mastery_backup_031`, `mastery_backup_041`, `mastery_backup_045`, `mastery_backup_074`, `error_log_backup_029` | rollback copies of mastery and error-log rows taken by older migrations | undoing those migrations | dropped after 30 days where they were kept | nothing (cascade) | no (rollback backups) |

### Plans, payments, discounts

| Table | What it holds | Why | Kept while open | Kept after deletion | In export |
|---|---|---|---|---|---|
| `entitlements` | plans paid for or given (tier, scope, source, product, period, store) | what the learner may use | while account open | nothing (cascade) | yes |
| `billing_events` | payment events received (provider, event id, type, times, outcome, detail) | accounting | no rows exist: paid plans are not switched on | **kept, `user_id` set null** (the record that a payment event happened, for accounting; **no retention period is set** -- decide one before payments launch) | yes (no detail) |
| `verified_discounts`, `discount_offer_codes` | the result of a verified group discount (group, provider, dates, the provider's reference); App Store offer codes issued to the account | verified discounts | while account open | `verified_discounts`: nothing (cascade). `discount_offer_codes`: the code stays with `issued_to` set null | yes |

### Kept after deletion, unlinked from the person

| Table | What it holds | Kept | Why |
|---|---|---|---|
| `ai_calls` | one row per model request: feature, model, token counts, latency, ok, error code; **no text**, `user_id` set null on deletion | **12 months** after the request, then deleted by the daily retention job (`lib/retention.ts`, `RETENTION.aiCallsMonths`) -- for open accounts too | cost and reliability; the Privacy Policy section 5 and 6 |
| `item_flags` | a "Report a problem" report: item, question, reason, date; **`note` erased on deletion**; `user_id` set null | no end date | a fix is not lost; holds nothing about the person once the note is gone. A `recheck_detail` / `context` column is machine data, not the learner's words |
| `content_review_queue` | a flagged item and its evidence: counts, rates, windows, and up to three **`recentNotes`** copied from reports | while the item is queued or on record | review work; **the deleted learner's notes are removed from `evidence.recentNotes`** (`lib/report-notes.ts`) |

### Shared, not personal

`lesson_content`, `pbq_scenarios`, `coach_quiz_items`, `exam_items`,
`review_items`, `discrimination_items`, `unit_check_items`, `labs`,
`lab_report_questions`, `sims`, `sim_versions`, `sim_reviews`, `item_status`,
`item_holdbacks`, `item_quality_params`, `learned_set_attempts`, `concept_sets`,
`concept_set_members`, `objectives`, `objective_prerequisites`,
`objective_terms`, `course_units`, `exam_domains`, `exam_objectives`,
`credentials`, `credential_exams`, `credential_providers`,
`assessment_types`, `education_categories`, `education_subcategories`,
`course_insights`, `content_review_findings`, `exec_checks`, `exec_check_runs`,
`lesson_generation_claims`, `mastery_model_params`, `schema_migrations`. They
hold catalog, generated and reviewer text (for example `labs.review_note`,
`item_status.resolved_note`), none of it from a learner.

## On the device

| Where | Key | What |
|---|---|---|
| iOS Keychain / Android Keystore (Expo SecureStore) | `ascendra_refresh_token` | sign-in token |
| same, biometric-protected | `ascendra_refresh_token_secure` | copy released only after a biometric or passcode check |
| same | `ascendra_biometric_enabled` | the biometric-unlock setting |
| Web: `sessionStorage` | same keys | cleared when the browser closes |

No cookies, analytics, in-app crash reporting or advertising identifiers (server-side error reports: see Sentry below).

## Outside services (processors)

| Service | Receives | Notes |
|---|---|---|
| Supabase | the whole database | hosting, Canada |
| Vercel | all API traffic | hosting, United States (no region set in `vercel.json`, so Vercel's default US region; confirm in the project settings); request logs on Vercel's side |
| Anthropic API | coach messages and history (`/api/chat`), written answers for grading (`/api/grade`), pre-lesson guesses (`guess-feedback`), explain-it-back, lab reports and lab step answers, scenario answers (`/api/pbq`), written review answers, unit-check answers, sim reasoning; lesson generation sends only course and objective titles | commercial terms: not used for training; deleted within 30 days unless kept for usage-policy enforcement or law (privacy.claude.com, checked 2026-11-04). Every route above requires the study notice on the server (REQ-205) |
| Resend | account email; support requests with the user's email as reply-to; from REQ-197 (once switched on) the service emails; **inbound (REQ-205): mail sent to the support address**, which Resend receives and passes to `/api/inbound/email` | Resend keeps received messages under its own schedule |
| Google | sign-in, only if chosen; **the mailbox behind `SUPPORT_FORWARD_TO`** if it is a Gmail address (the support inbox) | the inbox holds the email people sent to the support address and the support notifications, with no fixed retention period |
| Expo | app update requests from the mobile app | |
| GitHub | the nightly backup (REQ-200): the whole database, encrypted with age; GitHub never has the key | Actions artifact, kept 30 days; the manifest (counts) is encrypted too, and the only plaintext beside the backup is a format number and two sha256 values |
| **Sentry (conditional)** | **only when `ERROR_TRACKER_DSN` is set** (`lib/error-tracker.ts`): the error's name, message (500 characters), stack, request id, route, environment. Never request bodies, headers, tokens, or the learner's id | Nick plans to turn it on, so the Privacy Policy lists Sentry as a processor (section 4) and the delete-account page says its reports follow Sentry's own schedule. If it is never turned on, remove those lines in the same change. An error message can include a fragment of the data being handled. Set the project's retention in Sentry to what you want to stand behind |

## Retention jobs

`/api/cron/retention` (Vercel Cron, daily 08:15 UTC) runs
`lib/retention.ts`. It needs `CRON_SECRET` set on the Vercel project;
without it the route refuses every call, so nothing is purged.
`lib/retention.test.ts` fails if the periods drift from the Privacy Policy.
It purges: `auth_events` 90 days, ended `refresh_tokens` 30 days, one-time
tokens and challenges 7 days after expiry, `email_change_tokens` 30 days after
expiry, and (REQ-205) `ai_calls` 12 months after the request.

Release backups (REQ-168): a pre-release copy of production data taken
inside the database -- a table `public.backup_release_YYYYMMDD` or a schema
`backup_release_YYYYMMDD` -- is kept 30 days, then dropped within 7 days
after that by the weekly "Release backup housekeeping" GitHub workflow
(Tuesdays, 09:17 UTC), so **never more than 37 days**. It is a copy of the
tables above, so it holds the same personal data, and an account deleted in
the meantime stays in the copy until it is dropped. The 2026-11-07 copy
(schema `backup_release_20261107`) is dropped by the run on 2026-12-08. The API
roles have no access to it.

Nightly backups (REQ-200): the "Nightly database backup" GitHub workflow
dumps the whole database every day, encrypts it with age to a key only the
owner holds, and keeps it as a workflow artifact for 30 days, after which
GitHub deletes it. Each backup holds the same personal data as the database,
so an account deleted today is still in the backups of the previous 30 days
until they expire; a restore from one must re-delete any account deleted
after that backup was taken. See operations-runbook.md "Backups".

