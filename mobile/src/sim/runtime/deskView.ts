// REQ-311 (docs/sims.md 22.24): the ITIL service desk's view model, pure, like
// the console's. Everything is read from the document's `screen.desk`
// bindings over the run: the queue (open tickets first, then by priority,
// then by how soon the service level target falls due), the priority matrix
// the learner assigns by, and the services with a status in words and a tone.
// An open ticket past its target is breached and spoken at once, like an
// alarm. The renderer holds no rule of its own: priority is what the scenario
// assigned, never computed here.
import { renderTemplate, simTimeText } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import { evaluate } from "../engine/v1/eval.ts";
import { parseCached } from "../engine/v1/parser.ts";
import type { DeskKind, DeskTone } from "../engine/v1/types.ts";

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

function numberOf(run: Run, expr: string): number {
  const v = value(run, expr);
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function clockAt(run: Run, s: number): string {
  const dt = run.c.dt > 0 ? run.c.dt : 1;
  return simTimeText(run, Math.floor(Math.max(0, s) / dt));
}

export const KIND_WORDS: Record<DeskKind, string> = { incident: "Incident", request: "Service request", problem: "Problem", change: "Change" };
export const DESK_TONE_WORDS: Record<DeskTone, string> = { ok: "operating normally", degraded: "degraded", down: "down", maintenance: "in planned maintenance" };

// "1 h 20 min", "45 min"
export function spanText(secs: number): string {
  const s = Math.max(0, Math.round(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${Math.max(m, s > 0 ? 1 : 0)} min`;
}

export interface TicketView {
  id: string;
  ref: string;
  kind: DeskKind;
  title: string;
  impact: number;
  urgency: number;
  impactWord: string;
  urgencyWord: string;
  priority: number; // 0 when not yet assigned
  priorityText: string; // "P1", or "Not prioritized"
  status: string;
  assignee: string | null;
  open: boolean;
  opened: string;
  at: number;
  due: number; // sim seconds; negative when no target applies
  dueText: string; // "Due in 1 h 20 min", "Breached 10 min ago", "No target", "Met"
  breached: boolean;
  a11y: string;
}

export interface DeskView {
  matrix: { impacts: string[]; urgencies: string[]; priorities: number[][]; targets: { priority: number; label: string }[]; a11y: string };
  tickets: TicketView[];
  services: { id: string; label: string; spokenLabel: string; status: string; tone: DeskTone; a11y: string }[];
  meters: { id: string; label: string; text: string }[];
  openCount: number;
  breachedCount: number;
}

function toneOf(v: unknown): DeskTone {
  return v === "ok" || v === "degraded" || v === "down" || v === "maintenance" ? v : "degraded";
}

function levelWord(levels: string[], n: number): string {
  return n >= 1 && n <= levels.length ? levels[n - 1] : "not assessed";
}

export function deskView(run: Run): DeskView | null {
  const d = run.c.doc.screen.desk;
  if (!d) return null;
  const now = run.state.tick * run.c.dt;
  const m = d.matrix;
  const tickets = d.tickets
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => value(run, t.when) === true)
    .map(({ t, i }) => {
      const at = Math.max(0, numberOf(run, t.at));
      const impact = Math.round(numberOf(run, t.impact));
      const urgency = Math.round(numberOf(run, t.urgency));
      const priority = Math.round(numberOf(run, t.priority));
      const open = value(run, t.open) === true;
      const due = numberOf(run, t.due);
      const breached = open && due >= 0 && now > due;
      const dueText = due < 0 ? "No target" : !open ? "Closed" : breached ? `Breached ${spanText(now - due)} ago` : `Due in ${spanText(due - now)}`;
      const title = text(run, t.title);
      const status = text(run, t.status);
      const assignee = t.assignee ? text(run, t.assignee) : null;
      const priorityText = priority >= 1 ? `P${priority}` : "Not prioritized";
      const impactWord = levelWord(m.impacts, impact);
      const urgencyWord = levelWord(m.urgencies, urgency);
      const a11y = `${breached ? "Breached. " : ""}${KIND_WORDS[t.kind] ?? t.kind} ${t.ref}, ${priority >= 1 ? `priority ${priority}` : "not prioritized"}: ${title}. Impact ${impactWord}, urgency ${urgencyWord}. ${status}.${assignee ? ` With ${assignee}.` : ""} ${dueText}.`;
      return { i, v: { id: t.id, ref: t.ref, kind: t.kind, title, impact, urgency, impactWord, urgencyWord, priority, priorityText, status, assignee, open, opened: clockAt(run, at), at, due, dueText, breached, a11y } };
    })
    .sort((x, y) => {
      const pa = x.v.priority >= 1 ? x.v.priority : 99;
      const pb = y.v.priority >= 1 ? y.v.priority : 99;
      const da = x.v.due >= 0 ? x.v.due : Number.MAX_SAFE_INTEGER;
      const db = y.v.due >= 0 ? y.v.due : Number.MAX_SAFE_INTEGER;
      return Number(y.v.open) - Number(x.v.open) || Number(y.v.breached) - Number(x.v.breached) || pa - pb || da - db || x.v.at - y.v.at || x.i - y.i;
    })
    .map((x) => x.v);
  const services = d.services.map((s) => {
    const tone = toneOf(value(run, s.tone));
    const status = text(run, s.status);
    return { id: s.id, label: s.label, spokenLabel: s.spokenLabel, status, tone, a11y: `${s.spokenLabel}: ${DESK_TONE_WORDS[tone]}. ${status}` };
  });
  const rows = m.impacts.map((imp, r) => `Impact ${imp}: ${m.urgencies.map((u, c) => `urgency ${u} is P${m.priorities[r]?.[c] ?? "?"}`).join(", ")}`);
  const targets = m.targets.map((t) => `P${t.priority} ${t.label}`).join("; ");
  const matrix = { impacts: m.impacts, urgencies: m.urgencies, priorities: m.priorities, targets: m.targets, a11y: `Priority matrix. ${rows.join(". ")}. Targets: ${targets}.` };
  const meters = (d.meters ?? []).map((x) => ({ id: x.id, label: x.label, text: text(run, x.value) }));
  return { matrix, tickets, services, meters, openCount: tickets.filter((t) => t.open).length, breachedCount: tickets.filter((t) => t.breached).length };
}

// Spoken at once (13.2): a breached ticket, and a service that is down.
export function deskAlarmTexts(v: DeskView | null): string[] {
  if (!v) return [];
  return [...v.tickets.filter((t) => t.breached).map((t) => `${t.ref} breached its target: ${t.title}`), ...v.services.filter((s) => s.tone === "down").map((s) => `${s.spokenLabel} is down`)];
}

// What changed since the last frame, for polite announcements: a new ticket
// in the queue, a ticket's priority or status that changed, a service whose
// tone moved.
export function deskNews(prev: DeskView | null, next: DeskView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  for (const t of next.tickets) {
    const p = prev.tickets.find((x) => x.id === t.id);
    if (!p) out.push(`New ${KIND_WORDS[t.kind].toLowerCase()} ${t.ref}: ${t.title}.`);
    else {
      if (p.priority !== t.priority) out.push(`${t.ref} is now ${t.priorityText}.`);
      if (p.status !== t.status) out.push(`${t.ref}: ${t.status}.`);
    }
  }
  for (const s of next.services) {
    const p = prev.services.find((x) => x.id === s.id);
    if (p && p.tone !== s.tone && s.tone !== "down") out.push(`${s.spokenLabel} now ${DESK_TONE_WORDS[s.tone]}.`);
  }
  return out;
}

// "Read the queue": the whole screen in a few sentences.
export function deskSentence(v: DeskView): string {
  const open = v.tickets.filter((t) => t.open);
  const parts: string[] = [];
  parts.push(open.length ? `${open.length} open ${open.length === 1 ? "ticket" : "tickets"}${v.breachedCount ? `, ${v.breachedCount} breached` : ""}. ${open.map((t) => `${t.ref}, ${t.priorityText}, ${t.title}, ${t.dueText}`).join("; ")}.` : "The queue is clear.");
  parts.push(`Services: ${v.services.map((s) => `${s.spokenLabel} ${DESK_TONE_WORDS[s.tone]}`).join("; ")}.`);
  for (const m of v.meters) parts.push(`${m.label}: ${m.text}.`);
  return parts.join(" ");
}
