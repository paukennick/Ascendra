import { query, queryOne } from "@/lib/db";

// REQ-102: the vendor exam a track prepares for, as stored by the seed in
// credential_exams / exam_domains (migration 007). Exposed so later
// features -- mock exams (question count, time limit, item formats) and
// readiness (domain weights, passing policy) -- read one shape instead of
// re-joining the taxonomy. This is data only: nothing here builds a mock
// exam or scores readiness.
//
// questionFormat and passingScorePolicy are the vendor's words as recorded
// in the seed (e.g. "75 questions (65 scored, 10 unscored); multiple choice
// and multiple response"); they are not parsed into numbers here, because
// vendors state them too differently for a parser to be trusted.
export interface ExamBlueprint {
  examId: string;
  credentialName: string;
  providerName: string;
  examCode: string | null;
  examRevision: string | null;
  status: string;
  effectiveDate: string | null; // YYYY-MM-DD
  retirementDate: string | null; // YYYY-MM-DD, last day the exam can be sat
  durationMinutes: number | null;
  questionFormat: string | null;
  passingScorePolicy: string | null;
  recommendedExperience: string | null;
  officialObjectivesUrl: string | null;
  lastVendorVerifiedAt: string | null;
  // The exam that replaces this one, when the vendor has announced it.
  supersededBy: { examId: string; examCode: string | null } | null;
  domains: { name: string; weightPercent: number | null; sortOrder: number }[];
}

interface ExamRow {
  exam_id: string;
  credential_name: string;
  provider_name: string;
  exam_code: string | null;
  exam_revision: string | null;
  status: string;
  effective_date: string | null;
  retirement_date: string | null;
  duration_minutes: number | null;
  question_format: string | null;
  passing_score_policy: string | null;
  recommended_experience: string | null;
  official_objectives_url: string | null;
  last_vendor_verified_at: Date | string | null;
  superseded_by_exam_id: string | null;
  superseded_by_exam_code: string | null;
}

export async function examBlueprintForTrack(trackId: string): Promise<ExamBlueprint | null> {
  const row = await queryOne<ExamRow>(
    `select ce.id as exam_id, c.name as credential_name, cp.name as provider_name,
            ce.exam_code, ce.exam_revision, ce.status::text as status,
            to_char(ce.effective_date, 'YYYY-MM-DD') as effective_date,
            to_char(ce.retirement_date, 'YYYY-MM-DD') as retirement_date,
            ce.duration_minutes, ce.question_format, ce.passing_score_policy,
            ce.recommended_experience, ce.official_objectives_url, ce.last_vendor_verified_at,
            ce.superseded_by_exam_id, nx.exam_code as superseded_by_exam_code
       from subject_tracks st
       join credential_exams ce on ce.id = st.credential_exam_id
       join credentials c on c.id = ce.credential_id
       join credential_providers cp on cp.id = c.provider_id
       left join credential_exams nx on nx.id = ce.superseded_by_exam_id
      where st.id = $1`,
    [trackId]
  );
  if (!row) return null;

  const domains = await query<{ name: string; weight_percent: string | number | null; sort_order: number }>(
    `select name, weight_percent, sort_order from exam_domains where exam_id = $1 order by sort_order`,
    [row.exam_id]
  );

  const verified = row.last_vendor_verified_at;
  return {
    examId: row.exam_id,
    credentialName: row.credential_name,
    providerName: row.provider_name,
    examCode: row.exam_code,
    examRevision: row.exam_revision,
    status: row.status,
    effectiveDate: row.effective_date,
    retirementDate: row.retirement_date,
    durationMinutes: row.duration_minutes,
    questionFormat: row.question_format,
    passingScorePolicy: row.passing_score_policy,
    recommendedExperience: row.recommended_experience,
    officialObjectivesUrl: row.official_objectives_url,
    lastVendorVerifiedAt: verified == null ? null : new Date(verified).toISOString(),
    supersededBy: row.superseded_by_exam_id
      ? { examId: row.superseded_by_exam_id, examCode: row.superseded_by_exam_code }
      : null,
    domains: domains.map((d) => ({
      name: d.name,
      // numeric(5,2) arrives as a string from pg
      weightPercent: d.weight_percent == null ? null : Number(d.weight_percent),
      sortOrder: d.sort_order,
    })),
  };
}
