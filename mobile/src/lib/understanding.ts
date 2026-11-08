// REQ-111: pure helpers for the deep-understanding screens (comparison cards,
// explain-it-back, misconception notes, prerequisite refreshers). No React,
// so they are tested with node --test (understanding.test.ts).

export interface ComparisonConcept {
  position: number;
  name: string;
  aliases: string[];
  objectiveId: string | null;
  objectiveTitle: string | null;
}

export interface ComparisonSet {
  id: string;
  source: "generated" | "learned" | "edited" | string;
  howToTell: string;
  dimensions: { dimension: string; values: string[] }[];
  concepts: ComparisonConcept[];
  questionCount: number;
  yourMixUps: number;
}

export interface Diagnosis {
  sentence: string;
  confusedWith: string | null;
  conceptSetId: string | null;
}

export interface ExplainRubric {
  correct: boolean;
  complete: boolean;
  keyTerms: boolean;
  noMisconception: boolean;
}

// The card is laid out one dimension at a time, each concept's value on its
// own line beneath it, so it reads on a narrow phone and in a screen reader
// (no wide table). Values missing for a concept show as a dash.
export function comparisonRows(set: Pick<ComparisonSet, "dimensions" | "concepts">) {
  return set.dimensions.map((d) => ({
    dimension: d.dimension,
    cells: set.concepts.map((c, i) => ({ concept: c.name, value: d.values[i]?.trim() || "—" })),
  }));
}

// What a screen reader says for one dimension of the card.
export function rowAccessibilityLabel(row: ReturnType<typeof comparisonRows>[number]): string {
  return `${row.dimension}: ${row.cells.map((c) => `${c.concept}, ${c.value}`).join("; ")}`;
}

export function conceptList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// A line under the card title: why it is shown, never a judgement.
export function cardSubtitle(set: Pick<ComparisonSet, "source" | "yourMixUps">): string | null {
  if (set.yourMixUps > 0) {
    return set.yourMixUps === 1
      ? "You mixed these up once — a side-by-side look usually clears it."
      : `You've mixed these up ${set.yourMixUps} times — a side-by-side look usually clears it.`;
  }
  if (set.source === "learned") return "Learners often mix these up.";
  return null;
}

const RUBRIC_LABELS: { key: keyof ExplainRubric; good: string; gap: string }[] = [
  { key: "correct", good: "Accurate", gap: "Something stated isn't quite right" },
  { key: "complete", good: "Complete", gap: "Part of the idea is missing" },
  { key: "keyTerms", good: "Key terms used well", gap: "A key term is missing or used loosely" },
  { key: "noMisconception", good: "No mix-ups", gap: "A likely mix-up shows" },
];

export function rubricLines(rubric: ExplainRubric | null | undefined): { label: string; met: boolean }[] {
  if (!rubric) return [];
  return RUBRIC_LABELS.map((r) => ({ label: rubric[r.key] ? r.good : r.gap, met: !!rubric[r.key] }));
}

// Explain-it-back opens at Guided and above.
export function explainBackOpen(status: string | null | undefined): boolean {
  return status === "Guided" || status === "Independent" || status === "Transfer-ready";
}

export function explainBackLockedNote(status: string | null | undefined): string {
  if (status === "Needs review") {
    return "Explain-it-back comes back once you're at Guided again — one good answer on this objective gets you there.";
  }
  return "Explain-it-back opens once this objective reaches Guided. Try its practice questions first.";
}

export function explainAssistNote(assistReason: string | null | undefined): string | null {
  if (assistReason === "repeat") {
    return "You explained this recently, so this one is practice only. Come back tomorrow and it counts in full.";
  }
  if (assistReason === "reveal") {
    return "Much of this matched the lesson text, so it counts as practice. Your own words count in full.";
  }
  if (assistReason === "hint") return "You reopened the comparison, so this counts as practice.";
  return null;
}

// Offer a refresher only after a miss (incorrect or partial).
export function offerRefresherAfter(verdict: string | null | undefined): boolean {
  return verdict === "incorrect" || verdict === "partial";
}

export function refresherPrompt(prerequisiteTitle: string, minutes: number): string {
  return `This builds on "${prerequisiteTitle}". Want a quick refresher (about ${minutes} min) before you try again?`;
}

// Minimum the server accepts, so the button can say why it is disabled.
export const EXPLAIN_MIN_WORDS = 8;
export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
