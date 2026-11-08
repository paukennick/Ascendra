// REQ-113 (Audit 3 mobile L3): the coverage list flattened into rows a
// virtualised list can render a screenful at a time: a course heading, a unit
// heading, then one row per objective, in the server's order.
import type { TermCoverage } from "@/types";

export type CoverageRow =
  | { kind: "track"; key: string; title: string }
  | { kind: "unit"; key: string; title: string }
  | { kind: "objective"; key: string; objective: TermCoverage; percent: number };

export function coverageRows(rows: TermCoverage[]): CoverageRow[] {
  const out: CoverageRow[] = [];
  rows.forEach((r, i) => {
    const newTrack = i === 0 || rows[i - 1].trackTitle !== r.trackTitle;
    const newUnit = newTrack || rows[i - 1].unitTitle !== r.unitTitle;
    if (newTrack) out.push({ kind: "track", key: `t:${i}:${r.trackTitle}`, title: r.trackTitle });
    if (newUnit) out.push({ kind: "unit", key: `u:${i}:${r.unitTitle}`, title: r.unitTitle });
    const covered = r.terms.filter((t) => t.covered).length;
    out.push({
      kind: "objective",
      key: `o:${r.objectiveId}`,
      objective: r,
      percent: r.terms.length ? (100 * covered) / r.terms.length : 0,
    });
  });
  return out;
}
