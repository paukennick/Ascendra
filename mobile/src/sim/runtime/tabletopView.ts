// REQ-313 (docs/sims.md 22.19 proposal, 22.26): the tabletop exercise's view
// model, pure, like the console's. Everything is read from the document's
// `screen.tabletop` bindings over the run: the injects as the facilitator's
// timeline (oldest first, the order a table reads them), the roles around the
// table, the communications by audience, the decision log and the meters.
// The renderer holds no rule of its own.
import { renderTemplate, simTimeText } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import { evaluate } from "../engine/v1/eval.ts";
import { parseCached } from "../engine/v1/parser.ts";
import type { CommsTone, RoleTone } from "../engine/v1/types.ts";

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

export const ROLE_WORDS: Record<RoleTone, string> = { engaged: "engaged", waiting: "not yet involved", gap: "gap: not covered by the plan" };
export const COMMS_WORDS: Record<CommsTone, string> = { none: "not started", draft: "drafted, not yet reviewed", cleared: "reviewed by legal", sent: "sent", late: "late" };

export interface InjectView {
  id: string;
  title: string;
  text: string;
  open: boolean;
  time: string;
  at: number;
  a11y: string;
}

export interface RoleView {
  id: string;
  label: string;
  spokenLabel: string;
  status: string;
  tone: RoleTone;
  a11y: string;
}

export interface CommsView {
  id: string;
  label: string;
  spokenLabel: string;
  status: string;
  tone: CommsTone;
  a11y: string;
}

export interface TabletopView {
  injects: InjectView[];
  roles: RoleView[];
  comms: CommsView[];
  decisions: { label: string; items: string[] } | null;
  meters: { id: string; label: string; text: string }[];
  openCount: number;
}

function roleTone(v: unknown): RoleTone {
  return v === "engaged" || v === "waiting" || v === "gap" ? v : "waiting";
}

function commsTone(v: unknown): CommsTone {
  return v === "none" || v === "draft" || v === "cleared" || v === "sent" || v === "late" ? v : "none";
}

// Oldest first: a table works through injects in the order they arrive; ties
// keep the authored order (arrays keep their order in jsonb, FAIL-1222).
export function tabletopView(run: Run): TabletopView | null {
  const t = run.c.doc.screen.tabletop;
  if (!t) return null;
  const injects = t.injects
    .map((j, i) => ({ j, i }))
    .filter(({ j }) => value(run, j.when) === true)
    .map(({ j, i }) => {
      const at = seconds(run, j.at);
      const open = value(run, j.open) === true;
      const title = text(run, j.title);
      const body = text(run, j.text);
      const time = clockAt(run, at);
      return { i, v: { id: j.id, title, text: body, open, time, at, a11y: `${open ? "Waiting for a decision. " : ""}Inject at ${time}: ${title}. ${body}` } };
    })
    .sort((x, y) => x.v.at - y.v.at || x.i - y.i)
    .map((x) => x.v);
  const roles = t.roles.map((r) => {
    const tone = roleTone(value(run, r.tone));
    const status = text(run, r.status);
    return { id: r.id, label: r.label, spokenLabel: r.spokenLabel, status, tone, a11y: `${r.spokenLabel}: ${ROLE_WORDS[tone]}. ${status}` };
  });
  const comms = t.comms.map((c) => {
    const tone = commsTone(value(run, c.tone));
    const status = text(run, c.status);
    return { id: c.id, label: c.label, spokenLabel: c.spokenLabel, status, tone, a11y: `${c.spokenLabel}: ${COMMS_WORDS[tone]}. ${status}` };
  });
  const decisions = t.decisions ? { label: t.decisions.label, items: t.decisions.items.filter((it) => value(run, it.when) === true).map((it) => text(run, it.label)) } : null;
  const meters = (t.meters ?? []).map((m) => ({ id: m.id, label: m.label, text: text(run, m.value) }));
  return { injects, roles, comms, decisions, meters, openCount: injects.filter((j) => j.open).length };
}

// An inject waiting for the team's decision is spoken at once, like an alarm,
// and again as cleared once decided; a communication gone late is too.
export function tabletopAlarmTexts(v: TabletopView | null): string[] {
  if (!v) return [];
  return [...v.injects.filter((j) => j.open).map((j) => `New inject: ${j.title}`), ...v.comms.filter((c) => c.tone === "late").map((c) => `${c.spokenLabel} is late`)];
}

// What changed since the last frame, for polite announcements: a role or a
// communication whose state moved, a decided inject's new text, a new line in
// the decision log.
export function tabletopNews(prev: TabletopView | null, next: TabletopView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  for (const r of next.roles) {
    const p = prev.roles.find((x) => x.id === r.id);
    if (p && (p.tone !== r.tone || p.status !== r.status)) out.push(`${r.spokenLabel} now ${ROLE_WORDS[r.tone]}. ${r.status}`);
  }
  for (const c of next.comms) {
    if (c.tone === "late") continue;
    const p = prev.comms.find((x) => x.id === c.id);
    if (p && (p.tone !== c.tone || p.status !== c.status)) out.push(`${c.spokenLabel} now ${COMMS_WORDS[c.tone]}. ${c.status}`);
  }
  for (const j of next.injects) {
    if (j.open) continue;
    const p = prev.injects.find((x) => x.id === j.id);
    if (!p) out.push(`New inject. ${j.a11y}`);
  }
  const before = new Set(prev.decisions?.items ?? []);
  for (const it of next.decisions?.items ?? []) if (!before.has(it)) out.push(`Decided: ${it}`);
  return out;
}

// "Read the table": the open injects, the roles, the communications, the
// meters and the latest decision.
export function tabletopSentence(v: TabletopView): string {
  const open = v.injects.filter((j) => j.open);
  const parts: string[] = [];
  parts.push(open.length ? `${open.length} ${open.length === 1 ? "inject" : "injects"} waiting for a decision: ${open.map((j) => `${j.time}, ${j.title}. ${j.text}`).join("; ")}.` : "No inject waiting for a decision.");
  parts.push(`Roles: ${v.roles.map((r) => `${r.spokenLabel} ${ROLE_WORDS[r.tone]}`).join("; ")}.`);
  if (v.comms.length) parts.push(`Communications: ${v.comms.map((c) => `${c.spokenLabel} ${COMMS_WORDS[c.tone]}`).join("; ")}.`);
  for (const m of v.meters) parts.push(`${m.label}: ${m.text}.`);
  const items = v.decisions?.items ?? [];
  if (items.length) parts.push(`Latest decision: ${items[items.length - 1]}.`);
  return parts.join(" ");
}
