import { UserFacingError } from "@/lib/http";
import { lowConfidenceOf, noteListedClaims, recordHoldback, type HoldbackInput, type UncertaintyFields } from "@/lib/item-quality";
import { verdictClaims, verdictHolds, verdictUnchecked, type CheckVerdict } from "@/lib/fact-check";

// REQ-216 (H2): one rule for every generated learner-facing item.
//
//   Held back   the writer rated its own confidence LOW, or the independent
//               fact-check answered differently from the key. Logged in
//               item_holdbacks; written once more, steered with the first
//               attempt's claims; if the retry is held too, the learner is told
//               why, in plain words, with a 409 (the app hides a 5xx).
//   Logged      claims the writer merely listed ("this scenario is invented",
//               "may differ by version") and claims the checker could not
//               confirm while agreeing with the key. They go in the log line,
//               never block. Production had 3 of 9 lesson intros, 4 of 4
//               comparison cards and 4 of 4 PBQs held for these.
//   Retryable   the fact-check CALL failed (provider error, unusable reply).
//               That says nothing about the item: nothing is logged as a
//               holdback, no cooldown starts, the learner is told to try again.

export const GATE_ATTEMPTS = 2;

export type HoldReason = "uncertain" | "disagree";

// The words a learner reads when an item was held back, naming the reason.
export function reasonPhrase(reasons: Iterable<HoldReason>): string {
  const set = new Set(reasons);
  return set.has("uncertain") && set.has("disagree")
    ? "the writer wasn't sure it had the facts right and a second check picked a different answer"
    : set.has("disagree")
      ? "a second check picked a different answer from the one it was written with"
      : "the writer wasn't confident it had the facts right";
}

export function heldMessage(subject: string, reasons: Iterable<HoldReason>): string {
  return `We wrote a ${subject} but didn't use it: ${reasonPhrase(reasons)}. Nothing was counted against you. Please try again for a fresh one.`;
}

export class HeldForAccuracyError extends UserFacingError {
  constructor(subject: string, reasons: Iterable<HoldReason>) {
    super(heldMessage(subject, reasons), 409, { held: true, retryable: true });
    this.name = "HeldForAccuracyError";
  }
}

export function checkUnavailableMessage(subject: string): string {
  return `We couldn't double-check this ${subject} just now, so we didn't use it. Nothing was counted against you. Please try again in a moment.`;
}

// The fact-check call failed. Not a verdict on the content (see the header).
export class FactCheckUnavailableError extends UserFacingError {
  constructor(subject: string) {
    super(checkUnavailableMessage(subject), 409, { retryable: true });
    this.name = "FactCheckUnavailableError";
  }
}

// The steer a retry is handed: what held the first attempt back.
export function steerText(claims: string[]): string {
  const list = claims.slice(0, 8).map((c) => `- ${c.slice(0, 300)}`).join("\n");
  return `A previous draft was not used because of these claims. Leave each out, or state plainly that it may differ for this exam version, and make sure there is exactly one defensible answer:\n${list}`;
}

export interface GateCheckResult {
  verdict: CheckVerdict | undefined;
  // set when the call itself failed (factCheckGate's `error`)
  error: string | null;
}

// Generates one item, holds it back on low confidence or a disagreeing
// fact-check, regenerates once steered with the claims, and throws a 4xx the
// learner can read when it is held twice. `check` is absent for items with no
// key (a PBQ or unit-check scenario, graded holistically).
export async function generateGated<T>(o: {
  kind: HoldbackInput["kind"];
  objectiveId?: string | null;
  unitId?: string | null;
  trackId?: string | null;
  model: string;
  // "question", "scenario" ... used in the learner's sentence
  subject: string;
  generate: (steer: string | null) => Promise<T>;
  uncertainty: (t: T) => UncertaintyFields;
  check?: (t: T) => Promise<GateCheckResult>;
  content?: (t: T, verdict: CheckVerdict | undefined) => unknown;
  attempts?: number;
}): Promise<T> {
  const attempts = o.attempts ?? GATE_ATTEMPTS;
  const reasons = new Set<HoldReason>();
  let steer: string | null = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const made = await o.generate(steer);
    const label = `${o.kind} (${o.objectiveId ?? o.unitId ?? o.trackId ?? "-"})`;
    const low = lowConfidenceOf(o.uncertainty(made));
    if (low) {
      reasons.add("uncertain");
      await recordHoldback({ kind: o.kind, objectiveId: o.objectiveId, unitId: o.unitId, trackId: o.trackId, reason: "uncertain", claims: low, content: made, model: o.model });
      steer = steerText(low);
      continue;
    }
    if (o.check) {
      const res = await o.check(made);
      if (res.error || verdictUnchecked(res.verdict)) {
        // eslint-disable-next-line no-console
        console.warn(`[generation-gate] fact-check did not run for ${label}: ${res.error ?? "no result"}`);
        throw new FactCheckUnavailableError(o.subject);
      }
      if (verdictHolds(res.verdict)) {
        reasons.add("disagree");
        const claims = verdictClaims(res.verdict);
        await recordHoldback({
          kind: o.kind,
          objectiveId: o.objectiveId,
          unitId: o.unitId,
          trackId: o.trackId,
          reason: "fact_check",
          claims,
          content: o.content ? o.content(made, res.verdict) : { item: made, checker: res.verdict },
          model: o.model,
        });
        steer = steerText(claims);
        continue;
      }
      if (res.verdict && res.verdict.unsupportedClaims.length) {
        // eslint-disable-next-line no-console
        console.warn(`[item-quality] ${label} agreed with the key; checker could not confirm: ${res.verdict.unsupportedClaims.join(" | ").slice(0, 500)}`);
      }
    }
    noteListedClaims(label, o.uncertainty(made));
    return made;
  }
  throw new HeldForAccuracyError(o.subject, reasons);
}
