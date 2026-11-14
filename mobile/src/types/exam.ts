// REQ-109: shapes returned by /api/exam/* (backend/lib/exam-sessions.ts).

export type ExamFormat = "multiple_choice" | "multiple_response" | "ordering" | "matching";

export interface Exhibit {
  kind: "log" | "policy" | "table" | "diagram";
  title: string;
  text?: string;
  columns?: string[];
  rows?: string[][];
}

// What the app sends and gets back for an answer, in SHOWN positions.
export interface ExamResponse {
  choice?: number;
  choices?: number[];
  order?: number[];
  matches?: (number | null)[];
}

export interface ExamItem {
  position: number;
  unitTitle: string;
  format: ExamFormat;
  stem: string;
  exhibit: Exhibit | null;
  choices?: string[];
  selectCount?: number;
  steps?: string[];
  prompts?: string[];
  responses?: string[];
  response: ExamResponse | null;
  answered: boolean;
  flagged: boolean;
  confidence: number | null;
  timeSpentMs: number;
  // REQ-113: the last save number the server applied for this question
  // (migration 047); the app numbers its next saves on from it. Absent from
  // an older server.
  saveSeq?: number;
  // after submit only
  verdict?: "correct" | "partial" | "incorrect";
  credited?: boolean;
  partialScore?: number | null;
  repeat?: boolean;
  counted?: boolean;
  correct?: ExamResponse;
  correctText?: string[];
  explanation?: string;
}

export interface ExamSessionInfo {
  id: string;
  trackId: string;
  mode: "sprint" | "mock";
  status: "in_progress" | "submitted" | "abandoned";
  timeLimitSeconds: number | null;
  startedAt: string;
  deadlineAt: string | null;
  submittedAt: string | null;
  serverNow: string;
}

export interface ExamResults {
  correct: number;
  total: number;
  percent: number;
  partialPercent: number;
  domains: {
    unitId: string;
    title: string;
    weight: number | null;
    questions: number;
    correct: number;
    percent: number;
    averageSeconds: number;
    smallSample: boolean;
  }[];
  pacing: { lines: string[]; unanswered: number; flagged: number; slowQuestions: number[] };
  readiness: {
    mockPercent: number;
    marginPoints: number;
    readinessPercent: number | null;
    agreement: "agree" | "mock_higher" | "mock_lower" | "not_comparable";
    lines: string[];
  } | null;
  calibration: {
    rated: number;
    bands: { band: string; label: string; answered: number; correct: number; accuracyPercent: number | null }[];
    lines: string[];
    coaching: string[];
  };
  evidence: { counted: number; repeats: number; line: string };
  // REQ-298 (mock only): how the exam reports a result, in words, and whether
  // the course's exam length was read from its source; and the form this was.
  pass?: { line: string; confirmed: boolean } | null;
  form?: { questions: number; examQuestions: number | null; short: boolean } | null;
}

export interface ExamSessionView {
  session: ExamSessionInfo;
  items: ExamItem[];
  results: ExamResults | null;
  preparation?: {
    requested: number;
    built: number;
    fresh: number;
    repeats: number;
    generatedCalls: number;
    generationFailed: boolean;
    // REQ-298
    short?: boolean;
    shortReason?: string | null;
  } | null;
}

export interface ExamProfile {
  examCode: string | null;
  credentialName: string | null;
  formats: ExamFormat[];
  exhibits: boolean;
  questionCount: number | null;
  durationMinutes: number | null;
  mockQuestions: number;
  secondsPerQuestion: number | null;
  // REQ-298: the real exam behind the mock. Absent from an older server.
  mock?: ExamMockInfo;
}

export interface ExamMockInfo {
  confirmed: boolean;
  practiceOnly: string | null;
  note: string;
  passPolicy: string;
  scored: number | null;
  questionsAreMaximum: boolean;
  minutesNote: string | null;
  notReproduced: string | null;
  weights: "exam_blueprint" | "study_emphasis";
  pauseRule: string;
  sources: { title: string; url: string; readAt: string }[];
}

// What the bank can fill of a full-length mock right now (GET /api/exam/sessions).
export interface ExamMockState {
  requested: number;
  canBuild: number;
  freshAvailable: number;
  repeats: number;
  short: boolean;
  reason: string | null;
  thinDomains: { title: string; need: number; have: number }[];
}

export interface ExamSessionSummary {
  id: string;
  mode: "sprint" | "mock";
  status: string;
  startedAt: string;
  submittedAt: string | null;
  deadlineAt: string | null;
  total: number;
  correct: number | null;
}
