// REQ-230: golden paths as the model writes them. A model cannot know the
// tick each command lands on, so it writes a path as a short script of
// moves (the same controller scripts/sim-golden/steps.ts gives a person):
// act, choose, answer, skip, wait, and the pacing moves (pace, begin,
// teach, chapter). The generator drives the server engine
// through the script, records the commands it sent, and fills the exact
// expectations (score, criteria, KPIs, state hash) from the engine's own
// result. The model's predicted ending, class and rating are checked
// against that result: a path that ends somewhere else is a failed gate.
import { z } from "zod";
import { advance, applyCommand, clockMode, createRun, stateHash, waits } from "../engine/v1/index.ts";
import { replayGoldenPath } from "../engine/v1/validate.ts";
import type { GoldenFile, GoldenPath } from "../engine/v1/validate.ts";
import type { Command, CriterionRowScore, ScenarioDoc } from "../engine/v1/types.ts";

const stepSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("act"), action: z.string(), params: z.record(z.string(), z.union([z.string(), z.number()])).optional() }),
  z.object({ op: z.literal("choose"), choice: z.string() }),
  z.object({ op: z.literal("answer") }),
  z.object({ op: z.literal("skip"), timer: z.string().optional() }),
  z.object({ op: z.literal("wait"), seconds: z.number().positive() }),
  // Pacing (docs/sims.md 5.4a-e), clinical and fitness running phases only.
  z.object({ op: z.literal("pace"), pace: z.number() }),
  z.object({ op: z.literal("begin") }), // the focused start; first move only
  z.object({ op: z.literal("teach"), prompt: z.string(), choice: z.string() }),
  z.object({ op: z.literal("chapter"), chapter: z.string(), choice: z.enum(["continue", "later"]) }),
]);
export type Step = z.infer<typeof stepSchema>;

export const goldenScriptSchema = z.object({
  id: z.string().regex(/^[a-z][a-zA-Z0-9_]{0,47}$/),
  title: z.string().min(1).max(300),
  seed: z.number().int().optional(),
  reasoning: z.enum(["met", "partial", "missed"]),
  expect: z.object({
    ending: z.string().nullable(),
    class: z.enum(["target", "recovered", "harm"]).nullable(),
    rating: z.enum(["good", "mediocre", "bad"]).nullable(),
  }),
  steps: z.array(stepSchema).min(1).max(400),
  notes: z.string().optional(),
});
export type GoldenScript = z.infer<typeof goldenScriptSchema>;

// Runs one script; throws with the path id and the move that failed.
export function driveScript(doc: ScenarioDoc, s: GoldenScript): Command[] {
  const run = createRun(doc, s.seed ?? 1);
  const out: Command[] = [];
  const send = (c: Record<string, unknown>, step: number): void => {
    const cmd = { ...c, seq: out.length + 1, tick: run.state.tick } as Command;
    const r = applyCommand(run, cmd);
    if (!r.ok) throw new Error(`path ${s.id}, step ${step + 1}: ${JSON.stringify(c)} was refused at tick ${run.state.tick}: ${r.reason}`);
    out.push(cmd);
  };
  const answer = (i: number) => {
    if (run.state.openReasoning) send({ type: "reason", moment: run.state.openReasoning, answered: true }, i);
  };
  s.steps.forEach((st, i) => {
    if (run.state.ended) throw new Error(`path ${s.id}, step ${i + 1}: the run had already ended (${run.state.ended.ending ?? "no ending"}) before this move`);
    switch (st.op) {
      case "act":
        send({ type: "act", action: st.action, ...(st.params && Object.keys(st.params).length ? { params: st.params } : {}) }, i);
        break;
      case "choose":
        if (!run.state.openPrompt) throw new Error(`path ${s.id}, step ${i + 1}: no decision card is open at tick ${run.state.tick}`);
        send({ type: "choose", prompt: run.state.openPrompt, choice: st.choice }, i);
        break;
      case "answer":
        answer(i);
        break;
      case "skip": {
        answer(i);
        const w = waits(run).filter((x) => !st.timer || x.timer === st.timer);
        if (!w.length) throw new Error(`path ${s.id}, step ${i + 1}: nothing to skip to${st.timer ? ` (${st.timer})` : ""} at tick ${run.state.tick}`);
        send({ type: "skip", timer: w[0].timer, instance: w[0].instance, to: w[0].due }, i);
        break;
      }
      case "pace":
        send({ type: "pace", pace: st.pace }, i);
        break;
      case "begin":
        send({ type: "begin", start: "focused" }, i);
        break;
      case "teach":
        send({ type: "teach", prompt: st.prompt, choice: st.choice }, i);
        break;
      case "chapter":
        send({ type: "chapter", chapter: st.chapter, choice: st.choice }, i);
        break;
      case "wait": {
        const to = run.state.tick + Math.round(st.seconds / run.c.dt);
        while (run.state.tick < to && !run.state.ended) {
          answer(i);
          if (clockMode(run) !== "running" || !advance(run)) break;
        }
        answer(i);
        break;
      }
    }
  });
  return out;
}

export interface BuiltGolden {
  golden: GoldenFile | null;
  problems: string[];
}

// Drives every script and fills the expectations from the engine. Each
// problem names its path.
export function buildGolden(doc: ScenarioDoc, scripts: GoldenScript[]): BuiltGolden {
  const problems: string[] = [];
  const paths: GoldenPath[] = [];
  const moment = Object.keys(doc.reasoning ?? {})[0];
  const ids = new Set<string>();
  for (const s of scripts) {
    if (ids.has(s.id)) {
      problems.push(`golden path id ${s.id} is used twice`);
      continue;
    }
    ids.add(s.id);
    let commands: Command[];
    try {
      commands = driveScript(doc, s);
    } catch (e) {
      problems.push((e as Error).message);
      continue;
    }
    const seed = s.seed ?? 1;
    const draft: GoldenPath = { id: s.id, title: s.title, seed, commands, expect: { ending: null, class: null, rating: null }, ...(moment ? { reasoning: { [moment]: s.reasoning } } : {}), ...(s.notes ? { notes: s.notes } : {}) };
    const r = replayGoldenPath(doc, structuredClone(draft), (run) => stateHash(run.state));
    if (r.error) {
      problems.push(`path ${s.id}: ${r.error}`);
      continue;
    }
    const d = r.debrief;
    if (d.ending !== s.expect.ending || d.outcomeClass !== s.expect.class || d.rating !== s.expect.rating) {
      problems.push(
        `path ${s.id} was written to end ${s.expect.ending ?? "nowhere"} / ${s.expect.class ?? "no class"} / ${s.expect.rating ?? "no rating"} but the engine ends it ${d.ending ?? "nowhere"} / ${d.outcomeClass ?? "no class"} / ${d.rating ?? "no rating"} (score ${d.processScore})`
      );
      continue;
    }
    draft.expect = {
      ending: d.ending,
      class: d.outcomeClass,
      rating: d.rating,
      score: d.processScore ?? undefined,
      criteria: Object.fromEntries(d.criteria.map((c) => [c.id, c.score as CriterionRowScore])),
      kpis: Object.fromEntries(d.kpis.map((k) => [k.id, typeof k.raw === "number" || typeof k.raw === "string" || k.raw === null ? k.raw : JSON.stringify(k.raw)])),
      stateHash: r.stateHash,
    };
    paths.push(draft);
  }
  return { golden: paths.length ? { slug: doc.slug, status: "draft", paths } : null, problems };
}
