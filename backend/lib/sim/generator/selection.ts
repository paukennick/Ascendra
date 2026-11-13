// REQ-230 (docs/sims.md 12.2): which sub-objectives of a course are worth a
// sim. Nick's selection rule: a sim earns its place when at least two of
// these hold for the objective --
//
//   time      time matters (things get worse, or a window closes)
//   cues      there are cues to read (findings, trends, signs, readings)
//   choices   choices have consequences (act, treat, intervene, decide)
//   priorities  priorities compete (what first, trade-offs, conflicting duties)
//
// This is a keyword screen over the objective's own title, which is all the
// catalog holds: free, repeatable, and it records WHY (the words that matched)
// so a person can overrule it. It is a shortlist for a person to confirm, not
// a judgement. Ranked by the unit's exam weight (higher first); objectives
// that already have a sim go last (breadth before variants).

import type { ObjectiveContext } from "./course.ts";

export type Criterion = "time" | "cues" | "choices" | "priorities";

export const CRITERIA_WORDS: Record<Criterion, string[]> = {
  time: ["acute", "emergenc", "early", "deteriorat", "shock", "arrest", "crisis", "rapid", "urgent", "within", "window", "hemorrhag", "bleed", "sepsis", "stroke", "incident", "outage", "failover", "recover", "escalat", "time", "suicid", "threat", "choking", "fall", "triage", "resuscitat", "overdose", "unstable"],
  cues: ["recogni", "assess", "interpret", "identify", "monitor", "detect", "signs", "symptom", "trend", "finding", "reading", "cue", "evaluat", "screen", "diagnos", "investigat", "troubleshoot", "alarm", "intake", "metric", "logs"],
  choices: ["manag", "treat", "interven", "respond", "decid", "select", "choose", "apply", "titrat", "administer", "implement", "plan", "deploy", "mitigat", "configure", "design", "remediat", "conduct", "stabiliz", "initiat", "protect"],
  priorities: ["prioritiz", "priorit", "balanc", "trade", "versus", "competing", "while", "multiple", "delegat", "allocat", "cost", "sequenc", "first", "duty", "duties", "conflict", "ethic", "consent", "confidential", "risk", "safety", "availability"],
};

export interface SelectionRow {
  objective: string;
  unitTitle: string;
  unitWeight: number | null;
  weightsAreExam: boolean;
  met: Criterion[];
  reason: string; // which words matched each criterion met
  qualifies: boolean;
  existingSims: string[];
}

function matches(title: string, words: string[]): string[] {
  const t = title.toLowerCase();
  return words.filter((w) => new RegExp(`\\b${w}`).test(t));
}

export function selectionFor(o: Pick<ObjectiveContext, "objective" | "unitTitle" | "unitWeight" | "weightsAreExam">, existingSims: string[] = []): SelectionRow {
  const met: Criterion[] = [];
  const why: string[] = [];
  for (const c of Object.keys(CRITERIA_WORDS) as Criterion[]) {
    const hit = matches(o.objective, CRITERIA_WORDS[c]);
    if (hit.length) {
      met.push(c);
      why.push(`${c} (${hit.map((h) => `"${h}"`).join(", ")})`);
    }
  }
  return {
    objective: o.objective,
    unitTitle: o.unitTitle,
    unitWeight: o.unitWeight,
    weightsAreExam: o.weightsAreExam,
    met,
    reason: met.length ? `${met.length} of 4: ${why.join("; ")}` : "0 of 4: no cue words in the title",
    qualifies: met.length >= 2,
    existingSims,
  };
}

// Qualifying objectives only, ranked: no sim yet before has a sim, then unit
// weight (higher first), then more criteria met, then course order.
export function rankSelection(objectives: ObjectiveContext[], simsByObjective: Map<string, string[]>): SelectionRow[] {
  return objectives
    .map((o, i) => ({ row: selectionFor(o, simsByObjective.get(o.objective) ?? []), i }))
    .filter((x) => x.row.qualifies)
    .sort(
      (a, b) =>
        Number(a.row.existingSims.length > 0) - Number(b.row.existingSims.length > 0) ||
        (b.row.unitWeight ?? -1) - (a.row.unitWeight ?? -1) ||
        b.row.met.length - a.row.met.length ||
        a.i - b.i
    )
    .map((x) => x.row);
}

export function formatSelection(rows: SelectionRow[]): string[] {
  return rows.map((r, n) => {
    const w = r.unitWeight == null ? "no weight" : r.weightsAreExam ? `${r.unitWeight}% of the exam` : `weight ${r.unitWeight} (study emphasis)`;
    const has = r.existingSims.length ? ` [has a sim: ${r.existingSims.join(", ")}; a new one would be a variant]` : "";
    return `${n + 1}. ${r.objective}\n   unit: ${r.unitTitle} (${w}); ${r.reason}${has}`;
  });
}
