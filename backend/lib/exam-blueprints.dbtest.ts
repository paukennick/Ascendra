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

// REQ-103: Security+ V8 as a parallel course; CySA+ rebased to CS0-004.
describe("CompTIA SY0-801 and CS0-004 as seeded", () => {
  test("SECPLUSV8 teaches SY0-801; SECPLUS still teaches SY0-701, now marked superseded with its English last day", async () => {
    const v8 = await queryOne<{ id: string }>(`select id from subject_tracks where code = 'SECPLUSV8' and user_id is null`);
    assert.ok(v8, "SECPLUSV8 not seeded");
    const exam = await examBlueprintForTrack(v8.id);
    assert.equal(exam?.examCode, "SY0-801");
    assert.equal(exam?.durationMinutes, 90);
    assert.deepEqual(exam?.domains.map((d) => d.weightPercent), [16, 24, 19, 27, 14]);

    const v7 = await queryOne<{ id: string }>(`select id from subject_tracks where code = 'SECPLUS' and user_id is null`);
    const old = await examBlueprintForTrack(v7!.id);
    assert.equal(old?.examCode, "SY0-701");
    assert.equal(old?.status, new Date().toISOString().slice(0, 10) > "2027-06-11" ? "retired" : "transitioning");
    assert.equal(old?.retirementDate, "2027-06-11");
    assert.equal(old?.supersededBy?.examCode, "SY0-801");
    // Both versions hang off one credential.
    const creds = await query(
      `select distinct credential_id from credential_exams where exam_code in ('SY0-701', 'SY0-801')`
    );
    assert.equal(creds.length, 1);
  });

  test("CYSAPLUS teaches CS0-004; the CS0-003 units and objectives stay (listed until 2026-12-23T12:00Z)", async () => {
    const t = await queryOne<{ id: string }>(`select id from subject_tracks where code = 'CYSAPLUS' and user_id is null`);
    const exam = await examBlueprintForTrack(t!.id);
    assert.equal(exam?.examCode, "CS0-004");
    assert.equal(exam?.durationMinutes, 165);
    assert.deepEqual(exam?.domains.map((d) => [d.name, d.weightPercent]), [
      ["Security Operations", 34],
      ["Vulnerability Management", 26],
      ["Incident Response and Management", 24],
      ["Reporting and Communication", 16],
    ]);
    const units = await query<{ sort_order: number; retired_at: string | null; objs: number }>(
      `select cu.sort_order, to_char(cu.retired_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI') as retired_at,
              (select count(*)::int from objectives o where o.unit_id = cu.id and o.retired_at is not distinct from cu.retired_at) as objs
         from course_units cu where cu.track_id = $1 order by cu.sort_order`,
      [t!.id]
    );
    assert.deepEqual(
      units.map((u) => [u.sort_order, u.retired_at]),
      [
        [0, "2026-12-23T12:00"], [1, "2026-12-23T12:00"], [2, "2026-12-23T12:00"], [3, "2026-12-23T12:00"],
        [4, null], [5, null], [6, null], [7, null],
      ]
    );
    // Every objective carries its unit's retirement stamp.
    const want = CATALOG_TRACKS.find((x) => x.code === "CYSAPLUS")!.units.map((u) => u.objectives.length);
    assert.deepEqual(units.map((u) => u.objs), want);
    const old = await query<{ retirement_date: string; superseded_by_exam_id: string }>(
      `select to_char(retirement_date, 'YYYY-MM-DD') as retirement_date, superseded_by_exam_id
         from credential_exams where exam_code = 'CS0-003'`
    );
    // A database seeded before REQ-103 (production) has a CS0-003 row and it
    // must end up superseded; a fresh database never had one (the CySA+
    // track only ever seeds its current exam). The upgrade itself is
    // exercised end to end in the next suite.
    assert.ok(old.length <= 1, "duplicate CS0-003 rows");
    for (const o of old) assert.deepEqual(o, { retirement_date: "2026-12-22", superseded_by_exam_id: exam?.examId });
  });
});

// The CySA+ upgrade path end to end with the real CS0-003 and CS0-004
// content, on a throwaway track code and vendor so the catalog rows are not
// touched: seed the pre-REQ-103 shape (four CS0-003 units, unretired,
// original titles), record learner mastery, then seed the REQ-103 shape twice.
describe("CySA+ CS0-003 -> CS0-004 upgrade through the real seed code", () => {
  const cysa = CATALOG_TRACKS.find((x) => x.code === "CYSAPLUS")!;
  const tcode = `T-CYSA-${run}`;
  const tprov = `t-cysa-prov-${run}`;
  const cred = (examCode: string, extra: Partial<NonNullable<SeedTrack["credential"]>> = {}) => ({
    ...cysa.credential!,
    providerSlug: tprov,
    providerName: `Test CompTIA ${run}`,
    examCode,
    supersedes: undefined,
    ...extra,
  });
  const before: SeedTrack = {
    ...cysa,
    code: tcode,
    credential: cred("CS0-003", { status: "transitioning", retirementDate: "2026-12-22" }),
    units: cysa.units.slice(0, 4).map(({ retiredAt: _r, ...u }) => ({ ...u, title: u.title.replace(" (CS0-003)", "") })),
  };
  const v4 = (retiredAt?: string): SeedTrack => ({
    ...cysa,
    code: tcode,
    credential: cred("CS0-004", { supersedes: { examCode: "CS0-003", lastExamDate: "2026-12-22" } }),
    units: cysa.units.map((u) => (u.retiredAt && retiredAt ? { ...u, retiredAt } : u)),
  });
  let trackId: string;
  let before0: { id: string; title: string }[];

  after(async () => {
    await query(`delete from subject_tracks where code = $1`, [tcode]);
    await query(
      `delete from credentials where provider_id in (select id from credential_providers where slug = $1)`,
      [tprov]
    );
    await query(`delete from credential_providers where slug = $1`, [tprov]);
  });

  test("CS0-003 learner history survives two CS0-004 seeds; both versions listed until the retirement moment, then only CS0-004", async () => {
    await seedTrack(pool, null, before);
    trackId = (await queryOne<{ id: string }>(`select id from subject_tracks where code = $1`, [tcode]))!.id;
    const objs = () =>
      query<{ id: string; title: string }>(
        `select o.id, o.title from objectives o join course_units cu on cu.id = o.unit_id
          where cu.track_id = $1 and cu.sort_order < 4 order by cu.sort_order, o.sort_order`,
        [trackId]
      );
    before0 = await objs();
    assert.equal(before0.length, 22);
    await query(
      `insert into mastery (user_id, objective_id, status, score_0_4) values ($1, $2, 'Independent', 3), ($1, $3, 'Guided', 2)`,
      [user, before0[0].id, before0[21].id]
    );

    await seedTrack(pool, null, v4());
    await seedTrack(pool, null, v4());
    assert.deepEqual(await objs(), before0, "CS0-003 objective ids or text changed");
    const m = await query<{ status: string }>(
      `select status from mastery where user_id = $1 and objective_id = any($2::uuid[]) order by status`,
      [user, [before0[0].id, before0[21].id]]
    );
    assert.deepEqual(m.map((r) => r.status), ["Guided", "Independent"]);

    let c = await course(trackId);
    assert.equal(c.units.length, 8);
    assert.equal(c.exam?.examCode, "CS0-004");
    assert.deepEqual(c.exam?.domains.map((d) => d.weightPercent), [34, 26, 24, 16]);
    assert.equal(c.units[0].objectives[0].mastery_status, "Independent");

    // Same seed with the retirement moment already past: CS0-003 drops out of
    // the course and progress, its rows and the learner's mastery stay.
    await seedTrack(pool, null, v4("2026-01-01T00:00:00Z"));
    c = await course(trackId);
    assert.deepEqual(c.units.map((u) => u.title), cysa.units.slice(4).map((u) => u.title));
    assert.equal(c.track.mastered_objectives, 0);
    assert.equal(c.track.total_objectives, cysa.units.slice(4).reduce((a, u) => a + u.objectives.length, 0));
    const kept = await queryOne<{ n: number }>(
      `select count(*)::int as n from mastery where user_id = $1 and objective_id = any($2::uuid[])`,
      [user, [before0[0].id, before0[21].id]]
    );
    assert.equal(kept?.n, 2);

    const exams = await query<{ exam_code: string; status: string; superseded: boolean }>(
      `select ce.exam_code, ce.status::text as status, ce.superseded_by_exam_id is not null as superseded
         from credential_exams ce join credentials cr on cr.id = ce.credential_id
         join credential_providers cp on cp.id = cr.provider_id
        where cp.slug = $1 order by ce.exam_code`,
      [tprov]
    );
    // CS0-003 is 'transitioning' until its last day passes, then 'retired'.
    const cs0003Status = new Date().toISOString().slice(0, 10) > "2026-12-22" ? "retired" : "transitioning";
    assert.deepEqual(exams, [
      { exam_code: "CS0-003", status: cs0003Status, superseded: true },
      { exam_code: "CS0-004", status: "active", superseded: false },
    ]);
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
