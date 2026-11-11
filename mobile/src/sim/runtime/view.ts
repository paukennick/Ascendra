// REQ-190 (docs/sims.md 8, 13): the screen's view model, pure. Everything
// shown is read from the engine's run of the client document and the
// document's screen spec: vitals tiles (bedside), the topology (board), the
// action groups and their parameters, waits, the open prompt or reasoning
// moment, the event log. The renderer holds no rule and no state of its own.
import { clockBlocked, clockMode, renderTemplate, simTimeText, waits } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import { evaluate } from "../engine/v1/eval.ts";
import { parseCached } from "../engine/v1/parser.ts";
import type { Action, ActionParam, ScreenSpec, WaitInfo } from "../engine/v1/types.ts";
import { isTapPadParam } from "./tapPad.ts";

type Tile = NonNullable<ScreenSpec["bedside"]>["tiles"][number];

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

const UNIT_WORDS: Record<string, string> = {
  "/min": "per minute",
  mmHg: "millimeters of mercury",
  "%": "percent",
  "mL/h": "milliliters per hour",
  "L/min/m2": "liters per minute per square meter",
  "mL/15min": "milliliters in 15 minutes",
  mL: "millilitres",
  $: "dollars",
};

export function spokenUnit(unit: string): string {
  return UNIT_WORDS[unit] ?? unit;
}

export interface TileView {
  id: string;
  label: string;
  spokenLabel: string;
  text: string; // "112", "118/70", or "--" while hidden
  unit: string;
  sub: string | null;
  alarm: "low" | "high" | null;
  trend: "rising" | "falling" | null;
  colour: Tile["colour"];
  a11y: string;
}

function fmtNum(v: unknown, precise: boolean): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "--";
  return precise ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v));
}

export function tileViews(run: Run): TileView[] {
  const tiles = run.c.doc.screen.bedside?.tiles ?? [];
  return tiles.map((t) => {
    const hidden = t.hiddenUntil ? value(run, t.hiddenUntil) !== true : false;
    const vals = (Array.isArray(t.value) ? t.value : [t.value]).map((e) => value(run, e));
    const precise = !Array.isArray(t.value) && typeof vals[0] === "number" && Math.abs(vals[0] as number) < 10;
    const shown = hidden ? "--" : vals.map((v) => fmtNum(v, precise)).join("/");
    const primary = typeof vals[0] === "number" ? (vals[0] as number) : null;
    let alarm: TileView["alarm"] = null;
    if (!hidden && primary !== null && t.alarm) {
      if (t.alarm.low !== undefined && primary < t.alarm.low) alarm = "low";
      else if (t.alarm.high !== undefined && primary > t.alarm.high) alarm = "high";
    }
    let trend: TileView["trend"] = null;
    if (!hidden && t.trend) {
      const secs = parseSeconds(t.trend.window);
      const tr = secs ? value(run, `trend(${t.trend.history}, ${secs}, ${t.trend.threshold})`) : 0;
      trend = tr === 1 ? "rising" : tr === -1 ? "falling" : null;
    }
    const sub = t.sub && !hidden ? text(run, t.sub) : null;
    const spokenValue = hidden ? "not measured yet" : Array.isArray(t.value) ? shown.replace("/", " over ") : shown;
    const a11y = [
      `${t.spokenLabel}, ${spokenValue}${hidden ? "" : ` ${spokenUnit(t.unit)}`}`,
      trend,
      alarm ? `${alarm} alarm` : null,
    ]
      .filter(Boolean)
      .join(", ");
    return { id: t.id, label: t.label, spokenLabel: t.spokenLabel, text: shown, unit: t.unit, sub, alarm, trend, colour: t.colour, a11y };
  });
}

function parseSeconds(d: string): number | null {
  const m = /^(\d+)(s|min|h|d)$/.exec(d.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "s" ? n : m[2] === "min" ? n * 60 : m[2] === "h" ? n * 3600 : n * 86400;
}

// One sentence of every tile, for "Read vitals" (13.1).
export function vitalsSentence(tiles: TileView[]): string {
  return tiles.map((t) => t.a11y).join(". ") + ".";
}

export function alarmTexts(tiles: TileView[]): string[] {
  return tiles.filter((t) => t.alarm).map((t) => `${t.spokenLabel} ${t.alarm}`);
}

export interface ZoneView {
  id: string;
  label: string;
  items: string[];
  a11y: string;
}

export function boardViews(run: Run): { zones: ZoneView[]; meters: { id: string; label: string; text: string }[] } {
  const b = run.c.doc.screen.board;
  if (!b) return { zones: [], meters: [] };
  const zones = b.zones.map((z) => {
    const items = z.items.filter((it) => value(run, it.when) === true).map((it) => text(run, it.label));
    return { id: z.id, label: z.label, items, a11y: `${z.spokenLabel}: ${items.length ? items.join(", ") : "empty"}` };
  });
  const meters = (b.meters ?? []).map((m) => ({ id: m.id, label: m.label, text: text(run, m.value) }));
  return { zones, meters };
}

export type ActionKind = "plain" | "params" | "tapPad";

export interface ActionView {
  id: string;
  label: string;
  group: string;
  available: boolean;
  why: string | null;
  kind: ActionKind;
  params: ActionParam[];
}

export function actionViews(run: Run): ActionView[] {
  const doc = run.c.doc;
  const phase = doc.phases[run.state.phase];
  if (!phase || run.state.ended) return [];
  return phase.actions.map((id) => {
    const a: Action = doc.actions[id];
    const available = a.available ? value(run, a.available) === true : true;
    const params = a.params ?? [];
    const kind: ActionKind = params.some((p) => isTapPadParam(p as { kind: string; patterns?: { pattern: string }[] })) ? "tapPad" : params.length ? "params" : "plain";
    return { id, label: a.label, group: a.group, available, why: !available && a.why ? text(run, a.why) : null, kind, params };
  });
}

export function groupActions(actions: ActionView[]): { group: string; actions: ActionView[] }[] {
  const out: { group: string; actions: ActionView[] }[] = [];
  for (const a of actions) {
    let g = out.find((x) => x.group === a.group);
    if (!g) {
      g = { group: a.group, actions: [] };
      out.push(g);
    }
    g.actions.push(a);
  }
  return out;
}

// The catalogue entries a slot param can place, with the slots each allows.
export function slotChoices(run: Run, p: Extract<ActionParam, { kind: "slot" }>): { id: string; name: string; slots: string[] }[] {
  const cat = (run.c.doc.catalogs ?? {})[p.catalog];
  if (!cat) return [];
  return cat.entries.map((e) => {
    const slots = Array.isArray(e.slots) ? (e.slots as string[]).filter((s) => p.slots.includes(s)) : p.slots;
    return { id: String(e.id), name: typeof e.name === "string" ? e.name : String(e.id), slots };
  });
}

export interface PromptView {
  id: string;
  title: string;
  context: string;
  choices: { id: string; label: string }[];
}

export interface RunView {
  clock: string;
  mode: "running" | "turns" | "stopped";
  blocked: boolean;
  ended: { reason: string } | null;
  phaseLabel: string;
  banner: string | null;
  infusions: string | null;
  tiles: TileView[];
  board: ReturnType<typeof boardViews>;
  groups: { group: string; actions: ActionView[] }[];
  waits: WaitInfo[];
  prompt: PromptView | null;
  reasoning: { id: string; question: string } | null;
  log: { key: string; time: string; kind: string; text: string }[];
  finding: string | null;
  outputs: { key: string; text: string }[];
}

export function runView(run: Run, logLimit = 60): RunView {
  const doc = run.c.doc;
  const p = run.state.openPrompt ? (doc.prompts ?? {})[run.state.openPrompt] : null;
  const r = run.state.openReasoning ? doc.reasoning[run.state.openReasoning] : null;
  const banner = (doc.screen.bedside?.banner ?? []).find((b) => value(run, b.when) === true);
  const log = run.log
    .map((l, i) => ({ key: `${i}`, time: simTimeText(run, l.tick), kind: l.kind, text: l.text }))
    .slice(-logLimit)
    .reverse();
  return {
    clock: simTimeText(run),
    mode: clockMode(run),
    blocked: clockBlocked(run),
    ended: run.state.ended ? { reason: run.state.ended.reason } : null,
    phaseLabel: doc.phases[run.state.phase]?.label ?? run.state.phase,
    banner: banner ? text(run, banner.text) : null,
    infusions: doc.screen.bedside?.infusions ? text(run, doc.screen.bedside.infusions) : null,
    tiles: tileViews(run),
    board: boardViews(run),
    groups: groupActions(actionViews(run)),
    waits: waits(run),
    prompt: p && run.state.openPrompt ? { id: run.state.openPrompt, title: p.title, context: text(run, p.context), choices: p.choices.map((c) => ({ id: c.id, label: c.label })) } : null,
    reasoning: r && run.state.openReasoning ? { id: run.state.openReasoning, question: r.question } : null,
    log,
    finding: run.findings.length ? run.findings[run.findings.length - 1].text : null,
    outputs: run.outputs.slice(-5).map((o, i) => ({ key: `${o.tick}:${i}`, text: o.text ?? (o.table ? o.table.rows.map((row) => row.join("  ")).join("\n") : "") })),
  };
}

// "Skip to: the surgeon's callback (about 2 min)", spoken with the real time skipped.
export function waitLabel(run: Run, w: WaitInfo): { label: string; a11y: string } {
  const secs = Math.max(0, (w.due - run.state.tick) * run.c.dt);
  const mins = Math.max(1, Math.round(secs / 60));
  const span = secs >= 3600 ? `${Math.round((secs / 3600) * 10) / 10} h` : `${mins} min`;
  return { label: `${w.skipLabel} (about ${span})`, a11y: `${w.skipLabel}. Skips about ${span} of sim time.` };
}
