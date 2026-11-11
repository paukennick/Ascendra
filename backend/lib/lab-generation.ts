import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { systemWithRules, uncertaintySchemaFields, UNCERTAINTY_JSON, type SystemPrompt } from "@/lib/prompts";
import { factCheckEnabled } from "@/lib/fact-check";
import { type CheckVerdict } from "@/lib/fact-check";
import { FactCheckUnavailableError, generateGated, HeldForAccuracyError, type GateCheckResult } from "@/lib/generation-gate";
import type { CoachContext } from "@/lib/coach-context";
import { labContentHash, labContentProblems, type LabContent, type LabKind } from "@/lib/lab-content";
import type { LabSafetyFamily } from "@/lib/lab-grading";

// REQ-123: writing a lab with the model, for scale-out beyond the authored
// pilot (scripts/generate-labs.ts, Batch API). Shared content, so it goes
// through the REQ-216 generation gate (lib/generation-gate.ts) before it is stored:
//   1. the writer rating its own confidence LOW holds it back (claims it merely
//      listed are logged, never block);
//   2. the content rules (lib/labs.ts labContentProblems) reject a malformed lab;
//   3. an independent fast-model check reads the whole lab -- scenario, steps,
//      criteria and reference answers -- and holds it back when it finds a
//      reference answer wrong, something unsafe, or a step that depends on the
//      learner's earlier answer. Claims it could not confirm are logged only.
// A held lab is written once more, steered with what held the first one back;
// held twice, it is logged and the operator is told why in plain words
// (describeSaveOutcome). A checker CALL that fails says nothing about the lab:
// no holdback row, the outcome is retryable. A lab that passes is stored as
// source 'generated', review_status 'needs_expert_review': like the authored
// pilot it is not served in production until a person approves it
// (lib/labs.ts servedReviewStatuses).

const SAFETY: Record<LabSafetyFamily, string> = {
  clinical:
    "Every patient, family and setting is fictional. Write it as exam practice, never as clinical guidance, and never ask the learner about a real patient. Use conservative, widely taught practice; where guidelines vary by institution, frame the step so the answer does not depend on one local protocol. Prefer generic drug classes and avoid exact doses unless the step is a calculation with every number given.",
  fitness:
    "Every client is fictional. Write it as exam practice, never as exercise, nutrition or medical advice for a real person, and never ask the learner to program for their own clients. Put screening, referral and scope of practice first; no diagnosis, treatment or diet prescription.",
  general:
    "Every organisation and person is fictional. Never ask for real credentials, account numbers or company data.",
};

export const labGenerationSchema = z.object({
  title: z.string().describe("Short lab title naming the skill, 4-12 words."),
  brief: z.string().describe("The fictional situation, 60-200 words, with every fact the learner needs."),
  safetyNote: z.string().describe("One sentence of safety framing shown with the lab, or an empty string when none is needed."),
  steps: z
    .array(
      z.object({
        text: z.string().describe("For a case: the NEW information revealed at this step (empty for a build lab's single step)."),
        ask: z.string().describe("What the learner must decide or produce at this step."),
        parts: z
          .array(
            z.object({
              label: z.string().describe("Short label for one answer field, e.g. 'Priority action'."),
              criteria: z.string().describe("What a met answer must contain, specific enough to grade."),
              modelAnswer: z.string().describe("One good answer that meets the criteria."),
            })
          )
          .describe("2-4 rubric parts, one answer field each."),
      })
    )
    .describe("A build lab: exactly one step. A case: 2-4 steps whose text never depends on what the learner wrote."),
  ...uncertaintySchemaFields,
});
export type GeneratedLab = z.infer<typeof labGenerationSchema>;

export function labGenerationPrompt(params: {
  trackTitle: string;
  unitTitle: string;
  objectiveTitle: string;
  kind: LabKind;
  family: LabSafetyFamily;
  ctx?: CoachContext;
  // REQ-216: what held the previous draft back, for the one steered retry
  steer?: string | null;
}): { system: SystemPrompt; user: string } {
  const shape =
    params.kind === "build"
      ? `a BUILD lab: the learner produces one professional artifact the exam expects them to be able to produce
(a policy, plan, schedule, calculation, care plan, program). Exactly one step; its "text" is empty and its
"ask" names the artifact. 2-4 rubric parts, each one field of the artifact.`
      : `a CASE lab: an unfolding case in 2-4 steps. Each step's "text" reveals new information that follows the
story whatever the learner answered before (fixed branching: never "if you chose X"). Each step asks for a
decision (prioritise, act, re-assess, escalate), with 1-3 rubric parts.`;
  const system = systemWithRules(
    `You write one hands-on lab for a certification exam's objective: ${shape}
Test the skill the exam actually tests by doing, at the exam's level. The criteria must be specific enough
that two graders would agree; the reference answer must meet its own criteria. ${SAFETY[params.family]}`,
    params.ctx
  );
  const user = `Track: ${params.trackTitle}
Unit: ${params.unitTitle}
Objective: ${params.objectiveTitle}${params.steer ? `\n\n${params.steer}` : ""}

Produce ONLY a JSON object, no markdown fence:
{
  "title": "short lab title",
  "brief": "the fictional situation",
  "safetyNote": "one sentence, or empty",
  "steps": [{ "text": "...", "ask": "...", "parts": [{ "label": "...", "criteria": "...", "modelAnswer": "..." }] }],
  ${UNCERTAINTY_JSON}
}`;
  return { system, user };
}

export function toLabContent(g: GeneratedLab, kind: LabKind): LabContent {
  return {
    kind,
    title: g.title.trim(),
    brief: g.brief.trim(),
    safetyNote: g.safetyNote?.trim() ? g.safetyNote.trim() : null,
    steps: g.steps.map((s) => ({ text: (s.text ?? "").trim(), ask: s.ask.trim() })),
    rubric: g.steps.map((s) => ({
      parts: s.parts.map((p) => ({ label: p.label.trim(), criteria: p.criteria.trim(), modelAnswer: p.modelAnswer.trim() })),
    })),
  };
}

// ---------------------------------------------------------------------------
// The independent check (fail closed)
// ---------------------------------------------------------------------------

export const labCheckSchema = z.object({
  referenceAnswersCorrect: z.boolean().describe("true only if every reference answer is correct and current for this exam and meets its criteria."),
  safe: z.boolean().describe("true only if nothing in the lab would be unsafe advice if a learner acted on it, and nothing asks about a real person."),
  problems: z.array(z.string()).describe("Each wrong reference answer, unsafe instruction or step that depends on the learner's earlier answer."),
  unsupportedClaims: z.array(z.string()).describe("Each specific claim you cannot support for this exam version."),
});
export type LabCheckOutput = z.infer<typeof labCheckSchema>;

export interface LabCheckVerdict {
  publish: boolean;
  reasons: string[];
}

export function judgeLabCheck(out: Partial<LabCheckOutput> | null | undefined): LabCheckVerdict {
  if (!out) return { publish: false, reasons: ["no check result"] };
  const reasons = [
    ...(out.referenceAnswersCorrect === true ? [] : ["a reference answer was judged wrong"]),
    ...(out.safe === true ? [] : ["judged unsafe"]),
    ...(Array.isArray(out.problems) ? out.problems.filter((p) => typeof p === "string" && p.trim()) : []),
    ...(Array.isArray(out.unsupportedClaims) ? out.unsupportedClaims.filter((p) => typeof p === "string" && p.trim()) : []),
  ];
  return { publish: reasons.length === 0, reasons };
}

// REQ-216: the gate's reading of the checker. It disagrees with the lab when it
// says a reference answer is wrong, something is unsafe, or lists a problem; what
// it merely could not support is carried as unsupportedClaims (logged, not held).
// A reply missing either verdict is not a verdict at all: 'missing', retryable.
export function labCheckVerdict(out: Partial<LabCheckOutput> | null | undefined, key = "lab"): CheckVerdict {
  const unsupported = Array.isArray(out?.unsupportedClaims)
    ? out!.unsupportedClaims.filter((p): p is string => typeof p === "string" && p.trim() !== "").map((p) => p.trim())
    : [];
  if (!out || typeof out.referenceAnswersCorrect !== "boolean" || typeof out.safe !== "boolean") {
    return { key, publish: false, answer: null, unsupportedClaims: [], outcome: "missing" };
  }
  const problems = [
    ...(out.referenceAnswersCorrect ? [] : ["a reference answer was judged wrong"]),
    ...(out.safe ? [] : ["judged unsafe"]),
    ...(Array.isArray(out.problems) ? out.problems.filter((p): p is string => typeof p === "string" && p.trim() !== "").map((p) => p.trim()) : []),
  ];
  if (problems.length) return { key, publish: false, answer: [], unsupportedClaims: problems, outcome: "disagree" };
  return { key, publish: unsupported.length === 0, answer: [], unsupportedClaims: unsupported, outcome: unsupported.length ? "unsupported" : "agree" };
}

export function labCheckPrompt(lab: LabContent, objectiveTitle: string, ctx?: CoachContext): { system: SystemPrompt; user: string } {
  const system = systemWithRules(
    `You are an independent subject-matter checker. You did not write this lab. Read it as an examiner would:
is every reference answer correct and current for this exam, does it meet its own criteria, is anything unsafe
if a learner acted on it, and does any step's text depend on what the learner answered before? Report every
problem; when in doubt, report it.`,
    ctx
  );
  const steps = lab.steps
    .map(
      (s, i) =>
        `Step ${i + 1}: ${s.text}\n  Asked: ${s.ask}\n` +
        lab.rubric[i].parts.map((p) => `  - ${p.label}\n    Criteria: ${p.criteria}\n    Reference answer: ${p.modelAnswer}`).join("\n")
    )
    .join("\n");
  const user = `Objective: ${objectiveTitle}
Lab (${lab.kind}): ${lab.title}
Situation: ${lab.brief}
${steps}

Produce ONLY a JSON object, no markdown fence:
{ "referenceAnswersCorrect": true | false, "safe": true | false, "problems": ["..."], "unsupportedClaims": ["..."] }`;
  return { system, user };
}

export type LabChecker = (lab: LabContent, meta: { objectiveTitle: string; ctx?: CoachContext }) => Promise<LabCheckOutput>;

export const modelLabChecker: LabChecker = async (lab, meta) => {
  const { system, user } = labCheckPrompt(lab, meta.objectiveTitle, meta.ctx);
  return callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: labCheckSchema,
    maxTokens: 800,
    model: getFastModel(),
    effort: "high",
    thinking: "off",
    purpose: "lab_fact_check",
    // Run by scripts/generate-labs.ts (an operator), never for a learner.
    userId: null,
  });
};

export type SaveOutcome = "saved" | "exists" | "held_uncertain" | "held_invalid" | "held_check" | "held_check_error";

// What the operator reads for an outcome (scripts/generate-labs.ts). Labs have no
// learner request path -- they are written offline -- so the REQ-216 "tell them
// why" is this sentence. 'held_check_error' is retryable and is not a verdict.
export const SAVE_OUTCOME_TEXT: Record<SaveOutcome, string> = {
  saved: "stored (needs_expert_review)",
  exists: "an identical lab is already on the objective",
  held_uncertain: "held back twice: the writer rated its own confidence low",
  held_invalid: "held back twice: the lab broke a content rule",
  held_check: "held back twice: the independent check found a wrong reference answer, something unsafe, or a step that depends on an earlier answer",
  held_check_error: "not stored, retryable: the independent check could not run (nothing was held back; run --collect again)",
};

export const describeSaveOutcome = (o: SaveOutcome): string => SAVE_OUTCOME_TEXT[o];

// A thrown or unusable checker call is retryable and not a verdict on the lab.
export const isRetryableOutcome = (o: SaveOutcome): boolean => o === "held_check_error";

// The one steered retry: a live (non-batch) writer for one objective. Used only
// by scripts/generate-labs.ts after the batch's draft was held.
export function modelLabWriter(params: {
  trackTitle: string;
  unitTitle: string;
  objectiveTitle: string;
  kind: LabKind;
  family: LabSafetyFamily;
  ctx?: CoachContext;
}): (steer: string | null) => Promise<GeneratedLab> {
  return async (steer) => {
    const { system, user } = labGenerationPrompt({ ...params, steer });
    return callClaudeStructured({
      system,
      messages: [{ role: "user", content: user }],
      schema: labGenerationSchema,
      maxTokens: 4000,
      effort: "medium",
      thinking: "off",
      purpose: "lab_generate",
      // Run by scripts/generate-labs.ts (an operator), never for a learner.
      userId: null,
    });
  };
}

// Stores one generated lab after the gates above, or logs why not
// (item_holdbacks, kind 'lab'). Never replaces a lab already on the
// objective with the same content. `regenerate` writes the one steered retry; without it
// a held lab is held after the first draft.
export async function saveGeneratedLab(params: {
  objectiveId: string;
  kind: LabKind;
  generated: GeneratedLab;
  model: string;
  sources?: string[];
  ctx?: CoachContext;
  checker?: LabChecker;
  regenerate?: (steer: string | null) => Promise<GeneratedLab>;
}): Promise<SaveOutcome> {
  const obj = await queryOne<{ title: string }>(`select title from objectives where id = $1`, [params.objectiveId]);
  if (!obj) return "held_invalid";
  const toContent = (g: GeneratedLab) => toLabContent(g, params.kind);
  let content: LabContent;
  try {
    const gated = await generateGated<GeneratedLab>({
      kind: "lab",
      objectiveId: params.objectiveId,
      model: params.model,
      subject: "lab",
      attempts: params.regenerate ? undefined : 1,
      generate: async (steer) => (steer === null || !params.regenerate ? params.generated : params.regenerate(steer)),
      uncertainty: (g) => g,
      problemsOf: (g) => labContentProblems(toContent(g)),
      check: factCheckEnabled()
        ? async (g): Promise<GateCheckResult> => {
            try {
              const out = await (params.checker ?? modelLabChecker)(toContent(g), { objectiveTitle: obj.title, ctx: params.ctx });
              return { verdict: labCheckVerdict(out), error: null };
            } catch (err) {
              return { verdict: undefined, error: (err as Error).message ?? "check failed" };
            }
          }
        : undefined,
      content: (g, verdict) => ({ lab: g, checker: verdict }),
    });
    content = toContent(gated);
  } catch (err) {
    if (err instanceof HeldForAccuracyError) {
      return err.reasons.includes("disagree") ? "held_check" : err.reasons.includes("invalid") ? "held_invalid" : "held_uncertain";
    }
    if (err instanceof FactCheckUnavailableError) return "held_check_error";
    throw err;
  }
  const hash = labContentHash(content);
  const rows = await query<{ id: string }>(
    `insert into labs (objective_id, slug, kind, title, brief, steps, rubric, safety_note, sources, source, review_status, content_hash, model)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'generated', 'needs_expert_review', $10, $11)
     on conflict (objective_id, slug) do nothing returning id`,
    [
      params.objectiveId,
      `gen-${hash.slice(0, 12)}`,
      content.kind,
      content.title,
      content.brief,
      JSON.stringify(content.steps),
      JSON.stringify(content.rubric),
      content.safetyNote ?? null,
      JSON.stringify(params.sources ?? []),
      hash,
      params.model,
    ]
  );
  return rows.length ? "saved" : "exists";
}
