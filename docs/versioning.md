# Versioning policy

REQ-300 (Nick, 2026-11-14). One app version, how it relates to the other
numbers the app and the server already exchange, how an old app is told to
update, and when to bump what. Most of this was already in the code
(REQ-146, REQ-175, REQ-177, REQ-199); this page names it in one place and
adds the pieces that were missing. Section 11 lists what is a decision for
Nick and what was not verified.

## 1. The numbers, at a glance

| Number | Looks like | Set where | Means | Who reads it |
|---|---|---|---|---|
| App version | `2.0.0` | `expo.version` in `mobile/app.json` (mirrored, section 2) | The product version learners and support talk about | Settings > About; the server (`X-Ascendra-App`); release notes |
| Build tag | `web`, `embedded`, `u.1a2b3c4d` | computed at launch (`mobile/src/lib/appVersion.ts` `buildTag`) | Which bundle: the web app, the code inside the store binary, or an over-the-air update | Sent after the `+` in `X-Ascendra-App`; support |
| Runtime version | a hash | `runtimeVersion.policy: "fingerprint"` in `app.json` | Which native binaries an over-the-air update can run on | Expo's update service only |
| Store build number | `versionCode` / `buildNumber` | EAS (`eas.json`: `appVersionSource: "remote"`, `autoIncrement`) | Which upload to a store this is | The stores |
| Client protocol | `3` | `CLIENT_PROTOCOL` in `mobile/src/api/client.ts`, read by `backend/lib/client-protocol.ts` | Which API behaviors the app understands (lab controls, lesson versions) | The server, per request (`X-Ascendra-Client`) |
| Terms version | `2026-11-14` | `TERMS_VERSION` in `mobile/src/lib/legal.ts`; `LEGAL_VERSIONS` in `backend/lib/legal.ts` | Which legal text a build shows | The server (`X-Ascendra-Legal`) |
| Release note id | `2026-11-12-d` | `backend/lib/release-notes.ts` | One "What's new" note; each learner's seen marker | The server and the app |
| Deployed backend | a commit SHA | Vercel (`VERCEL_GIT_COMMIT_SHA`) | Which backend code is live (`/api/health`, `/api/version`) | Ops |

Only the first is "the version". The others are separate on purpose: they
change for different reasons and at different speeds, and none is derived
from another. The backend has no semver of its own; its `package.json`
`version` is not read by anything and is not the app version.

## 2. One app version

`MAJOR.MINOR.PATCH`, plain digits, each part 0 to 9999 (that is all the
server accepts, `backend/lib/client-version.ts` `parseSemver`). No
pre-release suffix (`2.1.0-beta` is unreadable to the server and would be
told to update).

It is set in four places that a test keeps equal
(`mobile/src/lib/appVersion.test.ts`):

1. `mobile/app.json` `expo.version`: the source. The stores and Expo read it here.
2. `mobile/src/lib/appVersion.ts` `APP_VERSION`: what the running JavaScript
   knows, shown in Settings > About and sent on every request.
3. `mobile/package.json` `version`.
4. `mobile/package-lock.json`, both `version` and `packages[""].version`.

Change all four in one commit. The test names the one that differs. Nothing
else shows or sends a version: a screen shows `APP_VERSION`, never a second
source (FAIL-2040: Settings once read the native config with a `"1.0.0"`
fallback).

Every request carries `X-Ascendra-App: <version>+<build>` and
`X-Ascendra-Platform: ios | android | web` (native and web). A request
without the first is a "legacy" client: a build from before REQ-175 or a
direct call (webhooks, cron).

## 3. Expo runtime, over-the-air updates and store builds

The app ships in two layers.

- **The binary** (App Store, Play Store): native code, permissions, the
  Expo SDK and the native modules, and a first copy of the JavaScript.
- **The JavaScript bundle and assets**: can be replaced over the air
  (expo-updates, channel `production` or `preview`) on any binary with the
  same **runtime version**.

`runtimeVersion` uses the `fingerprint` policy: a hash of everything native
(native dependencies, config plugins, `app.json`, `eas.json`). Change
anything native and the hash changes, so installed binaries no longer match
and the new JavaScript can reach them only through a new store build.

| The change touches | Ships as | Notes |
|---|---|---|
| Screens, copy, logic, styles, images in `mobile/src` and `mobile/app` | Over-the-air update | Reaches installed binaries on the same runtime |
| The web app | A backend deploy (`backend/scripts/build-webapp.sh`) | A tab picks it up on reload (`mobile/src/lib/webVersion.ts`) |
| A native package, a config plugin, a permission, an icon or splash, `ios` or `android` blocks in `app.json`, `eas.json`, the Expo SDK | **Store build** | New runtime. Plan: `docs/next-store-build-plan.md` |
| Backend only (API, content, "What's new" text) | Backend deploy | Needs no app release and no app version change |

The "EAS update (OTA)" workflow (`.github/workflows/eas-update.yml`) is the
check: its dry run reports per platform whether any store build on the
channel has the runtime the current commit would have, and publishes only
to those. If none match it says a store build is needed. Run it before
deciding between an OTA and a store build.

How the app version relates to this: the version string is JavaScript
(`APP_VERSION`), so an OTA update can carry a newer one. A binary on an old
runtime stays on the version it was built with for good, because it never
receives the newer JavaScript. That is what makes the minimum version
(section 5) work: an old-runtime binary falls below it and is sent to the
store; a current-runtime binary below it fetches the update.

**The version and the runtime.** By default `expo.version` is part of the
fingerprint; `mobile/fingerprint.config.js` (REQ-302, shipped in the 2.1.0
store build) leaves it out, so from 2.1.0 on a version bump alone is an OTA
(verified 2026-11-17, section 11). Still run the workflow's dry run on the
bump commit and read its answer before publishing. Never run `eas build` or `eas submit` from an
agent session; Nick or the lead does.

## 4. The headers a request carries

Each is independent and answers a different question.

- **`X-Ascendra-App` (this policy): "which build is this?"** Used for the
  minimum-version gate (section 5) and to choose Terms behavior for builds
  from before the next header existed.
- **`X-Ascendra-Client` (protocol number):** "which API behaviors do you
  understand?" It only goes up, and is raised together with the server's own
  check (`backend/lib/client-protocol.ts`): protocol 1 fetches Solo choices
  from the hint route, 2 renders interactive lab controls, 3 shows beginner
  lesson versions. A missing or lower number is not refused; the server
  serves the older shape (a lab step with its options written out, the
  standard lesson). Raise it when the server must serve a newer app
  differently from an older one. Raising it is a **minor** version bump at
  least, in the release that first sends the new number.
- **`X-Ascendra-Legal` (Terms version):** "which legal text does your
  build carry?" A build declaring a version can accept exactly that
  version; an older build still installed can accept the text it shows.
  Bumping Terms, Privacy, Cookies or the study notice is a content change
  (`.ai/checklists/pre-completion.md`, protocol and legal version item:
  keep the old values in `PREVIOUS_LEGAL_VERSIONS`), not an app version
  event. The two move independently: a Terms bump does not need a new app
  version, and a new app version does not change what is accepted.
- **Other specific refusals.** A feature the old app cannot run answers
  with its own 4xx, not a version check: a sim whose engine is newer than
  the app's returns 409 `app_update_required` (`backend/lib/sims.ts`),
  and a missing agreement is 403 `terms_required`. These say "update" only
  for the one thing the learner tried; they do not lock the whole app.

## 5. The compatibility window and the update prompt

**The window** is "every app version from `MIN_APP_VERSION` upward". Nothing
below it is promised to work.

- `MIN_APP_VERSION` is a server environment variable (Vercel,
  `backend/.env.example`). Unset, empty or unreadable means no minimum, so
  a typo can never lock everyone out. It is read on each request; changing
  it needs a redeploy of the environment, not of the code.
- `backend/proxy.ts` checks every `/api/*` request that carries
  `X-Ascendra-App`. Below the minimum, or an unreadable value, the answer is
  **426** `{ code: "update_required", error, minVersion, storeUrl }` before
  any route runs. The store link is the Play Store page for Android, and for
  iOS `IOS_APP_STORE_URL` (an `https://apps.apple.com/` link; without it the
  iOS screen has no button).
- Requests without the header (legacy clients, webhooks, cron) are never
  version-checked: they cannot be told apart from server-to-server callers,
  and those builds cannot show the update screen anyway. Older builds are
  covered by the Terms and protocol rules above, which keep them working
  rather than blocking them.

**What the learner sees** (`mobile/src/components/UpdateRequired.tsx`,
`mobile/src/lib/updatePrompt.ts`; the screen covers the app when any request
gets the 426):

- **Web.** The tab reloads by itself to fetch the current bundle, unless the
  screen holds unsaved work (a lesson, an exam, a lab), at most once per
  bundle per 10 minutes so a misconfigured minimum cannot loop it
  (`mobile/src/lib/webVersion.ts`). Otherwise the screen says a newer
  version is available and offers "Reload". Separately, a tab compares its
  build id with `GET /api/version` on focus and every 10 minutes and offers
  "Reload" when a newer deploy exists.
- **Phone.** The screen first checks for an over-the-air update. If one
  exists it installs it and restarts, and the learner sees "Installing the
  update". If there is none, or updates are off (Expo Go, development
  builds), it says "You have version X; version Y or newer is needed." and
  opens the store ("Update Ascendra"). Without a store link it tells the
  learner to open their app store and offers "Check again".
- An update already downloaded in the background shows the quiet restart bar
  instead (`mobile/src/updates/useAppUpdates.ts`), and applies on its own
  only after five minutes away and never on a screen holding unsaved work
  (`mobile/src/updates/protectedRoutes.ts`).

**Raising the minimum** (an owner step, never part of an ordinary merge):

1. A build at or above the new minimum must be reachable by every learner
   below it: live in both stores, or published over the air to every runtime
   still installed. Check the stores, not the repo.
2. Prefer waiting. Suggested policy, for Nick to confirm: raise the minimum
   only after the replacement has been live in the stores for at least 30
   days, and announce a coming raise in a release note first.
3. Set `MIN_APP_VERSION` for Preview, test it with a request at the old and
   the new version (`curl -H 'X-Ascendra-App: 2.0.0+web'`), then Production.
4. To undo, unset it. That is the rollback.
5. Never set it above the newest version actually published: everyone would
   be told to update to something they cannot get. There is no automatic
   guard for this; it is step 1.

No per-version usage report exists today. Nothing in the code counts
`X-Ascendra-App` values, so "how many learners are still on 2.0.0" cannot be
answered from the repo. Until it can, keep the window generous.

## 6. When to bump

Bump only for a release a learner can install: a store build or an OTA
publish. A backend-only deploy does not change the app version.

- **Patch** (`2.0.0` to `2.0.1`): fixes and wording, a change to content or
  copy that lives in the app, dependency updates with no visible change.
- **Minor** (`2.0.0` to `2.1.0`): something learners can see or use that is
  new (a screen, a feature, a course type), a new client protocol number, a
  new native capability (that one is also a store build).
- **Major** (`2.0.0` to `3.0.0`): a break. Either the app can no longer talk
  to the older API (the window moves across it), or it is a redesign
  learners must relearn, or a change that discards what older builds stored
  on the device. A major is the only bump that normally comes with a raised
  `MIN_APP_VERSION`.

Rules that go with it:

- The bump goes in the same commit as the release (section 2: four files),
  never ahead of it. An OTA publish and a store build that carry the same
  JavaScript carry the same number.
- The number only goes up. A store build rejected in review keeps its number
  for the resubmission; use a patch bump only if the code changed.
- Today's baseline is `2.0.0`. `app.json` has said `2.0.0` since before the
  version header existed (git history), so every release note written
  before 2026-11-14 is given `2.0.0`; no earlier number is known.

## 7. Release notes and the CHANGELOG

- Every release note (`backend/lib/release-notes.ts`) has an `appVersion`:
  the app version when it shipped. The Release notes screen shows it as
  "Version 2.1.0" and so does the What's new dialog. A test
  (`backend/lib/release-notes.test.ts`) requires a plain `x.y.z`, never
  rising as notes get older, never above `mobile/app.json`'s version (so the
  bump comes first, or in the same change as the note).
- A backend-only release keeps the current app version on its note.
- `CHANGELOG.md` keeps `## Unreleased` for what is merged and not yet
  released. When a version is cut, the entries since the last cut move
  under a new heading `## <version> - <date>`, and `## Unreleased` stays
  above it, empty, for what comes next (sections are newest first). `backend/lib/ship-notes.test.ts` reads from `## Unreleased` down
  through the version sections until it reaches the REQ-228 entry, so the
  cut cannot lose a check.
- Entries stay tagged `(learner-facing)` or `(internal)`; a learner-facing
  one needs a What's new note or "No What's new: ..." (REQ-228,
  `.ai/playbooks/release.md`).

## 8. Tagging releases in git

Once a version is released, tag the commit it shipped from on `master`:

    git tag -a v2.1.0 <sha> -m "Ascendra 2.1.0"
    git push origin v2.1.0

`v` plus the app version, annotated, one tag per version, never moved. A
tag marks the release of an app version, not a backend deploy (the deployed
SHA is in `/api/health`). No tags exist yet; the first is `v2.0.0` on the
commit that shipped the first store build with `X-Ascendra-App`, which Nick
or the lead should name. Tags are created by the person releasing, not by
agent sessions.

## 9. Deprecation steps

For a behavior, endpoint or old-app accommodation that is to go away:

1. **Announce.** A release note says what changes and when, in plain words.
   Mark the code with the REQ and the removal condition (the way
   `PREVIOUS_LEGAL_VERSIONS` and the legacy-client rules are).
2. **Ship the replacement.** A version that has it must be installable
   everywhere learners are (section 5, step 1).
3. **Wait out the window.** Keep the old behavior until the oldest version
   you still promise to support no longer uses it. For a protocol number or
   a response shape that is until `MIN_APP_VERSION` passes the first
   version that sent the new one.
4. **Raise the minimum** if the old behavior cannot be kept for older builds
   (section 5), or leave older builds on the 4xx for that one feature
   (section 4, "Other specific refusals") if only one feature is affected.
5. **Remove** the old path, its tests and its docs in one change, and say so
   in the CHANGELOG. A bump of the major version marks a removal the window
   moved across.
6. Never remove, in the same change as their replacement, the legal version
   lists or the legacy-client rules; they have their own steps
   (`.ai/checklists/pre-completion.md`).

## 10. Where the code is

- App version, header, 426 reader: `mobile/src/lib/appVersion.ts`,
  `mobile/src/updates/appIdentity.ts`, `mobile/src/api/client.ts`.
- Update screen and its rules: `mobile/src/components/UpdateRequired.tsx`,
  `mobile/src/lib/updatePrompt.ts`, `mobile/src/lib/webVersion.ts`,
  `mobile/src/updates/useAppUpdates.ts`.
- Server gate: `backend/proxy.ts`, `backend/lib/client-version.ts`.
- Protocol and Terms headers: `backend/lib/client-protocol.ts`,
  `backend/lib/legal.ts`.
- Release notes: `backend/lib/release-notes.ts`, `mobile/app/(app)/release-notes.tsx`,
  `mobile/src/components/WhatsNew.tsx`.
- Tests: `mobile/src/lib/appVersion.test.ts`, `backend/lib/client-version.test.ts`,
  `backend/lib/release-notes.test.ts`, `backend/lib/ship-notes.test.ts`.

## 11. Decisions (Nick, 2026-11-14) and what is still open

- **`expo.version` is part of the runtime fingerprint by default.** Read in
  the installed `@expo/fingerprint` 0.20.15 (`build/sourcer/Expo.js`
  `normalizeExpoConfig`, `build/Options.js` defaults): `version`,
  `android.versionCode` and `ios.buildNumber` are hashed unless
  `SourceSkips.ExpoConfigVersions` is set, and the project set no config. So
  a bare version bump would change the runtime and strand installed apps'
  over-the-air updates. `mobile/fingerprint.config.js` skips them (approved);
  it changes the fingerprint once, so it ships with the next store build.
  **Verified 2026-11-17 (REQ-330)** by running the tool EAS uses,
  `npx expo-updates runtimeversion:resolve`, in a full clone of
  `release/store-2.1` with real node_modules (`@expo/fingerprint` 0.20.16;
  the app config now loads, and its `expoConfig` source is in the hash). With
  `fingerprint.config.js`, versions 2.0.0 and 2.1.0 give the same runtime
  (Android `77d87bb4`, iOS `f59c3258`) and the hashed config has no
  `version`; with the file removed, the version is hashed and 2.0.0 and 2.1.0
  give different runtimes on both platforms. From the 2.1.0 store build on, a
  version bump alone can ship over the air; anything native still cannot.
- **2.1.0 (REQ-330).** The store build that carries the file is version
  2.1.0 (section 6: a new native capability is a minor bump). Store build
  numbers stay with EAS (`appVersionSource: remote`, production
  `autoIncrement`); nothing in the repo sets them.
- **30 days in the stores before raising the minimum** (section 5): approved.
- **First tag:** `v2.0.0` on the production commit f4b9c645 (2026-11-14):
  approved. The cloud session can't create tags (its GitHub proxy refuses
  tag writes); create it from GitHub's Releases page or a local clone.
  It had not been created as of 2026-11-17 (`git ls-remote --tags origin`
  listed none). Create it before `v2.1.0`, then tag 2.1.0 on the master
  commit the 2.1.0 store build was made from (section 8), once the build is
  accepted in the stores.
- **iOS store link.** `IOS_APP_STORE_URL` is not set until the iOS app is in
  the App Store; the iOS update screen has no button until then.
