// REQ-332: reviewer quick notes -- the rules that need no database: what a
// quick note must carry, which context keys are kept and how, and that the
// app's lists match the server's.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EMPTY_QUICK_NOTE_MESSAGE,
  ITEM_KINDS,
  QUICK_CONTEXT_RULES,
  QUICK_NOTE_MAX,
  QUICK_TAGS,
  TEXTS,
  parseQuickContext,
  parseQuickNoteInput,
  quickNoteAsFeedback,
} from "./reviewers-config";

const T = "6F1D2B3C-4A5B-4C6D-8E7F-90A1B2C3D4E5";
const S = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("a quick note", () => {
  test("the note (trimmed), an optional tag, ids lowercased, the context kept", () => {
    const q = parseQuickNoteInput({ kind: "quick", note: "  Too fast  ", tag: "unrealistic", trackId: T, simId: S, context: { screen: "Simulation", simTick: 12 } });
    assert.deepEqual(q, { trackId: T.toLowerCase(), simId: S, note: "Too fast", tag: "unrealistic", context: { screen: "Simulation", simTick: 12 } });
    const bare = parseQuickNoteInput({ kind: "quick", note: "Hi" });
    assert.ok(typeof bare !== "string");
    assert.equal(bare.tag, null);
    assert.equal(bare.context, null);
    assert.equal(bare.trackId, null);
  });
  test("refuses no note, a long or unstorable note, a bad tag and bad ids", () => {
    assert.equal(parseQuickNoteInput({ kind: "quick" }), EMPTY_QUICK_NOTE_MESSAGE);
    assert.equal(parseQuickNoteInput({ kind: "quick", note: "  " }), EMPTY_QUICK_NOTE_MESSAGE);
    assert.equal(typeof parseQuickNoteInput({ kind: "quick", note: "x".repeat(QUICK_NOTE_MAX + 1) }), "string");
    assert.equal(typeof parseQuickNoteInput({ kind: "quick", note: "bad \u0000" }), "string");
    assert.equal(typeof parseQuickNoteInput({ kind: "quick", note: 5 }), "string");
    assert.equal(typeof parseQuickNoteInput({ kind: "quick", note: "x", tag: "angry" }), "string");
    assert.equal(typeof parseQuickNoteInput({ kind: "quick", note: "x", trackId: "nope" }), "string");
    assert.equal(typeof parseQuickNoteInput({ kind: "quick", note: "x", simId: 3 }), "string");
    assert.equal(typeof parseQuickNoteInput(null), "string");
    assert.equal(typeof parseQuickNoteInput([]), "string");
  });
  test("as a feedback row: the note in otherComments and nothing else", () => {
    const q = parseQuickNoteInput({ kind: "quick", note: "Note", trackId: T });
    assert.ok(typeof q !== "string");
    const f = quickNoteAsFeedback(q);
    assert.equal(f.texts.otherComments, "Note");
    assert.deepEqual(Object.keys(f.texts).sort(), Object.keys(TEXTS).sort());
    assert.ok(Object.entries(f.texts).every(([k, v]) => k === "otherComments" || v === null));
    assert.ok(Object.values(f.ratings).every((v) => v === null));
    assert.equal(f.recommend, null);
    assert.equal(f.trackId, T.toLowerCase());
  });
});

describe("the context", () => {
  test("keeps only known keys, each in its shape; never refuses", () => {
    const c = parseQuickContext({
      route: "/course/abc/sim/def?title=Secret#x",
      screen: "  Simulation\n ",
      unitId: T,
      objectiveId: "not a uuid!",
      lessonStage: "fade",
      itemKind: "exam",
      itemId: "sec-q-1",
      itemPosition: 3,
      simPhase: "phase.2",
      simPhaseLabel: "x".repeat(300),
      simTick: 1.5,
      simClock: "04:30",
      examQuestion: -1,
      examQuestionCount: "10",
      labId: "lab_1",
      answer: "never kept",
      __proto__: { injected: true },
    });
    assert.deepEqual(c, {
      route: "/course/abc/sim/def",
      screen: "Simulation",
      unitId: T.toLowerCase(),
      lessonStage: "fade",
      itemKind: "exam",
      itemId: "sec-q-1",
      itemPosition: 3,
      simPhase: "phase.2",
      simPhaseLabel: "x".repeat(120),
      simClock: "04:30",
      labId: "lab_1",
    });
  });
  test("a route must be a plain path; a bad item kind is dropped", () => {
    assert.equal(parseQuickContext({ route: "https://evil.test/x" }), null);
    assert.equal(parseQuickContext({ route: "/a b" }), null);
    assert.equal(parseQuickContext({ itemKind: "secret" }), null);
    assert.equal(parseQuickContext({ screen: "bad \u0000" }), null);
  });
  test("nothing usable is null, and so is anything that isn't an object", () => {
    assert.equal(parseQuickContext({}), null);
    assert.equal(parseQuickContext(null), null);
    assert.equal(parseQuickContext("x"), null);
    assert.equal(parseQuickContext([1, 2]), null);
  });
  test("the largest context the rules allow fits the table's 4 KB check with room to spare", () => {
    const big: Record<string, unknown> = {};
    for (const [k, rule] of Object.entries(QUICK_CONTEXT_RULES)) {
      const r = rule as { kind: string; max?: number; values?: readonly string[] };
      if (r.kind === "path") big[k] = "/" + "a".repeat(250);
      else if (r.kind === "text" || r.kind === "slug") big[k] = "a".repeat(r.max!);
      else if (r.kind === "id") big[k] = "a".repeat(64);
      else if (r.kind === "int") big[k] = r.max;
      else big[k] = r.values![0];
    }
    const c = parseQuickContext(big)!;
    assert.equal(Object.keys(c).length, Object.keys(QUICK_CONTEXT_RULES).length);
    assert.ok(JSON.stringify(c).length < 2048, String(JSON.stringify(c).length));
  });
});

describe("the app's lists match", () => {
  const app = readFileSync(join(import.meta.dirname, "../../mobile/src/lib/quickNote.ts"), "utf8");
  const list = (name: string) => {
    const m = app.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\] as const;`));
    assert.ok(m, name);
    return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  };
  test("tags, item kinds and the note's limit", () => {
    assert.deepEqual(list("QUICK_TAGS"), [...QUICK_TAGS]);
    assert.deepEqual(list("ITEM_KINDS"), [...ITEM_KINDS]);
    assert.match(app, new RegExp(`export const QUICK_NOTE_MAX = ${QUICK_NOTE_MAX};`));
  });
  test("every context key the app sends is one the server keeps", () => {
    const block = app.slice(app.indexOf("export interface QuickContext {"), app.indexOf("}", app.indexOf("export interface QuickContext {")));
    const keys = [...block.matchAll(/^\s+(\w+)\?:/gm)].map((m) => m[1]);
    assert.deepEqual(keys.sort(), Object.keys(QUICK_CONTEXT_RULES).sort());
  });
  test("the database allows exactly these tags", () => {
    const sql = readFileSync(join(import.meta.dirname, "../supabase/migrations/089_reviewer_quick_notes.sql"), "utf8");
    const m = sql.match(/quick_tag in \(([^)]*)\)/);
    assert.ok(m);
    assert.deepEqual([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]), [...QUICK_TAGS]);
  });
});
