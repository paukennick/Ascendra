// REQ-116 (audit 3, security): replay binding (finding 3), /api/errors and
// course creation (finding 7), the avatar decompression bomb (finding 6),
// and refusing unstorable text before a model call (low). Adapted from the
// audit's a3sec-replay and a3sec-misc tests; the model is a stub.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-a3sec";
process.env.CHOICE_ORDER_SECRET ??= "choice-secret-a3sec";
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import zlib from "node:zlib";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { POST as reviewStart } from "../app/api/review/sessions/route";
import { POST as reviewAnswer } from "../app/api/review/sessions/[id]/items/[position]/answer/route";
import { GET as cmpQuestion } from "../app/api/comparisons/[setId]/question/route";
import { POST as cmpAnswer } from "../app/api/comparison-items/[itemId]/answer/route";
import { POST as explainPost } from "../app/api/objectives/[id]/explain-back/route";
import { POST as errorsPost, GET as errorsGet } from "../app/api/errors/route";
import { POST as coursesPost } from "../app/api/courses/route";
import { POST as avatarPost } from "../app/api/account/avatar/route";
import { GET as unitGet } from "../app/api/units/[id]/route";

console.error = () => {};
const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = [randomUUID(), randomUUID(), randomUUID()];
const set = randomUUID();
const privTrack = randomUUID();
const privUnit = randomUUID();
const privObj = randomUUID();
const users: string[] = [];
let modelCalls = 0;

const auth = (u: string) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@x.test` })}`,
  "content-type": "application/json",
});
async function call(handler: Function, u: string, opts: { body?: unknown; params?: Record<string, string>; method?: string } = {}) {
  const res: Response = await handler(
    new Request("http://t/x", {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: auth(u),
      ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
    }),
    { params: Promise.resolve(opts.params ?? {}) }
  );
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {}
  return { status: res.status, body };
}
async function newUser() {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id,email) values ($1,$2)`, [u, `${u}@x.test`]);
  return u;
}
function fakeParse(body: any) {
  const sys = Array.isArray(body.system) ? body.system.map((b: any) => b.text).join("\n") : String(body.system);
  const user = body.messages[body.messages.length - 1].content as string;
  const reply = (p: unknown) => ({ parsed_output: p, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
  modelCalls++;
  if (sys.includes("spaced-review questions")) {
    const blocks = [...user.matchAll(/<objective key="([^"]+)">/g)];
    return reply({
      items: blocks.map(([, key], i) => ({
        key,
        terms: [],
        question: `Q-${i}-${key}`,
        choices: [`SECRET-RIGHT-${i}`, "w1", "w2", "w3"],
        correctIndex: 0,
        why: `SECRET-WHY-${i}`,
        testedTerms: [],
      })),
    });
  }
  return reply({ verdict: "correct", feedback: "ok", classification: "none", missedParts: [], rubric: [], misconception: null, confusedWith: null });
}

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1,$2,'T','certification',null)`, [track, `RP-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1,$2,'U',1)`, [unit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1,$2,$3,$4)`, [o, unit, `Obj ${i}`, i]);
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1,'g','TEACH about things and more things here','f','["a","b","c","d"]',0,'w','s','["a","b","c","d"]',0,'w','t')`,
      [o]
    );
  }
  await query(`insert into concept_sets (id, track_id, source, set_key, how_to_tell, dimensions) values ($1,$2,'generated','k1','h','[]')`, [set, track]);
  for (let p = 0; p < 2; p++) {
    await query(`insert into concept_set_members (set_id, position, name, objective_id) values ($1,$2,$3,$4)`, [set, p, `Concept${p}`, objs[p]]);
  }
  for (let i = 0; i < 2; i++) {
    await query(`insert into discrimination_items (set_id, scenario, answer_position, why) values ($1,$2,$3,$4)`, [set, `Scenario ${i}`, i, `CMP-WHY-${i}`]);
  }
  const owner = await newUser();
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1,$2,'A3PRIVATE-TRACK','certification',$3)`, [privTrack, `PV-${run}`, owner]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1,$2,'A3PRIVATE-UNIT',1)`, [privUnit, privTrack]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1,$2,'A3PRIVATE-OBJ',1)`, [privObj, privUnit]);
  setAiCallSink(async () => undefined);
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("no");
      },
      parse: async (b: any) => fakeParse(b),
    },
  } as any);
});
after(async () => {
  __setClientForTest(null);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, privTrack]]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

async function reviewSession(u: string, tag: string) {
  for (const o of objs) {
    await recordAttemptAndUpdateMastery({ userId: u, unitId: unit, objectiveId: o, kind: "lesson", stage: "solo", format: "open", question: `q-${tag}-${o}`, answer: "a", verdict: "correct" });
  }
  await query(`update review_schedule set due_on = current_date where user_id = $1`, [u]);
  const s = (await call(reviewStart, u, { body: { trackId: track } })).body.session;
  assert.ok(s && s.items.length >= 2, "session with >=2 items");
  return s;
}

describe("finding 3: a client attempt id replays only its own item", () => {
  test("review: an id used on item 0 can't reveal item 1's key (409); the same item still replays", async () => {
    const u = await newUser();
    const s = await reviewSession(u, "a");
    const cid = `cid-${randomUUID()}`;
    const first = await call(reviewAnswer, u, { body: { format: "open", answer: "my words", clientAttemptId: cid }, params: { id: s.id, position: String(s.items[0].position) } });
    assert.equal(first.status, 200);
    const peek = await call(reviewAnswer, u, { body: { format: "mc", chosenIndex: 0, clientAttemptId: cid }, params: { id: s.id, position: String(s.items[1].position) } });
    assert.equal(peek.status, 409);
    assert.ok(!JSON.stringify(peek.body).includes("SECRET-RIGHT"));
    const again = await call(reviewAnswer, u, { body: { format: "open", answer: "my words", clientAttemptId: cid }, params: { id: s.id, position: String(s.items[0].position) } });
    assert.equal(again.status, 200);
    assert.equal(again.body.replayed, true);
  });

  test("comparison: an id recorded elsewhere gets 409, not the answer", async () => {
    const u = await newUser();
    const q = await call(cmpQuestion, u, { params: { setId: set } });
    assert.equal(q.status, 200);
    const cid = `cid-${randomUUID()}`;
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, client_attempt_id)
       values ($1,$2,$3,'lesson','solo','open','qq','aa','correct',$4)`,
      [u, unit, objs[0], cid]
    );
    const r = await call(cmpAnswer, u, { body: { clientAttemptId: cid }, params: { itemId: q.body.item.id } });
    assert.equal(r.status, 409);
    assert.equal(r.body.correctAnswer, undefined);
    assert.equal(r.body.why, undefined);
  });

  test("explain-back: an id recorded for another objective gets 409", async () => {
    const u = await newUser();
    const cid = `cid-${randomUUID()}`;
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, client_attempt_id)
       values ($1,$2,$3,'lesson','solo','open','qq','aa','correct',$4)`,
      [u, unit, objs[0], cid]
    );
    const r = await call(explainPost, u, { body: { answer: "words", clientAttemptId: cid }, params: { id: objs[2] } });
    assert.equal(r.status, 409);
  });
});

describe("low: text a database can't store is refused before the model is called", () => {
  test("review typed answer with NUL: 400 and no model call", async () => {
    const u = await newUser();
    const s = await reviewSession(u, "nul");
    const before = modelCalls;
    const r = await call(reviewAnswer, u, { body: { format: "open", answer: "abc\u0000def" }, params: { id: s.id, position: String(s.items[0].position) } });
    assert.equal(r.status, 400);
    assert.equal(modelCalls, before);
  });

  test("explain-back with NUL: 400 and no model call", async () => {
    const u = await newUser();
    await recordAttemptAndUpdateMastery({ userId: u, unitId: unit, objectiveId: objs[2], kind: "lesson", stage: "solo", format: "open", question: "q3", answer: "a", verdict: "correct" });
    const before = modelCalls;
    const r = await call(explainPost, u, { body: { answer: "this is a long enough answer with several words \u0000 in it for sure" }, params: { id: objs[2] } });
    assert.equal(r.status, 400);
    assert.equal(modelCalls, before);
  });
});

describe("finding 7: /api/errors checks ids and bounds text; course creation is limited", () => {
  test("another learner's private unit/objective ids: 404 and no titles", async () => {
    const b = await newUser();
    const r = await call(errorsPost, b, { body: { topic: "probe", errorText: "probe", unitId: privUnit, objectiveId: privObj } });
    assert.equal(r.status, 404);
    // Rows stored before the fix don't show titles either.
    await query(`insert into error_log (user_id, unit_id, objective_id, topic, error_text) values ($1,$2,$3,'old','old')`, [b, privUnit, privObj]);
    const list = await call(errorsGet, b);
    const row = list.body.errors.find((e: any) => e.topic === "old");
    assert.deepEqual([row.objective_title, row.unit_title, row.track_title], [null, null, null]);
    const own = await call(errorsPost, b, { body: { topic: "mine", errorText: "x", unitId: unit, objectiveId: objs[0] } });
    assert.equal(own.status, 201);
  });

  test("a 3 MB errorText is refused; entries are rate limited", async () => {
    const b = await newUser();
    assert.equal((await call(errorsPost, b, { body: { topic: "t", errorText: "x".repeat(3_000_000) } })).status, 400);
    const statuses: number[] = [];
    for (let i = 0; i < 61; i++) statuses.push((await call(errorsPost, b, { body: { topic: "t", errorText: `e${i}` } })).status);
    assert.equal(statuses.filter((s) => s === 201).length, 60);
    assert.equal(statuses.at(-1), 429);
  });

  test("course creation: description capped, 10 an hour", async () => {
    const b = await newUser();
    const sub = (await queryOne<{ id: string }>(`select id from education_subcategories limit 1`))!.id;
    assert.equal((await call(coursesPost, b, { body: { code: "C", title: "t", trackType: "professional", subcategoryId: sub, description: "d".repeat(100_000) } })).status, 400);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await call(coursesPost, b, { body: { code: `C${i}-${run}`, title: "t", trackType: "professional", subcategoryId: sub } })).status);
    }
    assert.equal(statuses.filter((s) => s === 201).length, 10, statuses.join(","));
    assert.equal(statuses.at(-1), 429);
    await query(`delete from subject_tracks where user_id = $1`, [b]);
  });

  test("a non-UUID path id answers 404/400, never 500", async () => {
    const b = await newUser();
    for (const id of ["not-a-uuid", "1e20"]) {
      const r = await call(unitGet, b, { params: { id } });
      assert.ok(r.status === 404 || r.status === 400, `${id} -> ${r.status}`);
    }
    const r = await call(errorsGet, b, {});
    assert.equal(r.status, 200);
  });
});

function pngBomb(w: number, h: number): Promise<Buffer> {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (t: string, d: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(t), d]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const row = Buffer.alloc(w + 1);
  const def = zlib.createDeflate({ level: 9 });
  const parts: Buffer[] = [];
  def.on("data", (d) => parts.push(d));
  for (let y = 0; y < h; y++) def.write(row);
  def.end();
  return new Promise((res) =>
    def.on("end", () =>
      res(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", Buffer.concat(parts)), chunk("IEND", Buffer.alloc(0))]))
    )
  );
}

describe("finding 6: avatar dimensions are checked before decoding", () => {
  test("an 8000x8000 PNG is refused fast without the memory spike; a small one is accepted", async () => {
    const b = await newUser();
    const bomb = await pngBomb(8000, 8000);
    const before = process.memoryUsage().rss;
    const t0 = Date.now();
    const r = await call(avatarPost, b, { body: { imageBase64: bomb.toString("base64") } });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /too large/);
    assert.ok(Date.now() - t0 < 1500, "no decode");
    assert.ok(process.memoryUsage().rss - before < 100 * 1024 * 1024, "no decode-sized allocation");
    const small = await pngBomb(64, 64);
    assert.equal((await call(avatarPost, b, { body: { imageBase64: small.toString("base64") } })).status, 200);
  });
});
