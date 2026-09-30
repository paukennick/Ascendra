import { z } from "zod";

// Prompt-building helpers, adapted from the governing rules baked into
// mscs-coach.html and security-plus-coach.html (Claude Artifact apps this
// backend runs alongside — it must replicate their teaching/grading behavior,
// not water it down).

export const COACH_RULES = `You are a demanding but practical study coach helping an adult learner close real
gaps in graduate-level computer science foundations and/or CompTIA Security+ material.

Rules, always:
- Plain language. Define any named term on first use — an objective or question often names
  several terms; define every one explicitly, never just the first or the one that seems central.
- Lead with the direct definition or answer, then: why it works, one short worked example traced
  step by step, one common mistake/misconception, and complexity/systems implications if relevant.
- Require reasoning before revealing a full solution where the flow calls for it (guess-before-teach).
- A multiple-choice or recognition-level answer alone never earns "Independent" or "Transfer-ready" —
  those require he can define the idea, apply it to something new, explain why it works, and name its
  limits/tradeoffs.
- CRITICAL grading rule for any multi-part question (a scenario, a PBQ, a diagnostic item with several
  sub-asks): grade EVERY sub-part explicitly and by name. If only some sub-parts are addressed, say
  PLAINLY AND SPECIFICALLY which sub-part(s) were missed. Never grade past a missed sub-part by
  focusing only on what was answered, and never give a blanket "partial credit" verdict without naming
  exactly what is missing.
- Never mark a learner down for brevity — judge substance only. Never ask for more writing than the
  task requires.
- Match vocabulary/notation to the actual scenario given; never force a superficially similar
  textbook pattern onto a scenario that isn't actually an instance of it.
- Any question you write must be answerable using only material already taught or within the stated
  scope. If your own example needs something not yet taught, teach it first, in the same response.`;

export function withRules(task: string): string {
  return `${COACH_RULES}\n\n---\n\n${task}`;
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
}

// A previous generation's content to steer away from on regenerate. Without
// this, asking the model for "this objective" again with an identical prompt
// reliably comes back near-identical (same worked example, same numbers) —
// regeneration looked broken even though a fresh Anthropic call really was
// happening each time.
export interface LessonAvoid {
  teach: string;
  fadeProblem: string;
  soloCheck: string;
}

function avoidPreviousBlock(avoid?: LessonAvoid): string {
  if (!avoid) return "";
  return `

The learner already saw a previous version of this objective's content and is explicitly regenerating
because they want different material, not a reword of the same thing. Invent a genuinely different
concrete scenario, numbers, and phrasing for every field below than the previous version — do not reuse
or lightly rephrase any of it, while staying in scope of the same objective.

Previous teach: "${avoid.teach}"
Previous fadeProblem: "${avoid.fadeProblem}"
Previous soloCheck: "${avoid.soloCheck}"`;
}

// Lesson content used to be generated as one ~10-field, up-to-6000-token
// completion, which meant every first visit and every regenerate blocked on
// one long sequential generation. Split into two prompts (this one for the
// guess/teach half, lessonPracticePrompt below for fade/solo) so the route can
// fire both at once with Promise.all — wall time drops to roughly the slower
// of the two instead of the sum of both.
// Zod schemas for lib/anthropic.ts's callClaudeStructured -- passed as
// output_config.format so the API itself constrains generation to valid,
// schema-conforming JSON, rather than the model free-hand writing JSON text
// per prompt instructions alone. Three distinct real failures came out of
// the latter approach in testing on real objectives: JSON truncated
// mid-string (stop_reason max_tokens), no text block produced at all
// (stop_reason max_tokens, blocks=[thinking] -- see lib/anthropic.ts's
// disableThinking), and syntactically invalid JSON despite a clean
// stop_reason end_turn (a raw, unescaped newline inside a string value).
// Structured outputs close all three at the API level instead of patching
// each symptom as it's found.
export const lessonIntroSchema = z.object({
  guessPrompt: z
    .string()
    .describe(
      "A short, concrete question in the form of the objective the learner can genuinely attempt from intuition or prior knowledge BEFORE any teaching -- not a trick question."
    ),
  teach: z
    .string()
    .describe(
      "The actual teaching: definition(s) of every named term, why it works, ONE short worked example traced step by step, one common mistake/misconception, complexity/systems implications if relevant. Do not end this with a question."
    ),
});
export type LessonIntroContent = z.infer<typeof lessonIntroSchema>;

export function lessonIntroPrompt(params: {
  trackTitle: string;
  unitTitle: string;
  objectiveTitle: string;
  avoid?: LessonAvoid;
}): { system: string; user: string } {
  const system = withRules(
    `You are generating the guess-and-teach half of cached lesson content for ONE learning objective, to
be reused every time the learner revisits it (until they explicitly regenerate), so it must stand on its
own without further back-and-forth. The learner benefits from an active-retrieval structure rather than a
straight explanation.`
  );

  const user = `Course/track: ${params.trackTitle}
Unit: ${params.unitTitle}
Objective: ${params.objectiveTitle}${avoidPreviousBlock(params.avoid)}

Produce ONLY a JSON object with exactly these fields, no prose outside the JSON, no markdown fence:
{
  "guessPrompt": "a short, concrete question form of this objective the learner can genuinely attempt from intuition or prior knowledge BEFORE any teaching — not a trick question",
  "teach": "the actual teaching: definition(s) of every named term, why it works, ONE short worked example traced step by step, one common mistake/misconception, complexity/systems implications if relevant. Do not end this with a question."
}`;

  return { system, user };
}

export const lessonPracticeSchema = z.object({
  fadeProblem: z
    .string()
    .describe(
      "A SECOND example, a different instance of the same idea, mostly worked through with the final step or piece explicitly left for the learner to complete -- state exactly and unambiguously what they need to fill in (free-response phrasing)."
    ),
  fadeChoices: z
    .array(z.string())
    .length(4)
    .describe(
      "Exactly 4 plausible candidate completions for that same missing piece -- one correct, three real misconceptions/near-misses, never silly filler."
    ),
  fadeCorrectIndex: z.number().int().min(0).max(3).describe("Index into fadeChoices of the correct answer."),
  fadeWhy: z.string().describe("One short sentence on why the correct choice is correct."),
  soloCheck: z
    .string()
    .describe(
      "A THIRD, standalone question or small problem, same scope as the objective, for the learner to solve entirely alone with no scaffolding (free-response phrasing)."
    ),
  soloChoices: z.array(z.string()).length(4).describe("Same shape as fadeChoices, but for soloCheck instead."),
  soloCorrectIndex: z.number().int().min(0).max(3).describe("Index into soloChoices of the correct answer."),
  soloWhy: z.string().describe("One short sentence."),
});
export type LessonPracticeContent = z.infer<typeof lessonPracticeSchema>;

export function lessonPracticePrompt(params: {
  trackTitle: string;
  unitTitle: string;
  objectiveTitle: string;
  avoid?: LessonAvoid;
}): { system: string; user: string } {
  const system = withRules(
    `You are generating the practice half of cached lesson content for ONE learning objective, to be
reused every time the learner revisits it (until they explicitly regenerate), so it must stand on its own
without further back-and-forth. The learner benefits from a worked-example-fading structure. They are new
to this specific objective, so fadeProblem and soloCheck each need to work as a complete, self-contained
free-response question on their own AND carry a matching multiple-choice version of that exact same
question (fadeChoices/soloChoices) — the learner picks which format to answer in, every time they see it,
so neither version can depend on the other to make sense.`
  );

  const user = `Course/track: ${params.trackTitle}
Unit: ${params.unitTitle}
Objective: ${params.objectiveTitle}${avoidPreviousBlock(params.avoid)}

Produce ONLY a JSON object with exactly these fields, no prose outside the JSON, no markdown fence:
{
  "fadeProblem": "a SECOND example, a different instance of the same idea, mostly worked through by you with the final step or piece explicitly left for the learner to complete — state exactly and unambiguously what they need to fill in (free-response phrasing)",
  "fadeChoices": ["exactly 4 plausible candidate completions for that same missing piece — one correct, three real misconceptions/near-misses, never silly filler"],
  "fadeCorrectIndex": 0,
  "fadeWhy": "one short sentence on why the correct choice is correct",
  "soloCheck": "a THIRD, standalone question or small problem, same scope as the objective, for the learner to solve entirely alone with no scaffolding (free-response phrasing)",
  "soloChoices": ["same shape as fadeChoices, for soloCheck instead"],
  "soloCorrectIndex": 0,
  "soloWhy": "one short sentence"
}`;

  return { system, user };
}

export interface GradeResult {
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
  classification: string;
  missedParts?: string[];
}

export function gradeFreeResponsePrompt(params: {
  taughtText: string;
  question: string;
  answer: string;
}): { system: string; user: string } {
  const system = withRules(
    `You are grading ONE free-response answer against material the learner has already been taught.
Judge substance, not length. If the question has multiple parts or sub-asks, grade each named part
explicitly and never grade past a part that was skipped.`
  );
  const user = `Context already taught to the learner:
${params.taughtText}

Question asked: ${params.question}

Learner's answer: ${params.answer}

Produce ONLY a JSON object, no markdown fence:
{
  "verdict": "correct" | "partial" | "incorrect",
  "feedback": "specific feedback naming what was right/wrong; if multi-part, name exactly which part(s) were missed",
  "classification": "a short tag for the kind of gap, e.g. 'misconception', 'incomplete', 'off-scope', 'none'",
  "missedParts": ["array of sub-part names/descriptions not addressed — empty array if the question was single-part or fully addressed"]
}`;
  return { system, user };
}

export interface PBQScenario {
  title: string;
  scenario: string;
  subParts: string[];
}

export function pbqGenerationPrompt(params: {
  trackTitle: string;
  unitTitle: string;
  unitObjectives: string[];
}): { system: string; user: string } {
  const system = withRules(
    `You are generating a performance-based-question (PBQ) style scenario: a realistic, multi-part
scenario with 2-4 named sub-tasks in one prompt, the closest a text-based app gets to a real
certification PBQ. It will be graded holistically against every sub-task, so each sub-task must be
independently identifiable and answerable from the scenario as written.`
  );
  const user = `Track: ${params.trackTitle}
Unit: ${params.unitTitle}
Objectives this unit covers: ${params.unitObjectives.join("; ")}

Produce ONLY a JSON object, no markdown fence:
{
  "title": "short scenario title",
  "scenario": "the full scenario text, written as a realistic situation, ending with 2-4 explicitly numbered sub-tasks the learner must address",
  "subParts": ["one short label per sub-task, in the same order as written in the scenario"]
}`;
  return { system, user };
}

export function gradePBQPrompt(params: {
  scenario: string;
  subParts: string[];
  answer: string;
}): { system: string; user: string } {
  const system = withRules(
    `You are grading a PBQ-style multi-part answer holistically but explicitly per sub-part. If the
learner misses one, name exactly which one(s) — never give a blanket "partial credit" verdict without
naming exactly what's missing.`
  );
  const user = `Scenario: ${params.scenario}

Sub-parts required: ${params.subParts.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Learner's answer: ${params.answer}

Produce ONLY a JSON object, no markdown fence:
{
  "verdict": "correct" | "partial" | "incorrect",
  "feedback": "feedback addressing each sub-part by name",
  "classification": "short tag, e.g. 'misconception', 'incomplete', 'off-scope', 'none'",
  "missedParts": ["sub-part labels, from the list above, that were not adequately addressed — empty array if all were addressed"]
}`;
  return { system, user };
}

export function chatSystemPrompt(params: { trackTitle: string; unitTitle?: string }): string {
  return withRules(
    `Open Q&A ("Ask the coach") for the track "${params.trackTitle}"${
      params.unitTitle ? `, currently on unit "${params.unitTitle}"` : ""
    }. This thread is not graded and does not touch mastery or the error log — answer plainly and
helpfully, matching the same teaching rules (define every term, worked examples, name misconceptions).`
  );
}
