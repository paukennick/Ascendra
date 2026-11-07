// Release 2026-11-07 rehearsal: drives the OLD production backend (master @
// c3e13ab, the code a Vercel Instant Rollback would bring back) against a
// database, by calling its route handlers directly -- no server, no network.
//
// Run from an extracted copy of master's backend (see
// rehearse-production-migration.sh, which extracts it, links node_modules
// and makes its pg pool honour PGSSLMODE=disable):
//
//   cd <master>/backend && MASTER_BACKEND=$PWD npx tsx <release>/backend/scripts/rehearsal/master-smoke.ts populate
//   ... smoke
//
// populate: what production holds -- 3 accounts and 25 graded answers made
//   through master's own register / login / grade routes, a favourite and a
//   support ticket, on cached lessons (one carrying line B's 025
//   *_choice_feedback, so 052's fold-in has data to move).
// smoke: every master route that needs no AI call, as an existing learner
//   and as a brand-new one (register, login, lesson, grade, errors, export,
//   delete...). Exits 1 if any answers 5xx or an unexpected 4xx.
//
// Routes that call the model (open grading, guess feedback, chat, PBQ,
// lesson generation) are not called: no API key exists here. Their database
// writes go through the same tables the mc grade path writes.

import { join } from "node:path";
import { Pool } from "pg";

const mode = process.argv[2];
const root = process.env.MASTER_BACKEND;
if (!root || (mode !== "populate" && mode !== "smoke")) {
  console.error("usage: MASTER_BACKEND=<master backend dir> tsx master-smoke.ts populate|smoke");
  process.exit(2);
}
process.env.AUTH_JWT_SECRET ??= "rehearsal-only-jwt-secret-not-a-real-one-0123456789";
process.env.RESEND_API_KEY ??= "re_rehearsal_placeholder";
process.env.EMAIL_FROM ??= "rehearsal@example.test";
// Mail is captured, never sent.
globalThis.fetch = (async () =>
  new Response(JSON.stringify({ id: "rehearsal" }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
console.error = () => undefined; // master logs handled 4xx paths as errors

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows as T[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: Request, ctx?: any) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function route(path: string): Promise<Record<string, Handler>> {
  return (await import(join(root!, "app/api", path, "route.ts"))) as Record<string, Handler>;
}

interface Call {
  method?: string;
  body?: unknown;
  token?: string;
  params?: Record<string, string>;
  query?: string;
}
async function call(path: string, c: Call = {}): Promise<{ status: number; json: any }> {
  const method = c.method ?? (c.body !== undefined ? "POST" : "GET");
  const handler = (await route(path))[method];
  if (!handler) throw new Error(`master has no ${method} ${path}`);
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": "198.51.100.7" };
  if (c.token) headers.authorization = `Bearer ${c.token}`;
  const req = new Request(`http://rehearsal.local/api/${path}${c.query ?? ""}`, {
    method,
    headers,
    body: c.body !== undefined ? JSON.stringify(c.body) : undefined,
  });
  const res = await handler(req, { params: Promise.resolve(c.params ?? {}) });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

const results: { what: string; status: number; ok: boolean }[] = [];
async function expect(what: string, p: Promise<{ status: number; json: any }>, okStatuses: number[] = [200, 201]) {
  const r = await p;
  const ok = okStatuses.includes(r.status);
  results.push({ what, status: r.status, ok });
  if (!ok) process.stdout.write(`  FAIL ${what}: ${r.status} ${JSON.stringify(r.json).slice(0, 300)}\n`);
  return r;
}

const PW = ["Rehearsal", "Pass", "2026", "x"].join("-");

async function account(email: string): Promise<{ id: string; token: string }> {
  const reg = await expect(`register ${email}`, call("auth/register", { body: { email, password: PW, displayName: "Rehearsal" } }));
  void reg;
  await q(`update app_users set email_verified_at = coalesce(email_verified_at, now()) where email = $1`, [email]);
  const login = await expect(`login ${email}`, call("auth/login", { body: { email, password: PW } }));
  const token = login.json?.accessToken;
  if (!token) throw new Error(`no access token in login response: ${JSON.stringify(login.json).slice(0, 200)}`);
  const id = (await q<{ id: string }>(`select id from app_users where email = $1`, [email]))[0].id;
  return { id, token };
}

// Three objectives on one shared catalog track with no course disclaimer,
// each given a cached lesson so no route needs the model.
async function lessonObjectives(): Promise<{ trackId: string; unitId: string; objectiveIds: string[] }> {
  const rows = await q<{ track_id: string; unit_id: string; objective_id: string }>(
    `select st.id as track_id, cu.id as unit_id, o.id as objective_id
       from subject_tracks st
       join course_units cu on cu.track_id = st.id
       join objectives o on o.unit_id = cu.id
      where st.user_id is null and st.code = 'SECPLUS'
      order by cu.sort_order, o.sort_order
      limit 3`
  );
  if (rows.length < 3) throw new Error("the SECPLUS catalog track is not seeded");
  const hasB025 = (
    await q<{ n: number }>(
      `select count(*)::int as n from information_schema.columns
        where table_schema = 'public' and table_name = 'lesson_content' and column_name = 'fade_choice_feedback'`
    )
  )[0].n === 1;
  for (const [i, r] of rows.entries()) {
    const choices = JSON.stringify([`Right ${i}`, `Wrong A ${i}`, `Wrong B ${i}`, `Wrong C ${i}`]);
    await q(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
                                   solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'Guess?', 'Teaching text.', 'Guided problem?', $2::jsonb, 0, 'Because.', 'Solo check?', $2::jsonb, 0, 'Because.', 'rehearsal')
       on conflict (objective_id) do nothing`,
      [r.objective_id, choices]
    );
    if (hasB025 && i === 0) {
      await q(
        `update lesson_content set fade_choice_feedback = $2::jsonb where objective_id = $1`,
        [r.objective_id, JSON.stringify(["Right because.", "A fails.", "B fails.", "C fails."])]
      );
    }
  }
  return { trackId: rows[0].track_id, unitId: rows[0].unit_id, objectiveIds: rows.map((r) => r.objective_id) };
}

async function gradeMc(token: string, unitId: string, objectiveId: string, stage: "fade" | "solo", correct: boolean) {
  const chosenIndex = correct ? 0 : 1;
  return call("grade", {
    token,
    body: {
      format: "mc",
      kind: "lesson",
      stage,
      objectiveId,
      unitId,
      question: stage === "fade" ? "Guided problem?" : "Solo check?",
      chosenIndex,
      correctIndex: 0,
      chosenText: chosenIndex === 0 ? "Right" : "Wrong A",
      why: "Because.",
      confidence: 3,
    },
  });
}

async function populate() {
  const { trackId, unitId, objectiveIds } = await lessonObjectives();
  const users = [];
  for (const n of [1, 2, 3]) users.push(await account(`learner${n}@rehearsal.test`));
  // 25 answers: 10, 10 and 5, mixed right and wrong, both stages.
  const plan = [10, 10, 5];
  for (const [u, count] of plan.entries()) {
    for (let i = 0; i < count; i++) {
      const objectiveId = objectiveIds[i % objectiveIds.length];
      await expect(`grade mc (learner${u + 1} #${i + 1})`, gradeMc(users[u].token, unitId, objectiveId, i % 2 ? "solo" : "fade", i % 3 !== 2));
    }
  }
  await expect(
    "favourite a course",
    call("courses/[id]/favorite", { method: "PATCH", token: users[0].token, params: { id: trackId }, body: { favorite: true } })
  );
  await expect("study session", call("sessions", { token: users[0].token, body: { trackId } }));
  await expect(
    "support ticket",
    call("support", { token: users[0].token, body: { kind: "ticket", subject: "Rehearsal ticket", body: "Hello from the rehearsal." } })
  );
  const n = (await q<{ n: number }>(`select count(*)::int as n from attempts`))[0].n;
  console.log(`populate: ${users.length} accounts, ${n} attempts`);
}

async function smoke() {
  const { trackId, unitId, objectiveIds } = await lessonObjectives();
  // An account made before the release (populate) and one made now.
  const old = await (async () => {
    const login = await expect("login (pre-release account)", call("auth/login", { body: { email: "learner1@rehearsal.test", password: PW } }));
    return { token: login.json?.accessToken as string };
  })();
  const fresh = await account(`fresh-${Date.now()}@rehearsal.test`);
  for (const [who, token] of [
    ["pre-release", old.token],
    ["new", fresh.token],
  ] as const) {
    await expect(`${who}: me`, call("auth/me", { token }));
    await expect(`${who}: courses`, call("courses", { token }));
    await expect(`${who}: course`, call("courses/[id]", { token, params: { id: trackId } }));
    await expect(`${who}: unit`, call("units/[id]", { token, params: { id: unitId } }));
    await expect(`${who}: taxonomy`, call("taxonomy", { token }));
    await expect(`${who}: lesson (cached)`, call("objectives/[id]/lesson", { token, params: { id: objectiveIds[0] } }));
    await expect(`${who}: grade mc right`, gradeMc(token, unitId, objectiveIds[1], "fade", true));
    await expect(`${who}: grade mc wrong`, gradeMc(token, unitId, objectiveIds[2], "solo", false));
    await expect(`${who}: errors`, call("errors", { token }));
    await expect(`${who}: attempts`, call("attempts", { token, query: `?trackId=${trackId}` }));
    await expect(`${who}: study session`, call("sessions", { token, body: { trackId } }));
    await expect(`${who}: study sessions`, call("sessions", { token, query: `?trackId=${trackId}` }));
    await expect(`${who}: auth sessions`, call("auth/sessions", { token }));
    await expect(`${who}: favourite`, call("courses/[id]/favorite", { method: "PATCH", token, params: { id: trackId }, body: { favorite: true } }));
    await expect(`${who}: support list`, call("support", { token }));
    await expect(`${who}: support ticket`, call("support", { token, body: { kind: "ticket", subject: "Smoke", body: "Smoke test." } }));
    await expect(`${who}: export`, call("account/export", { token }));
  }
  await expect("health", call("health"), [200, 503]);
  const del = await expect("delete new account", call("account", { method: "DELETE", token: fresh.token, body: { password: PW } }));
  void del;
  const bad = results.filter((r) => !r.ok);
  console.log(`smoke: ${results.length - bad.length}/${results.length} master routes answered as expected`);
  if (bad.length) process.exitCode = 1;
}

(mode === "populate" ? populate() : smoke())
  .catch((err) => {
    process.stdout.write(`master-smoke ${mode} failed: ${(err as Error).stack ?? err}\n`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
