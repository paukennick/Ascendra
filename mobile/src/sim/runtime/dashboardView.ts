// REQ-311 (docs/sims.md 20, 22.24): the project dashboard's view model, pure,
// like the console's. Everything is read from the document's
// `screen.dashboard` bindings over the run: the heading, the commitments
// (Product Goal, Sprint Goal, Definition of Done; or the project's objective
// and baseline), the board by column, the chart (a history for each actual
// series, fixed values for a plan line), the impediments or risks (open ones
// spoken at once, like alarms), the people as gauges read in words, and the
// events (the Daily Scrums, the Review and the Retrospective; or milestones).
// The renderer holds no rule of its own.
import { renderTemplate, simTimeText } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import { evaluate } from "../engine/v1/eval.ts";
import { parseCached } from "../engine/v1/parser.ts";

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

function seconds(run: Run, expr: string): number {
  const v = value(run, expr);
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
}

function clockAt(run: Run, s: number): string {
  const dt = run.c.dt > 0 ? run.c.dt : 1;
  return simTimeText(run, Math.floor(s / dt));
}

function wordFor(bands: number[], words: string[], v: number): string {
  let i = 0;
  while (i < bands.length && v >= bands[i]) i++;
  return words[Math.min(i, words.length - 1)] ?? "";
}

function num(v: number): string {
  return String(Math.round(v * 10) / 10);
}

export interface DashItemView {
  id: string;
  label: string;
  size: string | null;
  note: string | null;
  flag: boolean;
  a11y: string;
}

export interface DashColumnView {
  id: string;
  label: string;
  items: DashItemView[];
  a11y: string;
}

export interface DashSeriesView {
  id: string;
  label: string;
  style: "actual" | "plan";
  points: (number | null)[]; // one per slot; null where there is no sample yet
}

export interface DashChartView {
  label: string;
  unit: string;
  slotLabel: string;
  slots: number;
  max: number;
  series: DashSeriesView[];
  summary: string; // the chart in words, for the screen reader and as its text alternative
}

export interface DashIssueView {
  id: string;
  label: string;
  status: string;
  open: boolean;
  time: string;
  at: number;
  a11y: string;
}

export interface DashPersonView {
  id: string;
  label: string;
  spokenLabel: string;
  word: string;
  value: number | null;
  max: number;
  fraction: number;
  a11y: string;
}

export interface DashEventView {
  id: string;
  label: string;
  status: string;
  time: string;
  a11y: string;
}

export interface DashboardView {
  mode: "predictive" | "sprint";
  heading: string;
  commitments: { id: string; label: string; text: string; a11y: string }[];
  columns: DashColumnView[];
  chart: DashChartView | null;
  issues: DashIssueView[];
  people: DashPersonView[];
  events: DashEventView[];
  meters: { id: string; label: string; text: string }[];
  openCount: number;
  flagCount: number;
}

// The newest `slots` samples of a history, oldest first, padded with null on
// the right for the slots the run has not reached yet.
export function historyPoints(run: Run, name: string, slots: number): (number | null)[] {
  const buf = (run.state.history as Record<string, number[] | undefined>)[name] ?? [];
  const shown = buf.slice(0, slots);
  const out: (number | null)[] = shown.map((v) => (Number.isFinite(v) ? v : null));
  while (out.length < slots) out.push(null);
  return out;
}

function chartView(run: Run): DashChartView | null {
  const c = run.c.doc.screen.dashboard?.chart;
  if (!c) return null;
  const series: DashSeriesView[] = c.series.map((s) => ({
    id: s.id,
    label: s.label,
    style: s.style,
    points: s.style === "plan" ? (s.values ?? []).slice(0, c.slots).map((v) => (Number.isFinite(v) ? v : null)) : historyPoints(run, s.history ?? "", c.slots),
  }));
  let max = 0;
  for (const s of series) for (const p of s.points) if (p !== null && p > max) max = p;
  // In words: where each actual series stands now, against the plan at the same slot.
  const parts: string[] = [];
  for (const s of series.filter((x) => x.style === "actual")) {
    let last = -1;
    s.points.forEach((p, i) => {
      if (p !== null) last = i;
    });
    if (last < 0) {
      parts.push(`${s.label}: no data yet.`);
      continue;
    }
    const plans = series.filter((x) => x.style === "plan" && x.points[last] !== null && x.points[last] !== undefined);
    const vs = plans.map((x) => `${x.label} ${num(x.points[last] as number)}`).join(", ");
    parts.push(`${s.label}, ${c.slotLabel} ${last + 1} of ${c.slots}: ${num(s.points[last] as number)} ${c.unit}${vs ? `; ${vs}` : ""}.`);
  }
  return { label: c.label, unit: c.unit, slotLabel: c.slotLabel, slots: c.slots, max, series, summary: `${c.label}. ${parts.join(" ")}` };
}

export function dashboardView(run: Run): DashboardView | null {
  const d = run.c.doc.screen.dashboard;
  if (!d) return null;
  const commitments = d.commitments
    .filter((c) => (c.when ? value(run, c.when) === true : true))
    .map((c) => {
      const t = text(run, c.text);
      return { id: c.id, label: c.label, text: t, a11y: `${c.label}: ${t}` };
    });
  const colIds = d.columns.map((c) => c.id);
  const byCol: Record<string, DashItemView[]> = {};
  for (const id of colIds) byCol[id] = [];
  for (const it of d.items) {
    if (value(run, it.when) !== true) continue;
    const raw = value(run, it.column);
    const col = typeof raw === "string" && colIds.indexOf(raw) >= 0 ? raw : colIds[0];
    const label = text(run, it.label);
    const size = it.size ? text(run, it.size) : null;
    const note = it.note ? text(run, it.note) : null;
    const flag = it.flag ? value(run, it.flag) === true : false;
    byCol[col].push({ id: it.id, label, size, note, flag, a11y: `${flag ? "Flagged. " : ""}${label}${size ? `, ${size}` : ""}${note ? `. ${note}` : ""}` });
  }
  const columns = d.columns.map((c) => {
    const items = byCol[c.id];
    return { id: c.id, label: c.label, items, a11y: `${c.label}: ${items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}` : "empty"}` };
  });
  const issues = d.issues
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => value(run, x.when) === true)
    .map(({ x, i }) => {
      const at = seconds(run, x.at);
      const label = text(run, x.label);
      const status = text(run, x.status);
      const open = value(run, x.open) === true;
      const time = clockAt(run, at);
      return { i, v: { id: x.id, label, status, open, time, at, a11y: `${open ? "Open" : "Closed"}${d.mode === "sprint" ? " impediment" : ""}, raised ${time}: ${label}. ${status}.` } };
    })
    .sort((a, b) => Number(b.v.open) - Number(a.v.open) || b.v.at - a.v.at || a.i - b.i)
    .map((x) => x.v);
  const people = d.people.map((g) => {
    const raw = value(run, g.value);
    const v = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    const word = v === null ? "unknown" : wordFor(g.bands, g.words, v);
    return {
      id: g.id,
      label: g.label,
      spokenLabel: g.spokenLabel,
      word,
      value: v,
      max: g.max,
      fraction: v === null ? 0 : Math.max(0, Math.min(1, v / g.max)),
      a11y: `${g.spokenLabel}: ${word}, ${v === null ? "--" : Math.round(v)} of ${g.max}`,
    };
  });
  const events = d.events
    .filter((e) => (e.when ? value(run, e.when) === true : true))
    .map((e) => {
      const time = clockAt(run, seconds(run, e.at));
      const status = text(run, e.status);
      return { id: e.id, label: e.label, status, time, a11y: `${e.label}, ${time}: ${status}` };
    });
  const meters = (d.meters ?? []).map((m) => ({ id: m.id, label: m.label, text: text(run, m.value) }));
  const flagCount = columns.reduce((n, c) => n + c.items.filter((it) => it.flag).length, 0);
  return { mode: d.mode, heading: text(run, d.heading), commitments, columns, chart: chartView(run), issues, people, events, meters, openCount: issues.filter((x) => x.open).length, flagCount };
}

// Open impediments (or open risks and issues) are spoken at once, like an
// alarm (13.2), and so is a board item that becomes flagged (blocked).
export function dashboardAlarmTexts(v: DashboardView | null): string[] {
  if (!v) return [];
  const out = v.issues.filter((x) => x.open).map((x) => `${v.mode === "sprint" ? "Impediment" : "Open issue"}: ${x.label}`);
  for (const c of v.columns) for (const it of c.items) if (it.flag) out.push(`Flagged: ${it.label}`);
  return out;
}

// What changed since the last frame, for polite announcements: an item that
// moved column, a gauge that moved into another band, an event whose status
// changed, a commitment that changed (a Sprint Goal renegotiated), and where
// the chart stands when a new sample arrives.
export function dashboardNews(prev: DashboardView | null, next: DashboardView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  const colOf = (v: DashboardView): Map<string, string> => {
    const m = new Map<string, string>();
    for (const c of v.columns) for (const it of c.items) m.set(it.id, c.label);
    return m;
  };
  const a = colOf(prev);
  const b = colOf(next);
  for (const c of next.columns) {
    for (const it of c.items) {
      const was = a.get(it.id);
      if (was && was !== b.get(it.id)) out.push(`${it.label} moved to ${c.label}.`);
      else if (!was) out.push(`${it.label} added to ${c.label}.`);
    }
  }
  for (const g of next.people) {
    const p = prev.people.find((x) => x.id === g.id);
    if (p && p.word !== g.word) out.push(`${g.spokenLabel} now ${g.word}.`);
  }
  for (const e of next.events) {
    const p = prev.events.find((x) => x.id === e.id);
    if (p && p.status !== e.status) out.push(`${e.label}: ${e.status}.`);
  }
  for (const c of next.commitments) {
    const p = prev.commitments.find((x) => x.id === c.id);
    if (p && p.text !== c.text) out.push(`${c.label} changed: ${c.text}`);
  }
  for (const x of next.issues) {
    if (x.open) continue;
    const p = prev.issues.find((y) => y.id === x.id);
    if (p && p.status !== x.status) out.push(`${x.label}: ${x.status}.`);
  }
  if (next.chart && prev.chart && next.chart.summary !== prev.chart.summary) out.push(next.chart.summary);
  return out;
}

// "Read the dashboard": the whole screen in a few sentences.
export function dashboardSentence(v: DashboardView): string {
  const parts: string[] = [`${v.heading}.`];
  for (const c of v.commitments) parts.push(`${c.a11y}.`);
  parts.push(`Board: ${v.columns.map((c) => `${c.label} ${c.items.length}${c.items.some((it) => it.flag) ? `, ${c.items.filter((it) => it.flag).length} flagged` : ""}`).join("; ")}.`);
  if (v.chart) parts.push(v.chart.summary);
  const open = v.issues.filter((x) => x.open);
  parts.push(open.length ? `${open.length} open ${v.mode === "sprint" ? (open.length === 1 ? "impediment" : "impediments") : open.length === 1 ? "issue" : "issues"}: ${open.map((x) => x.label).join("; ")}.` : v.mode === "sprint" ? "No open impediments." : "No open issues.");
  parts.push(`People: ${v.people.map((g) => `${g.spokenLabel} ${g.word}`).join("; ")}.`);
  for (const m of v.meters) parts.push(`${m.label}: ${m.text}.`);
  return parts.join(" ");
}
