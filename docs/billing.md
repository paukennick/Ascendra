# Paid plans and payments (REQ-122)

Ascendra has three plans -- Free, Plus and Pro -- fully built and **off**.
One server setting, `BILLING_ENABLED`, turns them on. Until then every
learner is treated as Pro, the app shows no plan, price or upgrade prompt
anywhere, and nothing behaves differently from before (the $0.50 daily AI
budget still applies to everyone as the abuse guard).

The app asks the server at run time (`GET /api/billing/config`), so once a
store build with this code is installed, turning plans on needs **no app
update** -- only the backend setting.

## What each plan includes

| | Free | Plus | Pro |
|---|---|---|---|
| Courses | one, of the learner's choosing | every course | every course |
| Lessons, multiple-choice checks, spaced review, placement, progress | yes | yes | yes |
| AI grading of typed answers | 3 a day (a taste) | every one | every one |
| Explain-it-back, unit checks, comparison cards, Quiz me | no | yes | yes |
| AI coach | no | about 20 messages a day | no daily count |
| New lesson versions (regenerate) | no | 5 a week | 15 a week |
| Mock exams | no | 1 a month | unlimited |
| Scenario questions (PBQs), labs, readiness score | no | no | yes |

Free's ceiling is honest rather than locked: without graded typed answers,
levels go up to Guided (a Solo answer picked from shown choices counts as
assisted under the existing mastery rule). The app says "prove it with typed
answers in Plus" in one line on the plans screen and the free-course screen,
never as a padlock on every screen. Screens that only show something (the
lab card, explain-it-back's status, the unit check status, comparison
cards, the readiness score) say it's part of a plan instead of erroring; an
action that needs a plan gets one gentle sheet with the reason and "See
plans".

Sprints (short timed practice) are open on every plan; only mock exams are
counted. The study plan is open on every plan; `exam_day_plan` is reserved in
the config for a future Pro-only exam-day plan and gates nothing today.

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
`none` for no count).

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
  `{ upgrade }`), `consumeAllowance` / `withAllowance` (429 with
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
  `/api/courses/:id` (readiness), and the free-course check on the lesson,
  hint, guess, placement and prefetch routes. Multiple-choice grading and
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

A grant is an entitlement with source `grant` and an optional end date. The
policy -- who, which plan, how long -- is yours; the tool:

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
4. Decide the comp policy and run the grants (above), **before** step 6, so
   nobody loses access for a moment.
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
- [ ] Decide comps for existing learners and run the grant.
- [ ] Decide whether email verification is required before paying (Audit 3
      suggests it).
- [ ] Sales tax / VAT handling (Stripe Tax for the web; the stores handle
      theirs).
- [ ] Watch real AI spend for a month (`npm run metrics`, `ai_calls`) and tune
      the caps and allowances.
