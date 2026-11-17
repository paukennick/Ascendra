// REQ-312 (docs/sims.md 20, 20.1, 22.25): the data and code console's view
// model, pure, like the terminal's (terminalView.ts). Everything is read from
// the document's `screen.data` bindings and the run: the workspace, the
// quality flags, the result tables (with choice-only editable cells), the
// charts (points and reference lines placed on the chart's own axis), the
// code viewer (literal lines, numbered by their place among the lines shown)
// and the results each action printed (`output` effects). Nothing the learner
// types is executed: an edit is one of the cell's action options, sent as a
// normal action command. The renderer holds no rule of its own: a point is
// flagged only where the document says so.
import { renderTemplate, simTimeText } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import { evaluate } from "../engine/v1/eval.ts";
import { parseCached } from "../engine/v1/parser.ts";
import type { CommandParams, DataChartKind, DataMark, DataSeverity } from "../engine/v1/types.ts";
import type { ActionView } from "./view.ts";

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

function shown(run: Run, when: string | undefined): boolean {
  return when === undefined || value(run, when) === true;
}

function num(run: Run, expr: string): number | null {
  const v = value(run, expr);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export const DATA_SEVERITY_WORDS: Record<DataSeverity, string> = { error: "error", warning: "warning", info: "note" };
export const DATA_MARK_WORDS: Record<DataMark, string> = { none: "", error: "error", warning: "warning", changed: "changed", focus: "look here" };

function markOf(v: unknown): DataMark {
  return v === "error" || v === "warning" || v === "changed" || v === "focus" ? v : "none";
}

// Numbers as people read them: up to 4 significant decimals, no trailing
// zeros (12.5, 0.0312, 1840).
export function numberText(v: number): string {
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v);
  const dp = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 2 : 4;
  const s = v.toFixed(dp);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

export interface DataFlagView {
  id: string;
  label: string;
  text: string;
  severity: DataSeverity;
  a11y: string;
}

export interface DataCellView {
  text: string;
  editable: { action: string; label: string; available: boolean; why: string | null; param: string; options: { value: string; label: string }[] } | null;
  a11y: string;
}

export interface DataRowView {
  id: string;
  cells: DataCellView[];
  flagged: boolean;
  a11y: string;
}

export interface DataTableView {
  id: string;
  label: string;
  spokenLabel: string;
  columns: { id: string; label: string; numeric: boolean }[];
  rows: DataRowView[];
  note: string | null;
  flaggedCount: number;
}

export interface DataPointView {
  id: string;
  label: string;
  value: number | null;
  text: string;
  flagged: boolean;
  pos: number; // 0..1 up the axis, clamped; null values sit at 0 and say "no value"
  a11y: string;
}

export interface DataLineView {
  id: string;
  label: string;
  value: number;
  text: string;
  pos: number;
}

export interface DataChartView {
  id: string;
  label: string;
  spokenLabel: string;
  kind: DataChartKind;
  unit: string;
  min: number;
  max: number;
  points: DataPointView[];
  lines: DataLineView[];
  note: string | null;
  flaggedCount: number;
  summary: string; // the chart in words: what a sighted reader gets at a glance
}

export interface DataCodeLineView {
  id: string;
  n: number;
  text: string;
  mark: DataMark;
  a11y: string;
}

export interface DataCodeView {
  id: string;
  label: string;
  language: string;
  lines: DataCodeLineView[];
  marked: number;
}

export interface DataResultView {
  key: string;
  time: string;
  text: string | null;
  table: { columns: string[]; rows: string[][] } | null;
  a11y: string;
}

export interface DataView {
  workspace: string;
  flags: DataFlagView[];
  tables: DataTableView[];
  charts: DataChartView[];
  code: DataCodeView[];
  results: DataResultView[]; // newest first
  meters: { id: string; label: string; text: string }[];
  errorCount: number;
}

function pos(v: number, min: number, max: number): number {
  const p = (v - min) / (max - min);
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

function spoken(t: string): string {
  return t
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length)
    .join(". ")
    .replace(/\s+/g, " ");
}

function resultA11y(time: string, textBody: string | null, table: { columns: string[]; rows: string[][] } | null): string {
  const parts = [`${time}, result`];
  if (textBody) parts.push(spoken(textBody));
  if (table) {
    parts.push(`table with ${table.rows.length} ${table.rows.length === 1 ? "row" : "rows"}: ${table.columns.join(", ")}`);
    for (const r of table.rows.slice(0, 10)) parts.push(table.columns.map((c, i) => `${c} ${r[i] ?? ""}`).join(", "));
    if (table.rows.length > 10) parts.push(`and ${table.rows.length - 10} more rows`);
  }
  return parts.join(". ");
}

export function dataView(run: Run, actions: ActionView[] = [], resultLimit = 6): DataView | null {
  const d = run.c.doc.screen.data;
  if (!d) return null;
  const byId = new Map(actions.map((a) => [a.id, a]));
  const flags = d.flags
    .filter((f) => value(run, f.when) === true)
    .map((f) => {
      const body = text(run, f.text);
      return { id: f.id, label: f.label, text: body, severity: f.severity, a11y: `${DATA_SEVERITY_WORDS[f.severity]}, ${f.label}: ${spoken(body)}` };
    });
  const tables = d.tables
    .filter((t) => shown(run, t.when))
    .map((t) => {
      const rows = t.rows
        .filter((r) => shown(run, r.when))
        .map((r) => {
          const flagged = r.flag ? value(run, r.flag) === true : false;
          const cells = t.columns.map((c, i) => {
            const body = text(run, r.cells[i] ?? "");
            const e = (t.edits ?? []).find((x) => x.row === r.id && x.column === c.id);
            const a = e ? byId.get(e.action) : undefined;
            const p = a && a.params.length === 1 && a.params[0].kind === "choice" ? a.params[0] : null;
            const editable = e && a && p && p.kind === "choice" ? { action: a.id, label: a.label, available: a.available, why: a.why, param: p.id, options: p.options.map((o) => ({ value: o.value, label: o.label })) } : null;
            return { text: body, editable, a11y: `${c.label}: ${body || "empty"}${editable ? (editable.available ? ", editable" : ", not editable now") : ""}` };
          });
          return { id: r.id, cells, flagged, a11y: `${flagged ? "Flagged row. " : ""}${cells.map((c) => c.a11y).join("; ")}` };
        });
      return {
        id: t.id,
        label: t.label,
        spokenLabel: t.spokenLabel,
        columns: t.columns.map((c) => ({ id: c.id, label: c.label, numeric: !!c.numeric })),
        rows,
        note: t.note !== undefined ? text(run, t.note) : null,
        flaggedCount: rows.filter((r) => r.flagged).length,
      };
    });
  const charts = d.charts
    .filter((c) => shown(run, c.when))
    .map((c) => {
      const unit = c.unit ? ` ${c.unit}` : "";
      const points = c.points
        .filter((p) => shown(run, p.when))
        .map((p) => {
          const v = num(run, p.value);
          const flagged = p.flag ? value(run, p.flag) === true : false;
          const t = v === null ? "no value" : `${numberText(v)}${unit}`;
          return { id: p.id, label: p.label, value: v, text: t, flagged, pos: v === null ? 0 : pos(v, c.min, c.max), a11y: `${p.label}: ${t}${flagged ? ", flagged" : ""}` };
        });
      const lines = (c.lines ?? [])
        .filter((l) => shown(run, l.when))
        .flatMap((l) => {
          const v = num(run, l.value);
          return v === null ? [] : [{ id: l.id, label: l.label, value: v, text: `${numberText(v)}${unit}`, pos: pos(v, c.min, c.max) }];
        });
      const flaggedCount = points.filter((p) => p.flagged).length;
      const vals = points.flatMap((p) => (p.value === null ? [] : [p.value]));
      const lo = vals.length ? Math.min(...vals) : null;
      const hi = vals.length ? Math.max(...vals) : null;
      const parts = [`${c.spokenLabel}, ${c.kind === "control" ? "control chart" : c.kind === "line" ? "line chart" : "bar chart"}, ${points.length} ${points.length === 1 ? "point" : "points"}`];
      if (lo !== null && hi !== null) parts.push(`from ${numberText(lo)} to ${numberText(hi)}${unit}`);
      if (lines.length) parts.push(lines.map((l) => `${l.label} ${l.text}`).join(", "));
      parts.push(flaggedCount ? `${flaggedCount} flagged: ${points.filter((p) => p.flagged).map((p) => `${p.label} ${p.text}`).join(", ")}` : "none flagged");
      return {
        id: c.id,
        label: c.label,
        spokenLabel: c.spokenLabel,
        kind: c.kind,
        unit: c.unit,
        min: c.min,
        max: c.max,
        points,
        lines,
        note: c.note !== undefined ? text(run, c.note) : null,
        flaggedCount,
        summary: `${parts.join(". ")}.`,
      };
    });
  const code = d.code
    .filter((f) => shown(run, f.when))
    .map((f) => {
      const lines = f.lines
        .filter((l) => shown(run, l.when))
        .map((l, i) => {
          const mark = l.mark ? markOf(value(run, l.mark)) : "none";
          return { id: l.id, n: i + 1, text: l.text, mark, a11y: `Line ${i + 1}${mark !== "none" ? `, ${DATA_MARK_WORDS[mark]}` : ""}: ${l.text.trim() || "blank"}` };
        });
      return { id: f.id, label: f.label, language: f.language, lines, marked: lines.filter((l) => l.mark !== "none").length };
    });
  const results = run.outputs
    .map((o, i) => {
      const time = simTimeText(run, o.tick);
      const table = o.table ? { columns: o.table.columns, rows: o.table.rows } : null;
      return { key: `r${i}`, time, text: o.text ?? null, table, a11y: resultA11y(time, o.text ?? null, table) };
    })
    .slice(-resultLimit)
    .reverse();
  return {
    workspace: text(run, d.workspace),
    flags,
    tables,
    charts,
    code,
    results,
    meters: (d.meters ?? []).map((m) => ({ id: m.id, label: m.label, text: text(run, m.value) })),
    errorCount: flags.filter((f) => f.severity === "error").length,
  };
}

// An error flag is spoken at once, like a monitor alarm (and again as
// cleared, the announcer's rule).
export function dataAlarmTexts(v: DataView | null): string[] {
  if (!v) return [];
  return v.flags.filter((f) => f.severity === "error").map((f) => `${f.label}: ${spoken(f.text)}`);
}

// What changed since the last frame, for polite announcements (one sentence
// per 10 s): a new warning or note, new results summarized as a count and the
// newest, a chart or table that gained flagged points or rows.
export function dataNews(prev: DataView | null, next: DataView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  const had = new Set(prev.flags.map((f) => f.id));
  for (const f of next.flags) if (!had.has(f.id) && f.severity !== "error") out.push(`${f.label}: ${spoken(f.text)}`);
  const seen = new Set(prev.results.map((r) => r.key));
  const fresh = next.results.filter((r) => !seen.has(r.key));
  if (fresh.length === 1) out.push(`New result. ${fresh[0].a11y}`);
  else if (fresh.length > 1) out.push(`${fresh.length} new results. Newest: ${fresh[0].a11y}`);
  for (const c of next.charts) {
    const p = prev.charts.find((x) => x.id === c.id);
    if (!p) out.push(`New chart: ${c.summary}`);
    else if (c.flaggedCount > p.flaggedCount) out.push(`${c.spokenLabel}: ${c.flaggedCount} flagged now.`);
  }
  for (const t of next.tables) {
    const p = prev.tables.find((x) => x.id === t.id);
    if (!p) out.push(`New table: ${t.spokenLabel}, ${t.rows.length} rows.`);
    else if (t.flaggedCount > p.flaggedCount) out.push(`${t.spokenLabel}: ${t.flaggedCount} flagged ${t.flaggedCount === 1 ? "row" : "rows"} now.`);
  }
  return out;
}

// "Read the console": the workspace, the flags, each chart's summary, each
// table's size and flagged rows, the marked code lines and the latest result.
export function dataSentence(v: DataView): string {
  const parts: string[] = [`Open: ${v.workspace}.`];
  parts.push(v.flags.length ? `Flags: ${v.flags.map((f) => `${DATA_SEVERITY_WORDS[f.severity]}, ${f.label}: ${spoken(f.text)}`).join("; ")}.` : "No flags.");
  for (const c of v.charts) parts.push(c.summary);
  for (const t of v.tables) {
    parts.push(`${t.spokenLabel}: ${t.rows.length} ${t.rows.length === 1 ? "row" : "rows"}${t.flaggedCount ? `, ${t.flaggedCount} flagged` : ""}.`);
  }
  for (const f of v.code) {
    const marked = f.lines.filter((l) => l.mark !== "none");
    parts.push(`${f.label}, ${f.lines.length} lines${marked.length ? `; marked: ${marked.map((l) => `line ${l.n} ${DATA_MARK_WORDS[l.mark]}`).join(", ")}` : ""}.`);
  }
  for (const m of v.meters) parts.push(`${m.label}: ${m.text}.`);
  parts.push(v.results.length ? `Latest result: ${v.results[0].a11y}` : "No results yet.");
  return parts.join(" ");
}

// The command an edit sends: the cell's action with its one choice param.
export function editCommand(cell: DataCellView, optionValue: string): { type: "act"; action: string; params: CommandParams } | null {
  const e = cell.editable;
  if (!e || !e.available) return null;
  if (!e.options.some((o) => o.value === optionValue)) return null;
  return { type: "act", action: e.action, params: { [e.param]: optionValue } };
}
