// REQ-230 (docs/sims.md 12.2): the generator's duplicate check. Nick's rule
// is breadth before variants, so a draft that is too close to a sim the same
// objective already has is rejected rather than registered as a second copy.
//
// The measure is deliberately simple, so a person can recompute it by hand:
//
//   story      the case as told: title, situation and handover, lowercased,
//              cut into overlapping three-word runs ("shingles"). Two
//              retellings of the same patient share most of their runs.
//   decisions  what the learner can do: the content words (four letters or
//              more, common words removed) of every action label and every
//              ending label. A variant that renames the patient but keeps the
//              same moves shares most of these.
//
// Each is a Jaccard index (shared / either, 0 to 1). The similarity is the
// HIGHER of the two, so a draft is caught whether it reuses the story or the
// moves. At or above DUPLICATE_THRESHOLD it is a duplicate. The threshold was
// set from the seeded documents (lib/sim/generator/generator.test.ts prints
// and pins the highest pair): different cases sit far below it, a copy with a
// new slug sits at 1.
import type { ScenarioDoc } from "../engine/v1/types.ts";

export const DUPLICATE_THRESHOLD = 0.5;

const STOP = new Set(
  "with from that this then than they them their there what when where which while your into onto over under after before about again more most only also each every some such very just been have were will would could should does done make made take give given lets".split(" ")
);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function storyShingles(doc: Pick<ScenarioDoc, "title" | "brief">): Set<string> {
  const w = words([doc.title, doc.brief?.situation ?? "", ...(doc.brief?.handover ?? [])].join(" "));
  const out = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return out;
}

export function decisionWords(doc: Pick<ScenarioDoc, "actions" | "endings">): Set<string> {
  const labels = [...Object.values(doc.actions ?? {}).map((a) => a.label ?? ""), ...Object.values(doc.endings ?? {}).map((e) => e.label ?? "")];
  return new Set(words(labels.join(" ")).filter((x) => x.length >= 4 && !STOP.has(x)));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return shared / (a.size + b.size - shared);
}

export interface Similarity {
  story: number;
  decisions: number;
  // The story alone, or the mean of story and decisions, whichever is higher:
  // a copied story is a duplicate; shared decisions alone are not, since a
  // variant (same skill, different patient or system) shares its decisions
  // by design (FAIL-1302).
  score: number;
}

export function similarity(a: ScenarioDoc, b: ScenarioDoc): Similarity {
  const story = jaccard(storyShingles(a), storyShingles(b));
  const decisions = jaccard(decisionWords(a), decisionWords(b));
  return { story, decisions, score: Math.max(story, (story + decisions) / 2) };
}

export interface DuplicateHit {
  against: string; // course/slug or a draft's path
  similarity: Similarity;
}

// The existing sims on the same objective that the draft is too close to.
export function duplicatesOf(draft: ScenarioDoc, existing: { label: string; doc: ScenarioDoc }[], threshold = DUPLICATE_THRESHOLD): DuplicateHit[] {
  return existing
    .filter((e) => e.doc.objective === draft.objective)
    .map((e) => ({ against: e.label, similarity: similarity(draft, e.doc) }))
    .filter((h) => h.similarity.score >= threshold);
}
