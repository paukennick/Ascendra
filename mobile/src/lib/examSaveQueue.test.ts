import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createExamSaveQueue, unsavedMessage, type SaveOutcome, type SavePatch } from "./examSaveQueue.ts";

// REQ-113 (Audit 3 mobile H1, FAIL-250): exam saves are numbered, sent one
// at a time per question, retried, and flushed before submit.

type Call = { position: number; patch: SavePatch & { seq: number }; resolve: (o: SaveOutcome) => void; reject: (e: unknown) => void };

function fakeServer() {
  const calls: Call[] = [];
  const send = (position: number, patch: SavePatch & { seq: number }) =>
    new Promise<SaveOutcome>((resolve, reject) => calls.push({ position, patch, resolve, reject }));
  return { calls, send };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("exam save queue", () => {
  test("one save in flight per question; changes made meanwhile are merged and sent next, numbered upward", async () => {
    const srv = fakeServer();
    const q = createExamSaveQueue({ send: srv.send, initialSeq: { 3: 7 } });
    q.save(3, { response: { choice: 0 } });
    q.save(3, { response: { choice: 1 } });
    q.save(3, { confidence: 4 });
    assert.equal(srv.calls.length, 1, "the second change waits for the first");
    assert.deepEqual(srv.calls[0].patch, { response: { choice: 0 }, seq: 8 }, "numbered on from the server's last");
    srv.calls[0].resolve("saved");
    await tick();
    assert.equal(srv.calls.length, 2);
    assert.deepEqual(srv.calls[1].patch, { response: { choice: 1 }, confidence: 4, seq: 9 });
    srv.calls[1].resolve("saved");
    await tick();
    assert.equal(q.hasUnsaved(), false);
  });

  test("different questions save in parallel", () => {
    const srv = fakeServer();
    const q = createExamSaveQueue({ send: srv.send });
    q.save(0, { flagged: true });
    q.save(1, { flagged: true });
    assert.deepEqual(srv.calls.map((c) => [c.position, c.patch.seq]), [[0, 1], [1, 1]]);
  });

  test("a failed save keeps its fields and goes out again with the next change, at a higher number", async () => {
    const srv = fakeServer();
    const errors: unknown[] = [];
    const q = createExamSaveQueue({ send: srv.send, onError: (e) => errors.push(e) });
    q.save(2, { response: { choice: 3 } });
    srv.calls[0].reject(new TypeError("Network request failed"));
    await tick();
    assert.deepEqual(q.state().failed, [2]);
    assert.equal(errors.length, 1);
    assert.equal(srv.calls.length, 1, "no automatic resend until something asks");
    q.save(2, { timeSpentMs: 9000 });
    assert.deepEqual(srv.calls[1].patch, { response: { choice: 3 }, timeSpentMs: 9000, seq: 2 });
    srv.calls[1].resolve("saved");
    await tick();
    assert.deepEqual(q.state().failed, []);
  });

  test("a newer change wins over the failed one's value for the same field", async () => {
    const srv = fakeServer();
    const q = createExamSaveQueue({ send: srv.send });
    q.save(0, { response: { choice: 0 } });
    q.save(0, { response: { choice: 2 } }); // queued behind the first
    srv.calls[0].reject(new Error("timeout"));
    await tick();
    q.retryFailed();
    assert.deepEqual(srv.calls[1].patch, { response: { choice: 2 }, seq: 2 });
  });

  test("flush waits for in-flight saves, retries failed ones, and lists what is still unsaved", async () => {
    const srv = fakeServer();
    const q = createExamSaveQueue({ send: srv.send });
    q.save(0, { response: { choice: 1 } });
    q.save(1, { response: { choice: 2 } });
    srv.calls[1].reject(new Error("offline"));
    await tick();
    let done = false;
    const flushed = q.flush().then((r) => {
      done = true;
      return r;
    });
    await tick();
    assert.equal(done, false, "submit waits for the save still in flight");
    srv.calls[0].resolve("saved");
    await tick();
    // The failed save of question 2 was retried by the flush.
    assert.equal(srv.calls.length, 3);
    assert.deepEqual(srv.calls[2].patch, { response: { choice: 2 }, seq: 2 });
    srv.calls[2].reject(new Error("still offline"));
    const r = await flushed;
    assert.deepEqual(r, { unsaved: [1], ended: false });
    assert.equal(q.hasUnsaved(), true);
  });

  test("flush with everything saved reports nothing unsaved", async () => {
    const srv = fakeServer();
    const q = createExamSaveQueue({ send: srv.send });
    q.save(4, { flagged: true });
    const f = q.flush();
    srv.calls[0].resolve("stale"); // a newer save had already won: still saved
    assert.deepEqual(await f, { unsaved: [], ended: false });
  });

  test("a 409 (session ended) stops further saves and is reported once", async () => {
    const srv = fakeServer();
    let endedCalls = 0;
    const q = createExamSaveQueue({ send: srv.send, onEnded: () => endedCalls++ });
    q.save(0, { flagged: true });
    q.save(0, { flagged: false });
    srv.calls[0].resolve("ended");
    await tick();
    assert.equal(endedCalls, 1);
    assert.equal(srv.calls.length, 1, "nothing more is sent to an ended session");
    q.save(1, { flagged: true });
    assert.equal(srv.calls.length, 1);
    assert.deepEqual(await q.flush(), { unsaved: [], ended: true });
  });
});

describe("unsaved message", () => {
  test("names the questions, 1-based, and says nothing is lost", () => {
    assert.match(unsavedMessage([4]), /question 5 isn't saved yet/);
    assert.match(unsavedMessage([0, 2]), /questions 1, 3 aren't saved yet/);
    assert.match(unsavedMessage([0, 1, 2, 3, 4, 5, 6]), /1, 2, 3, 4, 5 and 2 more/);
    assert.match(unsavedMessage([0]), /still here/);
  });
});
