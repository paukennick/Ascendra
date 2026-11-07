// REQ-110: shapes returned by GET/PUT /api/courses/:id/plan, the placement
// check and "Quiz me" (backend/lib/study-plan.ts, placement.ts, coach-quiz.ts).

export type StepKind = "warmup" | "learn" | "practice" | "confirm" | "review" | "mock" | "light";

export interface PlanStep {
  kind: StepKind;
  objectiveId?: string;
  unitId?: string;
  title: string;
  minutes: number;
  reason: string;
}

export type PlanOption =
  | { kind: "more_hours"; weeklyHours: number }
  | { kind: "later_date"; examDate: string }
  | { kind: "focus"; unitIds: string[]; unitTitles: string[]; coveredWeightPercent: number };

export type Phase = "no_date" | "building" | "final_week" | "last_day" | "exam_day" | "past";
export type Feasibility = "done" | "on_track" | "tight" | "unrealistic" | "no_date";

export interface StudyPlan {
  today: string;
  examDate: string | null;
  weeklyHours: number;
  phase: Phase;
  daysToExam: number | null;
  mockExamDate: string | null;
  lightDay: string | null;
  roughLastSession: boolean;
  remaining: { learn: number; practice: number; confirm: number; done: number; total: number; minutes: number };
  thisWeek: { steps: PlanStep[]; reviewItems: number; reviewMinutes: number; minutes: number };
  feasibility: {
    status: Feasibility;
    neededMinutes: number;
    availableMinutes: number | null;
    paceFinishDate: string | null;
    options: PlanOption[];
  };
}

export type SessionKind = "review" | "lesson" | "scenario";
export type SessionTarget =
  | { type: "lesson"; objectiveId: string; unitId: string; title: string }
  | { type: "review" }
  | { type: "pbq"; unitId: string; unitTitle: string };

export interface SessionChoice {
  kind: SessionKind;
  label: string;
  detail: string;
  available: boolean;
  target: SessionTarget | null;
}

export interface KeptSummary {
  completed: number;
  kept: number;
  slipped: number;
  unchecked: number;
}

export interface PlanResponse {
  settings: { examDate: string | null; weeklyHours: number; saved: boolean };
  plan: StudyPlan;
  sessions: { defaultKind: SessionKind; choices: SessionChoice[] };
  kept: KeptSummary;
  placement: { available: boolean; status: "none" | "active" | "done" | "skipped"; offer: boolean };
}

export interface PlacementView {
  available: boolean;
  status: "none" | "active" | "done" | "skipped";
  asked: number;
  max: number;
  current: { seq: number; objectiveId: string; question: string; choices: string[] } | null;
  summary: { asked: number; correct: number; message: string } | null;
  stale?: boolean;
  replayed?: boolean;
}

export interface QuizTurn {
  id: string;
  objectiveId: string;
  objectiveTitle: string;
  unitId: string;
  question: string;
  choices: string[];
  tries: number;
  maxTries: number;
  status: "open" | "correct" | "revealed";
  hints: string[];
  correctIndex: number | null;
  explanation: string | null;
}
