// REQ-102: exam blueprints against a real Postgres with every migration
// applied and the catalog seeded (CI's Database job seeds twice before
// test:db). Two halves:
//   1. the seeded catalog: every certification track points at an exam whose
//      exam_domains match the seed, no duplicates, SAP is on SAP-C03;
//   2. an exam-version change driven through the real seed code (seedTrack)
//      on a throwaway track: a learner's mastery on the outgoing version
//      survives, the outgoing units disappear from the course once their
//      retirement passes, and the old exam row is marked superseded.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { signAccessToken } from "./auth/tokens";
import { examBlueprintForTrack } from "./exam-blueprint";
import { trackProgressLateral } from "./progress-sql";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { seedTrack } from "../supabase/seed/seed-lib";
import type { SeedTrack } from "../supabase/seed/data";
import { GET as courseGet } from "../app/api/courses/[id]/route";

const run = Date.now().toString(36);
const user = randomUUID();
const providerSlug = `t-prov-${run}`;
const code = `T-EXAM-${run}`;
let pool: Pool;

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `eb-${run}@example.test`]);
});

after(async () => {
  await query(`delete from app_users where id = $1`, [user]);
  await query(`delete from subject_tracks where code = $1`, [code]);
  // credentials -> provider is ON DELETE RESTRICT; exams and domains cascade from credentials.
  await query(
    `delete from credentials where provider_id in (select id from credential_providers where slug = $1)`,
    [providerSlug]
  );
  await query(`delete from credential_providers where slug = $1`, [providerSlug]);
  await pool.end();
  await closePool();
});

const auth = { authorization: `Bearer ${signAccessToken({ sub: user, email: `${user}@example.test` })}` };

async function course(trackId: string) {
  const res = await courseGet(new Request("http://t/x", { headers: auth }), { params: Promise.resolve({ id: trackId }) });
  assert.equal(res.status, 200);
  return (await res.json()) as {
    units: { id: string; title: string; objectives: { id: string; title: string; mastery_status: string | null }[] }[];
    exam: Awaited<ReturnType<typeof examBlueprintForTrack>>;
    track: { total_objectives: number; mastered_objectives: number };
  };
}

describe("seeded catalog blueprints", () => {
  test("every certification track points at an exam whose domains are its active units, weights included", async () => {
    const problems: string[] = [];
    for (const t of CATALOG_TRACKS.filter((x) => x.credential)) {
      const rows = await query<{ name: string; weight_percent: number | null }>(
        `select d.name, d.weight_percent
           from subject_tracks st
           join exam_domains d on d.exam_id = st.credential_exam_id
          where st.code = $1 and st.user_id is null
          order by d.sort_order`,
        [t.code]
      );
      const want = activeUnits(t).map((u) => ({ name: u.title, weight_percent: u.weight ?? null }));
      try {
        assert.deepEqual(rows, want);
      } catch {
        problems.push(t.code);
      }
    }
    assert.deepEqual(problems, [], "catalog not seeded, or exam_domains drifted from the seed");
  });

  test("no credential has two rows for one exam code (the seed updates, never duplicates)", async () => {
    const dups = await query(
      `select credential_id, exam_code, count(*) from credential_exams
        where exam_code is not null group by 1, 2 having count(*) > 1`
    );
    assert.deepEqual(dups, []);
  });

  // On a database that was seeded before REQ-102 (production) a SAP-C02 row
  // exists and must end up superseded; a fresh database never had one. The
  // upgrade path itself is exercised end to end by the synthetic track in
  // the next suite.
  test("AWSSAP teaches SAP-C03; any SAP-C02 row is kept, superseded, with its last test day", async () => {
    const sap = await queryOne<{ id: string }>(`select id from subject_tracks where code = 'AWSSAP' and user_id is null`);
    assert.ok(sap, "AWSSAP not seeded");
    const exam = await examBlueprintForTrack(sap.id);
    assert.equal(exam?.examCode, "SAP-C03");
    assert.equal(exam?.durationMinutes, 180);
    assert.match(exam?.questionFormat ?? "", /75 questions/);
    assert.match(exam?.passingScorePolicy ?? "", /720/);
    assert.deepEqual(exam?.domains.map((d) => d.weightPercent), [25, 25, 15, 15, 20]);
    const olds = await query<{ retirement_date: string; superseded_by_exam_id: string }>(
      `select to_char(retirement_date, 'YYYY-MM-DD') as retirement_date, superseded_by_exam_id
         from credential_exams where exam_code = 'SAP-C02'`
    );
    for (const old of olds) {
      assert.equal(old.retirement_date, "2026-11-16");
      assert.equal(old.superseded_by_exam_id, exam?.examId);
    }
  });

  // REQ-104: same shape for AWSDVA. A pre-REQ-104 database has a DVA-C02
  // row; a fresh one does not. Either way the track must be on DVA-C03.
  test("AWSDVA teaches DVA-C03; any DVA-C02 row is kept, superseded, with its last test day", async () => {
    const dva = await queryOne<{ id: string }>(`select id from subject_tracks where code = 'AWSDVA' and user_id is null`);
    assert.ok(dva, "AWSDVA not seeded");
    const exam = await examBlueprintForTrack(dva.id);
    assert.equal(exam?.examCode, "DVA-C03");
    assert.equal(exam?.durationMinutes, 130);
    assert.match(exam?.questionFormat ?? "", /65 questions/);
    assert.match(exam?.passingScorePolicy ?? "", /720/);
    assert.deepEqual(exam?.domains.map((d) => d.weightPercent), [30, 26, 22, 22]);
    const olds = await query<{ retirement_date: string; superseded_by_exam_id: string }>(
      `select to_char(retirement_date, 'YYYY-MM-DD') as retirement_date, superseded_by_exam_id
         from credential_exams where exam_code = 'DVA-C02'`
    );
    for (const old of olds) {
      assert.equal(old.retirement_date, "2026-11-30");
      assert.equal(old.superseded_by_exam_id, exam?.examId);
    }
  });

  test("Security+ now has its exam record (SY0-701) exposed with duration and format", async () => {
    const t = await queryOne<{ id: string }>(`select id from subject_tracks where code = 'SECPLUS' and user_id is null`);
    const exam = await examBlueprintForTrack(t!.id);
    assert.equal(exam?.examCode, "SY0-701");
    assert.equal(exam?.durationMinutes, 90);
    assert.match(exam?.questionFormat ?? "", /performance-based/);
    assert.equal(exam?.domains.reduce((a, d) => a + (d.weightPercent ?? 0), 0), 100);
  });
});

describe("an exam-version change through the real seed code", () => {
  const cred = (examCode: string, extra: Partial<NonNullable<SeedTrack["credential"]>> = {}) => ({
    providerSlug,
    providerName: `Test Vendor ${run}`,
    subcategorySlug: "aws-certifications",
    credentialSlug: "test-cert",
    credentialName: "Test Cert",
    credentialType: "certification",
    examCode,
    status: "active" as const,
    officialObjectivesUrl: "https://example.test/guide",
    lastVendorVerifiedAt: "2026-11-07T00:00:00Z",
    durationMinutes: 120,
    questionFormat: "50 questions; multiple choice",
    passingScorePolicy: "700 of 1000",
    ...extra,
  });
  const v1: SeedTrack = {
    code,
    title: "Test exam track",
    description: "v1",
    trackType: "certification",
    subcategorySlug: "aws-certifications",
    credential: cred("TST-01"),
    units: [
      { title: "Old domain A", weight: 60, objectives: ["A0", "A1"] },
      { title: "Old domain B", weight: 40, objectives: ["B0", "B1", "B2"] },
    ],
  };
  const v2 = (retiredAt: string): SeedTrack => ({
    ...v1,
    description: "v2",
    credential: cred("TST-02", { supersedes: { examCode: "TST-01", lastExamDate: "2026-01-31" } }),
    units: [
      { ...v1.units[0], retiredAt },
      { ...v1.units[1], retiredAt },
      { title: "New domain C", weight: 100, objectives: ["C0", "C1"] },
    ],
  });
  let trackId: string;
  let a0: string;

  test("v1: learner masters an objective on the outgoing version", async () => {
    await seedTrack(pool, null, v1);
    trackId = (await queryOne<{ id: string }>(`select id from subject_tracks where code = $1`, [code]))!.id;
    a0 = (await queryOne<{ id: string }>(
      `select o.id from objectives o join course_units cu on cu.id = o.unit_id
        where cu.track_id = $1 and cu.sort_order = 0 and o.sort_order = 0`,
      [trackId]
    ))!.id;
    await query(`insert into mastery (user_id, objective_id, status, score_0_4) values ($1, $2, 'Independent', 3)`, [user, a0]);
    const c = await course(trackId);
    assert.equal(c.units.length, 2);
    assert.equal(c.exam?.examCode, "TST-01");
  });

  test("v2 with retirement still ahead: old units stay listed alongside the new ones; exam moves to the new version", async () => {
    await seedTrack(pool, null, v2("2099-01-01T00:00:00Z"));
    const c = await course(trackId);
    assert.deepEqual(c.units.map((u) => u.title), ["Old domain A", "Old domain B", "New domain C"]);
    assert.equal(c.exam?.examCode, "TST-02");
    assert.deepEqual(c.exam?.domains.map((d) => [d.name, d.weightPercent]), [["New domain C", 100]]);
    assert.equal(c.exam?.durationMinutes, 120);
  });

  test("v2 after retirement (seeded twice): mastery row, objective id and title survive; course and progress show only the new version", async () => {
    await seedTrack(pool, null, v2("2026-01-01T00:00:00Z"));
    await seedTrack(pool, null, v2("2026-01-01T00:00:00Z"));

    const obj = await queryOne<{ title: string; retired_at: Date | null }>(`select title, retired_at from objectives where id = $1`, [a0]);
    assert.equal(obj?.title, "A0", "the retired objective was rewritten in place");
    assert.ok(obj?.retired_at, "the retired objective is not marked retired");
    const m = await queryOne<{ status: string }>(`select status from mastery where user_id = $1 and objective_id = $2`, [user, a0]);
    assert.equal(m?.status, "Independent", "learner mastery on the outgoing version was lost");

    const c = await course(trackId);
    assert.deepEqual(c.units.map((u) => u.title), ["New domain C"]);
    assert.deepEqual(c.units[0].objectives.map((o) => o.title), ["C0", "C1"]);
    // Retired mastery neither inflates nor deflates progress on the new version.
    assert.equal(c.track.total_objectives, 2);
    assert.equal(c.track.mastered_objectives, 0);
    const p = await queryOne<{ total_units: number }>(
      `select vp.total_units from subject_tracks st ${trackProgressLateral("$1")} where st.id = $2`,
      [user, trackId]
    );
    assert.equal(p?.total_units, 1);

    const counts = await queryOne<{ units: number; objs: number; exams: number }>(
      `select (select count(*) from course_units where track_id = $1) as units,
              (select count(*) from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = $1) as objs,
              (select count(*) from credential_exams ce join credentials c on c.id = ce.credential_id
                 join credential_providers cp on cp.id = c.provider_id where cp.slug = $2) as exams`,
      [trackId, providerSlug]
    );
    assert.deepEqual(counts, { units: 3, objs: 7, exams: 2 });

    const old = await queryOne<{ status: string; retirement_date: string; superseded: boolean }>(
      `select ce.status::text as status, to_char(ce.retirement_date, 'YYYY-MM-DD') as retirement_date,
              ce.superseded_by_exam_id is not null as superseded
         from credential_exams ce join credentials c on c.id = ce.credential_id
         join credential_providers cp on cp.id = c.provider_id
        where cp.slug = $1 and ce.exam_code = 'TST-01'`,
      [providerSlug]
    );
    assert.deepEqual(old, { status: "retired", retirement_date: "2026-01-31", superseded: true });
  });

  test("an objective dropped from the seed is retired, not deleted, and its domain list shrinks with the blueprint", async () => {
    const v3 = v2("2026-01-01T00:00:00Z");
    v3.units[2] = { ...v3.units[2], objectives: ["C0"] };
    await seedTrack(pool, null, v3);
    const c = await course(trackId);
    assert.deepEqual(c.units[0].objectives.map((o) => o.title), ["C0"]);
    const c1 = await queryOne<{ retired: boolean }>(
      `select o.retired_at is not null as retired from objectives o join course_units cu on cu.id = o.unit_id
        where cu.track_id = $1 and cu.sort_order = 2 and o.sort_order = 1`,
      [trackId]
    );
    assert.equal(c1?.retired, true);
  });
});
