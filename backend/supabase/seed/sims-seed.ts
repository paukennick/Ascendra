// REQ-190 (docs/sims.md 4.5, 6, 12): seeds the authored sims.
//
// For each document in lib/sim/documents.ts ALL_DOCUMENTS (scenarios and
// bands, compiled with their modules):
//   - the objective is found by its exact title in the document's course;
//   - `sims` is upserted by (objective, slug), with the safety family derived
//     from the course category (the labs rule), never read from the file;
//   - a sim_versions row is inserted only when the content hash is new; an
//     unchanged hash with changed source dates updates that row in place;
//     a file reverted to an earlier hash points the head back at its row;
//   - authored sims of a seeded course that are no longer listed are retired.
// Idempotent: a second run changes nothing.
import type { Pool, PoolClient } from "pg";
import { ALL_DOCUMENTS, loadDocument, type DocumentEntry } from "../../lib/sim/documents";
import { canonicalJson, clientDocument, clientHash, contentHash, earliestRecheck } from "../../lib/sim/content-hash";
import { validateScenario } from "../../lib/sim/engine/v1/index";
import type { ScenarioDoc } from "../../lib/sim/engine/v1/types";
import { labFamilySql } from "../../lib/labs";

export interface SeedSimResult {
  course: string;
  slug: string;
  simId: string;
  versionId: string;
  version: number;
  change: "new" | "dates" | "reverted" | "unchanged";
}

async function seedOne(c: PoolClient, entry: DocumentEntry, doc: ScenarioDoc): Promise<SeedSimResult> {
  const obj = await c.query<{ id: string; family: string }>(
    `select o.id, ${labFamilySql("st")} as family
       from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
      where st.code = $1 and st.user_id is null and o.title = $2 and o.retired_at is null and cu.retired_at is null`,
    [entry.course, doc.objective]
  );
  if (obj.rows.length !== 1) {
    // REQ-225: say which is missing, the course or the objective, so a sim
    // that lands before its course (the EPPP sessions) fails plainly.
    const course = await c.query(`select 1 from subject_tracks where code = $1 and user_id is null`, [entry.course]);
    if (!course.rows.length) {
      throw new Error(`sims: course ${entry.course} is not seeded, so sim ${entry.slug} cannot be registered to "${doc.objective}"; seed the course first`);
    }
    throw new Error(`sims: ${entry.course} has ${obj.rows.length} active objectives titled "${doc.objective}" (sim ${entry.slug}); expected exactly one`);
  }
  const { id: objectiveId, family } = obj.rows[0];
  const sim = await c.query<{ id: string; head_version_id: string | null }>(
    `insert into sims (objective_id, slug, safety_family, screen_type, title)
     values ($1, $2, $3, $4, $5)
     on conflict (objective_id, slug) do update set
       safety_family = excluded.safety_family, screen_type = excluded.screen_type, title = excluded.title, retired_at = null,
       updated_at = case when sims.title <> excluded.title or sims.screen_type <> excluded.screen_type or sims.retired_at is not null
                         then now() else sims.updated_at end
     returning id, head_version_id`,
    [objectiveId, doc.slug, family, doc.screen.type, doc.title]
  );
  const simId = sim.rows[0].id;
  const hash = contentHash(doc);
  const cHash = clientHash(doc);
  const recheck = earliestRecheck(doc, family === "general" ? 12 : 6);
  const existing = await c.query<{ id: string; version: number; document: ScenarioDoc }>(
    `select id, version, document from sim_versions where sim_id = $1 and content_hash = $2`,
    [simId, hash]
  );
  let versionId: string;
  let version: number;
  let change: SeedSimResult["change"];
  if (existing.rows.length) {
    versionId = existing.rows[0].id;
    version = existing.rows[0].version;
    // Same hash: only source dates can differ (they are outside the hash).
    const same = canonicalJson(existing.rows[0].document) === canonicalJson(doc);
    if (!same) {
      await c.query(
        `update sim_versions set document = $2, client_document = $3, client_hash = $4, sources_recheck_by = $5 where id = $1`,
        [versionId, JSON.stringify(doc), JSON.stringify(clientDocument(doc)), cHash, recheck]
      );
    }
    change = sim.rows[0].head_version_id !== versionId ? "reverted" : same ? "unchanged" : "dates";
  } else {
    const next = await c.query<{ v: number }>(`select coalesce(max(version), 0) + 1 as v from sim_versions where sim_id = $1`, [simId]);
    version = next.rows[0].v;
    const ins = await c.query<{ id: string }>(
      `insert into sim_versions
         (sim_id, version, schema_version, engine_major, engine_minor, renderer_level, document, client_document,
          content_hash, client_hash, sources_recheck_by, source, review_status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'authored', 'needs_expert_review')
       returning id`,
      [
        simId,
        version,
        doc.schemaVersion,
        doc.engine.major,
        doc.engine.minor,
        doc.screen.level ?? 1,
        JSON.stringify(doc),
        JSON.stringify(clientDocument(doc)),
        hash,
        cHash,
        recheck,
      ]
    );
    versionId = ins.rows[0].id;
    change = "new";
  }
  if (sim.rows[0].head_version_id !== versionId) {
    await c.query(`update sims set head_version_id = $2, updated_at = now() where id = $1`, [simId, versionId]);
  }
  return { course: entry.course, slug: entry.slug, simId, versionId, version, change };
}

export async function seedSims(pool: Pool, entries: readonly DocumentEntry[] = ALL_DOCUMENTS): Promise<SeedSimResult[]> {
  const docs = entries.map((e) => {
    const doc = loadDocument(e);
    const problems = validateScenario(doc);
    if (problems.length) throw new Error(`sims: ${e.course}/${e.slug} is not valid: ${problems.slice(0, 5).join("; ")}`);
    return { e, doc };
  });
  const c = await pool.connect();
  try {
    await c.query("begin");
    const out: SeedSimResult[] = [];
    for (const { e, doc } of docs) out.push(await seedOne(c, e, doc));
    // Retire authored sims of the seeded courses that are no longer listed;
    // their runs and attempts stay.
    const courses = [...new Set(entries.map((e) => e.course))];
    await c.query(
      `update sims s set retired_at = now(), updated_at = now()
         from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
        where s.objective_id = o.id and st.code = any($1::text[]) and st.user_id is null
          and s.retired_at is null and not (s.id = any($2::uuid[]))`,
      [courses, out.map((r) => r.simId)]
    );
    await c.query("commit");
    return out;
  } catch (err) {
    await c.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    c.release();
  }
}
