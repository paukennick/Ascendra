// REQ-253: the Key terms button. The pure logic (parsing, the device copy,
// which view the sheet shows, spoken labels) and source checks of the
// component and its one-line placement in the lesson screen: 48 dp targets,
// screen-reader labels, SheetModal (never Modal), loading and error states,
// offline from the device copy, swept at logout, a long timeout for first use.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  INITIAL_KEY_TERMS,
  KEY_TERMS_EMPTY_ERROR,
  keyTermsStorageKey,
  keyTermsView,
  parseCached,
  parsePrimer,
  serializeCached,
  sheetTitleA11y,
  termA11yLabel,
  type KeyTermsPrimer,
} from "./keyTerms.ts";
import { localDataOwner, userLocalDataKeys } from "./localData.ts";
// client.ts reads React Native's __DEV__ global when it loads.
(globalThis as Record<string, unknown>).__DEV__ = false;
const { requestTimeoutMs, MODEL_TIMEOUT_MS } = await import("../api/client.ts");

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const OBJ = "123e4567-e89b-12d3-a456-426614174000";
const server = {
  primer: {
    objectiveId: OBJ,
    terms: [
      { term: "variable", plain: "A name for a value.", example: "A labeled jar.", examWording: "A name bound to an object." },
      { term: "", plain: "dropped: no term" },
      { term: "int", plain: "A whole number.", example: "", examWording: "" },
    ],
    generatedAt: "2026-11-12T10:00:00Z",
    lessonHash: "a".repeat(64),
  },
  cached: false,
};

describe("parsing", () => {
  test("the server's primer, with unusable terms dropped", () => {
    const p = parsePrimer(server)!;
    assert.deepEqual(p.terms.map((t) => t.term), ["variable", "int"]);
    assert.equal(p.lessonHash, "a".repeat(64));
  });
  test("nothing usable is null", () => {
    assert.equal(parsePrimer(null), null);
    assert.equal(parsePrimer({ primer: { objectiveId: OBJ, terms: [], lessonHash: "h" } }), null);
    assert.equal(parsePrimer({ primer: { terms: server.primer.terms, lessonHash: "h" } }), null);
  });
});

describe("the device copy", () => {
  const p = parsePrimer(server)!;
  test("per user and objective, swept at logout", () => {
    const key = keyTermsStorageKey("user-1", OBJ);
    assert.equal(key, `ascendra.keyTerms.user-1.${OBJ}`);
    assert.equal(localDataOwner(key), "user-1");
    assert.deepEqual(userLocalDataKeys([key, keyTermsStorageKey("user-2", OBJ)], "user-1"), [key]);
  });
  test("round-trips, and is refused for another objective or a corrupt value", () => {
    assert.deepEqual(parseCached(serializeCached(p), OBJ), p);
    assert.equal(parseCached(serializeCached(p), "other"), null);
    assert.equal(parseCached("{not json", OBJ), null);
    assert.equal(parseCached(JSON.stringify({ v: 2, primer: p }), OBJ), null);
    assert.equal(parseCached(null, OBJ), null);
  });
});

describe("which view the sheet shows", () => {
  const p = parsePrimer(server)! as KeyTermsPrimer;
  test("loading first, then the server's terms", () => {
    assert.deepEqual(keyTermsView(INITIAL_KEY_TERMS), { kind: "loading" });
    assert.deepEqual(keyTermsView({ ...INITIAL_KEY_TERMS, loading: true }), { kind: "loading" });
    assert.deepEqual(keyTermsView({ ...INITIAL_KEY_TERMS, fresh: p }), { kind: "ready", primer: p, offline: false });
  });
  test("the device copy while loading, and offline when the request fails", () => {
    assert.deepEqual(keyTermsView({ ...INITIAL_KEY_TERMS, cached: p, loading: true }), { kind: "ready", primer: p, offline: false });
    assert.deepEqual(keyTermsView({ ...INITIAL_KEY_TERMS, cached: p, error: "offline" }), { kind: "ready", primer: p, offline: true });
  });
  test("no copy and a failed request: the error, with the server's words", () => {
    assert.deepEqual(keyTermsView({ ...INITIAL_KEY_TERMS, error: KEY_TERMS_EMPTY_ERROR }), { kind: "error", message: KEY_TERMS_EMPTY_ERROR });
  });
});

describe("screen-reader labels", () => {
  test("a term is read with its explanation, example and exam wording; empty parts are left out", () => {
    const [v, i] = parsePrimer(server)!.terms;
    assert.equal(termA11yLabel(v), "variable. A name for a value. Example: A labeled jar. On the exam: A name bound to an object.");
    assert.equal(termA11yLabel(i), "int. A whole number.");
    assert.equal(sheetTitleA11y(1), "Key terms, 1 term");
    assert.equal(sheetTitleA11y(3), "Key terms, 3 terms");
  });
});

describe("the component and its placement", () => {
  const src = read("src/components/KeyTerms.tsx");
  test("a button of at least 48 dp with a role, label and hint", () => {
    assert.match(src, /minHeight: MIN_TOUCH/);
    assert.match(src, /minWidth: MIN_TOUCH/);
    assert.match(src, /accessibilityRole="button"\s+accessibilityLabel=\{KEY_TERMS_LABEL\}\s+accessibilityHint=\{KEY_TERMS_HINT\}/);
  });
  test("the sheet is a SheetModal (hidden under the app lock), never React Native's Modal", () => {
    assert.match(src, /<SheetModal /);
    assert.doesNotMatch(src, /<Modal\b/);
    assert.doesNotMatch(src, /import \{[^}]*\bModal\b[^}]*\} from "react-native"/);
  });
  test("loading, error with retry, offline note, a header and a close control", () => {
    assert.match(src, /view\.kind === "loading"/);
    assert.match(src, /view\.kind === "error"/);
    assert.match(src, /label="Try again"/);
    assert.match(src, /KEY_TERMS_OFFLINE/);
    assert.match(src, /accessibilityRole="header"/);
    assert.match(src, /accessibilityLabel="Close key terms"/);
    assert.match(src, /accessibilityViewIsModal/);
  });
  test("the device copy is written only when the logout guard allows it", () => {
    assert.match(src, /localDataGuard\.mayWrite\(key\)/);
  });
  test("exported for other screens, with initiallyOpen for the levels work", () => {
    // REQ-252 added onOpenChange (key_terms_opened / key_terms_closed events).
    assert.match(src, /export function KeyTermsButton\(\{\s*objectiveId,\s*initiallyOpen = false,\s*onOpenChange,?\s*\}/);
    assert.match(src, /export function KeyTermsSheet/);
    assert.match(src, /export function useKeyTerms/);
  });
  test("the lesson screen places it once, beside the step header, at every step", () => {
    const lesson = read("app/(app)/course/[trackId]/lesson/[objectiveId].tsx");
    assert.equal((lesson.match(/<KeyTermsButton\b/g) ?? []).length, 1);
    // Right after the step header (a comment between them is allowed). REQ-252:
    // New learners in a pilot course get it opened once at the start.
    assert.match(lesson, /<StepHeader [^\n]*\/>\n\s*\{\/\* REQ-253[\s\S]*?\*\/\}\n\s*<KeyTermsButton\b[^>]*objectiveId=\{objectiveId\}[^>]*\/>/);
    assert.match(lesson, /<KeyTermsButton\b[^>]*initiallyOpen=\{openKeyTermsAtStart\(flow, step\)\}/);
  });
  test("first use may write and fact-check the terms: the long model timeout", () => {
    assert.equal(requestTimeoutMs(`/api/objectives/${OBJ}/primer`), MODEL_TIMEOUT_MS);
  });
});
