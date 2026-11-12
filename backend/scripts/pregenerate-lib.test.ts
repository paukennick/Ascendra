import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  batchRequestUpperUsd,
  batchUsageUsd,
  estimateCost,
  factCheckUpperUsd,
  fillBudget,
  pairBatchResults,
  parseArgs,
  parseHalf,
  parseRequestId,
  planLines,
  requestIds,
  requestInputTokens,
  type BatchResultLine,
  type Candidate,
} from "./pregenerate-lib";

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
    const e = parseArgs(["--tracks", "SY0-701, saa-c03", "--limit", "200"]);
    assert.deepEqual([e.mode, e.tracks, e.limit, e.maxUsd, e.dryRun], ["estimate", ["SY0-701", "SAA-C03"], 200, null, false]);
    // REQ-248: a submit without --limit also needs --confirm-full-run (lib/pregen-style-retry.test.ts)
    assert.equal(parseArgs(["--submit", "--tracks", "DPT", "--max-usd", "50", "--limit", "25"]).mode, "submit");
    assert.equal(parseArgs(["--collect", "msgbatch_01AbC"]).batchId, "msgbatch_01AbC");
    assert.throws(() => parseArgs(["--collect"]));
    assert.throws(() => parseArgs(["--limit", "-3"]));
    assert.throws(() => parseArgs(["--go"]));
  });
});

// REQ-208 (FAIL-979): the budget guard.
const cand = (track: string, unit: string, usd: number, n = 1): Candidate[] =>
  Array.from({ length: n }, (_, i) => ({ objectiveId: `${unit}-${i}`, trackCode: track, unitId: `${track}-${unit}`, unitTitle: unit, usd }));

describe("pregenerate arguments (REQ-208)", () => {
  test("submit needs an explicit track list and a cap; it never submits the whole catalog", () => {
    assert.throws(() => parseArgs(["--submit", "--max-usd", "50"]), /needs --tracks/);
    assert.throws(() => parseArgs(["--submit", "--tracks", "DPT"]), /needs --max-usd/);
  });

  test("--tracks keeps the order given (it is the priority), upper-cases, drops repeats, and refuses odd codes", () => {
    assert.deepEqual(parseArgs(["--tracks", "dpt,PTPREREQ,CCRNADULT,dpt"]).tracks, ["DPT", "PTPREREQ", "CCRNADULT"]);
    assert.throws(() => parseArgs(["--tracks", "DPT;drop"]), /not a track code/);
  });

  test("--max-usd must be a plain positive dollar amount", () => {
    assert.equal(parseArgs(["--max-usd", "12.5"]).maxUsd, 12.5);
    for (const bad of ["0", "-1", "abc", "1e3", "NaN", "", "5 "]) assert.throws(() => parseArgs(["--max-usd", bad]), /max-usd/, bad);
    assert.throws(() => parseArgs(["--max-usd"]), /needs a value/);
  });

  test("--dry-run, --intro-batch, --summary and --allow-concurrent", () => {
    const a = parseArgs(["--collect", "msgbatch_01A", "--intro-batch", "msgbatch_01B", "--dry-run", "--summary", "/tmp/s.json", "--allow-concurrent", "--max-usd", "5"]);
    assert.deepEqual([a.dryRun, a.introBatchId, a.summaryPath, a.allowConcurrent], [true, "msgbatch_01B", "/tmp/s.json", true]);
    assert.throws(() => parseArgs(["--intro-batch", "msgbatch_01B"]), /only for --collect/);
    assert.throws(() => parseArgs(["--collect", "msgbatch_01A", "--intro-batch", "nope"]), /msgbatch_/);
  });
});

describe("the upper bound (REQ-208)", () => {
  const sonnet = "claude-sonnet-5-5";
  const tiny = { max_tokens: 4000, system: "s", messages: [{ role: "user", content: "u" }] };

  test("a batch request is priced at max_tokens with the Batches discount: 4000 output tokens = $0.02", () => {
    // Sonnet 5.5 is $2 in / $10 out per MTok; batch halves both: $1 / $5.
    const inTok = requestInputTokens(tiny); // the prompt's estimate plus the schema allowance
    const expected = (inTok * 1 + 4000 * 5) / 1e6;
    assert.equal(batchRequestUpperUsd(sonnet, tiny), expected);
    assert.ok(batchRequestUpperUsd(sonnet, tiny) > 0.02 && batchRequestUpperUsd(sonnet, tiny) < 0.0225);
    assert.ok(Math.abs(batchRequestUpperUsd(sonnet, { ...tiny, max_tokens: 6000 }) - batchRequestUpperUsd(sonnet, tiny) - (2000 * 5) / 1e6) < 1e-12);
  });

  test("a longer prompt costs more input; an unknown or 4.5 model is priced as Sonnet 5.5 (never cheaper)", () => {
    const long = { ...tiny, messages: [{ role: "user", content: "x".repeat(35_000) }] };
    assert.ok(batchRequestUpperUsd(sonnet, long) > batchRequestUpperUsd(sonnet, tiny) + 0.0099);
    assert.equal(batchRequestUpperUsd("claude-sonnet-4-5", tiny), batchRequestUpperUsd(sonnet, tiny));
    assert.ok(batchRequestUpperUsd("claude-opus-5-5", tiny) > batchRequestUpperUsd(sonnet, tiny));
  });

  test("the live fact-check is NOT discounted and counts its thinking headroom: 4800 output tokens at $10/M", () => {
    const f = factCheckUpperUsd(sonnet);
    assert.ok(f > 0.048 && f < 0.07, String(f));
  });

  test("the batch's actual cost is the usage at the discounted price", () => {
    assert.equal(batchUsageUsd(sonnet, { input_tokens: 2000, output_tokens: 1500 }), (2000 * 1 + 1500 * 5) / 1e6);
    assert.equal(batchUsageUsd(sonnet, { input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000, output_tokens: 1_000_000 }), (2 + 0.1 + 2.5 + 10) / 2);
    assert.equal(batchUsageUsd(sonnet, {}), 0);
  });
});

describe("the budget cutoff (REQ-208)", () => {
  // DPT: 2 units; CCR: 2 units (the last track)
  const set = [...cand("DPT", "d1", 1, 3), ...cand("DPT", "d2", 1, 2), ...cand("CCR", "c1", 1, 4), ...cand("CCR", "c2", 1, 4)];

  test("no cap: everything, per-track totals", () => {
    const p = fillBudget(set, null);
    assert.equal(p.selected.length, 13);
    assert.equal(p.cutoff, null);
    assert.deepEqual(p.perTrack.map((t) => [t.track, t.objectives, t.usd]), [["DPT", 5, 5], ["CCR", 8, 8]]);
  });

  test("a cap cuts whole units, in order: the last track loses its later units first", () => {
    const p = fillBudget(set, 10); // DPT 5 + c1 4 = 9; c2 (4) would make 13
    assert.deepEqual(p.perTrack.map((t) => [t.track, t.objectives, t.available]), [["DPT", 5, 5], ["CCR", 4, 8]]);
    assert.equal(p.totalUsd, 9);
    assert.deepEqual(
      [p.cutoff!.track, p.cutoff!.unitTitle, p.cutoff!.unitObjectives, p.cutoff!.skippedObjectives, p.cutoff!.skippedUsd],
      ["CCR", "c2", 4, 4, 4]
    );
    assert.ok(p.selected.every((c) => c.unitTitle !== "c2"));
  });

  test("a unit is never split: a cap that fits part of a unit takes none of it", () => {
    const p = fillBudget(set, 7); // DPT 5 fits; c1 (4) -> 9 > 7
    assert.equal(p.selected.length, 5);
    assert.equal(p.cutoff!.unitTitle, "c1");
  });

  test("it stops at the first unit that does not fit, even if a later, smaller one would", () => {
    const uneven = [...cand("A", "big", 5, 2), ...cand("B", "small", 1, 1)];
    const p = fillBudget(uneven, 5); // the 10-dollar unit does not fit; the 1-dollar unit of the NEXT track would
    assert.equal(p.selected.length, 0, "priority order is kept: nothing from a lower-priority track jumps the queue");
    assert.equal(p.cutoff!.track, "A");
    assert.equal(p.cutoff!.skippedObjectives, 3);
  });

  test("the total never passes the cap, and the estimate text says where it was cut", () => {
    for (const cap of [0.5, 1, 4, 5, 8.99, 9, 12.99, 13]) assert.ok(fillBudget(set, cap).totalUsd <= cap, String(cap));
    const text = planLines(fillBudget(set, 10), 10).join("\n");
    assert.match(text, /DPT: 5 lessons/);
    assert.match(text, /CCR: 4 lessons.*4 of 8/);
    assert.match(text, /Cut off at CCR, unit "c2"/);
    assert.match(planLines(fillBudget(set, 100), 100).join("\n"), /fits under \$100/);
  });
});

describe("one half at a time (REQ-208)", () => {
  test("parseHalf reads one half and files the others by cause", () => {
    const { parsed, failed } = parseHalf(
      [
        ok(requestIds(A).intro, { guessPrompt: "g", teach: "t" }),
        ok(requestIds(B).intro, { guessPrompt: "g" }),
        { custom_id: requestIds("2d9e6c1a-2f4d-4c1e-9a7b-3d2e1f0a9b8e").intro, result: { type: "expired" } },
        ok(requestIds(A).practice, { fadeProblem: "f" }),
      ],
      "intro",
      intro
    );
    assert.deepEqual([...parsed.keys()], [A]);
    assert.deepEqual(failed.map((f) => f.reason).sort(), ["intro expired", "intro failed schema"]);
  });
});

describe("the workflow (REQ-208)", () => {
  const yml = readFileSync(join(__dirname, "..", "..", ".github", "workflows", "pregenerate.yml"), "utf8");
  const code = yml.replace(/^\s*#.*$/gm, "");

  test("manual only, read-only token, the production-database environment", () => {
    assert.match(code, /^on:\n  workflow_dispatch:/m);
    assert.ok(!/^\s+(push|pull_request|schedule):/m.test(code));
    assert.match(code, /^permissions:\n  contents: read\n/m);
    assert.match(code, /environment: production-database/);
  });

  test("the inputs the runbook names", () => {
    for (const input of ["mode", "tracks", "limit", "batch_id", "max_usd"]) assert.match(code, new RegExp(`^      ${input}:`, "m"), input);
    assert.match(code, /options: \[estimate, submit, collect\]/);
    assert.match(code, /max_usd:[\s\S]*?default: "110"/);
  });

  test("REQ-248 (FAIL-1603): a submit with limit blank needs confirm_full_run, checked before anything is installed, and passed on", () => {
    assert.match(code, /^      confirm_full_run:\n        description: .*\n        type: boolean\n        default: false/m);
    const guard = code.indexOf('[ -z "$LIMIT" ] && [ "$CONFIRM_FULL_RUN" != "true" ]');
    assert.ok(guard > 0 && guard < code.indexOf("npm ci"), "refused before npm ci");
    assert.match(code, /"\$CONFIRM_FULL_RUN" = "true" \]; then set -- "\$@" --confirm-full-run/);
  });

  test("refuses to start when either secret is missing", () => {
    assert.match(code, /test -n "\$PROD_DATABASE_URL" \|\| fail/);
    assert.match(code, /test -n "\$ANTHROPIC_PREGEN_API_KEY" \|\| fail/);
    assert.ok(code.indexOf("ANTHROPIC_PREGEN_API_KEY\" ||") < code.indexOf("npm ci"), "checked before anything is installed");
  });

  test("the app's key is never used, and nothing but counts is uploaded", () => {
    assert.ok(!/secrets\.ANTHROPIC_API_KEY/.test(code));
    assert.ok(!/ANTHROPIC_API_KEY:/.test(code), "this job is not given an ANTHROPIC_API_KEY");
    assert.match(code, /ANTHROPIC_PREGEN_API_KEY: \$\{\{ secrets\.ANTHROPIC_PREGEN_API_KEY \}\}/);
    assert.match(code, /name: pregen-summary/);
    // inputs reach the shell as environment variables only (no ${{ inputs.* }} inside a run: block)
    for (const m of code.matchAll(/run: \|\n((?:          .*\n?)+)/g)) assert.ok(!m[1].includes("${{"), m[1].slice(0, 80));
  });
});
