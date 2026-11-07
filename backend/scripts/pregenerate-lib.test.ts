import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { estimateCost, pairBatchResults, parseArgs, parseRequestId, requestIds, type BatchResultLine } from "./pregenerate-lib";

const intro = z.object({ guessPrompt: z.string(), teach: z.string() });
const practice = z.object({ fadeProblem: z.string() });
const A = "0b9e6c1a-2f4d-4c1e-9a7b-3d2e1f0a9b8c";
const B = "1c9e6c1a-2f4d-4c1e-9a7b-3d2e1f0a9b8d";
const ok = (id: string, body: unknown, stop = "end_turn"): BatchResultLine => ({
  custom_id: id,
  result: { type: "succeeded", message: { content: [{ type: "text", text: JSON.stringify(body) }], stop_reason: stop } },
});

describe("pregenerate", () => {
  test("estimate is about two cents a lesson and scales linearly", () => {
    const one = estimateCost(1).perLessonUsd;
    assert.ok(one > 0.015 && one < 0.025, String(one));
    assert.equal(estimateCost(5266).totalUsd.toFixed(2), (one * 5266).toFixed(2));
  });

  test("request ids round-trip and stay within the API's 64-character pattern", () => {
    const ids = requestIds(A);
    for (const id of [ids.intro, ids.practice]) assert.match(id, /^[a-zA-Z0-9_-]{1,64}$/);
    assert.deepEqual(parseRequestId(ids.practice), { objectiveId: A, part: "practice" });
    assert.equal(parseRequestId("junk"), null);
  });

  test("a lesson is saved only when both halves succeed and validate", () => {
    const { lessons, failed } = pairBatchResults(
      [
        ok(requestIds(A).intro, { guessPrompt: "g", teach: "t" }),
        ok(requestIds(A).practice, { fadeProblem: "f" }),
        ok(requestIds(B).intro, { guessPrompt: "g", teach: "t" }),
        { custom_id: requestIds(B).practice, result: { type: "errored" } },
      ],
      intro,
      practice
    );
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0].objectiveId, A);
    assert.deepEqual(failed, [{ objectiveId: B, reason: "practice errored" }]);
  });

  test("truncated, non-JSON and off-schema halves are failures, not partial saves", () => {
    const { lessons, failed } = pairBatchResults(
      [
        ok(requestIds(A).intro, { guessPrompt: "g", teach: "t" }, "max_tokens"),
        ok(requestIds(A).practice, { fadeProblem: "f" }),
        ok(requestIds(B).intro, { guessPrompt: "g" }),
        ok(requestIds(B).practice, { fadeProblem: "f" }),
      ],
      intro,
      practice
    );
    assert.equal(lessons.length, 0);
    assert.equal(failed.find((f) => f.objectiveId === A)?.reason, "intro hit max_tokens");
    assert.equal(failed.find((f) => f.objectiveId === B)?.reason, "intro failed schema");
  });

  test("estimate is the default; submit and collect must be asked for", () => {
    assert.equal(parseArgs([]).mode, "estimate");
    assert.deepEqual(parseArgs(["--tracks", "SY0-701, SAA-C03", "--limit", "200"]), {
      mode: "estimate",
      tracks: ["SY0-701", "SAA-C03"],
      limit: 200,
    });
    assert.equal(parseArgs(["--submit"]).mode, "submit");
    assert.equal(parseArgs(["--collect", "msgbatch_01AbC"]).batchId, "msgbatch_01AbC");
    assert.throws(() => parseArgs(["--collect"]));
    assert.throws(() => parseArgs(["--limit", "-3"]));
    assert.throws(() => parseArgs(["--go"]));
  });
});
