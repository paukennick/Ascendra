import { queryOne } from "@/lib/db";

// REQ-076: what the coach needs to know about WHERE a learner is in the
// catalog, so every prompt (lesson, guess feedback, grading, PBQ, chat)
// frames itself for that domain rather than the hardcoded "graduate CS
// and/or CompTIA Security+" line the rules carried from the two original
// artifact apps -- stale since the catalog grew to 74 tracks spanning
// nursing, physical therapy, project management and three cloud vendors.
//
// Everything here already exists in the taxonomy tables (migrations
// 007/013/019/020); this just joins it once per request. All fields except
// trackTitle are optional so a user-created track with no taxonomy still
// gets a sensible generic framing.
export interface CoachContext {
  trackTitle: string;
  trackType?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
  credentialName?: string | null;
  providerName?: string | null;
  examCode?: string | null;
  unitTitle?: string | null;
  unitWeight?: number | null;
}

interface ContextRow {
  track_title: string;
  track_type: string | null;
  category_slug: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  credential_name: string | null;
  provider_name: string | null;
  exam_code: string | null;
  unit_title: string | null;
  unit_weight: string | number | null;
}

function rowToContext(row: ContextRow): CoachContext {
  return {
    trackTitle: row.track_title,
    trackType: row.track_type,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    subcategoryName: row.subcategory_name,
    credentialName: row.credential_name,
    providerName: row.provider_name,
    examCode: row.exam_code,
    unitTitle: row.unit_title,
    unitWeight: row.unit_weight == null ? null : Number(row.unit_weight),
  };
}

const TRACK_JOINS = `
  left join education_subcategories esc on esc.id = st.subcategory_id
  left join education_categories ec on ec.id = esc.category_id
  left join credential_exams ce on ce.id = st.credential_exam_id
  left join credentials c on c.id = ce.credential_id
  left join credential_providers cp on cp.id = c.provider_id`;

const TRACK_FIELDS = `
  st.title as track_title, st.track_type::text as track_type,
  ec.slug as category_slug, ec.name as category_name, esc.name as subcategory_name,
  c.name as credential_name, cp.name as provider_name, ce.exam_code`;

export async function coachContextForTrack(trackId: string): Promise<CoachContext | null> {
  const row = await queryOne<ContextRow>(
    `select ${TRACK_FIELDS}, null::text as unit_title, null::numeric as unit_weight
     from subject_tracks st ${TRACK_JOINS}
     where st.id = $1`,
    [trackId]
  );
  return row ? rowToContext(row) : null;
}

export async function coachContextForUnit(unitId: string): Promise<CoachContext | null> {
  const row = await queryOne<ContextRow>(
    `select ${TRACK_FIELDS}, cu.title as unit_title, cu.weight as unit_weight
     from course_units cu
     join subject_tracks st on st.id = cu.track_id ${TRACK_JOINS}
     where cu.id = $1`,
    [unitId]
  );
  return row ? rowToContext(row) : null;
}

export async function coachContextForObjective(objectiveId: string): Promise<CoachContext | null> {
  const row = await queryOne<ContextRow>(
    `select ${TRACK_FIELDS}, cu.title as unit_title, cu.weight as unit_weight
     from objectives o
     join course_units cu on cu.id = o.unit_id
     join subject_tracks st on st.id = cu.track_id ${TRACK_JOINS}
     where o.id = $1`,
    [objectiveId]
  );
  return row ? rowToContext(row) : null;
}
