// REQ-217 (FAIL-1044..1054, 1062): phone screens. Pure rules are called; the
// wiring in screens, which tests can't render, is checked as source.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pendingIdFor } from "./pendingId.ts";
import { examLeaveGuard } from "./examPractice.ts";
import { keyboardOverlap, needsManualKeyboardAvoidance } from "./keyboardOverlap.ts";
import { alreadyGradedResult } from "../sim/runtime/reasoningReplay.ts";
import { reasoningDraftKey } from "./drafts.ts";
import { localDataOwner } from "./localData.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("TextField passes keyboardType through (FAIL-1044)", () => {
  test("the destructured prop reaches the TextInput", () => {
    const ui = read("../components/ui.tsx");
    assert.match(ui, /autoCapitalize=\{autoCapitalize\}\s*keyboardType=\{keyboardType\}/);
  });
});

describe("the exam start id survives a retry (FAIL-1048)", () => {
  test("same request keeps its id; a different one gets its own", () => {
    let n = 0;
    const make = () => `id${++n}`;
    const a = pendingIdFor(null, "t:sprint:true", make);
    assert.equal(pendingIdFor(a, "t:sprint:true", make).id, a.id, "a retry reuses it");
    assert.notEqual(pendingIdFor(a, "t:mock:true", make).id, a.id);
    assert.notEqual(pendingIdFor(a, "t:sprint:false", make).id, a.id);
  });
  test("exam.tsx keeps it in a ref and drops it only after a successful start", () => {
    const src = read("../../app/(app)/course/[trackId]/exam.tsx");
    assert.doesNotMatch(src, /clientSessionId: Crypto\.randomUUID\(\)/);
    const start = src.slice(src.indexOf("const pendingStart"), src.indexOf("async function open"));
    assert.ok(start.indexOf("clientSessionId: pendingStart.current.id") < start.indexOf("pendingStart.current = null;"));
  });
});

describe("leaving a running exam by any route saves and warns (FAIL-1049)", () => {
  test("the guard", () => {
    assert.equal(examLeaveGuard(false, true), true);
    assert.equal(examLeaveGuard(true, true), false, "once confirmed");
    assert.equal(examLeaveGuard(false, false), false, "a sign-out or lock is never held back");
  });
  test("RunView listens for beforeRemove and flushes first", () => {
    const src = read("../../app/(app)/course/[trackId]/exam.tsx");
    assert.match(src, /addListener\("beforeRemove"/);
    const w = src.slice(src.indexOf("async function leaveWith"), src.indexOf("function leave()"));
    assert.ok(w.indexOf("leaveQuestion()") < w.indexOf("q.flush()") && w.indexOf("q.flush()") < w.indexOf("proceed();"));
    assert.match(src, /onPress: \(\) => pendingLeave\.current\(\)/, "Leave anyway completes the pending back action");
  });
});

describe("a sim reasoning answer already graded shows its result (FAIL-1050)", () => {
  const result = { momentId: "m1", status: "graded", verdict: "partial", feedback: "ok", partScores: [], fixNext: null, modelAnswer: "model", replayed: true };
  test("reads the 409's result", () => {
    const got = alreadyGradedResult({ status: 409, data: { code: "already_graded", error: "x", result } });
    assert.equal(got?.modelAnswer, "model");
    assert.equal(got?.replayed, true);
  });
  test("anything else is not a result", () => {
    assert.equal(alreadyGradedResult({ status: 409, data: { code: "already_graded" } }), null, "the race answer carries no result");
    assert.equal(alreadyGradedResult({ status: 409, data: { code: "id_conflict", result } }), null);
    assert.equal(alreadyGradedResult({ status: 500, data: { code: "already_graded", result } }), null);
    assert.equal(alreadyGradedResult(new Error("x")), null);
    assert.equal(alreadyGradedResult(null), null);
    assert.equal(alreadyGradedResult({ status: 409, data: { code: "already_graded", result: { momentId: "m" } } }), null);
  });
  test("the draft is kept under a key the logout sweep removes, and the card uses it", () => {
    const key = reasoningDraftKey("user-1", "run-1", "m.1");
    assert.equal(localDataOwner(key), "user-1");
    assert.ok(!key.slice(key.indexOf("user-1")).includes("m.1"), "dots in ids can't split the key");
    assert.match(read("../sim/SimPanels.tsx"), /useStoredDraft\(draftKey,/);
    assert.match(read("../sim/useSimRun.ts"), /alreadyGradedResult\(err\)/);
  });
});

describe("destructive actions ask first; failures are shown (FAIL-1051..1054)", () => {
  test("lab Start over confirms and shows startError; a 409 reloads", () => {
    const src = read("../../app/(app)/course/[trackId]/lab/[labId].tsx");
    const idx = src.indexOf('label="Start over"');
    assert.match(src.slice(idx - 600, idx + 800), /Alert\.alert\("Start over\?"/);
    assert.match(src.slice(idx - 600, idx), /startError \? <ErrorBanner/);
    assert.match(src, /err\.status === 409\) onStale\(\)/);
    assert.match(src, /onStale=\{load\}/);
  });
  test("sim End the run and Start over confirm; a failed reload shows an error", () => {
    const src = read("../../app/(app)/course/[trackId]/sim/[simId].tsx");
    assert.match(src, /Alert\.alert\("End the run\?"/);
    assert.match(src, /Alert\.alert\("Start over\?"/);
    assert.match(src, /sim\.status === "error" && sim\.error \? <ErrorBanner/);
  });
});

describe("the keyboard no longer covers fields on Android 15+ (FAIL-1062)", () => {
  test("rules", () => {
    assert.equal(needsManualKeyboardAvoidance("android", 35), true);
    assert.equal(needsManualKeyboardAvoidance("android", 34), false, "the system still resizes");
    assert.equal(needsManualKeyboardAvoidance("ios", 35), false);
    assert.equal(needsManualKeyboardAvoidance("web", "35"), false);
    assert.equal(keyboardOverlap(800, 500), 300);
    assert.equal(keyboardOverlap(500, 800), 0, "window already resized");
    assert.equal(keyboardOverlap(NaN, 500), 0);
  });
  test("Screen and the coach chat use it", () => {
    assert.match(read("../components/ui.tsx"), /useKeyboardOverlap\(wrapRef\)/);
    assert.match(read("../../app/(app)/course/[trackId]/chat.tsx"), /useKeyboardOverlap\(wrapRef\)/);
  });
});

describe("sign-in screens say so when offline (FAIL-1045)", () => {
  test("messageOr", async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const { messageOr, NETWORK_MESSAGE } = await import("./errorMessage.ts");
    const { NetworkError, ApiError } = await import("../api/client.ts");
    assert.equal(messageOr(new NetworkError(new Error("Network request failed")), "Something went wrong."), NETWORK_MESSAGE);
    assert.equal(messageOr(new TypeError("Network request failed"), "fallback"), NETWORK_MESSAGE);
    assert.equal(messageOr(new ApiError("Wrong email or password.", 401, null), "fallback"), "Wrong email or password.");
    assert.equal(messageOr(new Error("boom"), "fallback"), "fallback");
    assert.equal(messageOr("x", "fallback"), "fallback");
  });
  test("no sign-in screen turns a non-ApiError into a generic message", () => {
    for (const f of ["login", "register", "forgot-password", "mfa-challenge", "verify-email-pending"]) {
      assert.doesNotMatch(read(`../../app/(auth)/${f}.tsx`), /err instanceof ApiError \? err\.message/, f);
    }
  });
});
