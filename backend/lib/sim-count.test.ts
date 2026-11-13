// REQ-249: the course list's sim_count asks pickServedVersion the same
// question the start route asks servedVersion, on versions read in one
// query. These pin the choice without a database; lib/sim-count.dbtest.ts
// covers the query, the switches and the mature-content rule.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pickServedVersion, type VersionRow } from "./sim/server-run.ts";
import { simCountsByTrack } from "./sim-count";

const v = (id: string, version: number, review_status: VersionRow["review_status"]): VersionRow => ({
  id,
  version,
  engine_major: 1,
  engine_minor: 2,
  renderer_level: 3,
  client_hash: `h${id}`,
  review_status,
});
const board = (head: string | null) => ({ head_version_id: head, screen_type: "board" });

describe("pickServedVersion (REQ-249)", () => {
  test("an approved head is served", () => {
    assert.equal(pickServedVersion([v("b", 2, "approved"), v("a", 1, "approved")], board("b"), null, {})?.version.id, "b");
  });
  test("an unreviewed head yields to the latest approved", () => {
    assert.equal(pickServedVersion([v("b", 2, "needs_expert_review"), v("a", 1, "approved")], board("b"), null, {})?.version.id, "a");
  });
  test("an unreviewed head alone is served by default, not when unreviewed content is off", () => {
    assert.equal(pickServedVersion([v("a", 1, "needs_expert_review")], board("a"), null, {})?.version.id, "a");
    assert.equal(pickServedVersion([v("a", 1, "needs_expert_review")], board("a"), null, { SIMS_SERVE_UNREVIEWED: "off" }), null);
  });
  test("a rejected head alone, no versions, or a head that is not among the servable rows: nothing", () => {
    assert.equal(pickServedVersion([v("a", 1, "rejected")], board("a"), null, {}), null);
    assert.equal(pickServedVersion([], board("a"), null, {}), null);
    assert.equal(pickServedVersion([v("a", 1, "needs_expert_review")], board("pulled"), null, {}), null);
  });
  test("without app capabilities a served version is still served, just not runnable", () => {
    const r = pickServedVersion([v("a", 1, "approved")], board("a"), null, {});
    assert.equal(r?.runnable, false);
  });
});

describe("simCountsByTrack switches (REQ-249)", () => {
  test("sims off: an empty map and no database call", async () => {
    const calls: string[] = [];
    const db = { query: async (sql: string) => (calls.push(sql), []) } as never;
    const out = await simCountsByTrack("00000000-0000-4000-8000-000000000001", ["00000000-0000-4000-8000-000000000002"], {}, db);
    assert.equal(out.size, 0);
    assert.equal(calls.length, 0);
  });
  test("one query for many tracks, counted per track through the served-version rule", async () => {
    const t1 = "00000000-0000-4000-8000-0000000000a1";
    const t2 = "00000000-0000-4000-8000-0000000000a2";
    const rows = [
      { track_id: t1, sim_id: "s1", head_version_id: "v1", screen_type: "board", ...v("v1", 1, "approved") },
      { track_id: t1, sim_id: "s2", head_version_id: "v2", screen_type: "bedside", ...v("v2", 1, "needs_expert_review") },
      { track_id: t2, sim_id: "s3", head_version_id: "v3", screen_type: "board", ...v("v3", 1, "rejected") },
    ];
    const calls: { sql: string; params: unknown[] }[] = [];
    const db = { query: async (sql: string, params: unknown[]) => (calls.push({ sql, params }), rows) } as never;
    const out = await simCountsByTrack("00000000-0000-4000-8000-000000000001", [t1, t2, "junk"], { SIMS_ENABLED: "on" }, db);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].params[1], [t1, t2], "malformed ids are dropped");
    assert.equal(out.get(t1), 2);
    assert.equal(out.get(t2), undefined, "a rejected-only sim is not served");
    // REQ-224: matches GET /api/sims?trackId=, which is not behind the 18+ gate (docs/sims.md 22.12).
    assert.doesNotMatch(calls[0].sql, /mature_content_confirmations/);
    assert.match(calls[0].sql, /item_status/, "pulled versions are left out (servableSql)");
  });
});

test("GET /api/courses attaches sim_count from simCountsByTrack (REQ-249)", () => {
  const src = readFileSync(join(import.meta.dirname, "../app/api/courses/route.ts"), "utf8");
  assert.match(src, /simCountsByTrack\(user\.id, rows\.map/);
  assert.match(src, /sim_count: sims\.get\(r\.id\) \?\? 0/);
});
