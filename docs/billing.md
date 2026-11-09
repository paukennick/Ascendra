# Paid plans and payments (REQ-122, REQ-124)

Ascendra has three plans -- Free, Plus and Pro -- fully built and **off**.
One server setting, `BILLING_ENABLED`, turns them on. Until then every
learner is treated as Pro, the app shows no plan, price or upgrade prompt
anywhere, and nothing behaves differently from before (the $0.50 daily AI
budget still applies to everyone as the abuse guard).

The app asks the server at run time (`GET /api/billing/config`), so once a
store build with this code is installed, turning plans on needs **no app
update** -- only the backend setting. While the switch is off that route
answers only `{ "enabled": false }`: no tiers, prices or product ids are
public before launch. To check the config before switching on, run
`npm run billing:config` (below).

Nick's decisions of 2026-11-07 (REQ-124) are applied throughout this page:
the launch comp, Pro's coach allowance, readiness on Plus, downgrades that
keep the paid period, the hidden config, labs on Pro with a sample per
course, and lab reports and explain-back counted as graded answers.

## What each plan includes

| | Free | Plus | Pro |
|---|---|---|---|
| Courses | one, of the learner's choosing | every course | every course |
| Lessons, multiple-choice checks, spaced review, placement, progress | yes | yes | yes |
| AI grading of typed answers | 3 a day (a taste) | every one | every one |
| Explain-it-back, unit checks, comparison cards, Quiz me | no | yes | yes |
| AI coach | no | about 20 messages a day | about 60 messages a day |
| New lesson versions (regenerate) | no | 5 a week | 15 a week |
| Mock exams | no | 1 a month | unlimited |
| Readiness score | "Readiness: unconfirmed -- prove it with typed answers in Plus" | yes | yes |
| Hands-on labs (build, case and the CompTIA self-reported ones) | one sample lab per course | one sample lab per course | every lab |
| Scenario questions (PBQs) | no | no | yes |

Explain-it-back answers and lab reports count against the same daily
allowance as graded typed answers (Free's three a day; Plus and Pro have no
count unless one is configured). On Free a sample lab's graded steps count
there too. The coach allowances are daily counts **and** stay under the
monthly AI cap.

Free's ceiling is honest rather than locked: without graded typed answers,
levels go up to Guided (a Solo answer picked from shown choices counts as
assisted under the existing mastery rule). The app says "prove it with typed
answers in Plus" in one line on the plans screen and the free-course screen,
never as a padlock on every screen. Screens that only show something (the
lab card, explain-it-back's status, the unit check status, comparison
cards, the readiness score, a lab outside the plan in the labs list) say
it's part of a plan instead of erroring; an
action that needs a plan gets one gentle sheet with the reason and "See
plans".

Sprints (short timed practice) are open on every plan; only full mock exams
are counted and gated. The study plan is open on every plan. There is no
exam-day plan yet, so it has no feature key (a key is added when the
feature exists).

### Labs on each plan

Labs are Pro (`labs` feature, `LABS_FEATURE` in `backend/lib/labs.ts`).
Free and Plus learners get **one sample lab per course**: the first
**approved** build or case lab in course order (unit, objective, then kind
and title), labelled "Sample lab" in the list and on the lab screen. The
other labs are listed with "Part of Pro" and open the upgrade sheet. An
unreviewed lab is never the sample. Free's sample is in their one free
course. A run already started (for example before a downgrade) can always
be read and finished. With the switch off every learner has every lab.

### Downgrades and cancellations

Moving to a lower plan (Pro to Plus) or cancelling keeps the current plan
until the end of the billing period already paid for; the lower tier
applies only from then. Upgrades apply at once.

- **Stripe**: a `customer.subscription.updated` that lowers the tier while
  the higher one is paid up keeps that paid period as a separate "held"
  entitlement (`external_id` `held:<subscription id>`, status `canceled`,
  `period_end` the paid period's end) and moves the subscription's own row
  to the new tier. `cancel_at_period_end` keeps access to the period end. A
  subscription **deleted** at once (portal or dashboard) with paid time
  left keeps access to its period end; one deleted for non-payment or a
  dispute (`cancellation_details.reason`) ends now. Subscription schedules
  change the price at the period end, so their `subscription.updated`
  arrives when the period is over and nothing is held.
- **RevenueCat**: the App Store applies a downgrade at the next renewal by
  itself; on Google Play the app asks for a DEFERRED replacement on a
  downgrade and an immediate (time-prorated) one on an upgrade
  (`mobile/src/billing/purchases.ts`, `googlePlanChange` in
  `src/lib/billing.ts`). Whichever way a lower product lands on the
  subscription's row early, the paid higher tier is held to its end.
- **Out of order**: a higher-tier event delivered after a newer lower-tier
  one is stale for the subscription's row, but its paid period is still
  held, so delivery order doesn't change the result.
- A refund or revocation ends the held period as well. The 24-hour grace
  window applies to held periods like any paid period.
- `GET /api/billing/me` shows `entitlement.next = { tier, from }` and the
  app says "Pro until Dec 1, then Plus".
- **An attempt in progress may be finished** when the period ends: a mock
  exam is gated only when it starts; a lab run already open can be read and
  finished; a PBQ answer to a scenario already on screen is accepted for 24
  hours after access ended (`FINISH_IN_PROGRESS_HOURS`; not after a refund
  or a revocation), while a new scenario needs the plan.

### Prices

| Plan | Monthly | 3 months | Yearly |
|---|---|---|---|
| Plus | $5.99 | $13.99 | $34.99 |
| Pro | $9.99 | $22.99 | $59.99 |

These are US list prices in `backend/lib/billing-config.ts` (each overridable
with `BILLING_PRICE_<PLAN>_USD`, e.g. `BILLING_PRICE_PLUS_MONTHLY_USD`). The
app shows the **store's** price, in the learner's currency, whenever the
store gives one; the US price is only a fallback. Set regional prices in
App Store Connect and Google Play.

### The AI cap (never losing money on a learner)

Each paid plan has one monthly AI spending cap, the same for every billing
length: half of what the plan's yearly price brings in per month after store
and card fees. Plus: about **$1.29**; Pro: about **$2.21**
(`AI_MONTHLY_CAP_PLUS_USD`, `AI_MONTHLY_CAP_PRO_USD`; `off` removes one).
Spend is summed from `ai_calls` for the calendar month (UTC). At the cap,
**coach chat and lesson regenerate pause** with a kind message naming the
day they open again. **Grading and review never stop.** Learners see
allowances (messages a day, versions a week, mocks a month), never dollars.
A unit test (`lib/billing-config.test.ts`) checks that no plan, at any
length, goes negative for a learner who uses the AI right up to the cap.

Allowance counts are rolling windows (24 hours, 7 days, 30 days), counted in
`allowance_uses` under a lock so parallel requests can't overrun them. A use
whose action fails before the learner gets anything is given back. Each is
configurable per kind and tier: `BILLING_ALLOWANCE_<KIND>_<TIER>` with
`KIND` one of `COACH_MESSAGE`, `REGENERATION`, `MOCK_EXAM`, `GRADED_ANSWER`
and `TIER` one of `FREE`, `PLUS`, `PRO` (a number, `0` for not included, or
`none` for no count). Pro's coach is `BILLING_ALLOWANCE_COACH_MESSAGE_PRO`
(default 60).

### The free course

The first course a Free learner opens becomes their free course. They can
switch it in Settings > Plan > Free course: the automatic choice can be
switched straight away (once), and after that once every 7 days
(`BILLING_FREE_COURSE_SWITCH_DAYS`). Progress in every course is kept.
Review stays open across all courses.

## How it works

- `backend/lib/billing-config.ts` -- the switch, plans, features, allowances,
  caps and product ids (pure).
- `backend/lib/entitlements.ts` -- `tierFor`, `requireFeature` (402 with
  `{ upgrade }`), `requireFeatureToFinish` (the in-progress allowance), `consumeAllowance` / `withAllowance` (429 with
  `{ allowance: { resetsAt } }`), `requireAiAllowance` (429 with
  `{ aiPaused }`), `requireCourseAccess`, grants. Every function returns at
  once while the switch is off, without touching the database.
- `backend/lib/billing-webhooks.ts` -- RevenueCat and Stripe events into one
  `entitlements` table.
- Migration `049_billing.sql` -- `entitlements`, `billing_events`,
  `free_course_choice`, `allowance_uses`. Additive. All four are in the
  account export.
- Gated routes (server-side; the app never decides): `/api/chat` (coach),
  `/api/objectives/:id/lesson` POST (regenerate), `/api/grade` (typed answers
  counted on Free; every grade checks the free course),
  `/api/objectives/:id/explain-back`, `/api/units/:id/check`,
  `/api/courses/:id/comparisons`, `/api/comparisons/:id/question`,
  `/api/comparison-items/:id/{answer,peek}`, `/api/coach/quiz[/answer]`,
  `/api/pbq`, `/api/exam/sessions` POST (mock), `/api/objectives/:id/lab[/questions,/report]`,
  `/api/labs` (list, progress, view, runs: Pro or the sample, Free's one
  course), `/api/courses/:id` (readiness), and the free-course check on the
  lesson, hint, guess, placement and prefetch routes. Multiple-choice grading and
  review are never gated.
- The app: `mobile/src/billing/BillingContext.tsx` (reads the config and the
  learner's plan; shows the upgrade sheet), `mobile/app/(app)/plans.tsx`,
  `mobile/app/(app)/settings/free-course.tsx`, the "Plan" rows in Settings,
  and `mobile/src/billing/purchases.ts` (RevenueCat, loaded lazily).

## Environment variables

Backend (Vercel). All optional until you turn plans on.

| Variable | What |
|---|---|
| `BILLING_ENABLED` | The switch. Off unless set to something other than `0`/`false`/`off`/`no`. |
| `REVENUECAT_WEBHOOK_AUTH` | The Authorization header value you type into RevenueCat's webhook settings. Long and random. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from the Stripe webhook endpoint. |
| `STRIPE_SECRET_KEY` | `sk_live_...` (or `sk_test_...` to test). Server only. Without it web checkout answers 503. |
| `STRIPE_PRICE_PLUS_MONTHLY` ... `STRIPE_PRICE_PRO_YEARLY` | The six Stripe price ids. A plan without one shows "Not available yet" on the web. |
| `BILLING_WEB_RETURN_URL` | Where Stripe Checkout and the portal return (e.g. `https://www.ascendra-learn.com`). Falls back to `APP_URL`. |
| `AI_MONTHLY_CAP_PLUS_USD`, `AI_MONTHLY_CAP_PRO_USD` | The caps (defaults 1.29 / 2.21). |
| `BILLING_ALLOWANCE_<KIND>_<TIER>` | Allowance overrides (above). |
| `BILLING_FREE_COURSE_SWITCH_DAYS` | Default 7. |
| `BILLING_PRICE_<PLAN>_USD` | Fallback display prices. |

App (EAS build env, `mobile/eas.json` `build.production.env`):

| Variable | What |
|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat's **public** Apple SDK key (`appl_...`). |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat's **public** Google SDK key (`goog_...`). |

The purchases SDK starts only when the server says plans are on **and** the
key for that platform is in the build. Never put RevenueCat's secret key or
any Stripe key in the app.

## Product ids to create

Create these with exactly these ids (they are what `billing-config.ts`
matches on).

**App Store Connect** -- one subscription group "Ascendra", six
auto-renewable subscriptions; Pro ranked above Plus so a change is an
upgrade:

- `ascendra.plus.monthly`, `ascendra.plus.quarterly`, `ascendra.plus.yearly`
- `ascendra.pro.monthly`, `ascendra.pro.quarterly`, `ascendra.pro.yearly`

Enrol in the App Store Small Business Program (15%).

**Google Play Console** -- two subscriptions, each with three auto-renewing
base plans:

- subscription `ascendra_plus`, base plans `monthly`, `three-month`, `yearly`
- subscription `ascendra_pro`, base plans `monthly`, `three-month`, `yearly`

(RevenueCat reports these as `ascendra_plus:monthly` and so on.)

**RevenueCat** -- one project with the iOS and Android apps:

- Entitlements `plus` and `pro`. Attach the three Plus products to `plus`
  and the three Pro products to `pro`.
- Offering `default` (set as current) with the six products as packages,
  using custom package identifiers equal to the plan ids: `plus_monthly`,
  `plus_quarterly`, `plus_yearly`, `pro_monthly`, `pro_quarterly`,
  `pro_yearly` (the built-in `$rc_monthly` can only be used once per
  offering). The app matches packages by store product id, so a different
  package name still works.
- App user id: the app logs in with the Ascendra account id; leave
  "transfer behaviour" at its default.
- Webhook: URL below, Authorization header = `REVENUECAT_WEBHOOK_AUTH`.

**Stripe** -- two products (Plus, Pro), each with three recurring prices
(monthly, every 3 months, yearly) in USD (add currencies as you like). Put
the six `price_...` ids in the `STRIPE_PRICE_*` variables. Turn on the
customer portal (Settings > Billing > Customer portal) with cancel and
payment-method update.

## Webhook URLs

- RevenueCat: `https://<backend>/api/billing/webhooks/revenuecat`
- Stripe: `https://<backend>/api/billing/webhooks/stripe`, events
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`,
  `charge.refunded` (and `checkout.session.completed`, logged only).

Both are accepted while the switch is off, so entitlements are already
correct the day you turn it on. Each event is stored once
(`billing_events`, unique on the provider's event id), and an event older
than what's stored for that subscription never overwrites it.

What each event does: a purchase, renewal or un-cancel gives access to the
period end; a cancellation (auto-renew off) keeps access to the period end;
a billing issue keeps access through the store's grace period; an expiry
ends it. A refund ends access at once (RevenueCat: a cancellation with
reason `CUSTOMER_SUPPORT`; Stripe: a **full** `charge.refunded` -- a partial
refund leaves access). A paid entitlement still counts for 24 hours past its
period end in case a renewal's webhook is late; an expiry, refund or
deletion event ends it straight away.

## Comping learners (grants)

A grant is an entitlement with source `grant` and an optional end date.

**The launch comp (Nick, 2026-11-07): every account that exists when plans
are switched on gets Pro free for 3 months.** That is the documented
default, `--launch-comp`:

```sh
cd backend
npm run billing:grant -- --launch-comp           # dry run: how many accounts, until when; changes nothing
npm run billing:grant -- --launch-comp --apply   # writes: Pro, source 'grant', 90 days from this moment
```

Every account in the database when it runs gets one grant with a fixed id
(`grant:launch-comp:<account id>`), so it is idempotent: running it again
comps only accounts made since, and never extends or repeats a comp. It
takes no other options. A learner who also pays keeps the higher of the
two, and their paid plan simply continues after the comp ends.

Other grants:

```sh
cd backend
# one learner
npm run billing:grant -- --email learner@example.com --tier pro --until 2027-06-30 --note "founding learner"
# every account that exists before a date (skips anyone already comped at that tier or higher)
npm run billing:grant -- --all-existing --created-before 2027-01-15 --tier plus --until 2027-12-31 --note "launch thank-you" --dry-run
npm run billing:grant -- --all-existing --created-before 2027-01-15 --tier plus --until 2027-12-31 --note "launch thank-you"
# take a learner's grants away
npm run billing:grant -- --email learner@example.com --revoke
```

Leave out `--until` for no end. A grant and a paid plan can coexist; the
learner gets the higher one. Grants show in the app as "Pro, given to you
until ...", with no "Manage subscription".

## Unrestricted access (REQ-144)

Separate from plans and grants: an account level that lifts the plan
limits whatever the tier and **whether or not `BILLING_ENABLED` is on**.

- **Owner**: an account whose **verified** email is in `OWNER_EMAILS`
  (comma-separated, any case). A server setting, not a row, so the app can
  never remove an owner and no SQL is needed. An unverified account with an
  owner's address is an ordinary learner (anyone can type an address into
  sign-up). Owner implies unrestricted.
- **Unrestricted**: a grant in `account_access` (migration 056) given by an
  owner, by email, with an optional end date and note.

### What it lifts, and what it doesn't

| Lifted for owner and unrestricted | Never lifted |
|---|---|
| Every plan feature (coach, regenerate, explain-back, unit checks, comparisons, Quiz me, mock exams, PBQs, readiness), every course, every lab (not just the sample) | Sign-in, MFA, session checks, rate limits (chat 30 per 10 min, regenerate, grading, access changes) |
| Plan allowances (no `allowance_uses` row is written) and the per-tier monthly AI cap | Course disclaimers and acknowledgements, the lab disclaimer |
| The $0.50 daily AI budget, **raised** to the safety ceiling below | Access checks: another learner's private courses and data stay invisible (unrestricted is not admin) |
| Early access to features behind a switch that is off for everyone else | |

How: `tierFor` answers Pro for them (Pro has every feature; a unit test
fails if a feature is ever added above Pro), `consumeAllowance`,
`allowanceStatus` and the monthly cap return "no limit" for them
(`lib/entitlements.ts`), and `requireAiBudget` uses the ceiling
(`lib/ai-budget.ts`). With the switch off nothing reads the access tables
for plan gates (everyone already has everything); the AI budget looks the
level up only once a learner is over the everyday budget.

### The AI safety ceiling

Unrestricted is not unlimited spend. Over the same rolling 24 hours as the
daily budget, an unrestricted account may use up to
`AI_UNRESTRICTED_DAILY_CEILING_USD` (default **$20**: 40 times the learner
budget and far beyond a heavy study day of about $0.15, but a hard stop on a
runaway loop, a leaked session or a broken client). At the ceiling the
coach and lesson regenerate pause with their own message, grading keeps
working, the server logs `[ai-ceiling]`, records a `ceiling_reached` row in
`account_access_events`, and emails every owner (at most once per account
per 24 hours). The ceiling can be changed but not switched off ("off" or 0
fall back to $20), and it applies even if `AI_DAILY_BUDGET_USD` is off.

### Early access

`featureEnabledFor(userId, flag)` (`lib/account-access.ts`) is true when the
switch is on for everyone, and otherwise only for owner and unrestricted
accounts. The switches are listed in `EARLY_ACCESS`
(`lib/account-access-config.ts`). Today: `LABS_SERVE_UNREVIEWED` -- set off,
unreviewed labs are still served to owner and unrestricted accounts (with
the same disclaimer and acknowledgement). For a new switch such as
`SIMS_ENABLED` (docs/sims.md on feature/sim-engine-design): add
`sims: { env: "SIMS_ENABLED", defaultOn: false }` to `EARLY_ACCESS` and read
it on the server with `featureEnabledFor(user.id, "sims")` instead of
reading the env. A switch meant as an emergency stop for everyone should
not be listed there.

### Giving and removing it

**In the app** (owners only): Settings > Access. Give access by email with
an optional end date and note; remove it with "Remove access". If no
verified account has that address yet, the grant waits and applies once
that address signs up and verifies; it is then bound to that account for
good (a later email change doesn't move it). Granting the same address
again renews its grant. Owners are listed but can't be removed. Unrestricted
accounts don't see the section and the server refuses them (403). Each
change is rate-limited (30 an hour) and emailed to the owner who made it,
so one made from a stolen session is noticed.

The recipient sees it as their plan: "Unrestricted access, granted by Nick"
in Settings and on the plans screen, with no upgrade prompts.

API (owner only, 403 otherwise): `GET /api/access/grants` (owners, grants,
the last 50 audit entries), `POST /api/access/grants { email, until?:
"YYYY-MM-DD", note? }`, `DELETE /api/access/grants/:id`. `GET /api/auth/me`
carries `access: { level, grantedBy, expiresAt } | null`.

**From the command line** (emergencies; uses `DATABASE_URL`):

```sh
cd backend
npm run access:grant -- --email friend@example.com --until 2027-06-30 --note "beta tester"
npm run access:grant -- --email friend@example.com --revoke
npm run access:grant -- --list
```

**Audit trail**: `account_access_events` records every grant, change,
revoke, claim (a waiting grant applied to a new account) and safety-ceiling
hit, with who did it (an owner's account, or `cli`). The affected learner's
account export includes their grants (`accessGrants`) and this trail
(`accessEvents`), naming the giver by display name, never by email.
Deleting the learner's account deletes both.

### Deploying it

1. Vercel -> the backend project -> Settings -> Environment Variables: add
   `OWNER_EMAILS=paukennick2@gmail.com` for **Production and Preview**.
   Optional: `AI_UNRESTRICTED_DAILY_CEILING_USD` (default 20).
2. Apply migration 056 with the routine deploy: push the release commit to
   `ops/migrate-production` (docs/deploy-runbook-integration.md, "Routine
   deploys") and wait for "Schema is current". Additive; the code before
   this release never reads it. If 055 (content currency, PR #44) merges
   first, the same run applies only 056; either order works.
3. Merge. Vercel redeploys (which also picks up the new variable);
   `/api/health` must answer `"schema":"current"`.
4. Check: signed in as paukennick2@gmail.com, `GET /api/auth/me` shows
   `"access": {"level": "owner", ...}`. The owner's email must be verified
   (a Google sign-in is).

Server-side access works at once for every installed app version (the
gates are on the server). The Settings > Access screen and the "Unrestricted
access" plan line need the new app: on the web on the next deploy, on
phones with the next app update. Until then Nick can grant with the CLI.

## Verified discounts (REQ-166)

Published group discounts for people a third party has verified: military
and veterans, first responders, nurses and students (Nick's approved groups,
2026-11-09), plus teachers, configurable and **off** by default. Built and
off, like everything else on this page.

Nick's rules:

- **Published, never personal.** Each group has one percentage, the same for
  everyone in it (`DISCOUNT_PERCENT_<GROUP>`). Nothing is priced per person,
  and there is no failure or retake discount.
- **Personal plans.** A verified discount covers a personal plan for the
  learner's own study. The teacher group says so in its copy and terms
  ("for your own study and professional development; it doesn't cover using
  Ascendra with a class or a school"), and wherever teachers are offered the
  page shows "Using Ascendra with a class? Contact us" pointing at
  `SUPPORT_EMAIL`. Class or school use is a separate arrangement and isn't built.
- **No stacking.** A learner gets one discount: the largest among their live
  verifications. On the web a verified coupon replaces the promotion-code box
  at Stripe Checkout (Stripe takes one or the other), so a promo code such as
  a future founding-member offer can't be added on top. On Google Play one
  offer is bought, and on the App Store one offer code is redeemed per
  subscription.
- **The full AI cap.** A discounted learner keeps their plan's whole monthly
  AI cap. The cap is set per tier from the list price (`monthlyAiCapUsd`,
  above), and nothing in it reads what the learner paid. A unit test
  (`lib/verified-discounts-config.test.ts`) pins this.

### When it is on

All of these must hold, or the app shows nothing about discounts and
`GET /api/discounts` answers only `{ "available": false }`:

1. `BILLING_ENABLED` is on.
2. `VERIFIED_DISCOUNTS_ENABLED` is on.
3. A verification provider is configured. **None is wired in by REQ-166**: the
   provider registry in `backend/lib/discount-providers.ts` is empty. ID.me
   comes with REQ-167 (its own PR, stacked on this one).
4. At least one enabled group has a published percentage.

### What is checked and what is kept

The learner signs in with the verification provider, not with us, and the
provider confirms the group. We keep **only the result** in
`verified_discounts` (migration 058): account, group, provider, verified at,
expires at, and the provider's opaque subject id. The subject id stops one
verification being used on many accounts: a second account with the same
identity and group gets "already linked to another Ascendra account". There
are no documents, names, birth dates, service or licence numbers, and no
provider tokens. A verification lasts `VERIFIED_DISCOUNT_VALID_DAYS`
(default 365), or less if the provider gives an earlier end. The learner can
remove it at any time (Settings > Verified discount > Remove). Deleting the
account deletes it, and the account export includes it (`verifiedDiscounts`,
plus any App Store codes handed out, `discountOfferCodes`).

The round trip (`backend/lib/discount-providers.ts`): `POST
/api/discounts/verify { group, client }` signs a 15-minute state (account,
group, provider, app or web) with a key derived from `AUTH_JWT_SECRET`,
derives a PKCE (Proof Key for Code Exchange) verifier from it, and answers
the provider's URL. The provider's callback route checks the state, exchanges
the code and stores the result. It then redirects to a fixed address
(`preplms://settings/discount` or `<BILLING_WEB_RETURN_URL>/settings/discount`),
never to one taken from the request.

### How the discount is applied

| Where | How | What Nick sets up |
|---|---|---|
| Web (Stripe) | `POST /api/billing/checkout` adds the group's coupon (`discounts[0][coupon]`) in place of the promotion-code box | One coupon per group (below), id in `STRIPE_COUPON_<GROUP>` |
| Google Play | The plans screen buys the base plan's **developer-determined offer** for the group (RevenueCat `purchaseSubscriptionOption`); with no such offer the regular price is bought | One offer per group on each of the six base plans (below) |
| App Store | The discount page hands the learner a **one-time offer code** for the plan they pick, from a pool Nick uploads; the app opens Apple's redemption sheet (or the redemption link) | Offer codes per group and product, uploaded with `npm run discounts:codes` |

Google Play promo codes can't carry a percentage off a subscription (Google:
"Promo codes offer free trials to subscriptions and not free subscriptions"),
so Play uses developer-determined offers instead. Their eligibility is
decided by the app ("You solely decide the business logic and determine
eligibility in your app"), and they can't be bought outside it. The app only
picks the offer when the server says the learner has a live verification.
Residual risk: a modified app could pick the offer without one. Google
doesn't check, so watch the Play offer's sales against
`verified_discounts`.

App Store codes can't be revoked once handed out. A learner who asks twice
for the same plan gets the same unexpired code, and the pool hands out
codes with at least a day left, earliest expiry first.

Routes: `GET /api/discounts` (status, groups, what's checked and kept,
terms), `POST /api/discounts/verify`, `POST /api/discounts/offer-code
{ planId }`, `DELETE /api/discounts/verifications`. In the app:
`mobile/app/(app)/settings/discount.tsx`, a "Verify for a discount" link on
the plans screen and a "Verified discount" row in Settings > Plan, all shown
only while the server says discounts are available.

### Environment variables

| Variable | What |
|---|---|
| `VERIFIED_DISCOUNTS_ENABLED` | The switch (off unless set to something other than `0`/`false`/`off`/`no`). |
| `VERIFIED_DISCOUNT_GROUPS` | Comma list replacing the default set `military,responder,nurse,student`. Add `teacher` to offer teachers. |
| `DISCOUNT_PERCENT_<GROUP>` | The published percentage, a whole number 1-90. **No default**: a group without one isn't offered. Nick hasn't set them yet (likely a flat 20%). It must match the Stripe coupon and the store offers. |
| `STRIPE_COUPON_<GROUP>` | The Stripe coupon id for the group. Without it, web checkout charges the regular price and the page says the discount is app-only. |
| `PLAY_OFFER_<GROUP>` | The Play offer id (default `verified-<group>`). |
| `APP_STORE_OFFER_REDEEM_URL` | App Store Connect's example redemption link with the code left off (optional; the app opens Apple's redemption sheet first). |
| `VERIFIED_DISCOUNT_VALID_DAYS` | Default 365. |
| `SUPPORT_EMAIL` | Already used for support mail; also the "Using Ascendra with a class?" contact. |

`npm run discounts:codes -- --config` reports which of these are set (never
their values) and which groups are on offer.

### Owner setup (Nick)

1. **Decide the percentages** and set `DISCOUNT_PERCENT_<GROUP>` for each
   group you offer.
2. **Stripe** (Products > Coupons): one coupon per group, *Percentage
   discount* equal to the published percentage, duration *Repeating, 12
   months*. That matches the yearly re-verification, so a lapsed
   verification doesn't keep a discount forever. Put each coupon id in
   `STRIPE_COUPON_<GROUP>`. Don't make these promotion codes: they are
   applied by the server, never typed.
3. **Google Play Console** (each subscription > each base plan > Add offer):
   on all six base plans, one offer per group with offer id
   `verified-<group>` (e.g. `verified-military`), eligibility *Developer
   determined*, and one phase *Discounted recurring payment* at the published
   percentage for as many periods as a year (12 monthly, 4 three-month, 1
   yearly). Activate them. RevenueCat reads them as `<base plan>:<offer id>`
   options.
4. **App Store Connect** (the app > Subscriptions > each subscription >
   Subscription Prices > Offer Codes): per product and group, an offer code
   offer of type *Pay as you go* at the discounted price for a year of
   periods, eligibility new, existing and expired subscribers, then
   *Create One-Time Use Codes* (500 to 25,000 per batch, up to 1 million a
   quarter per app, each batch expiring at most six months out). Download
   the CSV and load it:
   ```sh
   cd backend
   npm run discounts:codes -- --import codes.csv --group military --product ascendra.pro.yearly --expires 2027-05-01 --dry-run
   npm run discounts:codes -- --import codes.csv --group military --product ascendra.pro.yearly --expires 2027-05-01
   npm run discounts:codes -- --status    # free / issued per group and product, next expiry
   ```
   Refill before a batch expires. Optionally copy the offer's example
   redemption link (without a code) into `APP_STORE_OFFER_REDEEM_URL`. The
   app must be *Ready for Sale* for codes to redeem, and new codes can take
   up to an hour to work.
5. **The provider**: see REQ-167 (ID.me). Until a provider is configured
   nothing is shown.
6. Apply migration 058 (routine deploy), then set
   `VERIFIED_DISCOUNTS_ENABLED=true` and redeploy. Check with
   `npm run discounts:codes -- --config`.

Sources (checked 2026-11-09): Apple, [Set up offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/);
Google, [Promo codes](https://developer.android.com/google/play/billing/promo)
and [Understanding subscriptions](https://support.google.com/googleplay/android-developer/answer/12154973)
(offer eligibility and phases).

## Turning it on

1. Apply migration 049 (`npm run migrate -- --all`; see
   `docs/deploy-runbook-integration.md`). `/api/health` names it if missing.
2. Ship the store build with this code (it adds the RevenueCat native module;
   the release already needs a store build for `expo-notifications`). Set the
   two `EXPO_PUBLIC_REVENUECAT_*` keys in `eas.json` before building.
3. Create the products (above), the RevenueCat project and the Stripe
   products; set the backend env vars; point both webhooks at the backend
   and send a test event from each (`TEST` from RevenueCat is logged as
   ignored; a Stripe test event with a bad signature is a 400).
4. Run the launch comp, **before** step 6, so nobody loses access for a
   moment: `npm run billing:grant -- --launch-comp` (dry run; check the
   count), then `npm run billing:grant -- --launch-comp --apply`. Check the
   config the app will get with `npm run billing:config` (prices, plans,
   which secrets and Stripe prices are set -- reported as set or missing,
   never their values).
5. Test end to end with sandbox/test accounts: buy, cancel, restore, refund
   on each store and on the web, and watch `billing_events` and
   `GET /api/billing/me`.
6. Set `BILLING_ENABLED=true` in Vercel and redeploy (env changes need a
   deploy). The app picks it up the next time a learner opens the signed-in
   area. To turn it off again, unset it: everyone is Pro again at once.

## Launch checklist (still needed)

- [ ] Terms of Service: subscription, auto-renewal, cancellation and refund
      terms (store rules and US state auto-renewal laws require them; Audit 3
      H4). The app's plans screen already says plans renew until cancelled.
- [ ] Privacy Policy: the payment processors line drafted as a comment in
      `mobile/app/(legal)/privacy.tsx` ("[when payments launch]"), reviewed.
- [ ] App Store review notes and Google Play subscription disclosures.
- [ ] Apple Small Business Program enrolment; Google 15% tier is automatic
      for subscriptions.
- [x] Comps for existing learners decided: Pro for 3 months
      (`--launch-comp`, step 4 above). Run it at switch-on.
- [ ] Decide whether email verification is required before paying (Audit 3
      suggests it).
- [ ] Sales tax / VAT handling (Stripe Tax for the web; the stores handle
      theirs).
- [ ] Verified discounts (REQ-166): set the percentages, the Stripe coupons,
      the Play offers and the App Store code pool, and a provider (REQ-167),
      before `VERIFIED_DISCOUNTS_ENABLED` ("Verified discounts" above).
- [ ] Watch real AI spend for a month (`npm run metrics`, `ai_calls`) and tune
      the caps and allowances.
