// REQ-111: pure logic for the deep-understanding features (comparison
// cards, explain-it-back, misconception diagnosis, prerequisite refreshers).
// No database and no model here, so all of it is unit tested
// (lib/understanding.test.ts). Storage is lib/understanding-store.ts; model
// calls are lib/understanding-ai.ts.

export type MasteryStatus =
  | "Not started"
  | "Introduced"
  | "Guided"
  | "Independent"
  | "Transfer-ready"
  | "Needs review";

// Explain-it-back opens once an objective has real credit: Guided or above.
// Needs review is left out on purpose -- a re-explanation is offered again
// once the learner is back at Guided, not while the last answer was a miss.
export function isGuidedPlus(status: string | null | undefined): boolean {
  return status === "Guided" || status === "Independent" || status === "Transfer-ready";
}

// A prerequisite is "weak" when the learner has no credited evidence on it:
// never studied, only introduced, or currently needing review.
export function isWeakPrerequisite(status: string | null | undefined): boolean {
  return !status || status === "Not started" || status === "Introduced" || status === "Needs review";
}

// The explain-it-back prompt is fixed per objective, so a second explanation
// is recognisably the same item (the repeat rule keys on the question text).
export function explainBackQuestion(objectiveTitle: string): string {
  return `Explain "${objectiveTitle}" in your own words to someone who is new to it: what it is, why it matters, and how you would recognise it.`;
}

// Same-sitting re-explanations count as repeats (the feedback just named the
// gaps); one a day or more later is spaced retrieval and counts in full.
export const EXPLAIN_BACK_REPEAT_WINDOW_HOURS = 24;

// --- Concept names ------------------------------------------------------------

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

// One key per group of concepts, whatever order the model listed them in.
export function setKey(names: string[]): string {
  return names.map(normalizeName).sort().join(" | ");
}

export interface ConceptMember {
  setId: string;
  position: number;
  name: string;
  aliases: string[];
  objectiveId: string | null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Does `text` name this concept? Whole words only. A short all-caps alias
// (MAC, SNS) must match case-sensitively, so "mac" in "machine" or a lower
// case "sns" in prose does not count; longer names match in any case.
export function namesConcept(text: string, member: Pick<ConceptMember, "name" | "aliases">): boolean {
  const terms = [member.name, ...member.aliases].map((t) => t.trim()).filter((t) => t.length >= 2);
  for (const term of terms) {
    const acronym = /^[A-Z0-9][A-Z0-9-]{1,7}$/.test(term);
    const re = new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(term)}($|[^A-Za-z0-9])`, acronym ? "" : "i");
    if (re.test(text)) return true;
  }
  return false;
}

// The members `text` names. A text naming several concepts of one set (an
// option like "RBAC instead of MAC") is ambiguous and returns all of them.
export function conceptsNamed(text: string, members: ConceptMember[]): ConceptMember[] {
  return members.filter((m) => namesConcept(text, m));
}

// --- Diagnosing a missed multiple-choice answer (no model call) -------------------

export interface McDiagnosisInput {
  objectiveTitle: string;
  picked: string;
  correct: string;
  // The lesson's reason for the picked option, where the lesson has per-option
  // reasons (feat/lesson-experience); null otherwise.
  pickedReason?: string | null;
  // Members of every comparison set that touches this objective.
  members: ConceptMember[];
}

export interface Diagnosis {
  source: "mc_option" | "option_reason" | "concept_match" | "grader";
  tag: string;
  sentence: string;
  confusedWith: string | null;
  confusedWithObjectiveId: string | null;
  conceptSetId: string | null;
}

const MAX_TAG = 120;
const MAX_SENTENCE = 300;

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

function firstSentence(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  const m = t.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : t;
}

// One sentence naming the likely misconception behind a wrong pick, in order
// of how specific the evidence is:
//   1. the option names a sibling concept from a comparison set and the right
//      answer names a different one -> "You may be mixing up X with Y."
//   2. the lesson has a reason for that option -> that reason, framed kindly.
//   3. otherwise the pick itself, framed as a near miss.
export function diagnoseMcMiss(input: McDiagnosisInput): Diagnosis {
  const pickedConcepts = conceptsNamed(input.picked, input.members);
  const correctConcepts = conceptsNamed(input.correct, input.members);
  if (pickedConcepts.length === 1) {
    const wrong = pickedConcepts[0];
    const right = correctConcepts.find((c) => c.setId === wrong.setId && c.position !== wrong.position);
    if (right || correctConcepts.length === 0) {
      const rightName = right?.name ?? null;
      const sentence = rightName
        ? `You may be mixing up ${wrong.name} with ${rightName} — they look alike, but this scenario fits ${rightName}.`
        : `You may be mixing up ${wrong.name} with the idea this question is about.`;
      return {
        source: "concept_match",
        tag: clip(rightName ? `confused ${rightName} with ${wrong.name}` : `picked ${wrong.name}`, MAX_TAG),
        sentence: clip(sentence, MAX_SENTENCE),
        confusedWith: wrong.name,
        confusedWithObjectiveId: wrong.objectiveId,
        conceptSetId: wrong.setId,
      };
    }
  }
  if (input.pickedReason && input.pickedReason.trim()) {
    return {
      source: "option_reason",
      tag: clip(`picked: ${input.picked}`, MAX_TAG),
      sentence: clip(`Likely mix-up: ${firstSentence(input.pickedReason)}`, MAX_SENTENCE),
      confusedWith: clip(input.picked, MAX_TAG),
      confusedWithObjectiveId: null,
      conceptSetId: null,
    };
  }
  return {
    source: "mc_option",
    tag: clip(`picked: ${input.picked}`, MAX_TAG),
    sentence: clip(
      `"${clip(input.picked, 80)}" is a common near miss here — compare it with the right answer to see what sets them apart.`,
      MAX_SENTENCE
    ),
    confusedWith: clip(input.picked, MAX_TAG),
    confusedWithObjectiveId: null,
    conceptSetId: null,
  };
}

// The free-response grader's tag, cleaned for storage. Returns null when the
// grader found no misconception (blank, "none", or a correct answer).
export function graderDiagnosis(
  misconception: string | null | undefined,
  confusedWith: string | null | undefined,
  members: ConceptMember[]
): Diagnosis | null {
  const m = (misconception ?? "").trim();
  if (!m || /^(none|n\/a|no misconception)\.?$/i.test(m)) return null;
  const cw = (confusedWith ?? "").trim();
  const match = cw ? conceptsNamed(cw, members)[0] ?? null : null;
  return {
    source: "grader",
    tag: clip(cw ? `confused with ${cw}` : m, MAX_TAG),
    sentence: clip(firstSentence(m), MAX_SENTENCE),
    confusedWith: cw ? clip(cw, MAX_TAG) : null,
    confusedWithObjectiveId: match?.objectiveId ?? null,
    conceptSetId: match?.setId ?? null,
  };
}

// --- Explain-it-back: copied text ---------------------------------------------------

function words(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

// Share (0-1) of the answer's 6-word runs that appear word for word in the
// teaching text. An explanation pasted from the lesson is not the learner's
// own words; it is graded, but as assisted ("reveal").
export function copiedShare(answer: string, teach: string, n = 6): number {
  const a = words(answer);
  if (a.length < n) return 0;
  const t = words(teach);
  const grams = new Set<string>();
  for (let i = 0; i + n <= t.length; i++) grams.add(t.slice(i, i + n).join(" "));
  let hit = 0;
  let total = 0;
  for (let i = 0; i + n <= a.length; i++) {
    total++;
    if (grams.has(a.slice(i, i + n).join(" "))) hit++;
  }
  return total ? hit / total : 0;
}

export const COPIED_SHARE_LIMIT = 0.5;

// --- Prerequisite refresher ------------------------------------------------------------

// About two minutes of reading (~200 words a minute), cut at a sentence end.
export const REFRESHER_WORDS = 400;

export function refresherExcerpt(teach: string, maxWords = REFRESHER_WORDS): { text: string; minutes: number; trimmed: boolean } {
  const clean = teach.replace(/\r/g, "").trim();
  const all = clean.split(/\s+/).filter(Boolean);
  if (all.length <= maxWords) {
    return { text: clean, minutes: Math.max(1, Math.round(all.length / 200)), trimmed: false };
  }
  // Walk sentence by sentence (keeping paragraph breaks) until the budget.
  const sentences = clean.match(/[^.!?\n]+[.!?]+["')\]]*\s*|[^.!?\n]+\n+|\n+|[^.!?\n]+$/g) ?? [clean];
  let out = "";
  let count = 0;
  for (const s of sentences) {
    const n = s.split(/\s+/).filter(Boolean).length;
    if (count + n > maxWords && count > 0) break;
    out += s;
    count += n;
  }
  if (!out.trim()) out = all.slice(0, maxWords).join(" ");
  return { text: out.trim(), minutes: Math.max(1, Math.round(Math.min(count || maxWords, maxWords) / 200)), trimmed: true };
}

// --- Validating generated course maps ---------------------------------------------------

export interface RawConceptSet {
  concepts: { name: string; aliases: string[]; objectiveNumber: number }[];
  dimensions: { dimension: string; values: string[] }[];
  howToTell: string;
  scenarios: { scenario: string; answerConcept: number; why: string }[];
}

export interface CleanConceptSet {
  key: string;
  concepts: { name: string; aliases: string[]; objectiveId: string | null }[];
  dimensions: { dimension: string; values: string[] }[];
  howToTell: string;
  scenarios: { scenario: string; answerPosition: number; why: string }[];
}

export const MAX_SETS_PER_COURSE = 12;

// Keeps only well-formed sets: 2-4 distinct concepts, 2-6 dimensions each with
// one value per concept, at least two scenarios whose answer is a real member,
// and a key not already used (by an earlier set here or one already stored).
// objectiveNumber is 1-based into `objectiveIds`; 0 or out of range = no
// objective (the concept is taught nowhere specific in this course).
export function cleanConceptSets(
  raw: RawConceptSet[],
  objectiveIds: string[],
  existingKeys: Set<string> = new Set()
): CleanConceptSet[] {
  const out: CleanConceptSet[] = [];
  const seen = new Set(existingKeys);
  for (const s of raw ?? []) {
    if (out.length >= MAX_SETS_PER_COURSE) break;
    const concepts = (s.concepts ?? [])
      .map((c) => ({
        name: String(c.name ?? "").trim().slice(0, 120),
        aliases: (Array.isArray(c.aliases) ? c.aliases : [])
          .map((a) => String(a).trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, 4),
        objectiveId:
          Number.isInteger(c.objectiveNumber) && c.objectiveNumber >= 1 && c.objectiveNumber <= objectiveIds.length
            ? objectiveIds[c.objectiveNumber - 1]
            : null,
      }))
      .filter((c) => c.name);
    const names = concepts.map((c) => normalizeName(c.name));
    if (concepts.length < 2 || concepts.length > 4 || new Set(names).size !== names.length) continue;
    // A set nobody in the course is taught has nothing to record evidence on.
    if (!concepts.some((c) => c.objectiveId)) continue;
    const dimensions = (s.dimensions ?? [])
      .filter((d) => d && String(d.dimension ?? "").trim() && Array.isArray(d.values) && d.values.length === concepts.length)
      .map((d) => ({ dimension: String(d.dimension).trim().slice(0, 80), values: d.values.map((v) => String(v).trim().slice(0, 240)) }))
      .slice(0, 6);
    if (dimensions.length < 2) continue;
    const scenarios = (s.scenarios ?? [])
      .filter(
        (q) =>
          q &&
          String(q.scenario ?? "").trim() &&
          Number.isInteger(q.answerConcept) &&
          q.answerConcept >= 0 &&
          q.answerConcept < concepts.length
      )
      .map((q) => ({
        scenario: String(q.scenario).trim().slice(0, 1200),
        answerPosition: q.answerConcept,
        why: String(q.why ?? "").trim().slice(0, 600),
      }))
      .slice(0, 6);
    if (scenarios.length < 2) continue;
    const key = setKey(concepts.map((c) => c.name));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, concepts, dimensions, howToTell: String(s.howToTell ?? "").trim().slice(0, 400), scenarios });
  }
  return out;
}

export interface PrereqEdge {
  objective: number; // index into the course's objective list (0-based)
  prerequisite: number;
}

export const MAX_PREREQS_PER_OBJECTIVE = 2;

// Drops self-edges, out-of-range indexes, duplicates, more than two
// prerequisites per objective, and any edge that would close a cycle (an
// objective can never, through a chain, be its own prerequisite). Edges are
// taken in the order given, so the model's first choices win.
export function cleanPrerequisites(edges: PrereqEdge[], count: number): PrereqEdge[] {
  const out: PrereqEdge[] = [];
  const deps = new Map<number, Set<number>>(); // objective -> its prerequisites
  const reaches = (from: number, to: number): boolean => {
    const stack = [from];
    const seen = new Set<number>();
    while (stack.length) {
      const n = stack.pop()!;
      if (n === to) return true;
      if (seen.has(n)) continue;
      seen.add(n);
      for (const d of deps.get(n) ?? []) stack.push(d);
    }
    return false;
  };
  for (const e of edges ?? []) {
    const o = e?.objective;
    const p = e?.prerequisite;
    if (!Number.isInteger(o) || !Number.isInteger(p) || o === p) continue;
    if (o < 0 || p < 0 || o >= count || p >= count) continue;
    const mine = deps.get(o) ?? new Set<number>();
    if (mine.has(p) || mine.size >= MAX_PREREQS_PER_OBJECTIVE) continue;
    // Adding o -> p closes a cycle if p already (transitively) depends on o.
    if (reaches(p, o)) continue;
    mine.add(p);
    deps.set(o, mine);
    out.push({ objective: o, prerequisite: p });
  }
  return out;
}

// Learned comparison sets: a confusion becomes a shared card once this many
// different learners in the course have shown it.
export const LEARNED_SET_MIN_LEARNERS = 3;
