// Seed script: creates the single app user (if missing) and every catalog track
// with its real units/objectives.
// Idempotent: safe to re-run (uses ON CONFLICT / existence checks throughout), so it
// won't duplicate rows on a second run.
//
// Tracks that carry a `credential` (the AWS certification tracks) additionally
// seed the taxonomy records added by migration 007: the vendor, the credential,
// the specific exam version, and that exam's weighted domains. Run migration 007
// before seeding those, or the credential inserts will fail on missing tables.
//
// Usage:
//   cd backend
//   npm install
//   DATABASE_URL=postgres://... npm run seed
// (or set DATABASE_URL / DEFAULT_USER_EMAIL in a .env.local — this script loads it if present)

import { Pool } from "pg";
import "./env-local"; // must run before ./data so DEFAULT_USER_EMAIL is already set
import {
  MSCS_TRACK,
  SECPLUS_TRACK,
  PYTHON_TRACK,
  JAVASCRIPT_TRACK,
  LINUXPLUS_TRACK,
  CYSAPLUS_TRACK,
  PENTESTPLUS_TRACK,
  SECURITYX_TRACK,
  CMPCBS_TRACK,
  SEED_USER_EMAIL,
  type SeedTrack,
  type SeedCredential,
} from "./data";
import { AWS_TRACKS } from "./tracks/aws";
import { AZURE_TRACKS } from "./tracks/azure";
import { GCP_TRACKS } from "./tracks/gcp";
import { NURSING_TRACKS } from "./tracks/nursing";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (set it in backend/.env.local or the environment).");
  }
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const userRes = await pool.query(
      `insert into app_users (email, display_name)
       values ($1, $2)
       on conflict (email) do update set display_name = excluded.display_name
       returning id`,
      [SEED_USER_EMAIL, "Pak"]
    );
    const userId = userRes.rows[0].id as string;
    console.log(`app_users: ${SEED_USER_EMAIL} -> ${userId}`);

    await seedTrack(pool, userId, MSCS_TRACK);
    await seedTrack(pool, userId, SECPLUS_TRACK);
    await seedTrack(pool, userId, PYTHON_TRACK);
    await seedTrack(pool, userId, JAVASCRIPT_TRACK);
    await seedTrack(pool, userId, LINUXPLUS_TRACK);
    await seedTrack(pool, userId, CYSAPLUS_TRACK);
    await seedTrack(pool, userId, PENTESTPLUS_TRACK);
    await seedTrack(pool, userId, SECURITYX_TRACK);
    await seedTrack(pool, userId, CMPCBS_TRACK);

    for (const track of AWS_TRACKS) {
      await seedTrack(pool, userId, track);
    }

    for (const track of AZURE_TRACKS) {
      await seedTrack(pool, userId, track);
    }

    for (const track of GCP_TRACKS) {
      await seedTrack(pool, userId, track);
    }

    for (const track of NURSING_TRACKS) {
      await seedTrack(pool, userId, track);
    }

    console.log("Seed complete.");
  } finally {
    await pool.end();
  }
}

// Resolves a taxonomy subcategory by slug. Subcategory slugs are unique within
// a category rather than globally, so an ambiguous slug is something the seed
// should complain about rather than silently pick a winner for.
async function resolveSubcategoryId(pool: Pool, slug: string): Promise<string> {
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
async function seedCredentialExam(
  pool: Pool,
  cred: SeedCredential,
  units: SeedTrack["units"]
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

  console.log(
    `credential_exams: ${cred.examCode} (${cred.status}) -> ${examId}, ${units.length} domains`
  );
  return examId;
}

async function seedTrack(pool: Pool, userId: string, track: SeedTrack) {
  const credentialExamId = track.credential
    ? await seedCredentialExam(pool, track.credential, track.units)
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

  const existing = await pool.query(
    `select id from subject_tracks where user_id = $1 and code = $2`,
    [userId, track.code]
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
              disclaimer_version = $13
        where id = $4`,
      [track.title, track.description, track.trackType, trackId, ...alignment]
    );
    console.log(`subject_tracks: ${track.code} already exists -> ${trackId} (updated title/description)`);
  } else {
    const res = await pool.query(
      `insert into subject_tracks
         (user_id, code, title, description, track_type,
          subcategory_id, freshness_model, credential_exam_id,
          source_url, source_verified_at, content_review_due_at,
          requires_acknowledgement, disclaimer_key, disclaimer_version)
       values ($1,$2,$3,$4,$5,$6,$7::content_freshness_model,$8,$9,$10::timestamptz,$11::timestamptz,$12,$13,$14)
       returning id`,
      [userId, track.code, track.title, track.description, track.trackType, ...alignment]
    );
    trackId = res.rows[0].id;
    console.log(`subject_tracks: created ${track.code} -> ${trackId}`);
  }

  for (let i = 0; i < track.units.length; i++) {
    const unit = track.units[i];
    const existingUnit = await pool.query(
      `select id from course_units where track_id = $1 and sort_order = $2`,
      [trackId, i]
    );

    let unitId: string;
    if (existingUnit.rows[0]) {
      unitId = existingUnit.rows[0].id;
      await pool.query(
        `update course_units set title = $1, range_label = $2, weight = $3, gate_description = $4 where id = $5`,
        [unit.title, unit.rangeLabel ?? null, unit.weight ?? null, unit.gate ?? null, unitId]
      );
    } else {
      const res = await pool.query(
        `insert into course_units (track_id, title, range_label, weight, sort_order, gate_description)
         values ($1,$2,$3,$4,$5,$6) returning id`,
        [trackId, unit.title, unit.rangeLabel ?? null, unit.weight ?? null, i, unit.gate ?? null]
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
        await pool.query(`update objectives set title = $1, lab_prompt = $2 where id = $3`, [
          objTitle,
          lab,
          existingObj.rows[0].id,
        ]);
      } else {
        await pool.query(
          `insert into objectives (unit_id, title, sort_order, lab_prompt) values ($1,$2,$3,$4)`,
          [unitId, objTitle, j, lab]
        );
      }
    }
  }

  console.log(`  seeded ${track.units.length} units for ${track.code}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
