// REQ-096: the lesson's step list. Every lesson runs guess, teach, guided
// practice and solo check; an objective that has a hands-on lab prompt gets
// one more optional step, "lab" ("Try it"), after the solo check. Objectives
// without a lab prompt see exactly the four steps they always did.
//
// Pure (no React Native imports) so `npm test` can run it under node:test.

export type Step = "guess" | "teach" | "fade" | "solo" | "lab" | "done";
export type ProgressStep = Exclude<Step, "done">;

const BASE_STEPS: ProgressStep[] = ["guess", "teach", "fade", "solo"];

// What the server sends as `labPrompt`: text, or null/absent. Blank text is
// treated as absent so a whitespace-only prompt never opens an empty step.
export function normalizeLabPrompt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

export function stepsFor(labPrompt: string | null): ProgressStep[] {
  return labPrompt ? [...BASE_STEPS, "lab"] : BASE_STEPS;
}

// Where "Continue" on the solo check goes.
export function stepAfterSolo(labPrompt: string | null): Step {
  return labPrompt ? "lab" : "done";
}
