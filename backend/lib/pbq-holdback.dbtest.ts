// FAIL-1000, FAIL-1001, FAIL-1005: generating a PBQ scenario. The first two live
// attempts (2026-11-10) were both held back for "uncertain" claims that were
// only caveats about wording, and the learner saw "something went wrong on
// our side" (a 503) instead of the held-back message. Now a held-back
// scenario is written once more, and if that one is held back too the
// learner gets a 409 with the real message. Both held-back scenarios are
// still logged and never stored or shown.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { pbqGenerationPrompt } from "./prompts";
import { GET as pbqGet } from "../app/api/pbq/route";

const run = randomUUID().slice(0, 8);
const track = randomUUID();
const unit = randomUUID();
const users: string[] = [];
let replies: Array<{ confidence: string; uncertainClaims: string[] }> = [];
let calls = 0;

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `pbqh-${run}-${users.length}@example.test`]);
  await recordStudyNoticeAcceptance(u);
  return u;
}
const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` });
const generate = (u: string) => pbqGet(new Request(`http://t/api/pbq?unitId=${unit}&fresh=1`, { headers: auth(u) }));
const holdbacks = async () => (await query<{ n: number }>(`select count(*)::int as n from item_holdbacks where item_kind = 'pbq' and unit_id = $1`, [unit]))[0].n;

before(async () => {
  setAiCallSink(null);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'PBQH', 'certification', null)`, [track, `PBQH-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Controls', 1)`, [unit, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Compare control types', 1)`, [randomUUID(), unit]);
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async () => {
        calls++;
        const r = replies.shift() ?? { confidence: "high", uncertainClaims: [] };
        return {
          parsed_output: { title: "Audit", scenario: "1) classify 2) justify", subParts: ["classify", "justify"], ...r },
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  });
});

beforeEach(async () => {
  calls = 0;
  replies = [];
  await query(`delete from item_holdbacks where unit_id = $1`, [unit]);
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("FAIL-1000/1001: generating a PBQ scenario", () => {
  test("FAIL-1005: listed claims with medium confidence are served on the first call, not held back", async () => {
    replies = [{ confidence: "medium", uncertainClaims: ["The clinic scenario is invented; no regulation is claimed."] }];
    const res = await generate(await newUser());
    assert.equal(res.status, 200);
    assert.equal(calls, 1);
    assert.equal(await holdbacks(), 0);
  });

  test("a low-confidence first scenario is written once more and the second is served", async () => {
    replies = [{ confidence: "low", uncertainClaims: ["unsure of the port"] }];
    const res = await generate(await newUser());
    assert.equal(res.status, 200);
    const body = (await res.json()) as { scenario: { title: string } };
    assert.equal(body.scenario.title, "Audit");
    assert.equal(calls, 2);
    assert.equal(await holdbacks(), 1, "the held-back one is still logged");
  });

  test("two low-confidence scenarios: a 409 with the real message, nothing stored, both logged", async () => {
    const unsure = { confidence: "low", uncertainClaims: ["unsure"] };
    replies = [unsure, unsure];
    const before = (await query<{ n: number }>(`select count(*)::int as n from pbq_scenarios where unit_id = $1`, [unit]))[0].n;
    const res = await generate(await newUser());
    assert.equal(res.status, 409);
    assert.match(((await res.json()) as { error: string }).error, /couldn't write a scenario we're confident in/);
    assert.equal(calls, 2, "only one extra try");
    assert.equal(await holdbacks(), 2);
    const afterCount = (await query<{ n: number }>(`select count(*)::int as n from pbq_scenarios where unit_id = $1`, [unit]))[0].n;
    assert.equal(afterCount, before, "nothing held back is stored");
  });

  test("a confident first scenario costs one call", async () => {
    const res = await generate(await newUser());
    assert.equal(res.status, 200);
    assert.equal(calls, 1);
    assert.equal(await holdbacks(), 0);
  });

  test("the prompt says invented settings and wording caveats are not uncertain claims", () => {
    const { system } = pbqGenerationPrompt({ trackTitle: "Security+", unitTitle: "Controls", unitObjectives: ["Compare control types"] });
    const text = JSON.stringify(system);
    assert.match(text, /invented, so they are not claims/);
    assert.match(text, /Do not list that a term or label is paraphrased/);
  });
});
