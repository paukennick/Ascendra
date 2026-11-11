import { z } from "zod";
import { ITEM_WRITING_RULES, systemWithRules, uncertaintySchemaFields, type SystemPrompt } from "@/lib/prompts";
import type { CoachContext } from "@/lib/coach-context";

// REQ-108: prompts for the review loop. Kept apart from lib/prompts.ts so the
// lesson prompts stay untouched; both build on the same coach rules
// (systemWithRules), so the stable, cached system block is the same one.
//
// Nothing learner-specific goes into these prompts: the output is cached and
// served to every learner (review_items, unit_check_items). Which terms a
// question should target is chosen from the learner's coverage, but a term
// is objective text, not learner data.

// Teaching text beyond this is cut: enough for one question, and it bounds
// the input tokens of a 12-objective batch.
export const TEACH_CHARS = 6000;

export const reviewBatchSchema = z.object({
  items: z
    .array(
      z.object({
        key: z.string().describe("The key of the objective this question is for, copied exactly."),
        terms: z
          .array(z.string())
          .describe(
            "Only when the objective says TERMS: extract -- the specific named terms, tools or concepts the objective's title names (1-10, short noun phrases, the title's own wording). Otherwise an empty array."
          ),
        question: z
          .string()
          .describe(
            "A NEW standalone review question on this objective, answerable in a sentence or two from the teaching text alone; a different situation from any example in the teaching text."
          ),
        choices: z
          .array(z.string())
          .length(4)
          .describe("Exactly 4 options for the same question: one correct, three real misconceptions or near-misses."),
        correctIndex: z.number().int().min(0).max(3).describe("Index into choices of the correct option. Vary it."),
        why: z.string().describe("One or two sentences on why the correct option is right."),
        testedTerms: z
          .array(z.string())
          .describe("Which of the objective's terms this question actually tests, in the objective's own wording."),
        // REQ-114 (Audit 3 H1): an item the writer rates low is held back, not served;
        // REQ-216: claims it only lists are logged.
        ...uncertaintySchemaFields,
      })
    )
    .describe("One item per objective given, in the same order."),
});
export type ReviewBatch = z.infer<typeof reviewBatchSchema>;

export interface ReviewBatchObjective {
  key: string;
  title: string;
  unitTitle: string;
  teach: string;
  // null: extract the terms in this call.
  knownTerms: string[] | null;
  targetTerms: string[];
  // REQ-112 (i): this learner's recent mix-ups on the objective, already
  // fenced as data (misconceptionPromptBlock, lib/understanding-store.ts), or
  // "" / undefined when there are none. The question stays one any learner
  // can be served (the system text forbids addressing a learner); it just
  // aims at telling the mixed-up ideas apart.
  mixups?: string;
  // REQ-216: set on the one retry of a question that was held back -- the
  // claims to leave out or state as uncertain (lib/generation-gate.ts steerText).
  steer?: string;
}

export function reviewBatchPrompt(params: {
  trackTitle: string;
  objectives: ReviewBatchObjective[];
  ctx?: CoachContext;
}): { system: SystemPrompt; user: string } {
  const system = systemWithRules(
    `You are writing spaced-review questions: ONE new question per learning objective, for a learner
who studied each objective days ago. Each question must check the idea itself, not memory of the lesson's
own example: use a fresh situation, name, number or symptom, and keep it inside what the teaching text
covers. Each question is shown first for a free-response answer and, if the learner asks, with the four
options, so it must make sense on its own without the options. These questions are cached and reused for
other learners, so never address a particular learner or refer to their past answers.

${ITEM_WRITING_RULES}`,
    params.ctx
  );
  const blocks = params.objectives.map((o) => {
    const terms =
      o.knownTerms === null
        ? "TERMS: extract (fill the terms field for this objective)"
        : `TERMS: ${o.knownTerms.length ? o.knownTerms.join("; ") : "(none listed)"}`;
    const target = o.targetTerms.length
      ? `Test these terms in particular: ${o.targetTerms.join("; ")}`
      : "Test whichever of its terms the question fits best.";
    return `<objective key="${o.key}">
Unit: ${o.unitTitle}
Objective: ${o.title}
${terms}
${target}
Teaching text:
${o.teach.slice(0, TEACH_CHARS)}${o.mixups ? o.mixups : ""}${o.steer ? `\n${o.steer}` : ""}
</objective>`;
  });
  const user = `Course/track: ${params.trackTitle}

${blocks.join("\n\n")}

Return one item per objective above, in the same order, each with its key copied exactly, and its own
confidence and uncertainClaims.`;
  return { system, user };
}

// Unit gate check: a PBQ-shaped scenario written from the unit's gate
// statement, so the existing PBQ grader (gradePBQPrompt) grades it.
export const unitCheckSchema = z.object({
  title: z.string().describe("Short scenario title."),
  scenario: z
    .string()
    .describe(
      "A realistic situation the learner has not seen, that tests exactly what the gate statement asks, ending with 2-3 explicitly numbered sub-tasks."
    ),
  subParts: z.array(z.string()).describe("One short label per sub-task (2-3), in the order written."),
  ...uncertaintySchemaFields,
});
export type UnitCheck = z.infer<typeof unitCheckSchema>;

export function unitCheckPrompt(params: {
  trackTitle: string;
  unitTitle: string;
  gate: string;
  objectiveTitles: string[];
  ctx?: CoachContext;
}): { system: SystemPrompt; user: string } {
  const system = systemWithRules(
    `You are writing a short unit check: one transfer scenario that tests whether a learner can do what
the unit's gate statement says, in a situation that is new to them. It is graded per sub-task, so each
sub-task must be identifiable and answerable from the scenario as written, in a few sentences. Stay
inside the unit's objectives. The scenario is cached and reused for other learners.`,
    params.ctx
  );
  const user = `Track: ${params.trackTitle}
Unit: ${params.unitTitle}
Gate statement (what the learner must be able to do): ${params.gate}
Objectives this unit covers: ${params.objectiveTitles.join("; ")}

Write one scenario with 2-3 numbered sub-tasks that, together, check the gate statement.`;
  return { system, user };
}
