// REQ-313 (docs/sims.md 22.19 proposal, 22.26): the governance board's view
// model, pure, like the console's. Everything is read from the document's
// `screen.governance` bindings over the run: the risk register (each risk
// with an owner, a rating and where it sits against the risk appetite), the
// stakeholders' support in words, the docket (policies, exceptions, business
// cases, board papers, decisions), the budget and the meters. The renderer
// holds no rule of its own.
import { renderTemplate } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import { evaluate } from "../engine/v1/eval.ts";
import { parseCached } from "../engine/v1/parser.ts";
import type { AppetiteTone, RiskRating } from "../engine/v1/types.ts";

function value(run: Run, expr: string): unknown {
  try {
    return evaluate(parseCached(expr), null, run.ctx);
  } catch {
    return undefined;
  }
}

function text(run: Run, tpl: string): string {
  try {
    return renderTemplate(run, tpl, null);
  } catch {
    return "";
  }
}

function num(run: Run, expr: string): number | null {
  const v = value(run, expr);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export const RATING_WORDS: Record<RiskRating, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
export const APPETITE_WORDS: Record<AppetiteTone, string> = { within: "within appetite", above: "above appetite", excepted: "above appetite, under an approved exception" };
const RATING_RANK: Record<RiskRating, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export interface RiskView {
  id: string;
  label: string;
  spokenLabel: string;
  owner: string;
  rating: RiskRating;
  appetite: AppetiteTone;
  status: string;
  a11y: string;
}

export interface SupportView {
  id: string;
  label: string;
  spokenLabel: string;
  value: number | null;
  max: number;
  word: string;
  fraction: number;
  a11y: string;
}

export interface DocketView {
  id: string;
  kind: string;
  label: string;
  status: string;
  flag: boolean;
  a11y: string;
}

export interface BudgetView {
  label: string;
  spent: number;
  total: number;
  unit: string;
  over: boolean;
  fraction: number;
  text: string;
  a11y: string;
}

export interface GovernanceView {
  risks: RiskView[];
  stakeholders: SupportView[];
  docket: DocketView[];
  budget: BudgetView | null;
  meters: { id: string; label: string; text: string }[];
  aboveCount: number;
}

function ratingOf(v: unknown): RiskRating {
  return v === "critical" || v === "high" || v === "medium" || v === "low" ? v : "medium";
}

function appetiteOf(v: unknown): AppetiteTone {
  return v === "within" || v === "above" || v === "excepted" ? v : "above";
}

export function bandWord(bands: number[], words: string[], v: number): string {
  let i = 0;
  while (i < bands.length && v >= bands[i]) i++;
  return words[Math.min(i, words.length - 1)] ?? "";
}

function amount(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

// The register puts risks above appetite first, then by rating; ties keep the
// authored order (arrays keep their order in jsonb, FAIL-1222).
export function governanceView(run: Run): GovernanceView | null {
  const g = run.c.doc.screen.governance;
  if (!g) return null;
  const risks = g.risks
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => (r.when ? value(run, r.when) === true : true))
    .map(({ r, i }) => {
      const rating = ratingOf(value(run, r.rating));
      const appetite = appetiteOf(value(run, r.appetite));
      const owner = text(run, r.owner);
      const status = text(run, r.status);
      return {
        i,
        v: { id: r.id, label: r.label, spokenLabel: r.spokenLabel, owner, rating, appetite, status, a11y: `${r.spokenLabel}: ${RATING_WORDS[rating]} risk, ${APPETITE_WORDS[appetite]}. Owner: ${owner}. ${status}` },
      };
    })
    .sort((x, y) => Number(y.v.appetite === "above") - Number(x.v.appetite === "above") || RATING_RANK[x.v.rating] - RATING_RANK[y.v.rating] || x.i - y.i)
    .map((x) => x.v);
  const stakeholders = g.stakeholders.map((k) => {
    const v = num(run, k.value);
    const word = v === null ? "unknown" : bandWord(k.bands, k.words, v);
    const shown = v === null ? "--" : String(Math.round(v));
    return { id: k.id, label: k.label, spokenLabel: k.spokenLabel, value: v, max: k.max, word, fraction: v === null ? 0 : Math.max(0, Math.min(1, v / k.max)), a11y: `${k.spokenLabel}: ${word}, ${shown} of ${k.max}` };
  });
  const docket = g.docket
    .filter((d) => value(run, d.when) === true)
    .map((d) => {
      const label = text(run, d.label);
      const status = text(run, d.status);
      const flag = d.flag ? value(run, d.flag) === true : false;
      return { id: d.id, kind: d.kind, label, status, flag, a11y: `${flag ? "Needs attention. " : ""}${d.kind}: ${label}. ${status}` };
    });
  let budget: BudgetView | null = null;
  if (g.budget) {
    const spent = num(run, g.budget.spent) ?? 0;
    const total = num(run, g.budget.total) ?? 0;
    const over = total > 0 && spent > total;
    const t = `${amount(spent)} of ${amount(total)} ${g.budget.unit}`;
    budget = { label: g.budget.label, spent, total, unit: g.budget.unit, over, fraction: total > 0 ? Math.max(0, Math.min(1, spent / total)) : 0, text: t, a11y: `${g.budget.label}: ${t}${over ? ", over budget" : ""}` };
  }
  const meters = (g.meters ?? []).map((m) => ({ id: m.id, label: m.label, text: text(run, m.value) }));
  return { risks, stakeholders, docket, budget, meters, aboveCount: risks.filter((r) => r.appetite === "above").length };
}

// Spoken at once, like a monitor alarm (13.2): a risk above appetite with no
// approved exception, a docket item flagged (a deadline, a regulator's
// letter), and the budget overrun. Each is spoken again as cleared.
export function governanceAlarmTexts(v: GovernanceView | null): string[] {
  if (!v) return [];
  const out = v.risks.filter((r) => r.appetite === "above").map((r) => `${r.spokenLabel} is above the risk appetite`);
  for (const d of v.docket) if (d.flag) out.push(`${d.kind}: ${d.label}`);
  if (v.budget?.over) out.push(`${v.budget.label} is over budget`);
  return out;
}

// What changed since the last frame, for polite announcements (at most one
// polite sentence per 10 s): a risk's rating or appetite position, support
// moving into another word, a new docket item or a docket item's new status,
// and the budget.
export function governanceNews(prev: GovernanceView | null, next: GovernanceView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  for (const r of next.risks) {
    const p = prev.risks.find((x) => x.id === r.id);
    if (!p) out.push(`New risk in the register. ${r.a11y}`);
    else if (p.rating !== r.rating || (p.appetite !== r.appetite && r.appetite !== "above")) out.push(`${r.spokenLabel} now ${RATING_WORDS[r.rating]}, ${APPETITE_WORDS[r.appetite]}.`);
    else if (p.status !== r.status) out.push(`${r.spokenLabel}: ${r.status}.`);
  }
  for (const k of next.stakeholders) {
    const p = prev.stakeholders.find((x) => x.id === k.id);
    if (p && p.word !== k.word) out.push(`${k.spokenLabel} now ${k.word}.`);
  }
  for (const d of next.docket) {
    if (d.flag) continue;
    const p = prev.docket.find((x) => x.id === d.id);
    if (!p) out.push(`On the docket. ${d.a11y}`);
    else if (p.status !== d.status) out.push(`${d.kind} ${d.label}: ${d.status}.`);
  }
  if (prev.budget && next.budget && prev.budget.text !== next.budget.text && !next.budget.over) out.push(next.budget.a11y + ".");
  return out;
}

// "Read the board": the whole screen in a few sentences.
export function governanceSentence(v: GovernanceView): string {
  const parts: string[] = [];
  parts.push(v.aboveCount ? `${v.aboveCount} ${v.aboveCount === 1 ? "risk" : "risks"} above appetite.` : "No risk above appetite.");
  parts.push(`Risk register: ${v.risks.map((r) => `${r.spokenLabel}, ${RATING_WORDS[r.rating]}, ${APPETITE_WORDS[r.appetite]}`).join("; ")}.`);
  parts.push(`Support: ${v.stakeholders.map((k) => `${k.spokenLabel} ${k.word}`).join("; ")}.`);
  if (v.budget) parts.push(v.budget.a11y + ".");
  const flagged = v.docket.filter((d) => d.flag);
  if (flagged.length) parts.push(`Needs attention: ${flagged.map((d) => `${d.kind} ${d.label}`).join("; ")}.`);
  parts.push(v.docket.length ? `Docket: ${v.docket.length} ${v.docket.length === 1 ? "item" : "items"}.` : "The docket is empty.");
  for (const m of v.meters) parts.push(`${m.label}: ${m.text}.`);
  return parts.join(" ");
}
