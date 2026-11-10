// REQ-162 (docs/sims.md 4.1, 16): the zod schema and the engine's types must
// describe the same documents. Compile time: each building block and the
// whole document are mutually assignable (tsc runs over this file in CI's
// typecheck). Run time: every corpus, golden and seeded document parses with
// the schema and passes the engine's validator.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import type {
  Action,
  ActionParam,
  Catalog,
  Derived,
  Effect,
  Ending,
  FieldSpec,
  History,
  OutcomeSpec,
  Param,
  Phase,
  Process,
  Prompt,
  ReasoningMoment,
  ScenarioDoc,
  Scoring,
  ScreenSpec,
  Source,
  StateVar,
  Table,
  TimerSpec,
  Trigger,
} from "./engine/v1/types.ts";
import {
  actionParamSchema,
  actionSchema,
  catalogSchema,
  derivedSchema,
  effectSchema,
  endingSchema,
  fieldSpecSchema,
  goldenFileSchema,
  historySchema,
  outcomeSpecSchema,
  paramSchema,
  phaseSchema,
  processSchema,
  promptSchema,
  reasoningMomentSchema,
  scenarioJsonSchema,
  scenarioSchema,
  schemaProblems,
  scoringSchema,
  screenSpecSchema,
  sourceSchema,
  stateVarSchema,
  tableSchema,
  timerSpecSchema,
  triggerSchema,
} from "./schema.ts";
import { validateScenario } from "./engine/v1/index.ts";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";

// Mutual assignability: both directions must hold or tsc fails.
type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
// passing `true` where T is `never` is a compile error, so a mismatch cannot slip through
const ok = <T extends true>(v: T): T => v;

ok<Mutual<z.infer<typeof sourceSchema>, Source>>(true);
ok<Mutual<z.infer<typeof fieldSpecSchema>, FieldSpec>>(true);
ok<Mutual<z.infer<typeof paramSchema>, Param>>(true);
ok<Mutual<z.infer<typeof catalogSchema>, Catalog>>(true);
ok<Mutual<z.infer<typeof stateVarSchema>, StateVar>>(true);
ok<Mutual<z.infer<typeof historySchema>, History>>(true);
ok<Mutual<z.infer<typeof derivedSchema>, Derived>>(true);
ok<Mutual<z.infer<typeof processSchema>, Process>>(true);
ok<Mutual<z.infer<typeof tableSchema>, Table>>(true);
ok<Mutual<z.infer<typeof phaseSchema>, Phase>>(true);
ok<Mutual<z.infer<typeof effectSchema>, Effect>>(true);
ok<Mutual<z.infer<typeof actionParamSchema>, ActionParam>>(true);
ok<Mutual<z.infer<typeof actionSchema>, Action>>(true);
ok<Mutual<z.infer<typeof timerSpecSchema>, TimerSpec>>(true);
ok<Mutual<z.infer<typeof triggerSchema>, Trigger>>(true);
ok<Mutual<z.infer<typeof promptSchema>, Prompt>>(true);
ok<Mutual<z.infer<typeof reasoningMomentSchema>, ReasoningMoment>>(true);
ok<Mutual<z.infer<typeof outcomeSpecSchema>, OutcomeSpec>>(true);
ok<Mutual<z.infer<typeof endingSchema>, Ending>>(true);
ok<Mutual<z.infer<typeof screenSpecSchema>, ScreenSpec>>(true);
ok<Mutual<z.infer<typeof scoringSchema>, Scoring>>(true);
ok<Mutual<z.infer<typeof scenarioSchema>, ScenarioDoc>>(true);

describe("scenario schema conformance", () => {
  test("every document parses with the zod schema and the engine validator", () => {
    for (const d of ALL_DOCUMENTS) {
      const doc = loadDocument(d) as unknown;
      assert.deepEqual(schemaProblems(doc), [], `${d.slug}: schema`);
      assert.deepEqual(validateScenario(doc as ScenarioDoc), [], `${d.slug}: validator`);
      if (d.golden) {
        const g = goldenFileSchema.safeParse(JSON.parse(readFileSync(d.golden, "utf8")));
        assert.ok(g.success, `${d.slug}: golden file schema ${g.success ? "" : JSON.stringify(g.error.issues.slice(0, 3))}`);
      }
    }
  });

  test("every corpus case document parses", () => {
    const dir = join(__dirname, "engine", "v1", "golden", "corpus");
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length > 10);
    for (const f of files) {
      const c = JSON.parse(readFileSync(join(dir, f), "utf8")) as { doc: unknown };
      assert.deepEqual(schemaProblems(c.doc), [], f);
    }
  });

  test("the schema rejects the mistakes the validator relies on it for", () => {
    assert.ok(schemaProblems({}).length > 0);
    const problems = schemaProblems({ schemaVersion: 2 });
    assert.ok(problems.some((p) => p.startsWith("schemaVersion")));
  });

  test("a JSON Schema is generated for editors", () => {
    const js = scenarioJsonSchema() as { type?: string; properties?: Record<string, unknown> };
    assert.equal(js.type, "object");
    assert.ok(js.properties && "endings" in js.properties);
  });
});
