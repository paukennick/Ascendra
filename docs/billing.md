# Paid plans and payments (REQ-122, REQ-124, REQ-170)

**REQ-170 (Nick, 2026-11-09): plans are by category.** IT and cloud,
project management and fitness each have a Plus and a Pro plan; all-access
covers every non-clinical course with Pro's features; clinical is its own
Pro plan, with a cheaper add-on for all-access holders. There is **one
published price per plan for everyone** -- no personalised pricing (the New
York and Connecticut personalised-pricing laws are the reason). The intake
form (REQ-169, "Study profile" below) only *suggests* a plan and a length;
nothing a learner answers ever changes a price. See "Category plans" below;
Free, Plus and Pro remain the feature levels inside a plan.

Ascendra has three feature levels -- Free, Plus and Pro -- fully built and **off**.
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

### Prices (REQ-170, proposed -- not final)

| Plan | Covers | Monthly | 3 months | Yearly |
|---|---|---|---|---|
| IT and cloud Plus / Pro | AWS, Azure, Google Cloud, CompTIA, Kubernetes, programming | $12.99 / $19.99 | $29.99 / $44.99 | $79.99 / $129.99 |
| Project management Plus / Pro | PMI and other PM courses | $12.99 / $19.99 | $29.99 / $44.99 | $79.99 / $129.99 |
| Fitness Plus / Pro | Personal trainer, strength and conditioning | $12.99 / $19.99 | $29.99 / $44.99 | $79.99 / $129.99 |
| All access (Pro features) | Every non-clinical course, academic ones included | $29.99 | $69.99 | $199 |
| Clinical Pro | Nursing and physical therapy | $49 | $99 | -- |
| Clinical add-on (all-access holders only) | Nursing and physical therapy | $29 | -- | -- |

These are US list prices in `backend/lib/billing-config.ts`
(`PLAN_FAMILIES`). Each is overridable with
`BILLING_PRICE_<FAMILY>_<PERIOD>_USD` (e.g. `BILLING_PRICE_PM_PLUS_MONTHLY_USD`),
which can also **add** a length that has no default (e.g.
`BILLING_PRICE_CLINICAL_PRO_YEARLY_USD`). The app shows the **store's**
price, in the learner's currency, whenever the store gives one; the US price
is only a fallback. Set regional prices in App Store Connect and Google
Play. The plans screen says under every price list: "Every plan has one
published price, the same for everyone. Your answers to the study questions
never change it."

### Category plans: who gets what (REQ-170)

- Which plan covers a course comes from its catalog category
  (`EDUCATION_CATEGORY_PLAN` in `billing-config.ts`): the AWS, Azure, Google
  Cloud, CompTIA, cloud-native, IT and development categories are IT and
  cloud; the PM categories are project management; health and fitness is
  fitness; healthcare and nursing (including physical therapy and health
  informatics) is clinical. Anything else ("other", e.g. academics) is
  covered only by all-access. A learner's own course comes with any paid
  plan.
- A learner's level **on a course** is the highest level among their plans
  that cover it. Every gated route passes its course (`requireFeature(user,
  feature, course)`), so Project management Pro never opens Pro features in
  an IT course. A course no plan covers is on Free terms: the one free
  course still applies to the other categories.
- An upgrade prompt names the plan for that course ("The AI coach comes
  with Project management Plus") and carries `upgrade.scope`, so the app's
  "See plans" opens on that category.
- One non-clinical plan at a time in the stores (one App Store subscription
  group; Play replaces the plan the same way). Two categories means
  all-access. Clinical is held beside it.
- Grants (comps, the launch comp) have no scope: they cover every course,
  clinical included.
- Downgrades keep the higher plan's paid period, as before; "higher" is the
  plan's rank (all-access over a category's Pro over its Plus). Moving
  between two categories at the same level is a crossgrade (App Store:
  immediate; Play: at the end of the paid period).

### The AI cap (never losing money on a learner)

Each plan has one monthly AI spending cap, the same for every billing
length: half of what the plan's **yearly** price brings in per month after
store and card fees (70% bought in the stores at 15%, 30% on the web at
2.9% + $0.30). A plan without a yearly length (clinical) uses its cheapest
month instead. A learner holding two plans (a category and clinical) has
the sum of both caps; a held period and its new plan count once.

| Plan | Cap a month | Override |
|---|---|---|
| IT and cloud / PM / fitness Plus | $2.95 | `AI_MONTHLY_CAP_<FAMILY>_USD`, e.g. `AI_MONTHLY_CAP_PM_PLUS_USD` |
| IT and cloud / PM / fitness Pro | $4.80 | |
| All access | $7.35 | `AI_MONTHLY_CAP_ALL_ACCESS_USD` |
| Clinical Pro | $14.61 (from $99 for 3 months) | `AI_MONTHLY_CAP_CLINICAL_PRO_USD` |
| Clinical add-on | $12.81 | `AI_MONTHLY_CAP_CLINICAL_ADDON_USD` |
| A grant (no plan) | Plus $2.95, Pro $7.35 | `AI_MONTHLY_CAP_PLUS_USD`, `AI_MONTHLY_CAP_PRO_USD` |
| Unrestricted access (REQ-144), granted by the owner | $20.16: all-access plus the clinical add-on, the most a paying learner can hold | `AI_MONTHLY_CAP_UNRESTRICTED_USD` |
| An owner (`OWNER_EMAILS`) | $35 safety cap (REQ-181), billing switch on or off | `OWNER_MONTHLY_AI_CAP_USD` |

`off` removes a cap. A verified discount never lowers it, and only one
discount ever applies. Spend is summed from `ai_calls` for the calendar month (UTC).
At the cap, **coach chat and lesson regenerate pause** with a kind message
naming the day they open again. **Grading and review are not paused by the
monthly cap** (they have the daily grading pool, below). Learners
see allowances (messages a day, versions a week, mocks a month), never
dollars. Unit tests (`lib/billing-config.test.ts`) check that no plan, at
any length, goes negative for a learner who uses the AI right up to the
cap, at list price and at 20% and 25% off.

#### Margins (AI cost only, per learner per month, after fees)

Typical use is 30% of the cap; worst case is 100%. Percentages are of the
month's take after fees. The only discount is a verified group discount
(REQ-166), at most 25% (below); there is no founding-member discount (Nick,
2026-11-09: removed on every platform, as the App Store can't offer it).

| Plan and length | Take | Typical: list / 20% / 25% off | Worst: list / 20% / 25% off |
|---|---|---|---|
| Category Plus, monthly $12.99 | $11.42 | $10.54 / $8.24 / $7.66 | $8.47 / $6.17 / $5.59 |
| Category Plus, 3 months $29.99 | $8.83 | $7.95 / $6.17 / $5.73 | $5.88 / $4.11 / $3.67 |
| Category Plus, yearly $79.99 | $5.90 | $5.02 / $3.83 / $3.54 | $2.95 / $1.77 / **$1.47** |
| Category Pro, monthly $19.99 | $17.63 | $16.19 / $12.64 / $11.76 | $12.83 / $9.28 / $8.40 |
| Category Pro, 3 months $44.99 | $13.26 | $11.82 / $9.16 / $8.50 | $8.46 / $5.80 / $5.14 |
| Category Pro, yearly $129.99 | $9.59 | $8.15 / $6.23 / $5.75 | $4.79 / $2.87 / $2.39 |
| All access, monthly $29.99 | $26.49 | $24.29 / $18.97 / $17.64 | $19.14 / $13.82 / $12.50 |
| All access, 3 months $69.99 | $20.65 | $18.44 / $14.31 / $13.27 | $13.30 / $9.16 / $8.13 |
| All access, yearly $199 | $14.69 | $12.49 / $9.55 / $8.81 | $7.34 / $4.40 / $3.67 |
| Clinical Pro, monthly $49 | $43.34 | $38.96 / $30.27 / $28.10 | $28.73 / $20.04 / $17.87 |
| Clinical Pro, 3 months $99 | $29.22 | $24.83 / $18.99 / $17.52 | $14.61 / $8.76 / $7.30 |
| Clinical add-on, monthly $29 | $25.61 | $21.77 / $16.63 / $15.34 | $12.80 / $7.66 / $6.38 |

Worst case overall: a learner with the largest allowed discount (25%) on a
yearly category Plus plan who uses the whole cap every month leaves **$1.47
a month (25% of that month's take)**. Every plan's yearly (or cheapest)
length would break even at a discount of just under 50%, because the cap is
half the undiscounted take; the 25% limit keeps every plan positive at the
cap with room to spare (a unit test checks list, 20% and 25%).

Allowance counts are rolling windows (24 hours, 7 days, 30 days), counted in
`allowance_uses` under a lock so parallel requests can't overrun them. A use
whose action fails before the learner gets anything is given back. Each is
configurable per kind and tier: `BILLING_ALLOWANCE_<KIND>_<TIER>` with
`KIND` one of `COACH_MESSAGE`, `REGENERATION`, `MOCK_EXAM`, `GRADED_ANSWER`
and `TIER` one of `FREE`, `PLUS`, `PRO` (a number, `0` for not included, or
`none` for no count). Pro's coach is `BILLING_ALLOWANCE_COACH_MESSAGE_PRO`
(default 60).

### The AI spend gate (REQ-202)

The monthly caps above only stop the coach and lesson regenerate. Until the
2026-11-09 audit nothing else was capped: about 13 model routes (grading,
labs, units, review, quiz, re-checks) ran with no check, a loop of sprints
could start about 960 writer-plus-fact-check generations a day, and the first
generation of a shared lesson was charged to nobody. Nick's Anthropic credit is
finite, so one check now sits inside the model-call layer
(`lib/ai-calls.ts` `loggedCall`, reached by every `callClaude` and
`callClaudeStructured`) and applies to every account, Free included.

- **Two daily pools per learner**, each a rolling 24 hours of `ai_calls`:
  **coach** (everything that writes: chat and its guards, lesson text,
  practice and exam items, labs, re-checks) at `AI_DAILY_BUDGET_USD`
  (default $0.50), and **grading** (a learner's own answers: typed answers,
  PBQs, lab steps, review and unit checks, explain-back, guess feedback) at
  `AI_DAILY_GRADING_BUDGET_USD` (default $0.25). Grading has its own pool, so
  a heavy legitimate grader keeps the coach and the reverse. `off` or `0`
  removes a pool's cap. An owner or unrestricted account has the
  REQ-144 ceiling over both pools instead.
- **Reserve, then settle.** Before a call is sent its worst-case cost (the
  prompt as an uncached write, plus `max_tokens` of answer) is reserved as an
  `ai_calls` row (`error_code = 'reserved'`) under a per-learner advisory lock,
  and refused if spend plus reservations plus this call would pass the cap.
  When the call ends the same row is updated to the real usage. A function
  killed in between leaves the estimate, which keeps counting for 24 hours.
  No migration: a reservation is an ordinary `ai_calls` row.
- **Fails closed.** If the database cannot say what was spent, the call is
  refused with a 503 ("paused for a moment"), in the gate, in
  `requireAiBudget` and in `requireAiAllowance`.
- **Sprints and mocks** look at the coach budget before generating and, when
  it cannot cover a generation, are built from the bank only (a sprint over
  an empty bank answers 429 with the budget message). Generation is 12 an
  hour (was 40).
- **Who is charged.** A first (shared) lesson, lab questions and course
  insights are charged to the learner whose request started them; the lesson
  GET and prefetch rate is 20 an hour (was 20 per 10 minutes). A re-check is
  charged to the reporter, who can start 10 a day.
- **Every call states its learner.** `userId` is required on `callClaude`
  and `callClaudeStructured` (`null` only for operator scripts), and
  `lib/ai-spend-gate.test.ts` enumerates every call site and every route
  that reaches one from the source, failing on a new one.
- **Hook for the global daily ceiling** (`AI_GLOBAL_DAILY_CEILING_USD`,
  REQ-201): `setGlobalCeilingCheck` in `lib/ai-spend-gate.ts`. The check runs
  first for every call, with or without a learner, so the ceiling covers
  every path above.

Worst case per account, any rolling 24 hours: coach $0.50 plus grading $0.25
= **$0.75** (settled spend can pass a pool's cap only by the amount a call's
real cost exceeds its estimate, which is an upper bound). An owner or
unrestricted account: the $20 ceiling.

### Function duration

The AI routes export `maxDuration` (60 to 300 seconds, never more). The plan
is Hobby; Hobby with Fluid compute allows up to 300 s (without Fluid, 60 s,
and a larger value fails the deploy). The Anthropic client times out an
attempt at 90 s and retries once. Pro allows more, but nothing here needs it;
the long routes are the lesson GET, prefetch-next and exam session creation
(300 s).

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
| `STRIPE_PRICE_IT_CLOUD_PLUS_MONTHLY` ... `STRIPE_PRICE_CLINICAL_ADDON_MONTHLY` | The 24 Stripe price ids, `STRIPE_PRICE_<PLAN ID>` (REQ-170). A plan without one shows "Not available yet" on the web. |
| `BILLING_WEB_RETURN_URL` | Where Stripe Checkout and the portal return (e.g. `https://www.ascendra-learn.com`). Falls back to `APP_URL`. |
| `AI_MONTHLY_CAP_<FAMILY>_USD` | Per-plan caps (REQ-170; defaults in "The AI cap"). `AI_MONTHLY_CAP_PLUS_USD` / `_PRO_USD` are the caps of grants. |
| `BILLING_ALLOWANCE_<KIND>_<TIER>` | Allowance overrides (above). |
| `BILLING_FREE_COURSE_SWITCH_DAYS` | Default 7. |
| `BILLING_PRICE_<FAMILY>_<PERIOD>_USD` | Fallback display prices, e.g. `BILLING_PRICE_ALL_ACCESS_YEARLY_USD`. |
| `AI_ACCESS_MODE` | REQ-201: `all` (default), `granted` (full AI for owners and Settings > Access grants only) or `paid`. Independent of `BILLING_ENABLED`. See "AI access modes". |
| `AI_GLOBAL_DAILY_CEILING_USD` | REQ-201: total AI spend per UTC day across everyone; unset = none. Recommended production value `5`. |

App (EAS build env, `mobile/eas.json` `build.production.env`):

| Variable | What |
|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat's **public** Apple SDK key (`appl_...`). |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat's **public** Google SDK key (`goog_...`). |

The purchases SDK starts only when the server says plans are on **and** the
key for that platform is in the build. Never put RevenueCat's secret key or
any Stripe key in the app.

## Product ids to create (REQ-170)

Create these with exactly these ids (they are what `billing-config.ts`
matches on). The first pricing page's six ids (`ascendra.plus.monthly` ...)
were never created and are no longer sold.

**App Store Connect** -- two subscription groups, 24 auto-renewable
subscriptions. Enrol in the App Store Small Business Program (15%).

Group **"Ascendra"** (one non-clinical plan at a time). Rank all-access
highest, then the three Pro plans at one level, then the three Plus plans
at one level:

- `ascendra.it_cloud_plus.monthly`, `ascendra.it_cloud_plus.quarterly`, `ascendra.it_cloud_plus.yearly`
- `ascendra.it_cloud_pro.monthly`, `ascendra.it_cloud_pro.quarterly`, `ascendra.it_cloud_pro.yearly`
- `ascendra.pm_plus.monthly`, `ascendra.pm_plus.quarterly`, `ascendra.pm_plus.yearly`
- `ascendra.pm_pro.monthly`, `ascendra.pm_pro.quarterly`, `ascendra.pm_pro.yearly`
- `ascendra.fitness_plus.monthly`, `ascendra.fitness_plus.quarterly`, `ascendra.fitness_plus.yearly`
- `ascendra.fitness_pro.monthly`, `ascendra.fitness_pro.quarterly`, `ascendra.fitness_pro.yearly`
- `ascendra.all_access.monthly`, `ascendra.all_access.quarterly`, `ascendra.all_access.yearly`

Group **"Ascendra Clinical"** (one level):

- `ascendra.clinical_pro.monthly`, `ascendra.clinical_pro.quarterly`
- `ascendra.clinical_addon.monthly`

**Google Play Console** -- nine subscriptions; base plans `monthly`,
`three-month`, `yearly` where the plan has that length:

- `ascendra_it_cloud_plus`, `ascendra_it_cloud_pro`, `ascendra_pm_plus`,
  `ascendra_pm_pro`, `ascendra_fitness_plus`, `ascendra_fitness_pro`,
  `ascendra_all_access` -- all three base plans
- `ascendra_clinical_pro` -- `monthly`, `three-month`
- `ascendra_clinical_addon` -- `monthly`

(RevenueCat reports these as `ascendra_pm_plus:three-month` and so on.)
For verified discounts, add the `verified-<group>` offers (below). There is
no founding offer.

**RevenueCat** -- one project with the iOS and Android apps:

- Nine entitlements named after the plans: `it_cloud_plus`, `it_cloud_pro`,
  `pm_plus`, `pm_pro`, `fitness_plus`, `fitness_pro`, `all_access`,
  `clinical_pro`, `clinical_addon`; attach each plan's App Store and Play
  products to its entitlement. (The server reads the product id; the
  entitlement is the fallback.)
- Offering `default` (set as current) with the 24 products as packages,
  using custom package identifiers equal to the plan ids
  (`it_cloud_plus_monthly` ... `clinical_addon_monthly`). The app matches
  packages by store product id, so a different package name still works.
- App user id: the app logs in with the Ascendra account id; leave
  "transfer behaviour" at its default.
- Webhook: URL below, Authorization header = `REVENUECAT_WEBHOOK_AUTH`.

**Stripe** -- nine products, one recurring price per length (24 prices) in
USD. Put each `price_...` id in `STRIPE_PRICE_<PLAN ID>`, e.g.
`STRIPE_PRICE_IT_CLOUD_PLUS_MONTHLY`, `STRIPE_PRICE_ALL_ACCESS_YEARLY`,
`STRIPE_PRICE_CLINICAL_ADDON_MONTHLY`. A plan without one shows "Not
available yet" on the web. Turn on the customer
portal (Settings > Billing > Customer portal) with cancel and
payment-method update.

## Study profile: the intake form (REQ-169)

New learners are asked, once and skippably, what they want to learn: their
goal, the exam(s) or course(s) they're preparing for (up to five, each with
an optional exam date), their experience, weekly study time and, optionally,
what they'll use it for (personal, work, or teaching a class). It is step 2
of the first run and editable any time in Settings > Study profile
(`GET/PUT /api/intake`, `lib/intake.ts`, migration 060's `learner_intake` and
`learner_intake_targets`).

- **Study plan**: saving writes each named course's exam date into its
  study plan (the same `study_plans` row the course's plan screen edits).
  The weekly hours fill in **only plans that have no hours yet** (an even
  share per new plan); hours a plan already has are never overwritten (Nick,
  2026-11-09). Experience other than "new" suggests the
  quick placement check.
- **Plan suggestion** (only with `BILLING_ENABLED` on): from the courses'
  categories and the latest exam date only -- never experience, goal, hours
  or use (`lib/intake-suggest.ts`). One category gives that plan, several
  (or an "other" course) give all-access, clinical with anything else gives
  all-access with the clinical add-on. The length is the cheapest way to
  cover the time to the exam at the published prices (an exam about 10
  weeks away suggests 3 months). The suggestion has no price of its own: the
  plans screen opens on it, marks the length "Suggested for you", and shows
  the same published price as for everyone.
- **Teaching a class**: no personal plan is suggested; the app shows
  "Using Ascendra with a class? Contact us" (`CLASS_CONTACT_LINE`, REQ-166)
  with `SUPPORT_EMAIL`.
- **Billing off**: the form works the same for the study plan; nothing
  about plans or prices appears.
- The answers are in the account export (`intake`, `intakeTargets`) and are
  deleted with the account.

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
| Every plan feature (coach, regenerate, explain-back, unit checks, comparisons, Quiz me, mock exams, PBQs, readiness), every course in **every category, clinical included** (REQ-170: no payment, no free-course limit, no upgrade prompt), every lab (not just the sample) | Sign-in, MFA, session checks, rate limits (chat 30 per 10 min, regenerate, grading, access changes) |
| Plan allowances (no `allowance_uses` row is written). The monthly AI cap: for owners, a **$35** monthly safety cap instead (REQ-181, below, billing switch on or off); for unrestricted grants, the highest a paying learner can hold -- all-access plus the clinical add-on, **$20.16** (REQ-170, Nick 2026-11-09; was no cap) | Course disclaimers and acknowledgements, the lab disclaimer |
| The $0.50 daily AI budget, **raised** to the safety ceiling below | Access checks: another learner's private courses and data stay invisible (unrestricted is not admin) |
| Early access to features behind a switch that is off for everyone else | |

How: `tierFor`, `tierForCourse` and `requireCourseAccess` answer Pro for
them on every course whatever its category (Pro has every feature; a unit
test fails if a feature is ever added above Pro), `consumeAllowance` and
`allowanceStatus` return "no limit", and the monthly cap is
`unrestrictedCapUsd` for a grant and `ownerMonthlyCapUsd` for an owner (`lib/entitlements.ts`;
`lib/intake-plans.dbtest.ts` checks a granted, unpaid learner end to end on
clinical, PM and IT courses), and `requireAiBudget` uses the ceiling
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

### The owner's monthly AI safety cap

Owners (`OWNER_EMAILS`) also have a monthly cap: **$35** of model spend per
calendar month (UTC), set by `OWNER_MONTHLY_AI_CAP_USD` (Nick, 2026-11-09).
At the cap the coach and lesson regenerate pause with the same message and
`aiPaused` body as a plan's monthly cap, and open again on the 1st; grading
and review never stop. It applies whether or not `BILLING_ENABLED` is on,
because it is a safety stop rather than a plan limit, and like the ceiling
it cannot be switched off ("off", 0 or junk fall back to $35). The daily
ceiling above still applies on top of it. A granted (non-owner)
unrestricted account is not affected by this setting.

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
   Optional: `AI_UNRESTRICTED_DAILY_CEILING_USD` (default 20) and
   `OWNER_MONTHLY_AI_CAP_USD` (default 35).
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

## AI access modes and the global AI ceiling (REQ-201)

Nick, 2026-11-09 ("Go with C right now"): everyone gets the core
experience, invited pilot learners get full AI, and AI becomes paid-only
once billing is on. Two server settings, read on every request, so they are
changed in Vercel without new code. Code: `lib/ai-access-config.ts` (the
rules and words) and `lib/ai-access.ts` (the checks).

### `AI_ACCESS_MODE`

| Value | Who gets full AI | Everyone else |
| --- | --- | --- |
| unset / empty / `all` | everyone, through the plan gates exactly as before REQ-201 (billing off: everyone is Pro; only the $0.50 daily budget limits AI) | -- |
| `granted` | owners (`OWNER_EMAILS`) and owner-granted accounts (Settings > Access) | the Free AI experience, below |
| `paid` | billing on: the plans decide, as designed (REQ-122, REQ-170). Billing off: owners, granted accounts and learners holding a live paid entitlement (a comp) | billing off: the Free AI experience |

It is independent of `BILLING_ENABLED`. An unrecognised value is treated as
`granted` (spend less, lock nobody out of courses) and shows as a warning in
`/api/health`, as does `granted` left on while `BILLING_ENABLED` is on
(paying learners outside the pilot would get the Free AI experience).

**The Free AI experience** (for a learner the mode limits), with every
course and every non-AI feature still open -- no one-course rule, no plan
or price shown:

- Coach chat: refused, 403 `{ error, aiAccess: { state: "limited_preview", feature: "coach", mode, resetsAt: null } }`, "The AI coach is in limited preview, ...". No model call.
- Lesson regenerate (new lesson versions): the same, `feature: "regenerate"`.
- AI-graded written answers -- grade_open, explain-back, lab written parts
  (lab steps and lab report), sim reasoning, PBQ and unit check -- share
  Free's daily graded-answer allowance (`BILLING_ALLOWANCE_GRADED_ANSWER_FREE`,
  default 3, rolling 24 hours, counted in `allowance_uses` like the plan's
  count; given back if grading fails). Past it: 429 `{ aiAccess: { state:
  "graded_limit", feature: "written_grading", limit, used, resetsAt } }`.
- Never counted: multiple choice, interactive labs, sim scoring, review.
- Open (Nick, 2026-11-09, scope approved with REQ-201): shared catalog
  lessons on first open, Quiz me, guess feedback, PBQ scenario writing, mock
  and sprint exam items, review question writing, unit-check writing and item
  re-checks. Every one is recorded in `ai_calls` and counts toward the global
  ceiling's total.

`GET /api/auth/me` carries `ai: { mode, full }` when the mode is `granted`
or `paid` (absent in `all`, so the default response is unchanged); the app
shows the coach and "Regenerate lesson" as limited preview from it.

### `AI_GLOBAL_DAILY_CEILING_USD`

Total model spend across all learners and shared generation per UTC day,
summed from `ai_calls` (the `created_at` index from migration 028) and
reused for 60 seconds per server instance. Unset, empty, `off` or 0: no
ceiling (the code has no default). **Recommended production value: `5`**
(Nick, 2026-11-09).

When the day's total reaches it, until midnight UTC:

| Blocked (everyone except owners) | Only counted, never blocked |
| --- | --- |
| Coach chat: 429 `aiAccess.state: "paused"` | grade_open, explain-back, lab steps and report, sim reasoning, PBQ grading, unit-check grading |
| Lesson regenerate: 429 `paused` | review (questions and grading) |
| First generation of a shared lesson nobody has opened: 429 `preparing`, "This lesson is being prepared. Please try again later." (prefetch-next skips it) | Quiz me, guess feedback, PBQ scenarios, exam items, unit-check writing, item re-checks, lab questions, cron and catalog jobs |

Already generated lessons are served as usual. The ceiling check is one
exported function (`globalCeilingReached()` in `lib/ai-access.ts`), outside
the model-call layer, for REQ-202 to call.

Granted accounts are capped as REQ-144 says, not by the mode: with billing
off they have the $20 daily safety ceiling (`AI_UNRESTRICTED_DAILY_CEILING_USD`)
instead of the $0.50 budget, so the global ceiling is the backstop for a
large pilot group.

### Inviting the pilot group

Settings > Access (owners only). The email field takes one address or up to
50 pasted at once (commas, spaces or one per line), with one end date and
note for all of them -- use the note `AI pilot` to tell pilot grants apart
(no schema change: it is the existing note). Every address must be valid or
none is granted; an owner's address is reported, not granted. Each address
is an ordinary audited grant; a bulk add uses one unit of the owner's
access-change rate limit per 10 addresses and sends the owner one summary
email. While the mode is `granted` or `paid`, each grant shows "Full AI
access" (active), "Full AI access once they sign up" (waiting) or "No AI
pilot access (ended)". API: `POST /api/access/grants { emails, until?, note? }`
-> `{ results: [{ email, outcome: "granted" | "owner", grant }] }`;
`GET /api/access/grants` adds `aiMode`. The CLI (`npm run access:grant`)
still takes one address at a time.

### Switching modes (runbook)

Nick sets these himself in Vercel, or asks the lead to:

1. Vercel -> backend project -> Settings -> Environment Variables ->
   **Production**: `AI_ACCESS_MODE=granted` and
   `AI_GLOBAL_DAILY_CEILING_USD=5`. (Preview: optional, same values to test.)
2. Redeploy (Vercel applies new variables on the next deployment):
   Deployments -> the latest production deployment -> Redeploy.
3. Check: `/api/health` has no AI warning; signed in as an owner,
   `GET /api/auth/me` shows `"ai": {"mode": "granted", "full": true}`; an
   account not in Settings > Access shows `"full": false` and its coach tab
   says "The AI coach is in limited preview".
4. Invite the pilot learners in Settings > Access (note `AI pilot`).
5. At billing launch: set `AI_ACCESS_MODE=paid` together with
   `BILLING_ENABLED=true`, and redeploy.
6. To undo: delete `AI_ACCESS_MODE` (or set `all`) and redeploy -- exactly the
   behaviour before REQ-201. Deleting `AI_GLOBAL_DAILY_CEILING_USD` removes the
   ceiling. No migration or data change either way; the graded answers
   counted meanwhile are ordinary `allowance_uses` rows that age out in 24
   hours.

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
  a promotion code can't be added on top. On Google Play one
  offer is bought, and on the App Store one offer code is redeemed per
  subscription.
- **The full AI cap.** A discounted learner keeps their plan's whole monthly
  AI cap. The cap is set per plan from the list price (`familyCapUsd`,
  above), and nothing in it reads what the learner paid. REQ-170: the
  published percentage is at most 25%. A unit test
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
| Google Play | The plans screen buys the base plan's **developer-determined offer** for the group (RevenueCat `purchaseSubscriptionOption`); with no such offer the regular price is bought | One offer per group on each base plan (below) |
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
| `DISCOUNT_PERCENT_<GROUP>` | The published percentage, a whole number **1-25** (REQ-170, Nick 2026-11-09: capped at 25%; a larger value is refused and the group isn't offered -- `npm run discounts:codes -- --config` lists it under `rejectedPercents`). **No default**: a group without one isn't offered. Nick hasn't set them yet (likely a flat 20%). It must match the Stripe coupon and the store offers. |
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
   on every base plan, one offer per group with offer id
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
   npm run discounts:codes -- --import codes.csv --group military --product ascendra.it_cloud_pro.yearly --expires 2027-05-01 --dry-run
   npm run discounts:codes -- --import codes.csv --group military --product ascendra.it_cloud_pro.yearly --expires 2027-05-01
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
- [ ] Switch `AI_ACCESS_MODE` from `granted` to `paid` with `BILLING_ENABLED`
      (REQ-201; `/api/health` warns while `granted` is left on).
- [ ] Watch real AI spend for a month (`npm run metrics`, `ai_calls`) and tune
      the caps and allowances.
