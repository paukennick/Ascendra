// REQ-177: GET /api/version, which a web tab compares with its bundle.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/version/route";

const saved = process.env.VERCEL_GIT_COMMIT_SHA;
afterEach(() => {
  if (saved === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
  else process.env.VERCEL_GIT_COMMIT_SHA = saved;
});

test("answers the deployed commit, never cached", async () => {
  process.env.VERCEL_GIT_COMMIT_SHA = "b081470e34a9bed2569248422ba30ae437f13451";
  const res = await GET();
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await res.json(), { buildId: "b081470e34a9bed2569248422ba30ae437f13451" });
});

test("null when unset or not a commit id", async () => {
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  assert.deepEqual(await (await GET()).json(), { buildId: null });
  process.env.VERCEL_GIT_COMMIT_SHA = "not a sha!";
  assert.deepEqual(await (await GET()).json(), { buildId: null });
});
