// REQ-225 (FAIL-1221): the server stores a scenario document in a jsonb
// column (sim_versions.document and client_document), and jsonb does not
// keep the order of an object's keys: it returns shorter keys first, then
// in byte order. The engine evaluates endings in Object.keys order (5.3
// "in document order"), so on the server and in the app a document's
// endings run in jsonb order, not in the order the author wrote them. A
// document whose endings rely on first-match precedence (a catch-all last)
// then ends differently in production than in its golden paths and linter.
// Until the engine gives endings an explicit order (reported to Nick), every
// seeded document must reach the same results with its maps in jsonb order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { replayGoldenPath, stateHash } from "./engine/v1/index.ts";
import type { GoldenFile, ScenarioDoc } from "./engine/v1/index.ts";

// Postgres jsonb key order: by length in bytes, then bytewise.
export function jsonbKeyOrder(keys: string[]): string[] {
  return [...keys].sort((a, b) => Buffer.byteLength(a) - Buffer.byteLength(b) || Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

function reorder<T>(m: Record<string, T>): Record<string, T> {
  return Object.fromEntries(jsonbKeyOrder(Object.keys(m)).map((k) => [k, m[k]]));
}

test("jsonb key order is length first, then bytes", () => {
  assert.deepEqual(jsonbKeyOrder(["walkout", "gaps", "time_up", "accurate"]), ["gaps", "time_up", "walkout", "accurate"]);
});

// FAIL-1222 (found in REQ-225, not fixed here: the tamponade case and the
// code/ACLS module belong to other open work): in jsonb order the module's
// non-terminal `code_rosc` is evaluated before the terminal `code_epiHarm`,
// so on the server a run that gives full-dose epinephrine reaches ROSC and
// phase 2 instead of the harm ending its golden path expects (codeFullEpi).
const KNOWN: Record<string, string> = {
  "tamponade-after-cabg": "FAIL-1222: code_rosc runs before code_epiHarm in jsonb order (codeFullEpi); reported to Nick",
};

for (const e of ALL_DOCUMENTS) {
  test(`${e.course}/${e.slug}: golden paths reach the same results with the document in jsonb key order`, { todo: KNOWN[e.slug] }, () => {
    const doc = loadDocument(e);
    const stored = JSON.parse(JSON.stringify(doc)) as ScenarioDoc;
    stored.endings = reorder(stored.endings);
    stored.reasoning = reorder(stored.reasoning);
    stored.prompts = stored.prompts ? reorder(stored.prompts) : stored.prompts;
    const golden = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
    for (const p of golden.paths) {
      const r = replayGoldenPath(stored, structuredClone(p), (run) => stateHash(run.state));
      assert.equal(r.error, null, `${p.id}: ${r.error}`);
      assert.deepEqual(r.mismatches, [], `${p.id}: ${r.mismatches.join("; ")}`);
    }
  });
}
