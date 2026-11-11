# Next store build plan

REQ-197 (Nick, 2026-11-09). Push notifications, screen-capture blocking and
in-app voice input all change native code or config, so none of them can
ship as an over-the-air update. This is the plan for the next App Store and
Play Store build. Nothing here is built yet (status below, 2026-11-11).

What already shipped without a store build (REQ-197): study reminders that
name one due topic, scheduled as local notifications from
`GET /api/reminders/plan`; three service emails through Resend; and the
one-time "tap the mic on your keyboard" tip on long answer fields, which
uses the keyboard's own dictation.

## Status after releases 2026-11-10 and 2026-11-11

Nothing in sections 1 to 4 is built yet. What the two releases changed for
installed builds (the server side is live):

- **Terms version 2026-11-10 and the 16-or-older checkbox (REQ-205).**
  Older builds can still accept their own Terms text, but they cannot create
  a new account: the server requires the age confirmation they don't send.
  This is JavaScript only, so an OTA update to builds on the matching
  runtime fixes it; a binary on an older runtime needs this store build.
- **Paced sims (REQ-209, engine 1.1).** An older app is refused an open run
  on the new tamponade version (409 `app_update_required`). Also JavaScript
  only.
- **Mobile `npm audit` (REQ-207).** Three high findings need an Expo SDK
  step (`mobile/audit-known.json`). An SDK upgrade changes the runtime, so
  fold it into this build rather than a separate one.
- **Policy (section 5).** The 2026-11-10 Privacy text covers the backups,
  GitHub, Sentry and deletion, but a search of `mobile/src/content/legal.ts`
  found no mention of the service emails (exam change notices, exam
  countdown, weekly digest), so `SERVICE_EMAILS_ENABLED` stays off and
  section 5 still stands.

Not recorded anywhere this plan could check: whether an OTA update carrying
the 2026-11-10/11 app code has been published, and which runtime the
builds in the stores are on. The "EAS update (OTA)" workflow (REQ-176, dry
run by default) reports per platform whether a store build can take the
current commit; run it before deciding between an OTA update and waiting
for this build.

## Why a store build

`mobile/app.json` sets `runtimeVersion.policy` to `fingerprint`. Anything
below changes the native fingerprint (new config plugin settings, a new
native module, new entitlements or permissions), so the next OTA update
would get a new runtime version and old binaries would stop receiving
updates. These items have to go out together in one binary, followed by an
update-required prompt for older builds (`UpdateRequired.tsx`) only if the
server starts depending on them.

## 1. Push notifications (Expo push via FCM and APNs)

**What it is.** Server-sent notifications for things the phone cannot
know on its own: an exam outline change, a new sign-in on the account, and
a review nudge after several days away.

**Config and fingerprint changes.**
- Android: a Firebase project for `com.hel1x.ascendra`, the FCM V1 service
  account key uploaded to EAS (`eas credentials`), and
  `android.googleServicesFile` in `app.json`.
- iOS: an APNs key in EAS credentials; the `aps-environment` entitlement
  added by the `expo-notifications` plugin on build.
- `expo-notifications` is already a plugin (local reminders); push adds
  the files above and the entitlement, which is what moves the fingerprint.

**Token storage and consent.**
- Ask for push only when the learner turns a push category on in
  Settings, never at launch. Without a yes, no token is requested.
- New table (next free migration number): `push_tokens` (`user_id` on
  delete cascade, Expo token, platform, created, last seen, revoked). One
  row per device; revoked on sign-out, on `DeviceNotRegistered` receipts
  and when the learner turns every push category off.
- In the account export (tokens redacted to platform and dates) and
  probed in `lib/schema-status.ts`.

**Categories, each with its own switch** (a `push_preferences` row,
same shape as `email_preferences`):
- Exam changes: the same event as the exam change email, once per change.
- Security sign-in alerts: a new device signed in. Default on once push is
  allowed, since it protects the account.
- Review nudge after several days away: only when something is due and the
  learner has not opened the app for N days (start at 4). Same wording rules
  as local reminders: names one topic, no "fading", no percentage, no streak
  or guilt copy; same "Show topic on lock screen" setting.

**Limits.** Quiet hours from the reminder settings (moved server-side for
push, since the server sends), and at most one push a day across all
categories, with security alerts the only exception. A local reminder and a
review push never land on the same day: the phone reports which days it has
scheduled, or push takes over the review reminder entirely when enabled.

**Server sender, receipts and tests.**
- `lib/push.ts` with a mockable transport like `lib/email.ts`; sends in
  batches of 100 through the Expo push API with an access token
  (`EXPO_ACCESS_TOKEN`), records tickets, then a cron fetches receipts
  15+ minutes later and revokes dead tokens.
- Idempotent per user, category and period (a `push_log` with the same
  unique key pattern as `service_email_log`).
- Tests: copy (no guilt, length limits), quiet hours and the daily cap,
  idempotency under overlapping runs, receipt handling, token revocation at
  sign-out, and export and deletion.

**Policy and store listings.** Bundle with the next policy change (the
service-email update already pending, see below), not a separate one:
- Privacy Policy: push tokens and categories, that Expo and
  Google/Apple deliver them, retention of tokens.
- Play data-safety form: "Device or other IDs" (push token) collected,
  for app functionality, not shared; update the App Store privacy labels
  the same way.

## 2. Android screen-capture blocking

Branch `security/screen-capture` (REQ-193) is not merged. It needs a native
module or config change (`FLAG_SECURE`), so it rides this build. Merge it
into the store build branch, confirm which screens it covers (sign-in, MFA
codes, backup codes, exam questions), and check it does not block the
learner's own accessibility tools. Its own tests and REQ-193's acceptance
criteria decide readiness.

## 3. In-app mic button (on-device speech recognition)

**What it is.** A mic button on the long answer fields (labs, explain-it-back,
coach) that dictates into the field, for learners whose keyboard has no mic
or who want it inside the app.

- On-device recognition only (iOS `SFSpeechRecognizer` with
  `requiresOnDeviceRecognition`, Android `SpeechRecognizer` with
  `EXTRA_PREFER_OFFLINE`), through a maintained Expo module. If on-device
  recognition is unavailable for the language, the button is hidden, not
  switched to a cloud service.
- **No audio is stored or sent.** Only the transcript reaches the app.
  Cloud transcription is out of scope.
- The transcript lands in the field as editable text. Nothing is
  submitted until the learner presses the existing send button.
- Permissions: microphone (`microphonePermission` is currently `false` in
  the `expo-image-picker` plugin config; the new module adds its own), and
  iOS `NSSpeechRecognitionUsageDescription`. Asked on first tap, never at
  launch.
- Grading: answers that came from dictation are marked (`input_mode:
  "dictated"` on the attempt) and the grader is told to be lenient on
  spelling and homophones for them, never on substance. Tests show a
  dictated answer with a homophone ("cache" heard as "cash") gets the same
  verdict as the typed one.
- The current text limits stay as they are: fields take everything and
  hold the send when over, so a long dictation is never cut.

## 4. Lessons read aloud (text-to-speech)

A "Listen" control on lesson steps using the device's built-in voices
(`expo-speech`), on device, no audio sent anywhere. Reads the lesson text
only (skips code blocks and tables, or announces them). Pauses when the app
backgrounds. Respects the system speech rate. `expo-speech` is a native
module, so it belongs in this build.

## 5. Policy changes to bundle

One Privacy Policy and Play data-safety update, shipped with this build:
- service emails (REQ-197, already built, waiting on this text before
  `SERVICE_EMAILS_ENABLED` is turned on);
- push tokens and categories;
- microphone and speech recognition, stating that audio stays on the
  device and only text is kept;
- `docs/legal/data-inventory.md` updated in the same change.

## Out of scope

Cloud speech-to-text, marketing push, and any push or reminder copy that
mentions streaks.

## Order

1. Policy text drafted and reviewed (unblocks the service emails too).
2. Push config, `push_tokens` and preferences migration, sender, receipts
   cron, tests.
3. Merge `security/screen-capture`.
4. Mic button and dictated-answer grading.
5. Text-to-speech.
6. Store build, internal testing track and TestFlight, then release with
   the policy update live the same day.
