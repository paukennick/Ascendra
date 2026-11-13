import { query, type TxClient } from "@/lib/db";
import { isActive } from "@/lib/progress-sql";
import { isUuid } from "@/lib/visibility";
import { servableSql } from "@/lib/item-status-sql";
import { pickServedVersion, renderersOn, simsEnabled, type VersionRow } from "@/lib/sim/server-run.ts";

// Kept out of lib/sims.ts on purpose: GET /api/courses imports this, and
// lib/sims.ts reaches the model (sim reasoning is graded), which would put
// the course list on the model-route list (lib/ai-spend-gate.test.ts).

// REQ-249: how many sims a learner could start on each of these tracks now,
// for the course cards and Explore's "Has sims" filter. One query for every
// track, whatever the count. The rule is the start route's: sims switched on
// (simsEnabled), the renderer on (renderersOn), not retired, on an active
// objective and unit of a track the learner can see, and a served version
// (pickServedVersion, the same choice servedVersion makes; whether this
// particular app can run it is the sim screen's business, as on the list).
// Tier is not applied: a Pro-only sim still counts, as the course page's
// "Simulations (N)" does, and its list shows the lock. REQ-224: the 18+
// mental health rule is applied exactly as GET /api/sims?trackId= applies it
// today, which is not at all: that list names a mental health course's sims
// without the confirmation, by design (docs/sims.md 22.12, finding 3), so the
// count reveals nothing the list does not; starting one is still refused.
// If Nick decides the list should be gated, gate this count the same way
// (matureContentNeededSql("st", "$1") is null). A track missing from the map
// has no sims.
export async function simCountsByTrack(
  userId: string,
  trackIds: string[],
  env: Record<string, string | undefined> = process.env,
  db: Pick<TxClient, "query"> = { query }
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!simsEnabled(env)) return counts;
  const ids = trackIds.filter(isUuid);
  const on = renderersOn(env);
  if (!ids.length || !on.length) return counts;
  const rows = await db.query<VersionRow & { track_id: string; sim_id: string; head_version_id: string | null; screen_type: string }>(
    `select cu.track_id, s.id as sim_id, s.head_version_id, s.screen_type,
            v.id, v.version, v.engine_major, v.engine_minor, v.renderer_level, v.client_hash, v.review_status
       from sims s
       join objectives o on o.id = s.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       join sim_versions v on v.sim_id = s.id and ${servableSql("sim", "v.id")}
      where cu.track_id = any($2::uuid[]) and s.retired_at is null and (st.user_id is null or st.user_id = $1)
        and ${isActive("o")} and ${isActive("cu")}
        and s.screen_type = any($3::text[])
      order by s.id, v.version desc`,
    [userId, ids, on]
  );
  const bySim = new Map<string, { track: string; sim: { head_version_id: string | null; screen_type: string }; versions: VersionRow[] }>();
  for (const r of rows) {
    const entry = bySim.get(r.sim_id) ?? { track: r.track_id, sim: { head_version_id: r.head_version_id, screen_type: r.screen_type }, versions: [] };
    entry.versions.push({
      id: r.id,
      version: r.version,
      engine_major: r.engine_major,
      engine_minor: r.engine_minor,
      renderer_level: r.renderer_level,
      client_hash: r.client_hash,
      review_status: r.review_status,
    });
    bySim.set(r.sim_id, entry);
  }
  for (const { track, sim, versions } of bySim.values()) {
    if (pickServedVersion(versions, sim, null, env)) counts.set(track, (counts.get(track) ?? 0) + 1);
  }
  return counts;
}
