// REQ-169 (intake form) and REQ-170 (category plans),
// against a real Postgres with every migration applied (060 included). The
// model is a fake client and Stripe a fake fetch -- no key, no network.
//
//   1. Intake: saved and read back per learner, writes the study plans,
//      checks course visibility, skip, the suggestion only with plans on,
//      "teaching a class", export and account deletion.
//   2. Category plans: a plan opens its own category only; all-access is
//      every non-clinical course; the clinical add-on needs all-access; the
//      AI cap is the sum of the plans held; webhooks store family and scope.
//   3. Unrestricted access (REQ-144) under category pricing: every
//      category, clinical included, no payment, no upgrade prompt, capped at
//      all-access plus the clinical add-on.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { aiAllowanceStatus, featureLock, grantEntitlement, requireCourseAccess, requireFeature, tierFor, tierForCourse, UpgradeRequiredError } from "./entitlements";
import { buildAccountExport } from "./account-export";
import { GET as intakeGet, PUT as intakePut } from "../app/api/intake/route";
import { GET as meGet } from "../app/api/billing/me/route";
import { POST as checkoutPost } from "../app/api/billing/checkout/route";
import { POST as grantsPost } from "../app/api/access/grants/route";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { POST as rcPost } from "../app/api/billing/webhooks/revenuecat/route";
import { POST as chatPost } from "../app/api/chat/route";

const run = Date.now().toString(36);
const users: string[] = [];
const tracks: Record<"it" | "pm" | "nurse" | "acad" | "own", string> = { it: randomUUID(), pm: randomUUID(), nurse: randomUUID(), acad: randomUUID(), own: randomUUID() };
let owner = "";
const ENV = [
  "BILLING_ENABLED",
  "OWNER_EMAILS",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_CLINICAL_ADDON_MONTHLY",
  "BILLING_WEB_RETURN_URL",
  "REVENUECAT_WEBHOOK_AUTH",
  "SUPPORT_EMAIL",
  "AI_DAILY_BUDGET_USD",
];
const RC = "rc-secret-intake-test";
const DAY = 86_400_000;
const today = new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const call = (fn: any, url: string, u: string, method = "GET", body?: unknown) =>
  fn(new Request(`http://t${url}`, { method, headers: auth(u), body: body === undefined ? undefined : JSON.stringify(body) })) as Promise<Response>;
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `intake-${run}-${users.length}@example.test`]);
  return u;
}
const rc = (event: Record<string, unknown>) =>
  rcPost(
    new Request("http://t/api/billing/webhooks/revenuecat", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: RC },
      body: JSON.stringify({ api_version: "1.0", event }),
    })
  );
const buy = (u: string, product: string, days = 30) =>
  rc({
    id: `rc-${run}-${randomUUID()}`,
    type: "INITIAL_PURCHASE",
    event_timestamp_ms: Date.now(),
    app_user_id: u,
    original_transaction_id: `otx-${run}-${randomUUID()}`,
    product_id: product,
    expiration_at_ms: Date.now() + days * DAY,
  });

before(async () => {
  setAiCallSink(async () => {});
  __setClientForTest({
    messages: {
      async create() {
        return { content: [{ type: "text", text: "What do you think?" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
      async parse(body: any) {
        return { parsed_output: body.output_config.format.parse(JSON.stringify({ givenAway: [] })), stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
    },
  });
  owner = await newUser();
  const sub = async (cat: string, slug: string) =>
    (await queryOne<{ id: string }>(
      `select s.id from education_subcategories s join education_categories c on c.id = s.category_id where c.slug = $1 and s.slug = $2`,
      [cat, slug]
    ))!.id;
  const subs = {
    it: await sub("aws-certifications", "aws-certifications"),
    pm: await sub("project-management-certifications", "pmi-certifications"),
    nurse: await sub("healthcare-nursing", "nclex-preparation"),
    acad: await sub("teaching-academics", "math"),
  };
  for (const k of ["it", "pm", "nurse", "acad"] as const) {
    await query(`insert into subject_tracks (id, code, title, track_type, user_id, subcategory_id) values ($1, $2, $3, 'certification', null, $4)`, [
      tracks[k],
      `INT-${k}-${run}`,
      `Intake ${k}`,
      subs[k],
    ]);
  }
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'My own notes', 'certification', $3)`, [tracks.own, `INT-own-${run}`, owner]);
});

after(async () => {
  __setClientForTest(null);
  setAiCallSink(null);
  for (const k of ENV) delete process.env[k];
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from billing_events where event_id like $1`, [`%${run}%`]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [Object.values(tracks)]);
  await closePool();
});

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  process.env.REVENUECAT_WEBHOOK_AUTH = RC;
});

describe("REQ-169 the intake form", () => {
  test("saved per learner, read back, and written into each course's study plan", async () => {
    const u = await newUser();
    const body = {
      goal: "pass_exam",
      experience: "some",
      weeklyHours: 6,
      useFor: "work",
      targets: [{ trackId: tracks.it, examDate: inDays(70) }, { trackId: tracks.pm }],
      today,
    };
    const v = await json(await call(intakePut, "/api/intake", u, "PUT", body));
    assert.equal(v.answered, true);
    assert.deepEqual(v.targets.map((t: any) => [t.trackId, t.examDate, t.category]), [[tracks.it, inDays(70), "it_cloud"], [tracks.pm, null, "pm"]]);
    assert.equal(v.suggestPlacement, true);
    assert.equal(v.planSuggestion, null, "no suggestion (and no plan talk) while plans are off");
    assert.equal(v.classContact, null);
    const plans = await query<{ track_id: string; exam_date: string | null; weekly_hours: string }>(
      `select track_id, to_char(exam_date, 'YYYY-MM-DD') as exam_date, weekly_hours from study_plans where user_id = $1 order by exam_date nulls last`,
      [u]
    );
    assert.deepEqual(plans.map((p) => [p.track_id, p.exam_date, Number(p.weekly_hours)]), [[tracks.it, inDays(70), 3], [tracks.pm, null, 3]]);
    // Editing later (Settings > Study profile) replaces the answers.
    const w = await json(await call(intakePut, "/api/intake", u, "PUT", { experience: "new", targets: [{ trackId: tracks.pm, examDate: inDays(20) }], today }));
    assert.deepEqual(w.targets.map((t: any) => t.trackId), [tracks.pm]);
    assert.equal(w.goal, null);
    assert.equal(w.suggestPlacement, false);
    // No hours given: the plan keeps its own.
    assert.equal(Number((await queryOne<{ h: string }>(`select weekly_hours as h from study_plans where user_id = $1 and track_id = $2`, [u, tracks.pm]))!.h), 3);
    // Another learner sees nothing of it.
    const other = await newUser();
    const o = await json(await call(intakeGet, `/api/intake?today=${today}`, other));
    assert.equal(o.answered, false);
    assert.deepEqual(o.targets, []);
  });

  test("weekly hours fill in only plans with no hours yet; existing plan hours are never overwritten (Nick, 2026-11-09)", async () => {
    const u = await newUser();
    // The learner already set 8 hours on the IT course's own plan screen.
    await query(`insert into study_plans (user_id, track_id, exam_date, weekly_hours) values ($1, $2, null, 8)`, [u, tracks.it]);
    await json(await call(intakePut, "/api/intake", u, "PUT", {
      weeklyHours: 2,
      targets: [{ trackId: tracks.it, examDate: inDays(40) }, { trackId: tracks.pm }],
      today,
    }));
    const hours = async (t: string) =>
      queryOne<{ h: string; d: string | null }>(`select weekly_hours as h, to_char(exam_date, 'YYYY-MM-DD') as d from study_plans where user_id = $1 and track_id = $2`, [u, t]);
    const it = (await hours(tracks.it))!;
    assert.equal(Number(it.h), 8, "existing hours kept");
    assert.equal(it.d, inDays(40), "the exam date is still applied");
    assert.equal(Number((await hours(tracks.pm))!.h), 1, "a new plan gets its share (2 hours over 2 courses)");
    // Saving again with other hours changes neither plan's hours.
    await json(await call(intakePut, "/api/intake", u, "PUT", { weeklyHours: 20, targets: [{ trackId: tracks.it }, { trackId: tracks.pm }], today }));
    assert.deepEqual([Number((await hours(tracks.it))!.h), Number((await hours(tracks.pm))!.h)], [8, 1]);
  });

  test("bad answers are a 400; another learner's private course is a 404; nothing is saved", async () => {
    const u = await newUser();
    await json(await call(intakePut, "/api/intake", u, "PUT", { goal: "fame", today }), 400);
    await json(await call(intakePut, "/api/intake", u, "PUT", { targets: [{ trackId: tracks.it, examDate: "2001-01-01" }], today }), 400);
    await json(await call(intakePut, "/api/intake", u, "PUT", { targets: [{ trackId: tracks.own }], today }), 404);
    assert.equal((await queryOne(`select 1 from learner_intake where user_id = $1`, [u])), null);
    // The owner may name their own course.
    await json(await call(intakePut, "/api/intake", owner, "PUT", { targets: [{ trackId: tracks.own }], today }));
  });

  test("skip is remembered and keeps earlier answers", async () => {
    const u = await newUser();
    const s = await json(await call(intakePut, "/api/intake", u, "PUT", { skip: true, today }));
    assert.deepEqual([s.answered, s.skipped], [false, true]);
    await json(await call(intakePut, "/api/intake", u, "PUT", { goal: "new_skill", today }));
    const again = await json(await call(intakePut, "/api/intake", u, "PUT", { skip: true, today }));
    assert.deepEqual([again.answered, again.goal], [true, "new_skill"]);
  });

  test("with plans on: a category plan and length are suggested, never a price; teaching shows the class contact line instead", async () => {
    process.env.BILLING_ENABLED = "true";
    process.env.SUPPORT_EMAIL = "help@example.test";
    const u = await newUser();
    const v = await json(await call(intakePut, "/api/intake", u, "PUT", { targets: [{ trackId: tracks.it, examDate: inDays(70) }], today }));
    assert.deepEqual(v.planSuggestion.scopes, ["it_cloud"]);
    assert.equal(v.planSuggestion.period, "quarterly");
    assert.doesNotMatch(JSON.stringify(v.planSuggestion), /usd|\$\d|\d+\.\d\d|% off/i);
    const both = await json(await call(intakePut, "/api/intake", u, "PUT", { targets: [{ trackId: tracks.nurse }, { trackId: tracks.pm }], today }));
    assert.deepEqual(both.planSuggestion.scopes, ["all_access", "clinical"]);
    const t = await json(await call(intakePut, "/api/intake", u, "PUT", { useFor: "teaching", targets: [{ trackId: tracks.it }], today }));
    assert.equal(t.planSuggestion, null);
    assert.deepEqual(t.classContact, { line: "Using Ascendra with a class? Contact us", email: "help@example.test" });
    // The published prices are identical whatever the learner answered.
    const a = await json(await (await import("../app/api/billing/config/route")).GET());
    assert.equal(a.plans.find((p: any) => p.id === "it_cloud_plus_quarterly").usd, 29.99);
  });

  test("in the account export; deleted with the account", async () => {
    const u = await newUser();
    await json(await call(intakePut, "/api/intake", u, "PUT", { goal: "career_change", targets: [{ trackId: tracks.pm, examDate: inDays(30) }], today }));
    const exp = (await buildAccountExport(u, (sql, p) => query(sql, p))) as Record<string, any>;
    assert.equal(exp.intake[0].goal, "career_change");
    assert.equal(exp.intakeTargets[0].track_id, tracks.pm);
    await query(`delete from app_users where id = $1`, [u]);
    assert.equal(Number((await queryOne<{ n: number }>(
      `select (select count(*) from learner_intake where user_id = $1) + (select count(*) from learner_intake_targets where user_id = $1) as n`,
      [u]
    ))!.n), 0);
  });
});

describe("REQ-170 category plans", () => {
  test("switch off: everyone is Pro everywhere and no entitlement row is read", async () => {
    const u = await newUser();
    assert.equal(await tierForCourse(u, tracks.nurse), "pro");
    assert.equal(await requireCourseAccess(u, tracks.pm), "pro");
  });

  test("a category plan opens its own courses only; others are on Free terms", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await newUser();
    assert.equal((await json(await buy(u, "ascendra.it_cloud_plus.monthly"))).outcome, "applied");
    const row = await queryOne(`select family, scope, tier from entitlements where user_id = $1`, [u]);
    assert.deepEqual(row, { family: "it_cloud_plus", scope: "it_cloud", tier: "plus" });
    assert.equal(await tierForCourse(u, tracks.it), "plus");
    assert.equal(await tierForCourse(u, tracks.pm), "free");
    assert.equal(await tierFor(u), "plus", "the summary tier is the best held anywhere");
    await requireFeature(u, "coach", tracks.it);
    await assert.rejects(requireFeature(u, "coach", tracks.pm), (e: unknown) => {
      assert.ok(e instanceof UpgradeRequiredError);
      assert.deepEqual((e as any).extra.upgrade, { feature: "coach", requiredTier: "plus", currentTier: "free", scope: "pm" });
      assert.match((e as Error).message, /comes with Project management Plus/);
      return true;
    });
    // Pro features are still Pro inside the category.
    assert.equal((await featureLock(u, "pbq", tracks.it))?.message.includes("IT and cloud Pro"), true);
    // The first other course opened becomes the free course; a second is locked.
    assert.equal(await requireCourseAccess(u, tracks.pm), "free");
    await assert.rejects(requireCourseAccess(u, tracks.acad), /or study this course with the All access plan/);
    assert.equal(await requireCourseAccess(u, tracks.it), "plus", "covered courses never touch the free course");
    // Their own course comes with any paid plan.
    // (u doesn't own it; the owner does.)
    await json(await buy(owner, "ascendra.fitness_plus.monthly"));
    assert.equal(await tierForCourse(owner, tracks.own), "plus");
    // The coach in the other category: a 402 naming that category's plan.
    const res = await json(await call(chatPost, "/api/chat", u, "POST", { trackId: tracks.pm, message: "hi" }), 402);
    assert.equal(res.upgrade.scope, "pm");
  });

  test("all-access covers every non-clinical course, not clinical; the add-on needs all-access; caps add up", async () => {
    process.env.BILLING_ENABLED = "true";
    process.env.AI_DAILY_BUDGET_USD = "off";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PRICE_CLINICAL_ADDON_MONTHLY = "price_addon";
    process.env.BILLING_WEB_RETURN_URL = "https://a.test";
    const u = await newUser();
    // Without all-access the add-on is refused before Stripe is called.
    await json(await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "clinical_addon_monthly" }), 409);
    await json(await buy(u, "ascendra_all_access:yearly", 365));
    for (const k of ["it", "pm", "acad"] as const) assert.equal(await tierForCourse(u, tracks[k]), "pro", k);
    assert.equal(await tierForCourse(u, tracks.nurse), "free");
    const me1 = await json(await call(meGet, "/api/billing/me", u));
    assert.equal(me1.coversEverything, false);
    assert.equal(me1.entitlement.scope, "all_access");
    const real = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ url: "https://checkout.stripe.test/s" }), { status: 200 })) as typeof fetch;
    try {
      await json(await call(checkoutPost, "/api/billing/checkout", u, "POST", { planId: "clinical_addon_monthly" }));
    } finally {
      globalThis.fetch = real;
    }
    await json(await buy(u, "ascendra.clinical_addon.monthly"));
    assert.equal(await tierForCourse(u, tracks.nurse), "pro");
    const me2 = await json(await call(meGet, "/api/billing/me", u));
    assert.equal(me2.coversEverything, true);
    assert.equal(me2.freeCourse, null);
    // The cap is all-access ($7.35) + the add-on ($12.81): $20.16 of spend pauses chat, $20 doesn't.
    // Test model: 1M output tokens = $0.50 (billing.dbtest's rate), so 40M = $20.
    await query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok) values ($1,'chat','claude-haiku-5-5',0,40000000,1,true)`, [u]);
    assert.equal((await aiAllowanceStatus(u, "pro")).paused, false);
    await query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok) values ($1,'chat','claude-haiku-5-5',0,1000000,1,true)`, [u]);
    assert.equal((await aiAllowanceStatus(u, "pro")).paused, true);
  });

  test("a downgrade to another category's lower plan keeps the paid higher plan's scope to its end", async () => {
    process.env.BILLING_ENABLED = "true";
    const u = await newUser();
    const otx = `otx-${run}-${randomUUID()}`;
    const ev = (type: string, at: number, product: string) => ({
      id: `rc-${run}-${randomUUID()}`, type, event_timestamp_ms: at, app_user_id: u, original_transaction_id: otx, product_id: product, expiration_at_ms: Date.now() + 20 * DAY,
    });
    await json(await rc(ev("INITIAL_PURCHASE", Date.now() - 5000, "ascendra.all_access.monthly")));
    // RevenueCat reports the lower product landing on the same transaction as a purchase/renewal.
    await json(await rc(ev("RENEWAL", Date.now() - 1000, "ascendra.pm_plus.monthly")));
    assert.equal(await tierForCourse(u, tracks.it), "pro", "all-access held to the end of its paid month");
    const held = await queryOne(`select family, scope from entitlements where user_id = $1 and external_id like 'held:%'`, [u]);
    assert.deepEqual(held, { family: "all_access", scope: "all_access" });
  });
});

describe("REQ-144 unrestricted access under category pricing", () => {
  test("a granted, unpaid learner opens clinical, PM and IT courses with every feature and never sees an upgrade prompt", async () => {
    process.env.BILLING_ENABLED = "true";
    process.env.AI_DAILY_BUDGET_USD = "off";
    const ownerEmail = `owner-${run}@example.test`;
    process.env.OWNER_EMAILS = ownerEmail;
    const ownerAcct = randomUUID();
    users.push(ownerAcct);
    await query(`insert into app_users (id, email, email_verified_at) values ($1, $2, now())`, [ownerAcct, ownerEmail]);
    const u = randomUUID();
    users.push(u);
    const email = `granted-${run}@example.test`;
    await query(`insert into app_users (id, email, email_verified_at) values ($1, $2, now())`, [u, email]);
    // Granted the way the owner does it in Settings > Access.
    await json(await call(grantsPost, "/api/access/grants", ownerAcct, "POST", { email }));
    assert.equal((await queryOne(`select 1 from entitlements where user_id = $1`, [u])), null, "no payment, no plan row");

    for (const k of ["nurse", "pm", "it"] as const) {
      assert.equal(await requireCourseAccess(u, tracks[k]), "pro", k);
      for (const f of ["coach", "pbq", "labs", "readiness", "mock_exam"] as const) {
        assert.equal(await featureLock(u, f, tracks[k]), null, `${k} ${f}`);
        assert.equal(await requireFeature(u, f, tracks[k]), "pro");
      }
      const course = await json(await (courseGet as any)(new Request(`http://t/api/courses/${tracks[k]}`, { headers: auth(u) }), { params: Promise.resolve({ id: tracks[k] }) }));
      assert.equal(course.readinessLocked, undefined, `${k}: no "part of a plan" line`);
      const res = await call(chatPost, "/api/chat", u, "POST", { trackId: tracks[k], message: "hi" });
      const body = await res.json();
      assert.equal(res.status, 200, `${k} coach: ${JSON.stringify(body)}`);
      assert.equal(body.upgrade, undefined);
    }
    assert.equal((await queryOne(`select 1 from free_course_choice where user_id = $1`, [u])), null, "opening three categories never set a free course");
    const me = await json(await call(meGet, "/api/billing/me", u));
    assert.equal(me.tier, "pro");
    assert.equal(me.coversEverything, true);
    assert.equal(me.unrestricted.level, "unrestricted");
    assert.deepEqual(me.allowances, []);
    assert.equal(me.freeCourse, null);

    // Capped at all-access + the clinical add-on: $20.16 (40M test tokens = $20).
    await query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok, created_at) values ($1,'chat','claude-haiku-5-5',0,40000000,1,true, date_trunc('month', now()))`, [u]);
    assert.equal((await aiAllowanceStatus(u, "pro")).paused, false);
    await query(`insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, latency_ms, ok, created_at) values ($1,'chat','claude-haiku-5-5',0,1000000,1,true, date_trunc('month', now()))`, [u]);
    assert.equal((await aiAllowanceStatus(u, "pro")).paused, true);
  });
});
