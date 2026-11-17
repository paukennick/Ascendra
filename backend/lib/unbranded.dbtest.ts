// REQ-319 (Nick, 2026-11-16, option A then Option 2): what the server hands a
// learner for an unbranded course, read from the seeded catalog through the
// route handlers: the course list, the course view and the practice-exam
// profile name no mark of the course's exam body, except the reference line
// and the specific disclaimer (lib/unbranded.ts); the course view carries the
// exam's published facts; a counseling course still needs its 18+
// acknowledgment (REQ-224 / REQ-259). Skips when the catalog is not seeded.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { MATURE_CONTENT_MIN_AGE, MATURE_CONTENT_NOTICE_VERSION } from "./mature-content";
import { UNBRANDED_CODES, UNBRANDED_DISPLAY_CODES, examReferenceForCode, markIn } from "./unbranded";
import { clearCourseViewCaches } from "./readiness-cache";
import { GET as listCourses } from "../app/api/courses/route";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { GET as examGet } from "../app/api/exam/sessions/route";

const learner = randomUUID();
const auth = { authorization: `Bearer ${signAccessToken({ sub: learner, email: `${learner}@example.test` })}` };
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });

// URLs are attribution (the owner's own page), not text a learner reads.
function scrub(x: unknown, code: string): string {
  const ref = examReferenceForCode(code);
  const json = JSON.stringify(x, (k, v) => (/_url$|Url$/.test(k) ? undefined : v));
  return ref ? json.split(ref.line).join("").split(ref.disclaimer).join("") : json;
}

let tracks: { id: string; code: string }[] = [];

before(async () => {
  await query(`insert into app_users (id, email) values ($1, $2)`, [learner, `${learner}@example.test`]);
  tracks = await query<{ id: string; code: string }>(
    `select id, code from subject_tracks where user_id is null and code = any($1::text[]) order by code`,
    [[...UNBRANDED_CODES]]
  );
  clearCourseViewCaches();
});

after(async () => {
  await query(`delete from app_users where id = $1`, [learner]);
  await closePool();
});

describe("REQ-319: server responses for unbranded courses", () => {
  test("the course list shows the display code and no mark outside the disclaimer", async (t) => {
    if (!tracks.length) return t.skip("catalog not seeded in this database");
    const res = await listCourses(new Request("http://t/api/courses", { headers: auth }));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { tracks: Array<{ id: string; code: string }> };
    for (const tr of tracks.filter((x) => x.code !== "ITIL4FND")) {
      const row = body.tracks.find((r) => r.id === tr.id);
      assert.ok(row, `${tr.code} listed`);
      assert.equal(row.code, UNBRANDED_DISPLAY_CODES[tr.code]);
      assert.equal(markIn(tr.code, scrub(row, tr.code)), null, tr.code);
    }
  });

  test("the six courses REQ-318 hid are listed again", async (t) => {
    if (!tracks.length) return t.skip("catalog not seeded in this database");
    const rows = await query<{ code: string; hidden_at: string | null }>(
      `select code, hidden_at from subject_tracks where user_id is null and code = any($1::text[]) order by code`,
      [["CEH", "CEN", "CISSP", "ISC2CC", "NCE", "NCMHCE"]]
    );
    assert.equal(rows.length, 6);
    for (const r of rows) assert.equal(r.hidden_at, null, r.code);
  });

  test("the counseling courses still refuse a learner without the 18+ acknowledgment", async (t) => {
    if (!tracks.length) return t.skip("catalog not seeded in this database");
    for (const tr of tracks.filter((x) => x.code === "NCE" || x.code === "NCMHCE")) {
      const res = await courseGet(new Request("http://t/x", { headers: auth }), idCtx(tr.id));
      assert.equal(res.status, 403, tr.code);
      assert.equal(((await res.json()) as { code?: string }).code, "mature_content_required", tr.code);
      await query(
        `insert into mature_course_acknowledgements (user_id, track_id, notice_version, min_age, source, attested_at)
         values ($1, $2, $3, $4, 'course', now())`,
        [learner, tr.id, MATURE_CONTENT_NOTICE_VERSION, MATURE_CONTENT_MIN_AGE]
      );
    }
  });

  test("the course view: no mark outside the reference line and disclaimer, and the published facts are there", async (t) => {
    if (!tracks.length) return t.skip("catalog not seeded in this database");
    for (const tr of tracks) {
      const res = await courseGet(new Request("http://t/x", { headers: auth }), idCtx(tr.id));
      assert.equal(res.status, 200, tr.code);
      const body = (await res.json()) as {
        track: { code: string; description: string };
        exam: { providerName: string | null; credentialName: string | null; examCode: string | null; unbranded: boolean; facts: Record<string, unknown> & { reference: { line: string; disclaimer: string } | null; domains: unknown[] } };
      };
      assert.equal(body.track.code, UNBRANDED_DISPLAY_CODES[tr.code], tr.code);
      assert.equal(body.exam.unbranded, true, tr.code);
      assert.deepEqual([body.exam.providerName, body.exam.credentialName, body.exam.examCode], [null, null, null], tr.code);
      const f = body.exam.facts;
      for (const k of ["questions", "time", "delivery", "passing", "eligibility"]) assert.ok(f[k], `${tr.code}: ${k}`);
      assert.ok(f.domains.length >= 2, tr.code);
      const ref = examReferenceForCode(tr.code);
      assert.deepEqual(f.reference, ref, tr.code);
      if (ref) assert.ok(body.track.description.endsWith(ref.disclaimer), tr.code);
      assert.equal(markIn(tr.code, scrub(body, tr.code)), null, tr.code);
    }
  });

  test("the practice-exam profile names no exam code or credential", async (t) => {
    if (!tracks.length) return t.skip("catalog not seeded in this database");
    for (const tr of tracks) {
      const res = await examGet(new Request(`http://t/api/exam/sessions?trackId=${tr.id}`, { headers: auth }));
      assert.equal(res.status, 200, tr.code);
      const body = (await res.json()) as { exam: { examCode: string | null; credentialName: string | null } };
      assert.equal(body.exam.examCode, null, tr.code);
      assert.equal(body.exam.credentialName, null, tr.code);
      assert.equal(markIn(tr.code, scrub(body.exam, tr.code)), null, tr.code);
    }
  });
});
