// REQ-114 (Audit 3 H1/H2/H3 + recommendation 1) against a real Postgres with
// every migration applied: learner flags and quarantine (including five
// learners flagging at once), the automated re-check, pulled items never
// served, voided answers left out of mastery, the grader's key-suspect
// auto-flag, the report route, and the fact-check gate in each generator.
// The model is a fake client or an injected checker; no API key.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import {
  confirmItemWrong,
  clearItem,
  flagItem,
  itemStatus,
  lessonItemId,
  recordFlag,
  recheckItem,
  type ItemRef,
} from "./item-quality";
import type { CheckItem, CheckVerdict, FactChecker } from "./fact-check";
import { bankItems, generateForObjective } from "./exam-items";
import { prepareContext } from "./review-store";
import { nextDiscriminationItem } from "./understanding-store";
import { getLessonFor, saveLesson, SHARED } from "./lesson-store";
import { writeCheckedQuizItem } from "./coach-quiz";
import { FactCheckUnavailableError, HeldForAccuracyError } from "./generation-gate";
import { checkedPractice, ContentHeldBackError, NOT_SERVED_MARK, type LessonGenerator, type ObjectiveRow } from "./lesson-generation";
import { UserFacingError } from "./http";
import { POST as gradePost } from "../app/api/grade/route";
import { POST as reportPost } from "../app/api/items/report/route";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = Array.from({ length: 4 }, () => randomUUID());
const users: string[] = [];
const FADE = (o: string) => `Guided ${o}: which port does HTTPS use by default?`;
const SOLO = (o: string) => `Solo ${o}: name the default HTTPS port.`;
const CHOICES = ["80", "443", "8080", "22"];

type Body = { system: Array<{ text: string }>; messages: Array<{ content: string }> };
let onParse: (body: Body) => unknown = () => {
  throw new Error("no fake set");
};
const parsedCalls: Body[] = [];

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `iq-${run}-${users.length}@example.test`]);
  await recordStudyNoticeAcceptance(u); // REQ-205: model routes need the notice
  return u;
}
const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const req = (u: string, url: string, body: unknown) => new Request(`http://t${url}`, { method: "POST", headers: auth(u), body: JSON.stringify(body) });
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
const isFactCheck = (b: Body) => b.system.some((s) => s.text.includes("independent fact-checker"));
const agreeAll = (b: Body) => {
  // Answer every item in the fact-check prompt with the key the test stored
  // under that item's question in `keys`.
  const user = b.messages[0].content;
  const results = [...user.matchAll(/<item key="([^"]+)"[^>]*>\nObjective: [^\n]*\nQuestion: ([^\n]*)/g)].map((m) => ({
    key: m[1],
    answer: keys.get(m[2]) ?? [0],
    unsupportedClaims: [],
  }));
  return { results };
};
const keys = new Map<string, number[]>();
const checker = (verdict: (it: CheckItem) => Partial<CheckVerdict>): FactChecker & { calls: number } => {
  const fn = (async (items: CheckItem[]) => {
    fn.calls++;
    return items.map((it) => ({ key: it.key, publish: true, answer: it.expected, unsupportedClaims: [], outcome: "agree" as const, ...verdict(it) }));
  }) as unknown as FactChecker & { calls: number };
  fn.calls = 0;
  return fn;
};
const AGREE = () => ({});
const DISAGREE = () => ({ publish: false, outcome: "disagree" as const, answer: [0] });

before(async () => {
  setAiCallSink(null);
  delete process.env.ITEM_FACT_CHECK;
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Web basics', 'certification', null)`, [track, `IQ-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Ports', 1, 100)`, [unit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `Objective ${i + 1}`, i + 1]);
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', 'HTTPS defaults to port 443.', $2, $3, 1, 'w', $4, $3, 1, 'w', 'test')`,
      [o, FADE(o), JSON.stringify(CHOICES), SOLO(o)]
    );
  }
  __setClientForTest({
    messages: {
      create: async () => ({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }),
      parse: async (body: Body) => {
        parsedCalls.push(body);
        return { parsed_output: onParse(body), stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
    },
  });
});

beforeEach(() => {
  parsedCalls.length = 0;
  keys.clear();
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from item_flags where user_id = any($1::uuid[]) or objective_id = any($2::uuid[])`, [users, objs]);
  await query(`delete from item_status where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from item_holdbacks where objective_id = any($1::uuid[]) or track_id = $2`, [objs, track]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

async function examItem(o: string, stem = `Exam stem ${randomUUID()}`): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `insert into exam_items (objective_id, item_format, stem, body, answer_key, explanation)
     values ($1, 'multiple_choice', $2, $3, '{"correct":[1]}', 'e') returning id`,
    [o, stem, JSON.stringify({ choices: CHOICES })]
  );
  return r!.id;
}
const examRef = (id: string, o: string): ItemRef => ({ kind: "exam", itemId: id, objectiveId: o, question: "stem" });

describe("flags and quarantine (H2)", () => {
  test("five learners flag at once: exactly one quarantine row, every flag counted, item no longer served", async () => {
    const id = await examItem(objs[0]);
    const learners = await Promise.all(Array.from({ length: 5 }, () => newUser()));
    const results = await Promise.all(learners.map((u) => recordFlag(examRef(id, objs[0]), { userId: u, source: "learner", reason: "wrong_answer" })));
    assert.ok(results.every((r) => r.recorded));
    const rows = await query<{ status: string; reason: string; flag_count: number }>(
      `select status, reason, flag_count from item_status where item_kind = 'exam' and item_id = $1`,
      [id]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "quarantined");
    assert.equal(rows[0].reason, "flags");
    assert.equal(rows[0].flag_count, 5);
    assert.equal(results.filter((r) => r.quarantined).length, 3, "the 3rd, 4th and 5th flag each see it pulled");
    const served = await bankItems(learners[0], [objs[0]], ["multiple_choice"]);
    assert.ok(!served.some((i) => i.id === id), "a pulled item is never served");
  });

  test("one flag per learner; below the threshold nothing is pulled; the threshold is tunable", async () => {
    const id = await examItem(objs[0]);
    const [a, b] = [await newUser(), await newUser()];
    assert.equal((await recordFlag(examRef(id, objs[0]), { userId: a, source: "learner" })).recorded, true);
    assert.equal((await recordFlag(examRef(id, objs[0]), { userId: a, source: "key_suspect" })).recorded, false, "same learner");
    const second = await recordFlag(examRef(id, objs[0]), { userId: b, source: "learner" });
    assert.equal(second.flags, 2);
    assert.equal(second.quarantined, false);
    assert.equal(await itemStatus("exam", id), null);
    await query(`update item_quality_params set value = 2 where name = 'quarantine_flag_threshold'`);
    try {
      const c = await newUser();
      assert.equal((await recordFlag(examRef(id, objs[0]), { userId: c, source: "learner" })).quarantined, true);
    } finally {
      await query(`update item_quality_params set value = 3 where name = 'quarantine_flag_threshold'`);
    }
  });

  test("one flag plus a failed automated re-check pulls it; the re-check runs once per item", async () => {
    const id = await examItem(objs[1]);
    const failing = checker(DISAGREE);
    const first = await flagItem(examRef(id, objs[1]), { userId: await newUser(), source: "learner" }, failing);
    assert.ok(first.recheck);
    const r = await first.recheck!;
    assert.deepEqual(r, { ran: true, agreed: false, quarantined: true });
    const s = await queryOne<{ status: string; reason: string }>(`select status, reason from item_status where item_kind = 'exam' and item_id = $1`, [id]);
    assert.deepEqual(s, { status: "quarantined", reason: "flag_and_recheck" });
    // already pulled: a later flag starts no second re-check
    const later = await flagItem(examRef(id, objs[1]), { userId: await newUser(), source: "learner" }, failing);
    assert.equal(later.recheck, null);
    assert.equal(failing.calls, 1);

    const id2 = await examItem(objs[1]);
    const agreeing = checker(AGREE);
    const f = await flagItem(examRef(id2, objs[1]), { userId: await newUser(), source: "learner" }, agreeing);
    assert.deepEqual(await f.recheck, { ran: true, agreed: true, quarantined: false });
    const again = await flagItem(examRef(id2, objs[1]), { userId: await newUser(), source: "learner" }, agreeing);
    assert.deepEqual(await again.recheck, { ran: false, agreed: null, quarantined: false }, "claimed once");
    assert.equal(agreeing.calls, 1);
    assert.equal(await itemStatus("exam", id2), null);
  });

  test("a failed re-check call releases its claim so a later flag can retry", async () => {
    const id = await examItem(objs[1]);
    const broken: FactChecker = async () => {
      throw new Error("model down");
    };
    assert.deepEqual(await recheckItem(examRef(id, objs[1]), broken, null), { ran: false, agreed: null, quarantined: false });
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from item_flags where item_id = $1 and source = 'recheck'`, [id]))!.n, 0);
  });

  test("pulled review, comparison and lesson items are not served; a cleared one is served again", async () => {
    const u = await newUser();
    const ri = await queryOne<{ id: string }>(
      `insert into review_items (objective_id, source_hash, question, choices, correct_index, why, model)
       values ($1, md5('HTTPS defaults to port 443.'), 'Review q', $2, 1, 'w', 'test') returning id`,
      [objs[2], JSON.stringify(CHOICES)]
    );
    // REQ-218 (H1): the session builder reads its candidates through prepareContext
    // (it replaced unseenItems), so the pulled-item filter is checked there.
    const unseen = async () => (await prepareContext(u, [objs[2]])).get(objs[2])!.unseen.length;
    assert.equal(await unseen(), 1);
    const ref: ItemRef = { kind: "review", itemId: ri!.id, objectiveId: objs[2], question: "Review q" };
    for (let i = 0; i < 3; i++) await recordFlag(ref, { userId: await newUser(), source: "learner" });
    assert.equal(await unseen(), 0);
    assert.equal(await clearItem(ref, "checked, key is right"), true);
    assert.equal(await unseen(), 1);

    const set = await queryOne<{ id: string }>(
      `insert into concept_sets (track_id, source, set_key, how_to_tell, dimensions) values ($1, 'generated', $2, 'h', '[]') returning id`,
      [track, `k-${run}`]
    );
    await query(`insert into concept_set_members (set_id, position, name, objective_id) values ($1, 0, 'TLS', $2), ($1, 1, 'SSH', null)`, [set!.id, objs[2]]);
    const d1 = await queryOne<{ id: string }>(`insert into discrimination_items (set_id, scenario, answer_position, why) values ($1, 'S1', 0, 'w') returning id`, [set!.id]);
    await query(`insert into discrimination_items (set_id, scenario, answer_position, why) values ($1, 'S2', 1, 'w')`, [set!.id]);
    const firstPick = await nextDiscriminationItem(u, set!.id);
    const pulled = firstPick!.item.id;
    for (let i = 0; i < 3; i++) {
      await recordFlag({ kind: "comparison", itemId: pulled, objectiveId: objs[2], question: firstPick!.item.scenario }, { userId: await newUser(), source: "learner" });
    }
    for (let i = 0; i < 3; i++) assert.notEqual((await nextDiscriminationItem(u, set!.id))!.item.id, pulled);
    assert.ok(d1);

    // A lesson whose Solo check is pulled is not served or graded against,
    // and the next shared generation replaces it.
    const o = objs[3];
    assert.ok(await getLessonFor(u, o));
    const lref: ItemRef = { kind: "lesson", itemId: lessonItemId(o, "solo", SOLO(o)), objectiveId: o, question: SOLO(o) };
    for (let i = 0; i < 3; i++) await recordFlag(lref, { userId: await newUser(), source: "learner" });
    assert.equal(await getLessonFor(u, o), null);
    const fresh = await saveLesson(SHARED, o, {
      guessPrompt: "g2",
      teach: "t2",
      fadeProblem: "new fade",
      fadeChoices: CHOICES,
      fadeCorrectIndex: 1,
      fadeWhy: "w",
      soloCheck: "new solo",
      soloChoices: CHOICES,
      soloCorrectIndex: 1,
      soloWhy: "w",
    }, "test");
    assert.equal(fresh.solo_check, "new solo");
    assert.equal((await getLessonFor(u, o))!.row.solo_check, "new solo");
    // ...and a lesson that is NOT pulled is never replaced by a later save.
    const kept = await saveLesson(SHARED, o, { guessPrompt: "g3", teach: "t3", fadeProblem: "x", fadeChoices: CHOICES, fadeCorrectIndex: 0, fadeWhy: "w", soloCheck: "y", soloChoices: CHOICES, soloCorrectIndex: 0, soloWhy: "w" }, "test");
    assert.equal(kept.solo_check, "new solo");
  });
});

describe("voided answers (H2: a confirmed-wrong key)", () => {
  test("confirming an item wrong keeps the attempts, voids them, and the mastery rule stops counting them", async () => {
    const u = await newUser();
    const o = objs[0];
    const q = SOLO(o);
    const answer = (verdict: "correct" | "incorrect", question: string) =>
      recordAttemptAndUpdateMastery({
        userId: u, unitId: unit, objectiveId: o, kind: "lesson", stage: "solo", format: "open",
        question, answer: "443", verdict, classification: verdict === "correct" ? "none" : "misconception",
      });
    await answer("incorrect", q);
    await answer("incorrect", q);
    await answer("correct", `other question ${randomUUID()}`);
    const before = await queryOne<{ answers: number; weighted_accuracy: string }>(`select answers, weighted_accuracy from mastery_detail($1, $2)`, [u, o]);
    assert.equal(before!.answers, 3);

    const voided = await confirmItemWrong({ kind: "lesson", itemId: lessonItemId(o, "solo", q), objectiveId: o, question: q }, "443 was marked wrong");
    assert.equal(voided, 2);
    const rows = await query<{ voided_at: string | null; void_reason: string | null }>(
      `select voided_at, void_reason from attempts where user_id = $1 and objective_id = $2 and question = $3`,
      [u, o, q]
    );
    assert.equal(rows.length, 2, "kept");
    assert.ok(rows.every((r) => r.voided_at && /confirmed wrong/.test(r.void_reason!)));
    const afterDetail = await queryOne<{ answers: number; weighted_accuracy: string }>(`select answers, weighted_accuracy from mastery_detail($1, $2)`, [u, o]);
    assert.equal(afterDetail!.answers, 1);
    assert.equal(Number(afterDetail!.weighted_accuracy), 1);
    const m = await queryOne<{ status: string }>(`select status from mastery where user_id = $1 and objective_id = $2`, [u, o]);
    const rule = await queryOne<{ status: string }>(`select status from mastery_detail($1, $2)`, [u, o]);
    assert.equal(m!.status, rule!.status, "stored mastery recomputed to the rule");
    assert.equal(await itemStatus("lesson", lessonItemId(o, "solo", q)), "confirmed_wrong");
    assert.equal(await confirmItemWrong({ kind: "lesson", itemId: lessonItemId(o, "solo", q), objectiveId: o, question: q }, "again"), 0, "idempotent");
  });
});

describe("voiding a comparison card stays on its objective (PR #36 review)", () => {
  test("another objective's card with the same scenario text keeps its answers", async () => {
    const u = await newUser();
    const scenario = `Shared scenario ${randomUUID()}`;
    for (const o of [objs[2], objs[3]]) {
      await recordAttemptAndUpdateMastery({
        userId: u, unitId: unit, objectiveId: o, kind: "quiz", stage: "discriminate", format: "mc",
        question: scenario, answer: "a", verdict: "correct", assessmentType: "discrimination",
      } as Parameters<typeof recordAttemptAndUpdateMastery>[0]);
    }
    const voided = await confirmItemWrong({ kind: "comparison", itemId: randomUUID(), objectiveId: objs[2], question: scenario }, "card key wrong");
    assert.equal(voided, 1);
    const left = await query<{ objective_id: string; voided_at: string | null }>(
      `select objective_id, voided_at from attempts where user_id = $1 and question = $2 order by objective_id`,
      [u, scenario]
    );
    assert.deepEqual(
      left.map((r) => [r.objective_id === objs[2], r.voided_at !== null]).sort(),
      [[false, false], [true, true]]
    );
  });
});

describe("key-suspect (H3)", () => {
  test("the grader grades on the facts, the attempt counts, and the shared check is flagged and re-checked", async () => {
    const u = await newUser();
    const o = objs[1];
    onParse = (b) => {
      if (isFactCheck(b)) return { results: [{ key: "i1", answer: [1], unsupportedClaims: [] }] };
      return {
        verdict: "correct",
        feedback: "443 is right; the course's reference answer appears to be wrong.",
        classification: "key-suspect",
        missedParts: [],
        modelAnswer: "443",
        fixNext: "Nothing to fix.",
        misconception: "",
        confusedWith: "",
      };
    };
    // the lesson's key for o's Solo check, as the checker answers it: wrong on purpose
    await query(`update lesson_content set solo_correct_index = 2 where objective_id = $1`, [o]);
    const res = await json(await gradePost(req(u, "/api/grade", { format: "open", objectiveId: o, stage: "solo", answer: "443" })));
    assert.equal(res.verdict, "correct");
    assert.equal(res.classification, "key-suspect");
    const id = lessonItemId(o, "solo", SOLO(o));
    const flag = await queryOne<{ source: string; reason: string }>(`select source, reason from item_flags where item_id = $1 and user_id = $2`, [id, u]);
    assert.deepEqual(flag, { source: "key_suspect", reason: "key_suspect" });
    // the re-check runs in the background; wait for it
    for (let i = 0; i < 50 && !(await itemStatus("lesson", id)); i++) await new Promise((r) => setTimeout(r, 50));
    assert.equal(await itemStatus("lesson", id), "quarantined", "one flag + the independent answer (443) disagreeing with the key (8080)");
    const rc = await queryOne<{ recheck_agreed: boolean }>(`select recheck_agreed from item_flags where item_id = $1 and source = 'recheck'`, [id]);
    assert.equal(rc!.recheck_agreed, false);
    assert.ok(parsedCalls.some((b) => isFactCheck(b) && !b.messages[0].content.includes("Option 2: 8080\n(correct")), "checker is sent the options without the key");
  });

  test("an ordinary grade flags nothing", async () => {
    const u = await newUser();
    onParse = () => ({ verdict: "incorrect", feedback: "f", classification: "misconception", missedParts: [], modelAnswer: "m", fixNext: "x", misconception: "", confusedWith: "" });
    await json(await gradePost(req(u, "/api/grade", { format: "open", objectiveId: objs[2], stage: "fade", answer: "80" })));
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from item_flags where user_id = $1`, [u]))!.n, 0);
  });
});

describe("Report a problem (route)", () => {
  test("a learner reports a lesson check once; other learners' sessions and unknown kinds are refused", async () => {
    const u = await newUser();
    // The route starts the re-check in the background (tested above); off
    // here so it cannot land in a later test's model calls.
    process.env.ITEM_FACT_CHECK = "off";
    const o = objs[2];
    const first = await json(await reportPost(req(u, "/api/items/report", { kind: "lesson", objectiveId: o, stage: "fade", reason: "unclear", note: "two answers fit" })));
    assert.equal(first.recorded, true);
    const again = await json(await reportPost(req(u, "/api/items/report", { kind: "lesson", objectiveId: o, stage: "fade" })));
    assert.equal(again.recorded, false);
    const row = await queryOne<{ reason: string; note: string; question: string }>(
      `select reason, note, question from item_flags where user_id = $1 and source = 'learner'`,
      [u]
    );
    assert.deepEqual(row, { reason: "unclear", note: "two answers fit", question: FADE(o) });
    assert.ok(!("quarantined" in first), "the response does not reveal other learners' reports");

    const other = await newUser();
    const s = await queryOne<{ id: string }>(`insert into exam_sessions (user_id, track_id, mode) values ($1, $2, 'sprint') returning id`, [other, track]);
    const item = await examItem(o);
    await query(`insert into exam_session_items (session_id, position, item_id, objective_id, unit_id) values ($1, 0, $2, $3, $4)`, [s!.id, item, o, unit]);
    await json(await reportPost(req(u, "/api/items/report", { kind: "exam", sessionId: s!.id, position: 0 })), 404);
    const mine = await json(await reportPost(req(other, "/api/items/report", { kind: "exam", sessionId: s!.id, position: 0, reason: "wrong_answer" })));
    assert.equal(mine.recorded, true);
    await json(await reportPost(req(u, "/api/items/report", { kind: "pbq", itemId: randomUUID() })), 400);
    await json(await reportPost(req(u, "/api/items/report", { kind: "quiz", turnId: randomUUID() })), 404);
    await json(await reportPost(req(u, "/api/items/report", { kind: "lesson", objectiveId: o, stage: "fade", reason: "rude" })), 400);
    await json(await reportPost(req(u, "/api/items/report", { kind: "lesson", objectiveId: o, stage: "fade", note: "x".repeat(501) })), 400);
    delete process.env.ITEM_FACT_CHECK;
  });
});

describe("fact-check gate and hold-back on generation (H1 + recommendation 1)", () => {
  const mcItem = (stem: string, correct: number, extra: Record<string, unknown> = {}) => ({
    format: "multiple_choice",
    stem,
    choices: CHOICES,
    correct: [correct],
    steps: null,
    prompts: null,
    responses: null,
    matches: null,
    exhibit: null,
    explanation: "e",
    confidence: "high",
    uncertainClaims: [],
    ...extra,
  });

  test("exam bank: a low-confidence item is held without a check; the rest are checked in ONE call and only agreements publish", async () => {
    const u = await newUser();
    const o = objs[3];
    keys.set("Agreed stem", [1]);
    keys.set("Disputed stem", [0]); // the checker answers 0; the writer keyed 1
    onParse = (b) =>
      isFactCheck(b)
        ? agreeAll(b)
        : {
            items: [
              mcItem("Uncertain stem", 1, { confidence: "low", uncertainClaims: ["the 2026 default port changed"] }),
              mcItem("Agreed stem", 1),
              mcItem("Disputed stem", 1),
            ],
          };
    const out = await generateForObjective({ objectiveId: o, formats: ["multiple_choice", "multiple_choice", "multiple_choice"], exhibits: false, allowed: ["multiple_choice"], userId: u });
    assert.deepEqual(out.stored.map((s) => s.stem), ["Agreed stem"]);
    assert.equal(parsedCalls.filter(isFactCheck).length, 1);
    assert.ok(!parsedCalls.filter(isFactCheck)[0].messages[0].content.includes("Uncertain stem"), "uncertain items are not even checked");
    const held = await query<{ reason: string; claims: string[] }>(
      `select reason, claims from item_holdbacks where objective_id = $1 and item_kind = 'exam' order by created_at`,
      [o]
    );
    assert.deepEqual(held.map((h) => h.reason), ["uncertain", "fact_check"]);
    assert.deepEqual(held[0].claims, ["the 2026 default port changed"]);
  });

  test("exam bank (REQ-216): listed claims alone do not hold an item back; a disagreeing check does, and an all-held batch is written once more with the claims", async () => {
    const u = await newUser();
    const o = objs[3];
    keys.set("Listed stem", [1]);
    keys.set("Wrong stem", [0]);
    onParse = (b) => (isFactCheck(b) ? agreeAll(b) : { items: [mcItem("Listed stem", 1, { confidence: "medium", uncertainClaims: ["may differ by version"] })] });
    const listed = await generateForObjective({ objectiveId: o, formats: ["multiple_choice"], exhibits: false, allowed: ["multiple_choice"], userId: u });
    assert.deepEqual(listed.stored.map((x) => x.stem), ["Listed stem"]);
    assert.equal(listed.held, 0);
    // Everything held: the writer is asked again, steered with the claims.
    parsedCalls.length = 0;
    let writer = 0;
    onParse = (b) => (isFactCheck(b) ? agreeAll(b) : (writer++, { items: [mcItem("Wrong stem", 1)] }));
    const held = await generateForObjective({ objectiveId: o, formats: ["multiple_choice"], exhibits: false, allowed: ["multiple_choice"], userId: u });
    assert.equal(held.stored.length, 0);
    assert.equal(held.held, 2, "held on both attempts");
    assert.equal(writer, 2, "one retry");
    const writerCalls = parsedCalls.filter((c) => !isFactCheck(c));
    assert.match(String(writerCalls[1].messages[0].content), /previous draft was not used because of these claims/);
  });

  test("exam bank: when the check itself fails, nothing publishes (fails closed); with the gate off, all valid items do", async () => {
    const u = await newUser();
    const o = objs[3];
    onParse = (b) => {
      if (isFactCheck(b)) throw new Error("fact check timed out");
      return { items: [mcItem(`Closed ${run}`, 1)] };
    };
    const closed = await generateForObjective({ objectiveId: o, formats: ["multiple_choice"], exhibits: false, allowed: ["multiple_choice"], userId: u });
    assert.equal(closed.stored.length, 0);
    // REQ-216: a failed check CALL says nothing about the item: nothing is
    // logged as a holdback, and it is reported as unchecked (retryable).
    assert.equal(closed.unchecked, 1);
    assert.equal(closed.held, 0);
    assert.equal((await query<{ n: number }>(`select count(*)::int as n from item_holdbacks where objective_id = $1 and reason = 'fact_check_error'`, [o]))[0].n, 0);
    process.env.ITEM_FACT_CHECK = "off";
    try {
      const open = await generateForObjective({ objectiveId: o, formats: ["multiple_choice"], exhibits: false, allowed: ["multiple_choice"], userId: u });
      assert.equal(open.stored.length, 1);
    } finally {
      delete process.env.ITEM_FACT_CHECK;
    }
  });

  test("Quiz me (REQ-216): low confidence or a disagreeing check holds a question back twice with a reason; listed claims and an agreed one pass", async () => {
    const u = await newUser();
    const o = objs[0];
    const item = { question: "Default HTTPS port?", choices: CHOICES, correctIndex: 1, hints: ["a", "b"], explanation: "e", confidence: "high" as const, uncertainClaims: [] as string[] };
    const steers: Array<string | null | undefined> = [];
    const gen = (made: typeof item | (Omit<typeof item, "confidence"> & { confidence: "low" })) => async (_o: string, _u: string, steer?: string | null) => {
      steers.push(steer);
      return made as never;
    };
    const holds = async () => (await query<{ reason: string }>(`select reason from item_holdbacks where objective_id = $1 and item_kind = 'quiz' order by created_at, id`, [o])).map((r) => r.reason);
    // Low confidence twice: held, the retry is steered, the checker never runs.
    await assert.rejects(
      writeCheckedQuizItem(o, "Objective 1", u, gen({ ...item, confidence: "low", uncertainClaims: ["x"] })),
      (e: unknown) => e instanceof HeldForAccuracyError && e.status === 409 && /wasn't confident/.test(e.message)
    );
    assert.equal(parsedCalls.length, 0, "no check for a low-confidence item");
    assert.equal(steers[0], null);
    assert.match(String(steers[1]), /- x/, "the retry is steered with the first attempt's claims");
    // Listed claims alone (confidence high) do not hold it back: it is checked and passes.
    keys.set("Default HTTPS port?", [1]);
    onParse = agreeAll;
    await writeCheckedQuizItem(o, "Objective 1", u, gen({ ...item, uncertainClaims: ["version may differ"] }));
    // The independent answer disagrees with the key: held twice, says why.
    keys.set("Default HTTPS port?", [3]);
    await assert.rejects(writeCheckedQuizItem(o, "Objective 1", u, gen(item)), (e: unknown) => e instanceof HeldForAccuracyError && /different answer/.test((e as Error).message));
    keys.set("Default HTTPS port?", [1]);
    await writeCheckedQuizItem(o, "Objective 1", u, gen(item));
    assert.deepEqual(await holds(), ["uncertain", "uncertain", "fact_check", "fact_check"]);
  });

  test("Quiz me (REQ-216): a failed fact-check CALL is a retryable 409, logs no holdback", async () => {
    const u = await newUser();
    const o = objs[1];
    const item = { question: "Default SSH port?", choices: CHOICES, correctIndex: 1, hints: ["a", "b"], explanation: "e", confidence: "high" as const, uncertainClaims: [] as string[] };
    onParse = () => {
      throw new Error("provider down");
    };
    await assert.rejects(
      writeCheckedQuizItem(o, "Objective 2", u, async () => item as never),
      (e: unknown) => e instanceof FactCheckUnavailableError && e.status === 409
    );
    const n = (await query<{ n: number }>(`select count(*)::int as n from item_holdbacks where objective_id = $1 and item_kind = 'quiz'`, [o]))[0].n;
    assert.equal(n, 0);
    onParse = agreeAll;
  });

  // REQ-187 (audit 2026-11-09 R3/P1): a second failure is NOT served any
  // more (it used to be kept and logged 'served_after_retry'), and a
  // learner's own regenerate is fact-checked too (R4).
  test("lesson: a disputed practice half is regenerated once; a second failure is never served; regenerates are checked too", async () => {
    const o = objs[1];
    const objRow: ObjectiveRow = { title: "Objective 2", unit_title: "Ports", track_title: "Web basics", ctx: null };
    const practice = (tag: string) => ({
      fadeProblem: `fade ${tag}`, fadeChoices: CHOICES, fadeCorrectIndex: 1, fadeWhy: "w",
      soloCheck: `solo ${tag}`, soloChoices: CHOICES, soloCorrectIndex: 1, soloWhy: "w",
      confidence: "high" as const, uncertainClaims: [] as string[],
    });
    const steers: (string | undefined)[] = [];
    const gen = (fc: FactChecker): LessonGenerator => ({
      intro: async () => ({ guessPrompt: "g", teach: "t" }),
      practice: async (_o, _a, meta) => {
        steers.push(meta?.steer);
        return practice(`retry ${steers.length}`);
      },
      model: () => "test",
      factCheck: fc,
    });
    let n = 0;
    const firstFails = checker(() => (n++ < 2 ? DISAGREE() : AGREE()));
    const got = await checkedPractice(o, objRow, practice("first"), { shared: true, gen: gen(firstFails), meta: {} });
    assert.equal(got.fadeProblem, "fade retry 1");
    assert.equal(steers.length, 1);
    assert.match(steers[0]!, /held back/);
    const alwaysFails = checker(DISAGREE);
    await assert.rejects(checkedPractice(o, objRow, practice("first"), { shared: true, gen: gen(alwaysFails), meta: {} }), ContentHeldBackError);
    const held = await query<{ reason: string; claims: string[] }>(`select reason, claims from item_holdbacks where objective_id = $1 and item_kind = 'lesson' order by created_at`, [o]);
    assert.deepEqual(held.map((r) => r.reason), ["fact_check", "fact_check", "fact_check"]);
    assert.equal(held[2].claims[0], NOT_SERVED_MARK);
    assert.ok(!held.some((r) => r.reason === "served_after_retry"));
    // A learner's own regenerate is now fact-checked as well.
    const none = checker(DISAGREE);
    await assert.rejects(checkedPractice(o, objRow, practice("own"), { shared: false, gen: gen(none), meta: { userId: undefined } }), ContentHeldBackError);
    assert.equal(none.calls, 2, "checked, and the retry checked");
  });

});
