// Audit 2 (FAIL-038): a learner could set their own mastery level, up to
// Transfer-ready, through PUT /api/objectives/:id/mastery. Mastery now comes
// only from graded attempts.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { closePool } from "./db";
import { PUT } from "../app/api/objectives/[id]/mastery/route";

after(async () => { await closePool(); });

test("self-set mastery is refused", async () => {
  const res = await PUT();
  assert.equal(res.status, 405);
});
