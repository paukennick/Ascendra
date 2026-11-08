// REQ-135: clock skew on the account copy, the answer-signature cap, and
// the paged account export.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { OPEN_ANSWER_MAX, answerSignature, parseSnapshot, toLocalClock } from "./lessonProgress.ts";
import { fetchFullExport } from "./accountExport.ts";

const serverRecord = (savedAt: number, ageMs?: number) => ({
  step: "fade",
  guess: "g",
  guessFeedback: null,
  confidence: 3,
  lessonKey: "k",
  checks: {},
  savedAt,
  ...(ageMs === undefined ? {} : { ageMs }),
});

describe("account copy and a skewed phone clock", () => {
  const phoneNow = 1_000_000_000;
  const serverNow = phoneNow + 5 * 60_000; // phone runs 5 minutes behind

  test("without ageMs, a phone clock 5 minutes behind rejects the account copy (the old bug)", () => {
    assert.equal(parseSnapshot(serverRecord(serverNow - 1_000), "k", phoneNow), null);
  });

  test("with ageMs, the copy is placed on the phone's clock and accepted", () => {
    const local = toLocalClock(serverRecord(serverNow - 1_000, 1_000), phoneNow);
    const snap = parseSnapshot(local, "k", phoneNow);
    assert.ok(snap);
    assert.equal(snap.savedAt, phoneNow - 1_000);
  });

  test("a negative or missing ageMs leaves the record unchanged", () => {
    const r = serverRecord(5);
    assert.equal(toLocalClock(r, phoneNow), r);
    const neg = serverRecord(5, -1);
    assert.equal(toLocalClock(neg, phoneNow), neg);
    assert.equal(toLocalClock(null, phoneNow), null);
  });
});

describe("answer signature", () => {
  test("never longer than the cap plus its prefix, so the server stores it whole (8000)", () => {
    const sig = answerSignature("open", null, "x".repeat(20_000));
    assert.equal(sig.length, "open:".length + OPEN_ANSWER_MAX);
    assert.ok(sig.length < 8_000);
  });
});

describe("paged account export", () => {
  test("fetches each section's remaining pages and merges them in order", async () => {
    const pages: Record<string, Record<string, unknown>> = {
      "/api/account/export": { exportedAt: "t", attempts: [1, 2], profile: { id: "u" }, more: { attempts: { nextOffset: 2 } } },
      "/api/account/export?section=attempts&offset=2": { rows: [3, 4], nextOffset: 4 },
      "/api/account/export?section=attempts&offset=4": { rows: [5], nextOffset: null },
    };
    const seen: string[] = [];
    const out = await fetchFullExport(async (p) => {
      seen.push(p);
      return pages[p];
    });
    assert.deepEqual(out.attempts, [1, 2, 3, 4, 5]);
    assert.equal("more" in out, false);
    assert.equal(seen.length, 3);
  });

  // REQ-118 (FAIL-370): a first page over the size budget leaves whole
  // sections out and lists them with nextOffset 0.
  test("a section left off the first page (nextOffset 0) is fetched from the start", async () => {
    const pages: Record<string, Record<string, unknown>> = {
      "/api/account/export": { exportedAt: "t", profile: { id: "u" }, attempts: [1], more: { attempts: { nextOffset: 1 }, reviewLog: { nextOffset: 0 } } },
      "/api/account/export?section=attempts&offset=1": { rows: [2], nextOffset: null },
      "/api/account/export?section=reviewLog&offset=0": { rows: ["a", "b"], nextOffset: 2 },
      "/api/account/export?section=reviewLog&offset=2": { rows: ["c"], nextOffset: null },
    };
    const out = await fetchFullExport(async (p) => pages[p]);
    assert.deepEqual(out.attempts, [1, 2]);
    assert.deepEqual(out.reviewLog, ["a", "b", "c"]);
    assert.equal(out.incomplete, undefined);
  });
});
