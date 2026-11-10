import type { TeachCards } from "@/lib/lessonExperience";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  mfaEnabled?: boolean;
  totpEnabled?: boolean;
  emailMfaEnabled?: boolean;
  hasPassword?: boolean;
  googleLinked?: boolean;
  avatarDataUrl?: string | null;
  // REQ-093: documents whose current version this user still has to accept.
  legalPending?: ("terms" | "privacy")[];
  // REQ-144: owner or unrestricted access (src/lib/access.ts), null otherwise.
  access?: { level: "owner" | "unrestricted"; grantedBy: string | null; expiresAt: string | null } | null;
  // REQ-201: present when the server limits AI to invited pilot accounts
  // (AI_ACCESS_MODE granted or paid); absent means full AI as before.
  ai?: { mode: "all" | "granted" | "paid"; full: boolean };
}

export type MasteryStatus =
  | "Not started"
  | "Introduced"
  | "Guided"
  | "Independent"
  | "Transfer-ready"
  | "Needs review";

export type FreshnessStatus = "unverified" | "review_due" | "current";

export interface Track {
  id: string;
  code: string;
  title: string;
  description: string | null;
  track_type: "graduate" | "certification" | "academic" | "professional" | "skills";
  // REQ-037: delivery format, decoupled from track_type. Only one value
  // exists today -- see backend/supabase/migrations/015_content_format.sql.
  content_format?: "full_course";
  total_units?: number;
  total_objectives?: number;
  // Mastery: objectives at Independent/Transfer-ready. Distinct from progress
  // below -- an objective can be "started" (below) without being mastered.
  mastered_objectives?: number;
  percent_complete?: number;
  // Progress: objectives with any mastery row at all, i.e. attempted at
  // least once, regardless of how well. This is "how far in," not "how well
  // known" -- see backend/supabase/migrations/022_track_progress_vs_mastery.sql.
  started_objectives?: number;
  percent_progress?: number;
  last_studied_at?: string | null;
  is_favorite?: boolean;
  // REQ-036: taxonomy + freshness, joined in by GET /api/courses.
  subcategory_id?: string | null;
  subcategory_slug?: string | null;
  subcategory_name?: string | null;
  category_id?: string | null;
  category_slug?: string | null;
  category_name?: string | null;
  category_sort_order?: number | null;
  freshness_status?: FreshnessStatus | null;
}

export interface Unit {
  id: string;
  track_id: string;
  title: string;
  range_label: string | null;
  weight: number | null;
  sort_order: number;
  gate_description: string | null;
  total_objectives?: number;
  mastered_objectives?: number;
  needs_review_objectives?: number;
  avg_score_0_4?: number;
  objectives?: Objective[];
}

// REQ-100: GET /api/courses/:id -> readiness (backend/lib/readiness.ts).
export interface DomainReadiness {
  unitId: string;
  title: string;
  weight: number | null;
  objectives: number;
  practiced: number;
  coveragePercent: number;
  accuracyPercent: number | null;
  readinessPercent: number;
  keptPercent?: number;
}

export interface CourseReadiness {
  blueprintWeighted: boolean;
  status: "no_evidence" | "not_enough_evidence" | "building" | "ready";
  readinessPercent: number;
  coveragePercent: number;
  accuracyPercent: number | null;
  // REQ-117: blueprint-weighted share confirmed at a due review.
  keptPercent?: number;
  objectives: number;
  practiced: number;
  focusUnitId: string | null;
  domains: DomainReadiness[];
}

export interface Objective {
  id: string;
  unit_id: string;
  title: string;
  sort_order: number;
  lab_prompt: string | null;
  mastery_status?: MasteryStatus;
  mastery_score?: number;
  mastery_evidence?: string;
}

export interface LessonContent {
  guessPrompt: string;
  // Always present: for a lesson with cards it is the same teaching as one
  // text (what grading reads), for an older cached lesson the only teaching.
  teach: string;
  // REQ-106: Teach as 3-4 short cards plus one self-explanation prompt.
  // Absent for lessons cached before cards; `teach` is then shown as before.
  teachCards?: TeachCards;
  // Absent while the practice half is still generating in the background --
  // see `practicePending` on the lesson GET/POST response. Always present
  // once that flag is false.
  //
  // REQ-134: no answer key and no explanation of the right answer are sent
  // before the learner answers -- POST /api/grade returns them with the
  // verdict. fadeChoices come in this learner's fixed shuffled order. The
  // Solo choices are a hint: POST /api/objectives/:id/hint returns them and
  // records that the hint was used.
  fadeProblem?: string;
  fadeChoices?: string[];
  soloCheck?: string;
  model?: string;
  generatedAt?: string;
}

export interface PartScore {
  part: string;
  score: "met" | "partial" | "missed";
  comment: string;
}

export interface GradeResult {
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
  classification: string;
  missedParts: string[];
  // REQ-107 (PBQ only): the grader's score for each sub-part, in the
  // scenario's order. Absent on a replayed retry and from older servers;
  // null when the grader's list could not be matched to the sub-parts.
  partScores?: PartScore[] | null;
  // REQ-134 (lesson checks only): the answer key, revealed with the verdict.
  // correctIndex is a position in the order the choices were shown.
  correctIndex?: number | null;
  correctAnswer?: string | null;
  why?: string | null;
  // "hint": the Solo choices were seen. "repeat": this exact question was
  // answered before. "retry" (REQ-105): a revision written with the first
  // answer's feedback in view. Each keeps the answer from lifting mastery.
  assisted?: boolean;
  assistReason?: "hint" | "repeat" | "retry" | "reveal" | null;
  // REQ-105, returned only with the verdict: one reason per option in the
  // shown order (lesson multiple choice; null for an older cached lesson),
  // the grader's model answer and "what to fix" line (free response and
  // PBQ), and for a PBQ revision the sub-parts it covered.
  optionReasons?: string[] | null;
  modelAnswer?: string | null;
  fixNext?: string | null;
  revisedParts?: string[];
  attempt?: { id: string };
  // REQ-111: "reveal" -- an explain-it-back copied from the lesson text.
  // The likely misconception behind a miss, in one sentence.
  diagnosis?: { sentence: string; confusedWith: string | null; conceptSetId: string | null } | null;
}

export interface Attempt {
  id: string;
  unit_id: string | null;
  objective_id: string | null;
  objective_title?: string;
  unit_title?: string;
  // REQ-075: lets History navigate straight into the objective's lesson.
  track_id?: string | null;
  kind: "lesson" | "quiz" | "pbq" | "unitcheck" | "lab" | "review" | "labtask"; // labtask: a build or case lab (REQ-123)
  stage: string | null;
  format: "mc" | "open" | "pbq" | "lab";
  question: string;
  answer: string;
  verdict: "correct" | "partial" | "incorrect" | null;
  feedback: string | null;
  classification: string | null;
  missed_parts: string[] | null;
  confidence: number | null;
  created_at: string;
}

export interface ErrorLogEntry {
  id: string;
  unit_id: string | null;
  objective_id: string | null;
  objective_title?: string;
  unit_title?: string;
  // REQ-073: the Review screen groups by course and opens the lesson.
  track_id?: string | null;
  track_title?: string | null;
  topic: string;
  error_text: string;
  why: string | null;
  classification: string | null;
  review_stage: number;
  next_review_at: string | null;
  resolved: boolean;
  created_at: string;
  // REQ-134: set for a missed PBQ, so Review can offer the same scenario again.
  pbq_scenario_id?: string | null;
}

// REQ-074: shape returned by POST /api/objectives/:id/lesson/prefetch-next
// alongside its status, so the lesson screen can offer "Next objective".
export interface NextObjective {
  id: string;
  title: string;
  unit_id: string;
  unit_title: string;
}

export interface PBQScenario {
  id: string;
  unit_id: string;
  title: string;
  scenario: string;
  sub_parts: string[];
  generated_at: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export type ContentFreshnessModel =
  | "certification_aligned"
  | "technology_aligned"
  | "academic_foundational";

export interface EducationSubcategory {
  id: string;
  slug: string;
  name: string;
  freshnessModel: ContentFreshnessModel;
  sortOrder: number;
}

export interface EducationCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  subcategories: EducationSubcategory[];
}

export type SupportRequestKind = "ticket" | "course_request" | "content_report";
export type SupportRequestStatus = "open" | "in_review" | "resolved" | "declined";

export interface SupportRequest {
  id: string;
  kind: SupportRequestKind;
  subject: string;
  body: string;
  status: SupportRequestStatus;
  track_id: string | null;
  course_name: string | null;
  course_source_url: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

// REQ-108: Today's review, unit checks and term coverage.
export interface ReviewToday {
  dueCount: number;
  forToday: number;
  nextDueOn: string | null;
  unitChecks: { unitId: string; unitTitle: string; trackId: string; trackTitle: string; lastVerdict: string | null }[];
}

export interface ReviewSessionItem {
  position: number;
  objectiveId: string;
  objectiveTitle: string;
  unitTitle: string;
  trackTitle: string;
  question: string;
  answered: boolean;
  verdict: "correct" | "partial" | "incorrect" | null;
  // REQ-117: the last two answers on it were missed -- read this first, and
  // the choices are offered up front.
  reteach?: string | null;
  easierEntry?: boolean;
}

export interface ReviewSession {
  id: string;
  gentleStart: boolean;
  total: number;
  answered: number;
  items: ReviewSessionItem[];
}

export interface ReviewAnswerResult {
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
  missedParts: string[];
  assisted: boolean;
  correctIndex: number | null;
  correctAnswer: string | null;
  why: string | null;
  terms: string[];
  termsCredited?: string[];
  nextDueOn?: string | null;
  advanced?: boolean;
  replayed?: boolean;
}

export interface UnitCheckStatus {
  unitId: string;
  unitTitle: string;
  trackId: string;
  gate: string | null;
  total: number;
  studied: number;
  eligible: boolean;
  passed: boolean;
  lastVerdict: string | null;
}

export interface UnitCheck {
  id: string;
  unit_id: string;
  title: string;
  scenario: string;
  sub_parts: string[];
}

export interface TermCoverage {
  objectiveId: string;
  title: string;
  unitTitle: string;
  trackTitle: string;
  terms: { term: string; covered: boolean }[];
}
