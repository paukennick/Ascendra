// REQ-230 (docs/sims.md 12.2): the independent fact check of a generated
// sim. The claims are taken from the document by code, never chosen by the
// writer: every sourced number (params, timers, outcome thresholds), the
// no-progress rule, each terminal ending's class, and the expert path. A
// separate call (no shared context with the writer) answers each claim
// agree / disagree / unsure. REQ-187: the checker is the writer's model,
// never a weaker one.
//
// What a verdict means (the REQ-216 rule, lib/fact-check.ts):
//   disagree   the claim is wrong, outdated or unsafe: the draft is HELD
//              (retried once, steered with the claims, then held)
//   unsure     logged in the report, never blocking
//   missing    the checker skipped a claim or the call failed: the check did
//              not run. That is not a verdict on the draft; the call is
//              tried once more, then the draft is held as "check did not
//              run", to be rerun -- never registered unchecked.
import { z } from "zod";
import type { ScenarioDoc, Source } from "../engine/v1/types.ts";
import type { ObjectiveContext } from "./course.ts";

export interface Claim {
  key: string;
  text: string;
}

function cite(s: Source | undefined): string {
  if (!s) return "no source given";
  return `${s.cite}${s.url ? ` <${s.url}>` : ""}, checked ${s.checkedAt}${s.note ? `; note: ${s.note}` : ""}`;
}

export function claimsOf(doc: ScenarioDoc): Claim[] {
  const out: Claim[] = [];
  for (const [k, p] of Object.entries(doc.params ?? {})) {
    if (typeof p.value !== "number" || !p.source) continue;
    out.push({ key: `param.${k}`, text: `${k} = ${p.value}${p.unit ? ` ${p.unit}` : ""}. Source: ${cite(p.source)}` });
  }
  for (const [k, t] of Object.entries(doc.timers ?? {})) {
    // The delay is set where the timer is scheduled (an effect's `after`); the timer carries its label and source.
    out.push({ key: `timer.${k}`, text: `Timer ${k} ("${t.label}"), the delay it stands for is as its source says. Source: ${cite(t.source)}` });
  }
  for (const [k, t] of Object.entries(doc.outcome?.thresholds ?? {})) out.push({ key: `threshold.${k}`, text: `Outcome threshold ${k} = ${t.value}. Source: ${cite(t.source)}` });
  if (doc.outcome?.noProgress) out.push({ key: "noProgress", text: `Safe but no progress (${doc.outcome.noProgress.when}) is classed ${doc.outcome.noProgress.class}: ${doc.outcome.noProgress.rationale}. Source: ${cite(doc.outcome.noProgress.source)}` });
  for (const [k, e] of Object.entries(doc.endings ?? {})) {
    if (!e.terminal || !e.class) continue;
    out.push({ key: `ending.${k}`, text: `Ending "${e.label}" is classed ${e.class} (target = the right outcome, recovered = late or partial, harm = the person comes to foreseeable harm)${e.when ? `; reached when ${e.when}` : ""}` });
  }
  const expert = (doc.scoring?.expertPath ?? []).map((s) => `${s.at}: ${s.text}`).join(" | ");
  if (expert) out.push({ key: "expertPath", text: `The expert path (what a strong candidate does, in order) is correct, current and safe: ${expert}` });
  return out;
}

export const checkerReplySchema = z.object({
  results: z.array(
    z.object({
      key: z.string(),
      verdict: z.enum(["agree", "disagree", "unsure"]),
      reason: z.string(),
    })
  ),
});
export type CheckerReply = z.infer<typeof checkerReplySchema>;

export function checkerPrompt(doc: ScenarioDoc, ctx: ObjectiveContext, claims: Claim[]): { system: string; user: string } {
  const system = [
    "You are an independent expert fact-checker for exam-preparation simulations. You did not write this scenario.",
    "For each numbered claim, answer agree, disagree or unsure, with a one-sentence reason.",
    "disagree: the claim is wrong, outdated against current guidance or the exam outline, unsafe, or the source does not say it.",
    "agree: you are confident it is right and current. unsure: you cannot confirm it either way. Never guess agree.",
    "The people in the scenario are fictional. Judge the facts, the outcome classes and the expert path, not the writing.",
    'Reply with only JSON: {"results":[{"key":"<the claim key, copied exactly>","verdict":"agree"|"disagree"|"unsure","reason":"..."}]}, one result per claim.',
  ].join("\n");
  const own = ctx.courseSources.map((s) => `- ${s.title} <${s.url}>${s.checkedAt ? ` (checked ${s.checkedAt})` : ""}${s.keyValues.length ? `; values the course uses: ${s.keyValues.join("; ")}` : ""}`).join("\n");
  const user = [
    `Course: ${ctx.courseTitle} (${ctx.course}). Unit: ${ctx.unitTitle}. Objective: ${ctx.objective}.`,
    `Scenario: ${doc.title}. ${doc.brief?.situation ?? ""}`,
    own ? `The course's own sources:\n${own}` : "",
    `Claims:\n${claims.map((c) => `[${c.key}] ${c.text}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { system, user };
}

export interface CheckOutcome {
  status: "agree" | "disagree" | "unchecked";
  disagreements: string[]; // "key: reason", what steers the retry
  unsure: string[]; // logged
  missing: string[]; // claim keys with no result
}

export function judgeCheck(claims: Claim[], reply: CheckerReply | null): CheckOutcome {
  if (!reply) return { status: "unchecked", disagreements: [], unsure: [], missing: claims.map((c) => c.key) };
  const by = new Map(reply.results.map((r) => [r.key, r]));
  const disagreements: string[] = [];
  const unsure: string[] = [];
  const missing: string[] = [];
  for (const c of claims) {
    const r = by.get(c.key);
    if (!r) missing.push(c.key);
    else if (r.verdict === "disagree") disagreements.push(`${c.key}: ${r.reason}`);
    else if (r.verdict === "unsure") unsure.push(`${c.key}: ${r.reason}`);
  }
  if (disagreements.length) return { status: "disagree", disagreements, unsure, missing };
  if (missing.length) return { status: "unchecked", disagreements, unsure, missing };
  return { status: "agree", disagreements, unsure, missing };
}

export function parseCheckerReply(text: string): CheckerReply | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const r = checkerReplySchema.safeParse(JSON.parse(cleaned));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
