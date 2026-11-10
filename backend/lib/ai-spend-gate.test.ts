// REQ-202 (F1, the AI spend gate), unit side: no database, no network, no key.
// The stateful half (reservations under concurrency, 12 sprints at the cap,
// usage on a parse failure, fail closed) is lib/ai-spend-gate.dbtest.ts.
//
// This file is the one that "fails if a new route bypasses the gate":
//   1. every AiPurpose has a pool;
//   2. every callClaude / callClaudeStructured call site in app/, lib/ and
//      scripts/ is found by scanning the source (not listed by hand), and must
//      name its learner (userId) or, if it names null, be on a short list with
//      the reason;
//   3. every route that can reach one of those call sites is enumerated from
//      the import graph and must appear in MODEL_ROUTES below; the ones that
//      run a model call inline must export a maxDuration the platform allows;
//   4. at run time, for EVERY purpose, a call whose learner is refused makes no
//      model request, through both call wrappers.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname, normalize } from "node:path";
import { z } from "zod";
import { __setClientForTest, callClaude, callClaudeStructured, ANTHROPIC_MAX_RETRIES, ANTHROPIC_TIMEOUT_MS, getFastModel } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import type { AiPurpose } from "./ai-calls";
import { AiBudgetError } from "./ai-budget";
import {
  DEFAULT_DAILY_GRADING_BUDGET_USD,
  gradingDailyBudgetUsd,
  poolBudgetUsd,
  setGlobalCeilingCheck,
  setSpendGateForTest,
  type SpendContext,
} from "./ai-spend-gate";
import { PURPOSE_POOL, estimateCall, poolOf, purposesOf } from "./ai-spend-ledger";
import { GENERATE_LIMIT } from "./lesson-generation";
import { GENERATION_RATE, MAX_GENERATIONS } from "./exam-sessions";
import { RECHECK_LIMIT } from "./item-quality";
import { callCostUsd } from "./ai-pricing";

const ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Source scanning
// ---------------------------------------------------------------------------

function walk(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules" || n.startsWith(".") || n === "sandbox") return [];
    return statSync(p).isDirectory() ? walk(p, keep) : keep(n) ? [p] : [];
  });
}
const isSource = (n: string) => /\.tsx?$/.test(n) && !/\.(db|sandbox)?test\.ts$/.test(n);
const rel = (p: string) => relative(ROOT, p).split("\\").join("/");
const stripLineComments = (s: string) => s.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");

const SOURCE: Record<string, string> = {};
for (const dir of ["app", "lib", "scripts"]) for (const f of walk(join(ROOT, dir), isSource)) SOURCE[rel(f)] = stripLineComments(readFileSync(f, "utf8"));

// The text between the parentheses of a call that starts at `open`, skipping
// string contents (a prompt with a ")" in it must not end the call early).
function argsAt(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === "\\") i++;
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return src.slice(open + 1, i);
  }
  throw new Error("unbalanced call");
}

interface CallSite {
  file: string;
  fn: string;
  args: string;
}
function callSites(): CallSite[] {
  const out: CallSite[] = [];
  for (const [file, src] of Object.entries(SOURCE)) {
    if (file === "lib/anthropic.ts") continue; // the wrappers themselves
    for (const m of src.matchAll(/(?<!function\s)\b(callClaudeStructured|callClaude)\s*\(/g)) {
      out.push({ file, fn: m[1], args: argsAt(src, m.index! + m[0].length - 1) });
    }
  }
  return out;
}

// Call sites that pass `userId: null` on purpose. Everything under scripts/ is
// run by an operator (offline evals, pregeneration, lab generation) and has
// no learner to charge; the global ceiling still covers them, except pregeneration
// (purposes starting `pregen`, REQ-208), which has its own budget. Anything else
// needs a line here and a reason.
const NULL_USER_OK: Record<string, string> = {
  "lib/lab-generation.ts": "modelLabChecker: run only by scripts/generate-labs.ts (an operator), never for a learner",
};
const nullUserAllowed = (file: string) => file.startsWith("scripts/") || file in NULL_USER_OK;

describe("every AiPurpose has a pool", () => {
  test("PURPOSE_POOL lists exactly the AiPurpose union", () => {
    const src = readFileSync(join(ROOT, "lib/ai-calls.ts"), "utf8");
    // Up to the union's own closing semicolon (comments stripped): constants declared between the union and
    // AiCallMeta, such as REQ-208's PREGEN_PURPOSE_PREFIX = "pregen", are not purposes (FAIL-964).
    const from = stripLineComments(src.slice(src.indexOf("export type AiPurpose =")));
    const union = from.slice(0, from.indexOf(";"));
    const purposes = [...union.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    assert.ok(purposes.length >= 30, "the scan found the union");
    assert.deepEqual([...purposes].sort(), Object.keys(PURPOSE_POOL).sort());
  });

  test("graders of a learner's own answer are the grading pool; writers are the coach pool", () => {
    for (const p of ["grade_open", "pbq_grade", "lab_grade", "lab_step_grade", "review_grade", "unitcheck_grade", "explain_back", "guess_feedback"]) {
      assert.equal(poolOf(p), "grading", p);
    }
    for (const p of ["chat", "chat_dispute", "coach_guard", "lesson_intro", "lesson_practice", "exam_items", "pbq_generate", "item_recheck", "fact_check"]) {
      assert.equal(poolOf(p), "coach", p);
    }
    assert.equal(poolOf("something_new"), "coach", "an unknown purpose gets the stricter pool");
    assert.deepEqual([...purposesOf("coach"), ...purposesOf("grading")].sort(), Object.keys(PURPOSE_POOL).sort());
  });
});

describe("every model call site names its learner", () => {
  const sites = callSites();

  test("the scan finds the call sites (guards the scanner itself)", () => {
    assert.ok(sites.length >= 20, `found ${sites.length}`);
    const files = new Set(sites.map((s) => s.file));
    for (const f of ["app/api/chat/route.ts", "app/api/pbq/route.ts", "lib/lesson-generation.ts", "lib/exam-items.ts", "lib/fact-check.ts", "lib/unit-check.ts"]) {
      assert.ok(files.has(f), `${f} is scanned`);
    }
  });

  test("each call passes userId (not undefined), or spreads an object that does", () => {
    for (const s of sites) {
      const where = `${s.file}: ${s.fn}(${s.args.replace(/\s+/g, " ").slice(0, 80)}...)`;
      assert.ok(!/\buserId\s*:\s*undefined\b/.test(s.args), `${where} passes userId: undefined`);
      const named = /\buserId\b/.test(s.args);
      const spread = /\.\.\.\w/.test(s.args) && /\buserId\b/.test(SOURCE[s.file]);
      assert.ok(named || spread, `${where} does not name a userId; pass the learner it is for, or null with a reason (NULL_USER_OK)`);
    }
  });

  test("userId: null only where a reason is on file", () => {
    for (const s of sites) {
      if (/\buserId\s*:\s*null\b/.test(s.args)) assert.ok(nullUserAllowed(s.file), `${s.file} passes userId: null with no reason; add it to NULL_USER_OK or charge a learner`);
    }
    for (const f of Object.keys(NULL_USER_OK)) {
      assert.ok(sites.some((s) => s.file === f && /\buserId\s*:\s*null\b/.test(s.args)), `${f} no longer passes null; remove it from NULL_USER_OK`);
    }
  });

  test("every purpose written as a literal is a known purpose", () => {
    for (const s of sites) for (const m of s.args.matchAll(/\bpurpose\s*:\s*"([a-z_]+)"/g)) assert.ok(m[1] in PURPOSE_POOL, `${s.file}: unknown purpose ${m[1]}`);
  });
});

// ---------------------------------------------------------------------------
// Routes, enumerated from the call sites
// ---------------------------------------------------------------------------

// route -> "inline": makes a model call (or waits on one) in the request, so it
// declares maxDuration; "indirect": reaches the model only through a lib module
// (the gate in the call layer covers it all the same). A route not in this
// table that the import graph reaches from a call site fails the test: look at
// it, decide, add it. A route that no longer reaches one fails too.
type RouteKind = "inline" | "indirect";
const MODEL_ROUTES: Record<string, RouteKind> = {
  "app/api/chat/route.ts": "inline",
  "app/api/coach/quiz/answer/route.ts": "inline",
  "app/api/coach/quiz/route.ts": "inline",
  "app/api/comparison-items/[itemId]/answer/route.ts": "indirect",
  "app/api/comparison-items/[itemId]/peek/route.ts": "indirect",
  "app/api/comparisons/[setId]/question/route.ts": "indirect",
  "app/api/courses/[id]/comparisons/route.ts": "indirect",
  "app/api/courses/[id]/placement/route.ts": "indirect",
  "app/api/courses/[id]/plan/route.ts": "indirect",
  "app/api/courses/[id]/prerequisites/route.ts": "indirect",
  "app/api/errors/[id]/route.ts": "indirect",
  "app/api/exam-outcomes/[id]/route.ts": "indirect",
  "app/api/exam-outcomes/route.ts": "indirect",
  "app/api/exam/sessions/[id]/items/[position]/route.ts": "indirect",
  "app/api/exam/sessions/[id]/route.ts": "indirect",
  "app/api/exam/sessions/[id]/submit/route.ts": "indirect",
  "app/api/exam/sessions/route.ts": "inline",
  "app/api/grade/route.ts": "inline",
  "app/api/intake/route.ts": "indirect",
  "app/api/items/report/route.ts": "indirect",
  "app/api/labs/[id]/route.ts": "indirect",
  "app/api/labs/[id]/runs/route.ts": "indirect",
  "app/api/labs/[id]/submit/route.ts": "inline",
  "app/api/labs/progress/route.ts": "indirect",
  "app/api/labs/route.ts": "indirect",
  "app/api/objectives/[id]/explain-back/route.ts": "inline",
  "app/api/objectives/[id]/guess-feedback/route.ts": "inline",
  "app/api/objectives/[id]/hint/route.ts": "indirect",
  "app/api/objectives/[id]/lab/questions/route.ts": "inline",
  "app/api/objectives/[id]/lab/report/route.ts": "inline",
  "app/api/objectives/[id]/lab/route.ts": "indirect",
  "app/api/objectives/[id]/lesson/prefetch-next/route.ts": "inline",
  "app/api/objectives/[id]/lesson/route.ts": "inline",
  "app/api/objectives/[id]/refresher/route.ts": "indirect",
  "app/api/pbq/route.ts": "inline",
  "app/api/reminders/plan/route.ts": "indirect",
  "app/api/review/coverage/route.ts": "indirect",
  "app/api/review/sessions/[id]/items/[position]/answer/route.ts": "inline",
  "app/api/review/sessions/[id]/items/[position]/choices/route.ts": "indirect",
  "app/api/review/sessions/[id]/route.ts": "indirect",
  "app/api/review/sessions/route.ts": "inline",
  "app/api/review/today/route.ts": "indirect",
  "app/api/sims/[id]/route.ts": "indirect",
  "app/api/sims/[id]/runs/route.ts": "indirect",
  "app/api/sims/route.ts": "indirect",
  "app/api/sims/runs/[runId]/commands/route.ts": "indirect",
  "app/api/sims/runs/[runId]/debrief/route.ts": "indirect",
  "app/api/sims/runs/[runId]/finish/route.ts": "indirect",
  "app/api/sims/runs/[runId]/reasoning/route.ts": "inline",
  "app/api/sims/runs/[runId]/skip/route.ts": "indirect",
  "app/api/units/[id]/check/route.ts": "inline",
};

// The Hobby plan with Fluid compute allows 300 s; Pro allows more but is not
// bought yet. A larger value is a failed deploy on Hobby.
const MAX_DURATION_CEILING_S = 300;

function importGraph(): Map<string, Set<string>> {
  const modules = Object.keys(SOURCE).filter((f) => f.startsWith("app/") || f.startsWith("lib/"));
  const have = new Set(modules);
  const resolve = (spec: string, from: string): string | null => {
    const base = spec.startsWith("@/") ? spec.slice(2) : spec.startsWith(".") ? normalize(join(dirname(from), spec)).split("\\").join("/") : null;
    if (base === null) return null;
    for (const c of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) if (have.has(c)) return c;
    return null;
  };
  const graph = new Map<string, Set<string>>();
  for (const f of modules) {
    const deps = new Set<string>();
    for (const m of SOURCE[f].matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/gs)) {
      const r = resolve(m[1] ?? m[2], f);
      if (r) deps.add(r);
    }
    graph.set(f, deps);
  }
  return graph;
}

function routesReachingTheModel(): string[] {
  const graph = importGraph();
  const reverse = new Map<string, Set<string>>();
  for (const [from, deps] of graph) for (const d of deps) (reverse.get(d) ?? reverse.set(d, new Set()).get(d)!).add(from);
  const seen = new Set(callSites().map((s) => s.file).filter((f) => graph.has(f)));
  const queue = [...seen];
  while (queue.length) {
    for (const up of reverse.get(queue.pop()!) ?? []) if (!seen.has(up)) (seen.add(up), queue.push(up));
  }
  return [...seen].filter((f) => f.endsWith("/route.ts")).sort();
}

describe("every route that can reach a model call is accounted for", () => {
  const found = routesReachingTheModel();

  test("the routes found from the call sites are exactly MODEL_ROUTES", () => {
    assert.ok(found.length >= 40, `found ${found.length}`);
    assert.deepEqual(
      found.filter((r) => !(r in MODEL_ROUTES)),
      [],
      "a route now reaches the model and is not in MODEL_ROUTES: it is gated by the call layer, but add it here on purpose"
    );
    assert.deepEqual(
      Object.keys(MODEL_ROUTES).filter((r) => !found.includes(r)),
      [],
      "MODEL_ROUTES lists a route that no longer reaches the model"
    );
  });

  test("an inline model route exports a maxDuration the Hobby plan allows", () => {
    for (const [route, kind] of Object.entries(MODEL_ROUTES)) {
      const m = /export const maxDuration = (\d+);/.exec(readFileSync(join(ROOT, route), "utf8"));
      if (kind === "inline") {
        assert.ok(m, `${route} runs a model call in the request and sets no maxDuration`);
        const s = Number(m![1]);
        assert.ok(s >= 60 && s <= MAX_DURATION_CEILING_S, `${route}: maxDuration ${s}`);
      } else if (m) {
        assert.ok(Number(m[1]) <= MAX_DURATION_CEILING_S, `${route}: maxDuration ${m[1]}`);
      }
    }
  });

  test("the routes the audit named are inline and have the long durations", () => {
    for (const r of ["app/api/chat/route.ts", "app/api/objectives/[id]/lesson/route.ts", "app/api/pbq/route.ts", "app/api/grade/route.ts", "app/api/exam/sessions/route.ts", "app/api/objectives/[id]/lab/report/route.ts"]) {
      assert.equal(MODEL_ROUTES[r], "inline", r);
    }
    for (const r of ["app/api/objectives/[id]/lesson/route.ts", "app/api/exam/sessions/route.ts"]) {
      assert.match(readFileSync(join(ROOT, r), "utf8"), /export const maxDuration = 300;/, r);
    }
  });
});

// ---------------------------------------------------------------------------
// The layer refuses before it sends -- for every purpose
// ---------------------------------------------------------------------------

describe("a refused learner makes no model request (every purpose, both wrappers)", () => {
  let requests = 0;
  beforeEach(() => {
    requests = 0;
    setAiCallSink(async () => {});
    __setClientForTest({
      messages: {
        create: async () => {
          requests++;
          return { content: [{ type: "text", text: '{"ok":true}' }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 5 } };
        },
      },
    });
  });
  afterEach(() => {
    setSpendGateForTest(null);
    setAiCallSink(null);
    __setClientForTest(null);
  });

  const schema = z.object({ ok: z.boolean() });
  const opts = (purpose: AiPurpose) => ({
    system: "s",
    messages: [{ role: "user" as const, content: "q" }],
    model: getFastModel(),
    effort: "low" as const,
    thinking: "off" as const,
    purpose,
    userId: "11111111-1111-4111-8111-111111111111",
  });

  for (const purpose of Object.keys(PURPOSE_POOL) as AiPurpose[]) {
    test(purpose, async () => {
      const seen: SpendContext[] = [];
      setSpendGateForTest({
        reserve: async (ctx) => {
          seen.push(ctx);
          throw new AiBudgetError();
        },
      });
      await assert.rejects(callClaude(opts(purpose)), AiBudgetError);
      await assert.rejects(callClaudeStructured({ ...opts(purpose), schema }), AiBudgetError);
      assert.equal(requests, 0, "no request reached the model");
      assert.equal(seen.length, 2);
      assert.ok(seen.every((c) => c.userId && c.purpose === purpose && c.estimate.usd > 0 && c.model === getFastModel()));

      setSpendGateForTest({ reserve: async () => null });
      assert.equal(await callClaude(opts(purpose)), '{"ok":true}');
      assert.deepEqual(await callClaudeStructured({ ...opts(purpose), schema }), { ok: true });
      assert.equal(requests, 2, "an allowed call goes through");
    });
  }
});

// ---------------------------------------------------------------------------
// The hook for the global daily ceiling (REQ-201, batch 10)
// ---------------------------------------------------------------------------

describe("the global-ceiling hook", () => {
  let requests = 0;
  beforeEach(() => {
    requests = 0;
    setSpendGateForTest(null); // the real gate: with no learner it never reads the database
    setAiCallSink(async () => {});
    __setClientForTest({
      messages: {
        create: async () => {
          requests++;
          return { content: [{ type: "text", text: "hi" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
        },
      },
    });
  });
  afterEach(() => {
    setGlobalCeilingCheck(null);
    setAiCallSink(null);
    __setClientForTest(null);
  });

  const base = { system: "s", messages: [{ role: "user" as const, content: "q" }], model: getFastModel(), purpose: "exam_items" as const };

  test("runs first for a call with no learner, and a throw stops the model call", async () => {
    const seen: SpendContext[] = [];
    setGlobalCeilingCheck(async (ctx) => {
      seen.push(ctx);
    });
    assert.equal(await callClaude({ ...base, userId: null }), "hi");
    assert.equal(seen.length, 1);
    assert.equal(seen[0].userId, null);
    assert.equal(seen[0].purpose, "exam_items");

    setGlobalCeilingCheck(async () => {
      throw new Error("global ceiling reached");
    });
    await assert.rejects(callClaude({ ...base, userId: null }), /global ceiling reached/);
    assert.equal(requests, 1, "the refused call sent nothing");
  });

  test("runs before any per-learner database work, so a throw for a learner needs no database", async () => {
    setGlobalCeilingCheck(async () => {
      throw new Error("global ceiling reached");
    });
    await assert.rejects(callClaude({ ...base, userId: "11111111-1111-4111-8111-111111111111" }), /global ceiling reached/);
    assert.equal(requests, 0);
  });
});

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

describe("limits and configuration", () => {
  test("the grading budget has its own default, switch and bad-value fallback", () => {
    assert.equal(DEFAULT_DAILY_GRADING_BUDGET_USD, 0.25);
    assert.equal(gradingDailyBudgetUsd({}), 0.25);
    assert.equal(gradingDailyBudgetUsd({ AI_DAILY_GRADING_BUDGET_USD: "0.4" }), 0.4);
    assert.equal(gradingDailyBudgetUsd({ AI_DAILY_GRADING_BUDGET_USD: "off" }), null);
    assert.equal(gradingDailyBudgetUsd({ AI_DAILY_GRADING_BUDGET_USD: "0" }), null);
    assert.equal(gradingDailyBudgetUsd({ AI_DAILY_GRADING_BUDGET_USD: "-3" }), 0.25);
    assert.equal(gradingDailyBudgetUsd({ AI_DAILY_GRADING_BUDGET_USD: "lots" }), 0.25);
    assert.equal(poolBudgetUsd("coach", {}), 0.5);
    assert.equal(poolBudgetUsd("grading", {}), 0.25);
    assert.equal(poolBudgetUsd("coach", { AI_DAILY_BUDGET_USD: "1.5", AI_DAILY_GRADING_BUDGET_USD: "0.1" }), 1.5);
  });

  test("generation rates are the lowered ones", () => {
    assert.deepEqual(GENERATE_LIMIT, { max: 20, windowMinutes: 60 }); // lesson GET and prefetch: was 20 per 10 minutes
    assert.equal(GENERATION_RATE.max, 12); // sprint and mock items: was 40 an hour
    assert.equal(GENERATION_RATE.windowMinutes, 60);
    assert.ok(MAX_GENERATIONS.sprint <= GENERATION_RATE.max);
    assert.deepEqual(RECHECK_LIMIT, { max: 10, windowMinutes: 1440 });
  });

  test("the Anthropic client has a timeout and one retry", () => {
    assert.equal(ANTHROPIC_MAX_RETRIES, 1);
    assert.ok(ANTHROPIC_TIMEOUT_MS > 0 && ANTHROPIC_TIMEOUT_MS <= 120_000);
    const src = readFileSync(join(ROOT, "lib/anthropic.ts"), "utf8");
    assert.equal(src.match(/timeout: ANTHROPIC_TIMEOUT_MS, maxRetries: ANTHROPIC_MAX_RETRIES|timeout: ANTHROPIC_TIMEOUT_MS,\n\s+maxRetries: ANTHROPIC_MAX_RETRIES/g)?.length, 2, "both clients (key and federation) set them");
  });

  test("a call's estimate is an upper bound on what the call can cost", () => {
    const body = { system: "x".repeat(7000), messages: [{ role: "user", content: "y".repeat(3500) }], max_tokens: 1000 };
    for (const model of ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5", "mystery-model"]) {
      const e = estimateCall(model, body);
      // At least the prompt priced as a cache write at 3.5 characters a
      // token, plus the whole max_tokens of answer; the margin is on top.
      const plain = callCostUsd(model, { cacheWriteTokens: Math.ceil(10_500 / 3.5), outputTokens: 1000 });
      assert.ok(e.usd > plain, `${model}: estimate ${e.usd} vs plain ${plain}`);
      assert.equal(e.outputTokens, 1000);
    }
    assert.ok(estimateCall("claude-sonnet-5-5", {}).outputTokens > 0, "a body with no max_tokens still reserves an answer");
    assert.ok(estimateCall("claude-sonnet-5-5", { max_tokens: 4000 }).usd > estimateCall("claude-haiku-5-5", { max_tokens: 4000 }).usd);
  });
});
