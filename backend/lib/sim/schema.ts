// REQ-162 (docs/sims.md 4.1, 4.4 layer 1): the zod schema of a scenario
// document. It sits outside the engine (zod is a dependency the engine must
// not import) and must stay mutually assignable with the engine's types in
// engine/v1/types.ts: lib/sim/schema-conformance.test.ts checks that at
// compile time, and parses every corpus, golden and seeded document at run
// time. A JSON Schema for editors is generated from it (scenarioJsonSchema).
import { z } from "zod";

const ID = /^[a-z][a-zA-Z0-9_]{0,47}$/;
const id = z.string().regex(ID, "an id is ^[a-z][a-zA-Z0-9_]{0,47}$");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "an ISO date YYYY-MM-DD");
const expr = z.string().min(1).max(2000);
const template = z.string().max(3000);
const duration = z.string().regex(/^\d+(s|min|h|d)$/, 'a duration like "90s", "8min", "2h", "7d"');

export const sourceSchema = z.object({
  cite: z.string().min(1).max(500),
  url: z.string().max(1000).optional(),
  note: z.string().max(2000).optional(),
  checkedAt: isoDate,
  recheckBy: isoDate.optional(),
});

const literalSchema: z.ZodType<Literal> = z.lazy(() => z.union([z.number(), z.boolean(), z.string(), z.array(literalSchema), z.record(z.string(), literalSchema)]));
type Literal = number | boolean | string | Literal[] | { [k: string]: Literal };

export const fieldSpecSchema = z.union([
  z.object({ type: z.literal("number"), unit: z.string().optional() }),
  z.object({ type: z.literal("bool") }),
  z.object({ type: z.literal("string"), max: z.number() }),
  z.object({ type: z.literal("enum"), values: z.array(z.string()) }),
  z.object({ type: z.literal("list"), of: z.union([z.literal("number"), z.literal("string")]) }),
]);

export const paramSchema = z.object({ value: literalSchema, unit: z.string().optional(), source: sourceSchema.optional() });

export const catalogSchema = z.object({
  fields: z.record(id, fieldSpecSchema),
  entries: z.array(z.object({ id: z.string() }).catchall(literalSchema)).max(5000),
  source: sourceSchema.optional(),
});

export const stateVarSchema = z.union([
  z.object({ type: z.literal("number"), init: z.union([z.number(), expr]), unit: z.string().optional(), min: z.number(), max: z.number() }),
  z.object({ type: z.literal("bool"), init: z.boolean() }),
  z.object({ type: z.literal("enum"), values: z.array(z.string()), init: z.string() }),
  z.object({ type: z.literal("set"), of: z.array(z.string()), init: z.array(z.string()) }),
  z.object({ type: z.literal("time"), init: z.null() }),
  z.object({ type: z.literal("records"), fields: z.record(id, fieldSpecSchema), max: z.number(), init: z.array(z.record(z.string(), literalSchema)) }),
]);

export const historySchema = z.object({ of: expr, every: duration, keep: duration });
export const derivedSchema = z.object({ expr, unit: z.string().optional(), precision: z.number().optional() });
export const processSchema = z.object({ id, when: expr.optional(), update: z.record(id, expr) });
export const tableSchema = z.object({ rows: z.array(z.object({ when: expr, then: z.record(id, expr), text: template.optional() })) });
export const phaseSchema = z.object({ label: z.string(), actions: z.array(id), clock: z.enum(["running", "turns", "stopped"]) });

const optionSchema = z.object({ value: z.string(), label: z.string() });

type EffectT = import("./engine/v1/types.ts").Effect;
export const effectSchema: z.ZodType<EffectT> = z.lazy(() =>
  z.union([
    z.object({ update: id, where: expr, set: z.record(id, expr) }),
    z.object({ set: id, to: expr }),
    z.object({ add: id, by: expr }),
    z.object({ push: id, value: z.union([expr, z.record(id, expr)]) }),
    z.object({ remove: id, where: expr }),
    z.object({ schedule: id, after: z.string(), with: z.record(id, expr).optional() }),
    z.object({ cancel: id, where: expr.optional() }),
    z.object({ log: template, kind: z.enum(["act", "find", "sys", "good", "bad", "alarm"]).optional() }),
    z.object({ finding: template }),
    z.object({ output: z.union([template, tableViewSchema]) }),
    z.object({ phase: id }),
    z.object({ prompt: id }),
    z.object({ reason: id }),
    z.object({ end: id }),
    z.object({ table: id, into: id.optional() }),
    z.object({ if: expr, then: z.array(effectSchema), else: z.array(effectSchema).optional() }),
    z.object({ cases: z.array(z.object({ when: expr, then: z.array(effectSchema) })) }),
    z.object({ each: id, in: expr, do: z.array(effectSchema) }),
  ]),
);

export const tableViewSchema = z.object({
  rows: expr,
  columns: z.array(z.object({ label: z.string(), value: expr, format: z.string().optional() })),
});

export const commandPatternSchema = z.object({
  id,
  pattern: z.string().min(1).max(200),
  cases: z.array(z.object({ when: expr, then: z.array(effectSchema) })),
});

export const actionParamSchema = z.union([
  z.object({ id, kind: z.literal("choice"), label: z.string(), options: z.array(optionSchema) }),
  z.object({ id, kind: z.literal("form"), label: z.string(), fields: z.array(z.object({ id, label: z.string(), options: z.array(optionSchema) })) }),
  z.object({ id, kind: z.literal("slot"), label: z.string(), catalog: id, slots: z.array(z.string()) }),
  z.object({ id, kind: z.literal("pick"), label: z.string(), from: expr, show: template, max: z.number().optional() }),
  z.object({ id, kind: z.literal("command"), label: z.string(), maxLength: z.literal(200), patterns: z.array(commandPatternSchema), unmatched: template }),
  z.object({ id, kind: z.literal("query"), label: z.string(), fields: z.array(id), maxLength: z.literal(200) }),
]);

export const actionSchema = z.object({
  label: z.string().min(1).max(200),
  group: z.string().min(1).max(60),
  available: expr.optional(),
  why: template.optional(),
  params: z.array(actionParamSchema).optional(),
  effects: z.array(effectSchema),
});

export const timerSpecSchema = z.object({
  label: template,
  wait: z.object({ skipLabel: template, routine: z.boolean().optional() }).optional(),
  instances: z.enum(["one", "many"]),
  interruptsSkip: z.boolean().optional(),
  with: z.record(id, fieldSpecSchema).optional(),
  source: sourceSchema,
  effects: z.array(effectSchema),
});

export const triggerSchema = z.object({ id, when: expr, mode: z.enum(["once", "edge"]), interruptsSkip: z.boolean().optional(), effects: z.array(effectSchema) });

export const promptSchema = z.object({
  title: z.string().max(200),
  context: template,
  choices: z.array(z.object({ id, label: z.string().max(400), effects: z.array(effectSchema), feedback: template.optional() })),
});

export const reasoningMomentSchema = z.object({
  trigger: expr.optional(),
  question: z.string().min(1).max(1000),
  parts: z.array(z.object({ label: z.string(), criteria: z.string(), modelAnswer: z.string() })),
  pausesClock: z.literal(true),
});

export const outcomeClassSchema = z.enum(["target", "recovered", "harm"]);

export const outcomeSpecSchema = z.object({
  profile: z.enum(["clinical", "cloud", "project", "fitness", "security", "infrastructure", "data", "clinical-session"]),
  thresholds: z.record(id, z.object({ value: z.number(), source: sourceSchema })),
  noProgress: z.object({ when: expr, class: outcomeClassSchema, rationale: z.string(), source: sourceSchema }),
});

export const endingSchema = z.object({
  label: z.string().max(200),
  class: outcomeClassSchema.optional(),
  when: expr.optional(),
  narrative: template,
  terminal: z.boolean(),
  phase: id.optional(),
});

export const screenSpecSchema = z.object({
  type: z.enum(["bedside", "board", "dashboard", "trainer", "session", "security", "terminal", "data"]),
  level: z.number().optional(),
  bedside: z
    .object({
      tiles: z.array(
        z.object({
          id,
          label: z.string(),
          spokenLabel: z.string(),
          value: z.union([expr, z.tuple([expr, expr])]),
          unit: z.string(),
          sub: template.optional(),
          alarm: z.object({ low: z.number().optional(), high: z.number().optional() }).optional(),
          trend: z.object({ history: id, window: duration, threshold: z.number() }).optional(),
          announce: z.object({ bands: z.array(z.number()) }),
          colour: z.enum(["ecg", "art", "cvp", "pa", "spo2", "neutral"]),
          hiddenUntil: expr.optional(),
        }),
      ),
      waveforms: z.array(z.object({ kind: z.enum(["ecg", "art", "pleth"]), from: z.object({ hr: id, sys: id.optional(), dia: id.optional(), flat: expr.optional() }) })).optional(),
      infusions: template.optional(),
      banner: z.array(z.object({ when: expr, text: template })).optional(),
    })
    .optional(),
  board: z
    .object({
      zones: z.array(z.object({ id, label: z.string(), spokenLabel: z.string(), items: z.array(z.object({ label: template, when: expr })) })),
      meters: z.array(z.object({ id, label: z.string(), value: template })).optional(),
    })
    .optional(),
  session: z
    .object({
      client: z.object({ name: z.string(), presentation: template }),
      gauges: z.array(
        z.object({ id, label: z.string(), spokenLabel: z.string(), value: expr, max: z.number(), bands: z.array(z.number()), words: z.array(z.string()) }),
      ),
      notes: z.array(z.object({ id, label: z.string(), text: template, when: expr.optional(), alert: expr.optional() })).optional(),
      record: z.object({ label: z.string(), items: z.array(z.object({ label: template, when: expr })) }).optional(),
    })
    .optional(),
});

const criterionScoreSchema = z.enum(["met", "partial", "missed"]);
const criterionRowScoreSchema = z.enum(["met", "partial", "missed", "na"]);

export const scoringSchema = z.object({
  criteria: z
    .array(
      z.object({
        id,
        label: z.string().max(300),
        weight: z.number(),
        critical: z.boolean().optional(),
        rows: z.array(z.object({ when: expr, score: criterionRowScoreSchema, why: template })),
      }),
    )
    .max(30),
  reasoningCriteria: z.array(z.object({ moment: id, label: z.string(), weight: z.number(), critical: z.boolean().optional() })),
  kpis: z.array(z.object({ id, label: z.string(), value: expr, format: z.enum(["duration", "number", "usd"]), expert: z.string().optional() })),
  expertPath: z.array(z.object({ at: z.string(), text: z.string() })),
  debrief: z.record(id, z.object({ headline: z.string().max(300), body: template })),
  modelReasoning: z.string().max(6000),
});

// REQ-209: the optional pacing declarations (types.ts FocusedStart, Chapter,
// TeachingPrompt). Cross-checks (a running phase, a clinical or fitness
// scenario, a pending wait, reachable points) are lint rules in validate.ts.
export const focusedStartSchema = z.object({ label: z.string().min(1).max(80), summary: z.string().min(1).max(240), at: duration, source: sourceSchema });
export const chapterSchema = z.object({ id, label: z.string().min(1).max(80), when: expr });
export const teachingPromptSchema = z.object({
  during: id,
  when: expr.optional(),
  ask: z.string().min(1).max(160),
  choices: z.array(z.object({ id, label: z.string().min(1).max(120) })).min(2).max(4),
  expect: id,
  explain: z.string().min(1).max(600),
  source: sourceSchema,
});

export const scenarioSchema = z.object({
  schemaVersion: z.literal(1),
  engine: z.object({ major: z.literal(1), minor: z.number() }),
  slug: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  screen: screenSpecSchema,
  objective: z.string().min(1).max(400),
  secondaryObjectives: z.array(z.string()).optional(),
  sources: z.array(sourceSchema),
  brief: z.object({ situation: z.string().max(6000), handover: z.array(z.string()).optional(), howItWorks: z.array(z.string()).optional() }),
  safetyNote: z.string().max(600).optional(),
  clock: z.object({ start: z.string(), tick: duration, maxDuration: duration, calendar: z.enum(["clock", "date", "week"]).optional() }),
  random: z.object({ streams: z.array(id) }).optional(),
  params: z.record(id, paramSchema),
  catalogs: z.record(id, catalogSchema).optional(),
  state: z.record(id, stateVarSchema),
  history: z.record(id, historySchema).optional(),
  derived: z.record(id, derivedSchema),
  processes: z.array(processSchema),
  tables: z.record(id, tableSchema).optional(),
  phases: z.record(id, phaseSchema),
  initialPhase: id,
  actions: z.record(id, actionSchema).refine((a) => Object.keys(a).length <= 60, "at most 60 actions"),
  timers: z.record(id, timerSpecSchema).refine((t) => Object.keys(t).length <= 40, "at most 40 timers"),
  triggers: z.array(triggerSchema).max(80),
  prompts: z.record(id, promptSchema).optional(),
  reasoning: z.record(id, reasoningMomentSchema),
  outcome: outcomeSpecSchema,
  endings: z.record(id, endingSchema).refine((e) => Object.keys(e).length <= 12, "at most 12 endings"),
  endingOrder: z.array(id).max(12).optional(), // REQ-227, engine minor 2
  scoring: scoringSchema,
  focusedStart: focusedStartSchema.optional(),
  chapters: z.array(chapterSchema).max(6).optional(),
  teaching: z.record(id, teachingPromptSchema).refine((t) => Object.keys(t).length <= 6, "at most 6 teaching prompts").optional(),
});

export type ScenarioDocParsed = z.infer<typeof scenarioSchema>;

// Golden paths live beside a document, never inside it (4.1).
export const goldenFileSchema = z.object({
  slug: z.string(),
  status: z.enum(["draft", "frozen"]),
  paths: z.array(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      seed: z.number(),
      commands: z.array(z.record(z.string(), z.unknown())),
      expect: z.object({
        ending: z.string().nullable(),
        class: outcomeClassSchema.nullable(),
        rating: z.enum(["good", "mediocre", "bad"]).nullable(),
        score: z.number().optional(),
        criteria: z.record(z.string(), criterionRowScoreSchema).optional(),
        kpis: z.record(z.string(), z.union([z.number(), z.string(), z.null()])).optional(),
        snapshots: z.array(z.object({ tick: z.number(), values: z.record(z.string(), z.unknown()) })).optional(),
        stateHash: z.string().optional(),
        minWallSeconds: z.number().optional(), // REQ-209: the paced run's fewest wall-clock seconds
        focusedAt: z.number().optional(), // REQ-209: the tick a focused start began at
      }),
      reasoning: z.record(z.string(), criterionScoreSchema).optional(),
      notes: z.string().optional(),
    }),
  ),
});

// Schema problems in the shape labContentProblems uses (4.4).
export function schemaProblems(doc: unknown): string[] {
  const r = scenarioSchema.safeParse(doc);
  if (r.success) return [];
  return r.error.issues.map((i) => `${i.path.join(".") || "document"}: ${i.message}`);
}

export function scenarioJsonSchema(): unknown {
  return z.toJSONSchema(scenarioSchema, { target: "draft-7", unrepresentable: "any" });
}
