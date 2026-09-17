export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  mfaEnabled?: boolean;
  hasPassword?: boolean;
  googleLinked?: boolean;
  avatarDataUrl?: string | null;
}

export type MasteryStatus =
  | "Not started"
  | "Introduced"
  | "Guided"
  | "Independent"
  | "Transfer-ready"
  | "Needs review";

export interface Track {
  id: string;
  code: string;
  title: string;
  description: string | null;
  track_type: "graduate" | "certification";
  total_units?: number;
  total_objectives?: number;
  mastered_objectives?: number;
  percent_complete?: number;
  last_studied_at?: string | null;
  is_favorite?: boolean;
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
  teach: string;
  fadeProblem: string;
  fadeChoices: string[];
  fadeCorrectIndex: number;
  fadeWhy: string;
  soloCheck: string;
  soloChoices: string[];
  soloCorrectIndex: number;
  soloWhy: string;
  model: string;
  generatedAt: string;
}

export interface GradeResult {
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
  classification: string;
  missedParts: string[];
}

export interface Attempt {
  id: string;
  unit_id: string | null;
  objective_id: string | null;
  objective_title?: string;
  unit_title?: string;
  kind: "lesson" | "quiz" | "pbq" | "unitcheck" | "lab";
  stage: string | null;
  format: "mc" | "open" | "pbq";
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
  topic: string;
  error_text: string;
  why: string | null;
  classification: string | null;
  review_stage: number;
  next_review_at: string | null;
  resolved: boolean;
  created_at: string;
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
