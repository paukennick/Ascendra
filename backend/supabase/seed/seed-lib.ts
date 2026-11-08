// REQ-102: the seed's write logic, split out of seed.ts so the database
// tests can drive a real exam-version change (seed v1, record learner
// mastery, seed v2) through exactly the code production runs.
import type { Pool } from "pg";
import type { SeedTrack, SeedCredential } from "./data";
import { activeUnits } from "./catalog";
import type { SeedLabSet } from "./labs/types";
import { labContentHash, labContentProblems, type LabContent } from "../../lib/lab-content";

// Resolves a taxonomy subcategory by slug. Subcategory slugs are unique within
// a category rather than globally, so an ambiguous slug is something the seed
// should complain about rather than silently pick a winner for.
export async function resolveSubcategoryId(pool: Pool, slug: string): Promise<string> {
  const res = await pool.query(
    `select s.id, c.slug as category_slug
       from education_subcategories s
       join education_categories c on c.id = s.category_id
      where s.slug = $1`,
    [slug]
  );
  if (res.rows.length === 0) {
    throw new Error(
      `education_subcategories: no subcategory with slug "${slug}" -- apply migration 007 before seeding`
    );
  }
  if (res.rows.length > 1) {
    const categories = res.rows.map((r) => r.category_slug).join(", ");
    throw new Error(
      `education_subcategories: slug "${slug}" is ambiguous across categories (${categories})`
    );
  }
  return res.rows[0].id as string;
}

// Seeds the vendor -> credential -> exam chain for a certification track and
// returns the exam id so the track can point at it.
//
// Only the exam's weighted domains are mirrored into exam_domains, not the
// objectives. Domain names and weights are vendor facts worth pinning to an
// exam version; the objective text is our own paraphrase of the vendor guide
// and already lives in `objectives`, so copying it here would only create a
// second copy to keep in sync.
export async function seedCredentialExam(
  pool: Pool,
  cred: SeedCredential,
  units: SeedTrack["units"] // the exam's domains: the track's active units only
): Promise<string> {
  const subcategoryId = await resolveSubcategoryId(pool, cred.subcategorySlug);

  const providerRes = await pool.query(
    `insert into credential_providers (slug, name, official_url)
     values ($1,$2,$3)
     on conflict (slug) do update
       set name = excluded.name,
           official_url = excluded.official_url,
           updated_at = now()
     returning id`,
    [cred.providerSlug, cred.providerName, cred.providerUrl ?? null]
  );
  const providerId = providerRes.rows[0].id as string;

  const credentialRes = await pool.query(
    `insert into credentials (provider_id, subcategory_id, slug, name, credential_type, status, official_url)
     values ($1,$2,$3,$4,$5,'active',$6)
     on conflict (provider_id, slug) do update
       set subcategory_id = excluded.subcategory_id,
           name = excluded.name,
           credential_type = excluded.credential_type,
           official_url = excluded.official_url,
           updated_at = now()
     returning id`,
    [
      providerId,
      subcategoryId,
      cred.credentialSlug,
      cred.credentialName,
      cred.credentialType,
      cred.credentialUrl ?? null,
    ]
  );
  const credentialId = credentialRes.rows[0].id as string;

  // exam_revision is nullable, and NULLs count as distinct in a unique index,
  // so ON CONFLICT would insert a duplicate on every re-run. Look it up first.
  // Matches the identity index added in migration 014: a vendor exam is
  // identified by its code, a degree or licence by the standard it follows,
  // and absent values compare as the empty string so a re-run updates the
  // existing row instead of inserting a second one.
  const existingExam = await pool.query(
    `select id from credential_exams
      where credential_id = $1
        and coalesce(exam_code, '') = coalesce($2, '')
        and coalesce(exam_revision, '') = coalesce($3, '')
        and coalesce(standard_name, '') = coalesce($4, '')`,
    [credentialId, cred.examCode ?? null, cred.examRevision ?? null, cred.standardName ?? null]
  );

  const examValues = [
    cred.objectivesRevision ?? null,
    cred.status,
    cred.effectiveDate ?? null,
    cred.retirementDate ?? null,
    cred.lastVendorVerifiedAt,
    cred.officialObjectivesUrl,
    cred.recommendedExperience ?? null,
    cred.durationMinutes ?? null,
    cred.questionFormat ?? null,
    cred.passingScorePolicy ?? null,
    cred.basis ?? "vendor_exam",
    cred.standardName ?? null,
    cred.standardRevision ?? null,
  ];

  let examId: string;
  if (existingExam.rows[0]) {
    examId = existingExam.rows[0].id as string;
    await pool.query(
      `update credential_exams
          set objectives_revision = $1,
              status = $2,
              effective_date = $3,
              retirement_date = $4,
              last_vendor_verified_at = $5,
              official_objectives_url = $6,
              recommended_experience = $7,
              duration_minutes = $8,
              question_format = $9,
              passing_score_policy = $10,
              basis = $11,
              standard_name = $12,
              standard_revision = $13,
              updated_at = now()
        where id = $14`,
      [...examValues, examId]
    );
  } else {
    const inserted = await pool.query(
      `insert into credential_exams
         (credential_id, exam_code, exam_revision, objectives_revision, status,
          effective_date, retirement_date, last_vendor_verified_at,
          official_objectives_url, recommended_experience, duration_minutes,
          question_format, passing_score_policy, basis, standard_name,
          standard_revision)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       returning id`,
      [credentialId, cred.examCode ?? null, cred.examRevision ?? null, ...examValues]
    );
    examId = inserted.rows[0].id as string;
  }

  for (let i = 0; i < units.length; i++) {
    await pool.query(
      `insert into exam_domains (exam_id, name, weight_percent, sort_order)
       values ($1,$2,$3,$4)
       on conflict (exam_id, sort_order) do update
         set name = excluded.name,
             weight_percent = excluded.weight_percent`,
      [examId, units[i].title, units[i].weight ?? null, i]
    );
  }
  // REQ-102: a blueprint that loses a domain must not keep the old row --
  // stale domains made an exam's weights total more than 100. exam_domains
  // is vendor reference data (no learner rows point at it), so deleting the
  // surplus is safe.
  await pool.query(`delete from exam_domains where exam_id = $1 and sort_order >= $2`, [examId, units.length]);

  // REQ-102: the version this exam replaces keeps its row (tracks and
  // history may still point at it) but is marked superseded, with its last
  // test date, instead of continuing to look current. Status flips to
  // 'retired' once that day has passed; re-running the seed is what moves
  // it, which is idempotent for any given day.
  if (cred.supersedes) {
    await pool.query(
      `update credential_exams
          set superseded_by_exam_id = $1,
              retirement_date = $3::date,
              status = case when $3::date < current_date then 'retired'::publication_status
                            else 'transitioning'::publication_status end,
              updated_at = now()
        where credential_id = $2 and exam_code = $4 and id <> $1`,
      [examId, credentialId, cred.supersedes.lastExamDate, cred.supersedes.examCode]
    );
  }

  console.log(
    `credential_exams: ${cred.examCode} (${cred.status}) -> ${examId}, ${units.length} domains`
  );
  return examId;
}

export async function seedTrack(pool: Pool, legacyUserId: string | null, track: SeedTrack) {
  const credentialExamId = track.credential
    ? await seedCredentialExam(pool, track.credential, activeUnits(track))
    : null;
  const subcategoryId = track.subcategorySlug
    ? await resolveSubcategoryId(pool, track.subcategorySlug)
    : null;

  // Alignment columns are only written when the track declares them, so the
  // nine original tracks keep whatever they already have.
  const alignment = [
    subcategoryId,
    track.freshnessModel ?? null,
    credentialExamId,
    track.sourceUrl ?? null,
    track.sourceVerifiedAt ?? null,
    track.contentReviewDueAt ?? null,
    track.requiresAcknowledgement ?? false,
    track.disclaimerKey ?? null,
    track.disclaimerVersion ?? 1,
  ];

  // Shared row first; failing that, the legacy owner's private copy, which
  // gets adopted (user_id -> null) below.
  const existing = await pool.query(
    `select id, user_id from subject_tracks
      where code = $1 and (user_id is null or user_id = $2)
      order by user_id nulls first
      limit 1`,
    [track.code, legacyUserId]
  );

  let trackId: string;
  if (existing.rows[0]) {
    trackId = existing.rows[0].id;
    await pool.query(
      `update subject_tracks
          set title = $1,
              description = $2,
              track_type = $3,
              subcategory_id = coalesce($5, subcategory_id),
              freshness_model = coalesce($6::content_freshness_model, freshness_model),
              credential_exam_id = coalesce($7, credential_exam_id),
              source_url = coalesce($8, source_url),
              source_verified_at = coalesce($9::timestamptz, source_verified_at),
              content_review_due_at = coalesce($10::timestamptz, content_review_due_at),
              -- Assigned outright rather than coalesced: the seed file is the
              -- authority on whether a course is gated, so removing the flag
              -- there has to actually turn the gate off.
              requires_acknowledgement = $11,
              disclaimer_key = $12,
              disclaimer_version = $13,
              user_id = null
        where id = $4`,
      [track.title, track.description, track.trackType, trackId, ...alignment]
    );
    const adopted = existing.rows[0].user_id ? " (adopted into shared catalog)" : "";
    console.log(`subject_tracks: ${track.code} already exists -> ${trackId} (updated)${adopted}`);
  } else {
    const res = await pool.query(
      `insert into subject_tracks
         (user_id, code, title, description, track_type,
          subcategory_id, freshness_model, credential_exam_id,
          source_url, source_verified_at, content_review_due_at,
          requires_acknowledgement, disclaimer_key, disclaimer_version)
       values (null,$1,$2,$3,$4,$5,$6::content_freshness_model,$7,$8,$9::timestamptz,$10::timestamptz,$11,$12,$13)
       returning id`,
      [track.code, track.title, track.description, track.trackType, ...alignment]
    );
    trackId = res.rows[0].id;
    console.log(`subject_tracks: created ${track.code} -> ${trackId}`);
  }

  // REQ-102: units and objectives are matched by sort_order, so their row
  // ids -- and every learner's mastery and attempts on them -- survive a
  // re-seed. retired_at is assigned outright from the seed (a unit the seed
  // marks retired gets that timestamp, on itself and all its objectives;
  // anything else is un-retired), so the seed file stays the authority.
  for (let i = 0; i < track.units.length; i++) {
    const unit = track.units[i];
    const retiredAt = unit.retiredAt ?? null;
    const existingUnit = await pool.query(
      `select id from course_units where track_id = $1 and sort_order = $2`,
      [trackId, i]
    );

    let unitId: string;
    if (existingUnit.rows[0]) {
      unitId = existingUnit.rows[0].id;
      await pool.query(
        `update course_units
            set title = $1, range_label = $2, weight = $3, gate_description = $4, retired_at = $6::timestamptz
          where id = $5`,
        [unit.title, unit.rangeLabel ?? null, unit.weight ?? null, unit.gate ?? null, unitId, retiredAt]
      );
    } else {
      const res = await pool.query(
        `insert into course_units (track_id, title, range_label, weight, sort_order, gate_description, retired_at)
         values ($1,$2,$3,$4,$5,$6,$7::timestamptz) returning id`,
        [trackId, unit.title, unit.rangeLabel ?? null, unit.weight ?? null, i, unit.gate ?? null, retiredAt]
      );
      unitId = res.rows[0].id;
    }

    for (let j = 0; j < unit.objectives.length; j++) {
      const objTitle = unit.objectives[j];
      const lab = unit.labs?.[j] ?? null;
      const existingObj = await pool.query(
        `select id from objectives where unit_id = $1 and sort_order = $2`,
        [unitId, j]
      );
      if (existingObj.rows[0]) {
        await pool.query(
          `update objectives set title = $1, lab_prompt = $2, retired_at = $4::timestamptz where id = $3`,
          [objTitle, lab, existingObj.rows[0].id, retiredAt]
        );
      } else {
        await pool.query(
          `insert into objectives (unit_id, title, sort_order, lab_prompt, retired_at) values ($1,$2,$3,$4,$5::timestamptz)`,
          [unitId, objTitle, j, lab, retiredAt]
        );
      }
    }

    // Objectives in the database past the end of this unit's list were
    // dropped from the seed. Retire them (keeping learner history) rather
    // than leave them taught, or delete them and cascade mastery away.
    await pool.query(
      `update objectives set retired_at = coalesce(retired_at, now())
        where unit_id = $1 and sort_order >= $2`,
      [unitId, unit.objectives.length]
    );
  }

  // Same for whole units the seed no longer lists.
  await pool.query(
    `update objectives set retired_at = coalesce(retired_at, now())
      where unit_id in (select id from course_units where track_id = $1 and sort_order >= $2)`,
    [trackId, track.units.length]
  );
  await pool.query(
    `update course_units set retired_at = coalesce(retired_at, now())
      where track_id = $1 and sort_order >= $2`,
    [trackId, track.units.length]
  );

  const retired = track.units.length - activeUnits(track).length;
  console.log(
    `  seeded ${track.units.length} units for ${track.code}${retired ? ` (${retired} retired, history kept)` : ""}`
  );
}

// REQ-123: authored labs (migration 050). Upserted by (objective, slug). A
// lab whose content changed goes back to needs_expert_review (its hash
// moved); an unchanged lab keeps whatever review a person gave it. Authored
// labs the seed no longer lists for a track are retired (their runs and
// attempts stay). Throws on a lab whose objective title is not in the track
// or whose content breaks the rules (lib/labs.ts labContentProblems).
export function seedLabContent(lab: SeedLabSet["labs"][number]): LabContent {
  return {
    kind: lab.kind,
    title: lab.title,
    brief: lab.brief,
    safetyNote: lab.safetyNote ?? null,
    steps: lab.steps.map((s) => ({ text: s.text, ask: s.ask })),
    rubric: lab.steps.map((s) => ({ parts: s.parts.map((p) => ({ label: p.label, criteria: p.criteria, modelAnswer: p.modelAnswer })) })),
  };
}

export async function seedLabs(pool: Pool, set: SeedLabSet): Promise<number> {
  const objs = await pool.query<{ id: string; title: string }>(
    `select o.id, o.title from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
      where st.code = $1 and st.user_id is null and o.retired_at is null and cu.retired_at is null`,
    [set.trackCode]
  );
  const byTitle = new Map(objs.rows.map((r) => [r.title, r.id]));
  const kept: string[] = [];
  for (const lab of set.labs) {
    const objectiveId = byTitle.get(lab.objective);
    if (!objectiveId) throw new Error(`labs: ${set.trackCode} has no active objective titled "${lab.objective}" (lab ${lab.slug})`);
    const content = seedLabContent(lab);
    const problems = labContentProblems(content);
    if (problems.length) throw new Error(`labs: ${set.trackCode}/${lab.slug}: ${problems.join("; ")}`);
    const hash = labContentHash(content);
    const res = await pool.query<{ id: string }>(
      `insert into labs (objective_id, slug, kind, title, brief, steps, rubric, safety_note, sources, source, review_status, content_hash)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'authored', 'needs_expert_review', $10)
       on conflict (objective_id, slug) do update set
         kind = excluded.kind, title = excluded.title, brief = excluded.brief, steps = excluded.steps,
         rubric = excluded.rubric, safety_note = excluded.safety_note, sources = excluded.sources,
         review_status = case when labs.content_hash <> excluded.content_hash then 'needs_expert_review' else labs.review_status end,
         reviewed_by = case when labs.content_hash <> excluded.content_hash then null else labs.reviewed_by end,
         reviewed_at = case when labs.content_hash <> excluded.content_hash then null else labs.reviewed_at end,
         content_hash = excluded.content_hash, retired_at = null,
         updated_at = case when labs.content_hash <> excluded.content_hash or labs.retired_at is not null then now() else labs.updated_at end
       returning id`,
      [
        objectiveId,
        lab.slug,
        content.kind,
        content.title,
        content.brief,
        JSON.stringify(content.steps),
        JSON.stringify(content.rubric),
        content.safetyNote ?? null,
        JSON.stringify(set.sources),
        hash,
      ]
    );
    kept.push(res.rows[0].id as string);
  }
  await pool.query(
    `update labs l set retired_at = now()
       from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
      where l.objective_id = o.id and st.code = $1 and st.user_id is null
        and l.source = 'authored' and l.retired_at is null and not (l.id = any($2::uuid[]))`,
    [set.trackCode, kept]
  );
  return kept.length;
}
