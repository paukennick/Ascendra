// REQ-237 (docs/sims.md 20, 20.1, 22.10): the terminal and network screen's
// view model, pure, like the console's (consoleView.ts). Everything is read
// from the document's `screen.terminal` bindings and the run: the transcript
// (what each command printed, at the tick it ran, merged with the lines that
// appear on their own over sim time), the map (nodes and links with a status
// in words and a tone), the meters and the prompt. The command line offers
// the phase's actions as a bounded command set: a typed line runs only when
// it is exactly one of those commands (no free shell; arguments come from
// the action's choice lists), so nothing the learner types reaches the
// engine as text. The renderer holds no rule of its own.
import { renderTemplate, simTimeText } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import { evaluate } from "../engine/v1/eval.ts";
import { parseCached } from "../engine/v1/parser.ts";
import type { CommandParams, TerminalTone } from "../engine/v1/types.ts";
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

function seconds(run: Run, expr: string): number {
  const v = value(run, expr);
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
}

function dtOf(run: Run): number {
  return run.c.dt > 0 ? run.c.dt : 1;
}

function clockAt(run: Run, s: number): string {
  return simTimeText(run, Math.floor(s / dtOf(run)));
}

export const TERMINAL_TONE_WORDS: Record<TerminalTone, string> = { up: "up", degraded: "degraded", down: "down", out: "out of service" };

function toneOf(v: unknown): TerminalTone {
  return v === "up" || v === "degraded" || v === "down" || v === "out" ? v : "degraded";
}

// A screen reader reads a multi-line block better as sentences.
export function spokenText(t: string): string {
  return t
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length)
    .join(". ")
    .replace(/\s+/g, " ");
}

export interface TerminalEntryView {
  key: string;
  kind: "output" | "line";
  text: string;
  time: string;
  at: number;
  error: boolean;
  a11y: string;
}

export interface TerminalNodeView {
  id: string;
  label: string;
  spokenLabel: string;
  kind: string;
  status: string;
  tone: TerminalTone;
  a11y: string;
}

export interface TerminalLinkView {
  id: string;
  label: string;
  from: string;
  to: string;
  status: string;
  tone: TerminalTone;
  a11y: string;
}

export interface TerminalView {
  prompt: string;
  transcript: TerminalEntryView[]; // oldest first, as a terminal reads
  nodes: TerminalNodeView[];
  links: TerminalLinkView[];
  meters: { id: string; label: string; text: string }[];
  downCount: number;
}

// Oldest first, as a terminal scrolls; ties keep the order things happened
// (command output in the order it was printed, then the authored order of
// the lines; arrays keep their order in jsonb, FAIL-1222). At most `limit`
// entries, the newest.
export function terminalView(run: Run, limit = 40): TerminalView | null {
  const t = run.c.doc.screen.terminal;
  if (!t) return null;
  const dt = dtOf(run);
  const entries: { at: number; order: number; v: TerminalEntryView }[] = [];
  run.outputs.forEach((o, i) => {
    const body = o.text ?? (o.table ? [o.table.columns.join("  "), ...o.table.rows.map((r) => r.join("  "))].join("\n") : "");
    const at = o.tick * dt;
    const time = clockAt(run, at);
    entries.push({ at, order: i, v: { key: `o${i}`, kind: "output", text: body, time, at, error: false, a11y: `${time}, output: ${spokenText(body)}` } });
  });
  const base = run.outputs.length;
  t.lines.forEach((l, i) => {
    if (value(run, l.when) !== true) return;
    const at = seconds(run, l.at);
    const body = text(run, l.text);
    const error = l.error ? value(run, l.error) === true : false;
    const time = clockAt(run, at);
    entries.push({ at, order: base + i, v: { key: `l:${l.id}`, kind: "line", text: body, time, at, error, a11y: `${time}, ${error ? "error" : "log"}: ${spokenText(body)}` } });
  });
  entries.sort((a, b) => a.at - b.at || a.order - b.order);
  const transcript = entries.slice(-limit).map((e) => e.v);
  const nodes = t.nodes.map((n) => {
    const tone = toneOf(value(run, n.tone));
    const status = text(run, n.status);
    return { id: n.id, label: n.label, spokenLabel: n.spokenLabel, kind: n.kind, status, tone, a11y: `${n.spokenLabel}, ${n.kind}: ${TERMINAL_TONE_WORDS[tone]}. ${status}` };
  });
  const name = (id: string) => nodes.find((n) => n.id === id)?.spokenLabel ?? id;
  const links = t.links.map((l) => {
    const tone = toneOf(value(run, l.tone));
    const status = text(run, l.status);
    return { id: l.id, label: l.label, from: name(l.from), to: name(l.to), status, tone, a11y: `${l.label}, from ${name(l.from)} to ${name(l.to)}: ${TERMINAL_TONE_WORDS[tone]}. ${status}` };
  });
  const meters = (t.meters ?? []).map((m) => ({ id: m.id, label: m.label, text: text(run, m.value) }));
  return {
    prompt: text(run, t.prompt),
    transcript,
    nodes,
    links,
    meters,
    downCount: nodes.filter((n) => n.tone === "down").length + links.filter((l) => l.tone === "down").length,
  };
}

// A node or link that is down is spoken at once, like a monitor alarm: going
// down is assertive, and so is coming back (the announcer's "cleared").
export function terminalAlarmTexts(v: TerminalView | null): string[] {
  if (!v) return [];
  return [...v.nodes.filter((n) => n.tone === "down").map((n) => `${n.spokenLabel} is down`), ...v.links.filter((l) => l.tone === "down").map((l) => `${l.label} is down`)];
}

function freshEntries(prev: TerminalView, next: TerminalView): TerminalEntryView[] {
  const seen = new Set(prev.transcript.map((e) => e.key));
  return next.transcript.filter((e) => !seen.has(e.key));
}

// New error lines since the last frame, spoken at once (not rate-limited).
export function terminalErrors(prev: TerminalView | null, next: TerminalView | null): string[] {
  if (!prev || !next) return [];
  return freshEntries(prev, next)
    .filter((e) => e.error)
    .map((e) => `Error: ${spokenText(e.text)}`);
}

// What changed since the last frame, for polite announcements (the
// announcer's one sentence per 10 s): new output, summarized as a count and
// the newest so a burst is one sentence, and a node or link whose tone moved
// other than to down (down is an alarm).
export function terminalNews(prev: TerminalView | null, next: TerminalView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  const fresh = freshEntries(prev, next).filter((e) => !e.error);
  if (fresh.length === 1) out.push(`New output. ${spokenText(fresh[0].text)}`);
  else if (fresh.length > 1) out.push(`${fresh.length} new output blocks. Newest: ${spokenText(fresh[fresh.length - 1].text)}`);
  for (const n of next.nodes) {
    const p = prev.nodes.find((x) => x.id === n.id);
    if (p && p.tone !== n.tone && n.tone !== "down") out.push(`${n.spokenLabel} now ${TERMINAL_TONE_WORDS[n.tone]}.`);
  }
  for (const l of next.links) {
    const p = prev.links.find((x) => x.id === l.id);
    if (p && p.tone !== l.tone && l.tone !== "down") out.push(`${l.label} now ${TERMINAL_TONE_WORDS[l.tone]}.`);
  }
  return out;
}

// "Read the terminal": the map, the meters and the last output in a few
// sentences.
export function terminalSentence(v: TerminalView): string {
  const parts: string[] = [];
  parts.push(`Prompt ${v.prompt}.`);
  parts.push(`Map: ${v.nodes.map((n) => `${n.spokenLabel} ${TERMINAL_TONE_WORDS[n.tone]}`).join("; ")}.`);
  const notUp = v.links.filter((l) => l.tone !== "up");
  if (v.links.length) parts.push(notUp.length ? `Links not up: ${notUp.map((l) => `${l.label} ${TERMINAL_TONE_WORDS[l.tone]}`).join("; ")}.` : "Every link is up.");
  for (const m of v.meters) parts.push(`${m.label}: ${m.text}.`);
  const errors = v.transcript.filter((e) => e.error);
  if (errors.length) parts.push(`Latest error: ${spokenText(errors[errors.length - 1].text)}`);
  const last = v.transcript[v.transcript.length - 1];
  if (last) parts.push(`Latest output at ${last.time}: ${spokenText(last.text)}`);
  else parts.push("No output yet.");
  return parts.join(" ");
}

// ---- the command line ----

export interface TerminalCommand {
  text: string; // what the learner types or picks: "systemctl restart shopd"
  action: string;
  params?: CommandParams;
  available: boolean;
  why: string | null;
  // true when the action needs a form or another param kind the line cannot
  // fill: the learner picks it from the action list instead
  needsForm: boolean;
}

const MAX_COMMANDS = 200;

// The phase's actions as complete command lines: a plain action is its label;
// an action whose params are all choices is its label followed by one option
// label per param (every combination, at most MAX_COMMANDS lines in all).
export function terminalCommands(actions: ActionView[]): TerminalCommand[] {
  const out: TerminalCommand[] = [];
  for (const a of actions) {
    if (out.length >= MAX_COMMANDS) break;
    const base = { action: a.id, available: a.available, why: a.why };
    if (!a.params.length) {
      out.push({ ...base, text: a.label, needsForm: false });
      continue;
    }
    if (!a.params.every((p) => p.kind === "choice")) {
      out.push({ ...base, text: a.label, needsForm: true });
      continue;
    }
    let combos: { words: string[]; params: CommandParams }[] = [{ words: [], params: {} }];
    for (const p of a.params) {
      if (p.kind !== "choice") continue;
      const next: typeof combos = [];
      for (const c of combos) for (const o of p.options) next.push({ words: [...c.words, o.label], params: { ...c.params, [p.id]: o.value } });
      combos = next.slice(0, MAX_COMMANDS);
    }
    for (const c of combos) {
      if (out.length >= MAX_COMMANDS) break;
      out.push({ ...base, text: [a.label, ...c.words].join(" "), params: c.params, needsForm: false });
    }
  }
  return out;
}

export function normalizeCommand(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

// Exactly one of the commands, ignoring case and extra spaces; never a
// partial or fuzzy match, so what runs is what the learner meant.
export function matchCommand(cmds: TerminalCommand[], typed: string): TerminalCommand | null {
  const n = normalizeCommand(typed);
  if (!n) return null;
  return cmds.find((c) => normalizeCommand(c.text) === n) ?? null;
}

// Up to `max` commands for what is typed so far: those that start with it
// first, then those that contain it; available ones before the others.
export function suggestCommands(cmds: TerminalCommand[], typed: string, max = 6): TerminalCommand[] {
  const n = normalizeCommand(typed);
  if (!n) return [];
  const starts = cmds.filter((c) => normalizeCommand(c.text).startsWith(n));
  const contains = cmds.filter((c) => !normalizeCommand(c.text).startsWith(n) && normalizeCommand(c.text).includes(n));
  const all = [...starts, ...contains];
  return [...all.filter((c) => c.available), ...all.filter((c) => !c.available)].slice(0, max);
}

// What the command line says about a typed line that is not runnable.
export function commandProblem(cmds: TerminalCommand[], typed: string): string | null {
  const n = normalizeCommand(typed);
  if (!n) return "Type a command or pick one from the list.";
  const m = matchCommand(cmds, typed);
  if (!m) return `${typed.trim()}: not available in this lab. Pick a command from the suggestions or the action list.`;
  if (m.needsForm) return `${m.text} needs its details: open it from the action list.`;
  if (!m.available) return `${m.text}: not available now${m.why ? `. ${m.why}` : "."}`;
  return null;
}
