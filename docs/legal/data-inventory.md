# Personal data inventory

What Ascendra stores about people, where it lives, how long it is kept, and
what account deletion and data export do with it. The Privacy Policy and the
Cookies page (`mobile/src/content/legal.ts`) are written from this table, so
**change this file and those pages together**.

Last checked against the code and the live database: 2026-11-04 (REQ-093).

## Database (Supabase, Postgres, region ca-central-1)

All tables have row-level security on and no access for Supabase's public
API roles (migration 026). Only the backend server reads and writes them.

| Table | What it holds | Why | Kept | Account deletion | In export |
|---|---|---|---|---|---|
| `app_users` | email, display name, password hash, profile photo, MFA settings and encrypted TOTP secret, the newest "What's new" note dismissed | account and sign-in | while account open | deleted | yes (profile; no secrets) |
| `oauth_accounts` | Google account ID and email | Google sign-in | while linked | deleted (cascade) | yes (provider, email) |
| `refresh_tokens` | session token hash, device label, user agent, IP address | keeping you signed in; session list | 30 days after the session ends (cron) | deleted (cascade) | yes (no hashes) |
| `auth_events` | event type, email or user ID as identifier, IP address | rate limits, security history | 90 days (cron) | **deleted explicitly** by `DELETE /api/account` (FK only nulls user_id, and the identifier is the email) | yes (type, IP, time) |
| `email_verification_tokens`, `password_reset_tokens`, `login_challenges` | token hashes, expiry; challenges also IP and user agent | one-time verification | 7 days after expiry (cron) | deleted (cascade) | no (secrets, short-lived) |
| `email_change_tokens` | token and cancel-link hashes, the requested new address, expiry, cancelled/used time | email change, and the "this wasn't me" cancel link sent to the old address | 30 days after expiry (cron; REQ-139, so the cancel link keeps working) | deleted (cascade) | no (secrets, short-lived) |
| `mfa_backup_codes` | hashed backup codes | two-factor recovery | while MFA on | deleted (cascade) | no (secrets) |
| `subject_tracks` (user-owned rows) | courses the user created | study | while account open | deleted (cascade) | yes |
| `course_favorites` | favourite courses | study | while account open | deleted (cascade) | yes |
| `mastery`, `attempts`, `error_log`, `study_sessions` | answers, scores, review schedule, session times | teaching and progress | while account open | deleted (cascade) | yes |
| `chat_messages` | AI coach messages and replies | coach history | while account open | deleted (cascade) | yes |
| `support_requests` | tickets, course requests, lesson reports (may name an objective and lesson step), coach-reply reports (quote the reply) | support and content fixes | while account open | deleted (cascade) | yes |
| `track_acknowledgements` | which course disclaimer version was accepted, when | history only since REQ-165 (the study notice is the gate now) | while account open | deleted (cascade) | yes |
| `legal_acceptances` | which Terms, Privacy and study-notice (REQ-165) versions were accepted, how and when | record of consent | while account open | deleted (cascade) | yes |
| `learner_intake`, `learner_intake_targets` (REQ-169) | study-profile answers: goal, experience, weekly study hours, what it's for (personal, work, teaching), up to five courses with exam dates | setting up the study plan; suggesting a plan and length (never a price) | while account open; editable in Settings > Study profile | deleted (cascade) | yes (`intake`, `intakeTargets`) |
| `email_preferences` (REQ-197, 063) | on/off for exam change notices, exam countdown, weekly digest | the learner's email choices | while account open | deleted (cascade) | yes |
| `service_email_log` (REQ-197, 063) | which service email kind was sent for which period (exam change, exam date, ISO week), status, tries, times; no address, subject or body | sending each at most once | while account open | deleted (cascade) | yes |

**Pending Privacy Policy change (REQ-197):** the two rows above, and the
service emails they support, are not yet described in
`mobile/src/content/legal.ts`, which still says email is account email
only. The cron that sends them stays off (`SERVICE_EMAILS_ENABLED`) until
that text is updated.

Shared, not personal: `lesson_content`, `pbq_scenarios`, catalog and taxonomy
tables, `content_review_findings`, `schema_migrations`.

## On the device

| Where | Key | What |
|---|---|---|
| iOS Keychain / Android Keystore (Expo SecureStore) | `ascendra_refresh_token` | sign-in token |
| same, biometric-protected | `ascendra_refresh_token_secure` | copy released only after a biometric or passcode check |
| same | `ascendra_biometric_enabled` | the biometric-unlock setting |
| Web: `sessionStorage` | same keys | cleared when the browser closes |

No cookies, analytics, crash reporting or advertising identifiers.

## Outside services (processors)

| Service | Receives | Notes |
|---|---|---|
| Supabase | the whole database | hosting |
| Vercel | all API traffic | hosting, United States (no region set in `vercel.json`, so Vercel's default US region; confirm in the project settings); request logs on Vercel's side |
| Anthropic API | coach messages and history (`/api/chat`), written answers for grading (`/api/grade`), pre-lesson guesses (`guess-feedback`), scenario answers (`/api/pbq`); lesson generation sends only course and objective titles | commercial terms: not used for training; deleted within 30 days unless kept for usage-policy enforcement or law (privacy.claude.com, checked 2026-11-04) |
| Resend | account email; support requests with the user's email as reply-to; from REQ-197 (once switched on) the service emails: exam change notices, exam countdown with readiness and weakest objectives, opt-in weekly digest | |
| Expo | app update requests from the mobile app | |
| Google | sign-in, only if chosen | |
| GitHub | the nightly backup (REQ-200): the whole database, encrypted with age; GitHub never has the key | Actions artifact, kept 30 days; the manifest (counts) is encrypted too, and the only plaintext beside the backup is a format number and two sha256 values |

## Retention jobs

`/api/cron/retention` (Vercel Cron, daily 08:15 UTC) runs
`lib/retention.ts`. It needs `CRON_SECRET` set on the Vercel project;
without it the route refuses every call, so nothing is purged.
`lib/retention.test.ts` fails if the periods drift from the Privacy Policy.

Release backups (REQ-168): a pre-release copy of production data taken
inside the database -- a table `public.backup_release_YYYYMMDD` or a schema
`backup_release_YYYYMMDD` -- is kept 30 days, then dropped within 7 days
after that by the weekly "Release backup housekeeping" GitHub workflow
(Tuesdays, 09:17 UTC). It is a copy of the tables above, so it holds the
same personal data, and an account deleted in the meantime stays in the
copy until it is dropped. The 2026-11-07 copy (schema
`backup_release_20261107`) is dropped by the run on 2026-12-08. The API
roles have no access to it.

Nightly backups (REQ-200): the "Nightly database backup" GitHub workflow
dumps the whole database every day, encrypts it with age to a key only the
owner holds, and keeps it as a workflow artifact for 30 days, after which
GitHub deletes it. Each backup holds the same personal data as the database,
so an account deleted today is still in the backups of the previous 30 days
until they expire; a restore from one must re-delete any account deleted
after that backup was taken. See operations-runbook.md "Backups".
