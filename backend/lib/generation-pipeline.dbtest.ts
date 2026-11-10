// REQ-187 (audit 2026-11-09, prompts and pipeline) against a real Postgres
// with every migration applied and the seed loaded. The model is a fake
// client or an injected generator/checker; no API key.
//   - P8: teaching text held back on the writer's doubt; the cooldown
//   - R4/P7 + REQ-196: a verification program is queued, never run, in the request path (fail closed)
//   - (R1's degree-advising lessons: replaced by REQ-195, lib/cmpcbs-general-courses.dbtest.ts)
//   - R12/P9: a coach reply agreeing a verdict was wrong flags the item
//   - lesson fixes (void / replace) through the app's mechanisms; the
//     "authored" fix is tested in lib/cmpcbs-general-courses.dbtest.ts
//   - R6: the re-check of content stored before the gate
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { lessonItemId, itemStatus, clearStaged, confirmItemWrong } from "./item-quality";
import type { CheckItem, FactChecker } from "./fact-check";
import { getLessonFor, getSharedLesson, SHARED } from "./lesson-store";
import {
  ContentHeldBackError,
  NOT_SERVED_MARK,
  EXEC_QUEUE_FAILED,
  recentlyHeldBack,
  ensureGeneration,
  type GenerationHandle,
  type LessonGenerator,
  type ObjectiveRow,
} from "./lesson-generation";
import { flagChatDisputes } from "./chat-dispute";
import { applyLessonFix, lookupFix, type LessonFix } from "./lesson-fixes";
import { recheckStored } from "./recheck-stored";
import { RunBudget } from "./run-budget";
import { listStaged } from "./staging";
import { execBacklog, queueExecCheck } from "./exec-checks";
import { LESSON_FIXES_2026_11_09 } from "../scripts/lesson-fixes-2026-11-09";
import fixture from "./fixtures/audit-2026-11-09-lessons.json";
import { POST as chatPost } from "../app/api/chat/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = Array.from({ length: 12 }, () => randomUUID());
const users: string[] = [];
const CHOICES = ["Port 80", "Port 443", "Port 8080", "Port 22"];
let modelCalls = 0;
let onParse: (body: any) => unknown = () => {
  throw new Error("no model call expected");
};

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `gp-${run}-${users.length}@example.test`]);
  return u;
}
const objRow = (i: number): ObjectiveRow => ({ title: `Objective ${i + 1}`, unit_title: "Ports", track_title: "Web basics", ctx: null });
const practice = (tag: string, extra: Record<string, unknown> = {}) => ({
  fadeProblem: `fade ${tag}`, fadeChoices: CHOICES, fadeCorrectIndex: 1, fadeWhy: "w",
  soloCheck: `solo ${tag}`, soloChoices: CHOICES, soloCorrectIndex: 1, soloWhy: "w",
  confidence: "high" as const, uncertainClaims: [] as string[], ...extra,
});
async function insertLesson(objectiveId: string, row: Record<string, unknown>, model = "claude-sonnet-5", generatedAt?: string) {
  await query(
    `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
       solo_check, solo_choices, solo_correct_index, solo_why, teach_cards, model, generated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, coalesce($14::timestamptz, now()))
     on conflict (objective_id) do update set guess_prompt = excluded.guess_prompt, teach = excluded.teach,
       fade_problem = excluded.fade_problem, fade_choices = excluded.fade_choices, fade_correct_index = excluded.fade_correct_index,
       fade_why = excluded.fade_why, solo_check = excluded.solo_check, solo_choices = excluded.solo_choices,
       solo_correct_index = excluded.solo_correct_index, solo_why = excluded.solo_why, teach_cards = excluded.teach_cards,
       model = excluded.model, generated_at = excluded.generated_at`,
    [
      objectiveId,
      row.guess_prompt ?? "g",
      row.teach,
      row.fade_problem,
      JSON.stringify(row.fade_choices),
      row.fade_correct_index,
      row.fade_why,
      row.solo_check,
      JSON.stringify(row.solo_choices),
      row.solo_correct_index,
      row.solo_why,
      row.teach_cards ? JSON.stringify(row.teach_cards) : null,
      model,
      generatedAt ?? null,
    ]
  );
}
async function attempt(u: string, objectiveId: string, stage: "fade" | "solo", question: string, verdict: "correct" | "incorrect", answer = "Port 80") {
  await query(
    `insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict)
     values ($1, $2, 'lesson', $3, 'mc', $4, $5, $6)`,
    [u, objectiveId, stage, question, answer, verdict]
  );
}

before(async () => {
  setAiCallSink(async () => {});
  delete process.env.ITEM_FACT_CHECK;
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Web basics', 'certification', null)`, [track, `GP${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Ports', 1, 100)`, [unit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `Objective ${i + 1}`, i + 1]);
  }
  __setClientForTest({
    messages: {
      create: async () => {
        modelCalls++;
        return { content: [{ type: "text", text: "You're right: port 443 is the answer, so that was graded wrongly." }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
      parse: async (body: any) => {
        modelCalls++;
        return { parsed_output: onParse(body), stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
    },
  } as any);
});

beforeEach(() => {
  modelCalls = 0;
  onParse = () => {
    throw new Error("no model call expected");
  };
});

after(async () => {
  __setClientForTest(null);
  setAiCallSink(null);
  delete process.env.ITEM_FACT_CHECK;
  await query(`delete from item_status where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from item_flags where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from item_holdbacks where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from attempts where user_id = any($1::uuid[])`, [users]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

const fresh = () => new Map<string, GenerationHandle>();

describe("P8: teaching text is held back on the writer's doubt", () => {
  test("unsure twice: not shown, logged, and the objective cools down without another model call", async () => {
    const o = objs[0];
    let intros = 0;
    const gen: LessonGenerator = {
      intro: async (_r, _a, meta) => {
        intros++;
        return { guessPrompt: "g", teach: `t${intros}`, confidence: "medium", uncertainClaims: [meta?.introSteer ? "still unsure" : "the 2026 limit"] };
      },
      practice: async () => practice("x"),
      model: () => "test",
    };
    const h = ensureGeneration(o, objRow(0), { scope: SHARED, generator: gen, pending: fresh() });
    await assert.rejects(h.introPromise, ContentHeldBackError);
    await assert.rejects(h.fullPromise, ContentHeldBackError);
    assert.equal(intros, 2, "one retry");
    assert.equal(await getSharedLesson(o), null, "nothing stored");
    const held = await query<{ item_kind: string; claims: string[] }>(`select item_kind, claims from item_holdbacks where objective_id = $1 order by created_at`, [o]);
    assert.deepEqual(held.map((h) => h.item_kind), ["lesson_intro", "lesson_intro"]);
    assert.equal(held[1].claims[0], NOT_SERVED_MARK);
    // Cooldown: the next visit spends nothing.
    const before = intros;
    await assert.rejects(ensureGeneration(o, objRow(0), { scope: SHARED, generator: gen, pending: fresh() }).fullPromise, ContentHeldBackError);
    assert.equal(intros, before);
  });

  test("unsure once: the steered retry is what the learner reads and what is stored", async () => {
    const o = objs[1];
    const gen: LessonGenerator = {
      intro: async (_r, _a, meta) =>
        meta?.introSteer
          ? { guessPrompt: "g", teach: "steered", confidence: "high", uncertainClaims: [] }
          : { guessPrompt: "g", teach: "first", confidence: "low", uncertainClaims: [] },
      practice: async () => practice("ok"),
      model: () => "test",
    };
    const h = ensureGeneration(o, objRow(1), { scope: SHARED, generator: gen, pending: fresh() });
    assert.equal((await h.introPromise)!.teach, "steered");
    assert.equal((await h.fullPromise).teach, "steered");
  });
});

describe("R4/P7 + REQ-196: verify by execution never runs in the request path", () => {
  test("a practice half with a program is served once the fact-check passes and is queued exec_unverified; nothing is executed", async () => {
    const o = objs[2];
    const gen: LessonGenerator = {
      intro: async () => ({ guessPrompt: "g", teach: "t" }),
      practice: async () => practice("v1", { soloVerification: { language: "python", code: "print(443)", expected: "8080" } }),
      model: () => "test",
      // the production queue; there is no runner in the request path at all
      queueExec: queueExecCheck,
    };
    const row = await ensureGeneration(o, objRow(2), { scope: SHARED, generator: gen, pending: fresh() }).fullPromise;
    assert.equal(row.solo_check, "solo v1", "served: the program's (wrong) expected value does not hold it back here");
    const id = lessonItemId(o, "solo", "solo v1");
    const q = await queryOne<{ expected: string }>(`select expected from exec_checks where item_kind = 'lesson' and item_id = $1`, [id]);
    assert.equal(q?.expected, "8080", "queued for the sandbox job");
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from exec_check_runs where item_id = $1`, [id]))?.n, 0, "never run here");
    assert.deepEqual(await execBacklog().then((b) => b.pending >= 1), true);
  });

  test("fail closed: if the program cannot be queued, the practice half is held back and nothing is stored", async () => {
    const o = objs[8];
    const gen: LessonGenerator = {
      intro: async () => ({ guessPrompt: "g", teach: "t" }),
      practice: async () => practice("q1", { soloVerification: { language: "python", code: "print(443)", expected: "443" } }),
      model: () => "test",
      queueExec: async () => {
        throw new Error("relation \"exec_checks\" does not exist");
      },
    };
    await assert.rejects(ensureGeneration(o, objRow(8), { scope: SHARED, generator: gen, pending: fresh() }).fullPromise, ContentHeldBackError);
    assert.equal(await getSharedLesson(o), null, "nothing stored or served");
    const held = await queryOne<{ claims: string[]; reason: string }>(
      `select claims, reason from item_holdbacks where objective_id = $1 and item_kind = 'lesson' order by created_at desc limit 1`,
      [o]
    );
    assert.equal(held?.reason, "fact_check_error");
    assert.equal(held?.claims[0], NOT_SERVED_MARK);
    assert.match(held!.claims[1], new RegExp(EXEC_QUEUE_FAILED));
  });

  test("a practice half without a program queues nothing", async () => {
    const o = objs[9];
    let calls = 0;
    const gen: LessonGenerator = {
      intro: async () => ({ guessPrompt: "g", teach: "t" }),
      practice: async () => practice("n1"),
      model: () => "test",
      queueExec: async () => {
        calls++;
      },
    };
    await ensureGeneration(o, objRow(9), { scope: SHARED, generator: gen, pending: fresh() }).fullPromise;
    assert.equal(calls, 0);
  });
});

describe("R12/P9: a coach reply agreeing a verdict was wrong flags the item", () => {
  test("dispute + recent wrong answer + agreeing reply -> one key_suspect flag; no dispute -> no judge call", async () => {
    process.env.ITEM_FACT_CHECK = "off"; // the flag's automated re-check is tested elsewhere
    try {
      const o = objs[3];
      await insertLesson(o, { teach: "HTTPS uses 443.", fade_problem: `Q fade ${run}`, fade_choices: CHOICES, fade_correct_index: 0, fade_why: "w", solo_check: `Q solo ${run}`, solo_choices: CHOICES, solo_correct_index: 1, solo_why: "w" });
      const u = await newUser();
      await attempt(u, o, "fade", `Q fade ${run}`, "incorrect", "Port 443");
      let judged = 0;
      const judge = async () => {
        judged++;
        return [1];
      };
      const none = await flagChatDisputes({ userId: u, trackId: track, message: "What is CTR mode?", reply: "r" }, judge);
      assert.equal(judged, 0);
      assert.equal(none.flagged.length, 0);
      const r = await flagChatDisputes({ userId: u, trackId: track, message: "I was marked wrong for 443, I think the key is wrong", reply: "You're right." }, judge);
      assert.equal(judged, 1);
      assert.equal(r.flagged.length, 1);
      const f = await queryOne<{ source: string; reason: string; note: string }>(
        `select source, reason, note from item_flags where item_kind = 'lesson' and item_id = $1 and user_id = $2`,
        [lessonItemId(o, "fade", `Q fade ${run}`), u]
      );
      assert.deepEqual([f!.source, f!.reason], ["key_suspect", "key_suspect"]);
      assert.match(f!.note, /coach agreed/);
      // A judge that sees no agreement flags nothing.
      const other = await newUser();
      await attempt(other, o, "fade", `Q fade ${run}`, "incorrect");
      const no = await flagChatDisputes({ userId: other, trackId: track, message: "why was my answer wrong?", reply: "Because 443 is right." }, async () => []);
      assert.equal(no.flagged.length, 0);
    } finally {
      delete process.env.ITEM_FACT_CHECK;
    }
  });

  test("through POST /api/chat: the dispute judge runs after the reply and the flag lands", async () => {
    process.env.ITEM_FACT_CHECK = "off";
    try {
      const o = objs[4];
      await insertLesson(o, { teach: "HTTPS uses 443.", fade_problem: `R fade ${run}`, fade_choices: CHOICES, fade_correct_index: 0, fade_why: "w", solo_check: `R solo ${run}`, solo_choices: CHOICES, solo_correct_index: 1, solo_why: "w" });
      const u = await newUser();
      await attempt(u, o, "fade", `R fade ${run}`, "incorrect", "Port 443");
      onParse = (body) => (JSON.stringify(body).includes("graded wrongly") ? { agreed: [1] } : { givenAway: [] });
      const res = await chatPost(
        new Request("http://t/api/chat", {
          method: "POST",
          headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" },
          body: JSON.stringify({ trackId: track, message: "I was marked wrong for picking 443 -- is the answer key wrong?" }),
        })
      );
      assert.equal(res.status, 200, await res.clone().text());
      let flag = null;
      for (let i = 0; i < 50 && !flag; i++) {
        flag = await queryOne(`select 1 from item_flags where item_id = $1 and user_id = $2 and source = 'key_suspect'`, [lessonItemId(o, "fade", `R fade ${run}`), u]);
        if (!flag) await new Promise((r) => setTimeout(r, 50));
      }
      assert.ok(flag, "flagged after the reply");
    } finally {
      delete process.env.ITEM_FACT_CHECK;
    }
  });
});

describe("lesson fixes through the app's mechanisms", () => {
  const lessons = (fixture as any).lessons;
  test("every 2026-11-09 fix maps to exactly one seeded objective (read-only lookup)", async () => {
    for (const f of LESSON_FIXES_2026_11_09) {
      const t = await lookupFix(f);
      assert.equal(t.length, 1, `${f.id} matched ${t.length}`);
    }
  });

  const fixFor = (id: string, i: number): LessonFix => ({ ...LESSON_FIXES_2026_11_09.find((f) => f.id === id)!, track: `GP${run}`, objective: `Objective ${i + 1}` });

  test("replace: a dry run changes nothing; apply corrects it, keeps answers to right checks, voids the wrong one, logs the old content; a re-run skips", async () => {
    const i = 5;
    const o = objs[i];
    const old = lessons["ABPTSGCS-27"].row;
    await insertLesson(o, old);
    const u = await newUser();
    await attempt(u, o, "fade", old.fade_problem, "correct");
    await attempt(u, o, "solo", old.solo_check, "correct");
    const f = fixFor("ABPTSGCS-27", i);
    const dry = await applyLessonFix(f, { apply: false });
    assert.equal(dry.status, "would_apply");
    assert.equal((await getSharedLesson(o))!.solo_check, old.solo_check);
    const r = await applyLessonFix(f, { apply: true });
    assert.equal(r.status, "applied", r.detail);
    assert.equal(r.voidedAnswers, 1);
    const now = (await getLessonFor(u, o))!.row;
    assert.match(now.model, /^corrected:ABPTSGCS-27$/);
    assert.match(now.teach, /tends to underestimate/);
    assert.match(now.teach, /Sources \(checked\): Tanaka/);
    const voided = await query<{ stage: string; voided: boolean }>(`select stage, voided_at is not null as voided from attempts where user_id = $1 order by stage`, [u]);
    assert.deepEqual(voided.map((v) => [v.stage, v.voided]), [["fade", false], ["solo", true]]);
    assert.equal(await itemStatus("lesson", lessonItemId(o, "solo", old.solo_check)), "confirmed_wrong");
    const log = await queryOne<{ claims: string[]; content: any }>(`select claims, content from item_holdbacks where objective_id = $1 order by created_at desc limit 1`, [o]);
    assert.match(log!.claims[0], /^REQ-187 ABPTSGCS-27/);
    assert.equal(log!.content.solo_check, old.solo_check);
    assert.equal((await applyLessonFix(f, { apply: true })).status, "skipped");
  });

  test("void: both checks confirmed wrong, answers voided, lesson no longer served; a re-run skips", async () => {
    const i = 6;
    const o = objs[i];
    const old = lessons["CMPCBS-7"].row;
    await insertLesson(o, old);
    const u = await newUser();
    await attempt(u, o, "fade", old.fade_problem, "incorrect");
    const f = fixFor("CMPCBS-7", i);
    const r = await applyLessonFix(f, { apply: true });
    assert.equal(r.status, "applied", r.detail);
    assert.equal(r.voidedAnswers, 1);
    assert.equal(await getLessonFor(u, o), null);
    assert.equal((await applyLessonFix(f, { apply: true })).status, "skipped");
    // A lesson that no longer matches the audited text is left alone.
    const other = await applyLessonFix({ ...f, objective: "Objective 1" }, { apply: true });
    assert.notEqual(other.status, "applied");
  });
});

describe("R6 + REQ-196: re-check content stored before the gate (staged, never pulled)", () => {
  test("estimate calls nothing; check writes nothing; apply stages without changing what is served; a person decides", async () => {
    const o = objs[7];
    await insertLesson(o, { teach: "t", fade_problem: `Old fade ${run}`, fade_choices: CHOICES, fade_correct_index: 1, fade_why: "w", solo_check: `Old solo ${run}`, solo_choices: CHOICES, solo_correct_index: 1, solo_why: "w" }, "claude-sonnet-5", "2026-10-01T00:00:00Z");
    const seen: string[] = [];
    const checker: FactChecker = async (items: CheckItem[]) => {
      seen.push(...items.map((i) => i.question));
      return items.map((it) => (it.question.startsWith("Old fade") ? { key: it.key, publish: false, answer: [0], unsupportedClaims: [], outcome: "disagree" as const } : { key: it.key, publish: true, answer: it.expected, unsupportedClaims: [], outcome: "agree" as const }));
    };
    const fadeId = lessonItemId(o, "fade", `Old fade ${run}`);
    const mine = (r: Awaited<ReturnType<typeof recheckStored>>) => r.staged.filter((p) => p.ref.objectiveId === o);
    const stagedRows = async () =>
      (await query<{ n: number }>(`select count(*)::int as n from item_holdbacks where content->>'staged' = 'recheck' and content->>'itemId' = $1`, [fadeId]))[0].n;

    const est = await recheckStored({ before: "2026-10-15", mode: "estimate", kinds: ["lesson"], checker, model: "claude-sonnet-5-5" });
    assert.equal(seen.length, 0, "estimate makes no model call");
    assert.ok(est.batches >= 1 && est.estimate.upperUsd > 0 && est.estimate.typicalUsd <= est.estimate.upperUsd);

    const dry = await recheckStored({ before: "2026-10-15", mode: "check", kinds: ["lesson"], checker, budget: new RunBudget(5) });
    assert.equal(mine(dry).length, 1);
    assert.ok(seen.includes(`Old solo ${run}`));
    assert.equal(await stagedRows(), 0, "check writes nothing");

    const done = await recheckStored({ before: "2026-10-15", mode: "apply", kinds: ["lesson"], checker, budget: new RunBudget(5) });
    assert.equal(mine(done).length, 1);
    assert.equal(await stagedRows(), 1, "staged for a person");
    assert.equal(await itemStatus("lesson", fadeId), null, "not pulled");
    const u = await newUser();
    assert.equal((await getLessonFor(u, o))?.row.fade_problem, `Old fade ${run}`, "still served until a person decides");
    assert.equal(await recentlyHeldBack(o), false, "a staged finding does not start the held-back cooldown");
    assert.equal((await listStaged({ open: true })).some((r) => r.itemId === fadeId), true);

    // Already staged: not checked or staged again.
    seen.length = 0;
    await recheckStored({ before: "2026-10-15", mode: "apply", kinds: ["lesson"], checker, budget: new RunBudget(5) });
    assert.ok(!seen.includes(`Old fade ${run}`));
    assert.equal(await stagedRows(), 1);

    // A person confirms: only now does the learner-facing state change.
    await confirmItemWrong({ kind: "lesson", itemId: fadeId, objectiveId: o, question: `Old fade ${run}` }, "test: key disputed");
    assert.equal(await getLessonFor(u, o), null, "pulled after the person confirmed");
    assert.equal((await listStaged({ open: true })).some((r) => r.itemId === fadeId), false, "decided");

    // Person-made: never checked.
    seen.length = 0;
    await query(`update lesson_content set model = 'corrected:X' where objective_id = $1`, [o]);
    await recheckStored({ before: "2026-10-15", mode: "apply", kinds: ["lesson"], checker, budget: new RunBudget(5) });
    assert.ok(!seen.some((q) => q.includes(run)));
  });

  test("the budget is a hard stop: a run that cannot afford its next batch makes no call", async () => {
    const o = objs[10];
    await insertLesson(o, { teach: "t", fade_problem: `Budget fade ${run}`, fade_choices: CHOICES, fade_correct_index: 1, fade_why: "w", solo_check: `Budget solo ${run}`, solo_choices: CHOICES, solo_correct_index: 1, solo_why: "w" }, "claude-sonnet-5", "2026-10-01T00:00:00Z");
    let calls = 0;
    const checker: FactChecker = async (items) => {
      calls++;
      return items.map((it) => ({ key: it.key, publish: true, answer: it.expected, unsupportedClaims: [], outcome: "agree" as const }));
    };
    const r = await recheckStored({ before: "2026-10-15", mode: "apply", kinds: ["lesson"], checker, budget: new RunBudget(0.0001) });
    assert.equal(calls, 0);
    assert.match(r.stoppedAtBudget ?? "", /Budget reached/);
    await assert.rejects(recheckStored({ before: "2026-10-15", mode: "apply", kinds: ["lesson"], checker }), /budget is required/);
  });

  test("a person clears a staged finding: still served, never staged again", async () => {
    const o = objs[11];
    await insertLesson(o, { teach: "t", fade_problem: `Clear fade ${run}`, fade_choices: CHOICES, fade_correct_index: 1, fade_why: "w", solo_check: `Clear solo ${run}`, solo_choices: CHOICES, solo_correct_index: 1, solo_why: "w" }, "claude-sonnet-5", "2026-10-01T00:00:00Z");
    const fadeId = lessonItemId(o, "fade", `Clear fade ${run}`);
    const seen: string[] = [];
    const checker: FactChecker = async (items) => {
      seen.push(...items.map((i) => i.question));
      return items.map((it) => ({ key: it.key, publish: !it.question.startsWith("Clear fade"), answer: [0], unsupportedClaims: [], outcome: it.question.startsWith("Clear fade") ? ("disagree" as const) : ("agree" as const) }));
    };
    await recheckStored({ before: "2026-10-15", mode: "apply", kinds: ["lesson"], checker, budget: new RunBudget(5) });
    await clearStaged({ kind: "lesson", itemId: fadeId, objectiveId: o, question: `Clear fade ${run}` }, "test: checked, fine");
    const u = await newUser();
    assert.equal((await getLessonFor(u, o))?.row.fade_problem, `Clear fade ${run}`);
    seen.length = 0;
    await recheckStored({ before: "2026-10-15", mode: "apply", kinds: ["lesson"], checker, budget: new RunBudget(5) });
    assert.ok(!seen.includes(`Clear fade ${run}`), "a person's decision is final for the job");
  });
});
