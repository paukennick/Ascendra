// REQ-235 (FAIL-1401..1403): the owner's hold-rate view against a real
// Postgres with every migration applied. Counts only; staged job findings,
// replaced lessons and failed checks are not holds; a learner's own course is
// never listed.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, closePool } from "./db";
import { holdRateReport, shapeHoldRates } from "./hold-rates";

const run = Date.now().toString(36);
const code = `HR${run}`.toUpperCase();
const track = randomUUID();
const privateTrack = randomUUID();
const owner = randomUUID();
const unit = randomUUID();
const privUnit = randomUUID();
const obj = [randomUUID(), randomUUID(), randomUUID()];
const privObj = randomUUID();

const hold = (kind: string, reason: string, claims: unknown[], content: unknown, opts: { objective?: string; unit?: string; track?: string; daysAgo?: number } = {}) =>
  query(
    `insert into item_holdbacks (item_kind, objective_id, unit_id, track_id, reason, claims, content, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, now() - make_interval(days => $8))`,
    [kind, opts.objective ?? null, opts.unit ?? null, opts.track ?? null, reason, JSON.stringify(claims), JSON.stringify(content), opts.daysAgo ?? 0]
  );

before(async () => {
  await query(`insert into app_users (id, email) values ($1, $2)`, [owner, `hr-${run}@example.test`]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Hold course', 'certification', null)`, [track, code]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'A learner course', 'certification', $3)`, [privateTrack, `HRP${run}`, owner]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [unit, track]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'P', 1)`, [privUnit, privateTrack]);
  for (const [i, id] of obj.entries()) await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [id, unit, `O${i} ${run}`, i]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'PO', 1)`, [privObj, privUnit]);
  // stored: two lessons now, one authored (not generation), one 10 days old
  const lesson = (id: string, model: string, daysAgo: number) =>
    query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model, generated_at)
       values ($1, 'g', 't', 'f', '["a","b","c","d"]', 0, 'w', 's', '["a","b","c","d"]', 0, 'w', $2, now() - make_interval(days => $3))`,
      [id, model, daysAgo]
    );
  await lesson(obj[0], "claude-test", 0);
  await lesson(obj[1], "authored:course-lesson", 0);
  await lesson(obj[2], "claude-test", 10);
  // held: writer unsure (intro, counted as lesson), checker disagreed, content rule (a review by unit)
  await hold("lesson_intro", "uncertain", ["x"], { teach: "t", confidence: "low" }, { objective: obj[0] });
  await hold("lesson", "fact_check", ["fade: claim"], { fadeProblem: "f" }, { objective: obj[0], daysAgo: 20 });
  await hold("pbq", "fact_check", ["content check: too short"], { title: "t" }, { unit });
  // not holds
  await hold("lesson", "fact_check", ["SECRET"], { staged: "recheck", itemKind: "lesson", itemId: "x" }, { objective: obj[0] });
  await hold("lesson", "fact_check", ["fixed by a person"], { fade_problem: "old row", teach: "t" }, { objective: obj[0] });
  await hold("lesson", "fact_check_error", ["call failed"], {}, { objective: obj[0] });
  // too old, and a learner's own course
  await hold("lesson", "uncertain", ["old"], {}, { objective: obj[0], daysAgo: 40 });
  await hold("lesson", "uncertain", ["mine"], {}, { objective: privObj });
});

after(async () => {
  await query(`delete from item_holdbacks where objective_id = any($1::uuid[]) or unit_id = $2`, [[...obj, privObj], unit]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, privateTrack]]);
  await query(`delete from app_users where id = $1`, [owner]);
  await closePool();
});

describe("REQ-235 hold rates", () => {
  test("per kind: stored and held in 7 and 30 days; non-holds, old rows, authored lessons and learner courses left out", async () => {
    const report = await holdRateReport();
    const c = report.courses.find((x) => x.code === code)!;
    assert.ok(c, "the catalog course with activity is listed");
    const lesson = c.kinds.find((k) => k.kind === "lesson")!;
    assert.deepEqual(lesson, { kind: "lesson", stored7: 1, held7: 1, stored30: 2, held30: 2 });
    const pbq = c.kinds.find((k) => k.kind === "pbq")!;
    assert.deepEqual(pbq, { kind: "pbq", stored7: 0, held7: 1, stored30: 0, held30: 1 });
    assert.deepEqual(
      c.topReasons.map((r) => [r.reason, r.n]).sort(),
      [["checker_disagreed", 1], ["content_rule", 1], ["writer_unsure", 1]]
    );
    assert.ok(!report.courses.some((x) => x.code === `HRP${run}`.toUpperCase()), "a learner's own course is never listed");
    assert.ok(!JSON.stringify(report).includes("SECRET"), "no claims");
  });

  test("shape: the launch courses are always listed, first and in order, quiet ones with no kinds", () => {
    const r = shapeHoldRates(
      [{ code: "ZZZ", title: "Z", kind: "review", n7: 1, n30: 3 }],
      [{ code: "ZZZ", title: "Z", kind: "review", reason: "writer_unsure", n7: 0, n30: 1 }],
      [{ code: "SECPLUS", title: "S" }, { code: "CNA", title: "C" }],
      new Date("2026-11-11T00:00:00Z")
    );
    assert.deepEqual(r.courses.map((c) => c.code), ["SECPLUS", "CNA", "ZZZ"]);
    assert.deepEqual(r.courses[0].kinds, []);
    assert.deepEqual(r.courses[2].kinds, [{ kind: "review", stored7: 1, held7: 0, stored30: 3, held30: 1 }]);
    assert.equal(r.asOf, "2026-11-11T00:00:00.000Z");
  });
});
