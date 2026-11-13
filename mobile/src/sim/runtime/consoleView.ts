// REQ-231 (docs/sims.md 20, 20.1, 22.7): the security operations console's
// view model, pure, like the session's (view.ts). Everything is read from the
// document's `screen.console` bindings over the run: the alert queue (newest
// first, open alerts spoken at once like alarms), the log and event lines
// (newest first, with the log they came from), and the assets with a status
// in words and a tone. The renderer holds no rule of its own.
import { renderTemplate, simTimeText } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import { evaluate } from "../engine/v1/eval.ts";
import { parseCached } from "../engine/v1/parser.ts";
import type { ConsoleSeverity, ConsoleTone } from "../engine/v1/types.ts";

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

export const SEVERITY_WORDS: Record<ConsoleSeverity, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
export const TONE_WORDS: Record<ConsoleTone, string> = { ok: "normal", watch: "under watch", bad: "compromised", held: "contained" };
const SEVERITY_RANK: Record<ConsoleSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export interface ConsoleAlertView {
  id: string;
  severity: ConsoleSeverity;
  title: string;
  detail: string | null;
  status: string;
  open: boolean;
  time: string;
  at: number;
  a11y: string;
}

export interface ConsoleEventView {
  id: string;
  source: string;
  text: string;
  time: string;
  at: number;
  a11y: string;
}

export interface ConsoleAssetView {
  id: string;
  label: string;
  spokenLabel: string;
  kind: string;
  status: string;
  tone: ConsoleTone;
  a11y: string;
}

export interface ConsoleView {
  alerts: ConsoleAlertView[];
  events: ConsoleEventView[];
  assets: ConsoleAssetView[];
  meters: { id: string; label: string; text: string }[];
  openCount: number;
}

function toneOf(v: unknown): ConsoleTone {
  return v === "ok" || v === "watch" || v === "bad" || v === "held" ? v : "watch";
}

// Newest first; ties keep the authored order (arrays keep their order in
// jsonb, unlike object keys, FAIL-1222). The alert queue puts open alerts
// before closed ones and, at the same time, the more severe first.
export function consoleView(run: Run, eventLimit = 40): ConsoleView | null {
  const c = run.c.doc.screen.console;
  if (!c) return null;
  const alerts = c.alerts
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => value(run, a.when) === true)
    .map(({ a, i }) => {
      const at = seconds(run, a.at);
      const open = value(run, a.open) === true;
      const title = text(run, a.title);
      const status = text(run, a.status);
      const detail = a.detail ? text(run, a.detail) : null;
      const time = clockAt(run, at);
      const sev = SEVERITY_WORDS[a.severity] ?? a.severity;
      return {
        i,
        v: {
          id: a.id,
          severity: a.severity,
          title,
          detail,
          status,
          open,
          time,
          at,
          a11y: `${sev} alert at ${time}: ${title}. ${status}.${detail ? ` ${detail}` : ""}`,
        },
      };
    })
    .sort((x, y) => Number(y.v.open) - Number(x.v.open) || y.v.at - x.v.at || (SEVERITY_RANK[x.v.severity] ?? 9) - (SEVERITY_RANK[y.v.severity] ?? 9) || x.i - y.i)
    .map((x) => x.v);
  const events = c.events
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => value(run, e.when) === true)
    .map(({ e, i }) => {
      const at = seconds(run, e.at);
      const t = text(run, e.text);
      const time = clockAt(run, at);
      return { i, v: { id: e.id, source: e.source, text: t, time, at, a11y: `${time}, ${e.source}: ${t}` } };
    })
    .sort((x, y) => y.v.at - x.v.at || y.i - x.i)
    .slice(0, eventLimit)
    .map((x) => x.v);
  const assets = c.assets.map((a) => {
    const tone = toneOf(value(run, a.tone));
    const status = text(run, a.status);
    return { id: a.id, label: a.label, spokenLabel: a.spokenLabel, kind: a.kind, status, tone, a11y: `${a.spokenLabel}, ${a.kind}: ${TONE_WORDS[tone]}. ${status}` };
  });
  const meters = (c.meters ?? []).map((m) => ({ id: m.id, label: m.label, text: text(run, m.value) }));
  return { alerts, events, assets, meters, openCount: alerts.filter((a) => a.open).length };
}

// Open alerts are spoken at once, like a monitor alarm (13.2): entering the
// list is assertive, leaving it (closed or contained) is assertive too. The
// text is the severity and title only, so a status change does not repeat it.
export function consoleAlarmTexts(v: ConsoleView | null): string[] {
  return v ? v.alerts.filter((a) => a.open).map((a) => `${SEVERITY_WORDS[a.severity] ?? a.severity} severity: ${a.title}`) : [];
}

// What changed since the last frame, for polite announcements (at most one
// polite sentence per 10 s, the announcer's rate): an asset whose tone moved
// (compromised, contained), a closed alert's new status, and new log lines,
// summarized as a count and the newest line so a burst is one sentence.
export function consoleNews(prev: ConsoleView | null, next: ConsoleView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  for (const a of next.assets) {
    const p = prev.assets.find((x) => x.id === a.id);
    if (p && p.tone !== a.tone) out.push(`${a.spokenLabel} now ${TONE_WORDS[a.tone]}.`);
  }
  for (const a of next.alerts) {
    if (a.open) continue;
    const p = prev.alerts.find((x) => x.id === a.id);
    if (p && p.status !== a.status) out.push(`Alert ${a.title}: ${a.status}.`);
  }
  const seen = new Set(prev.events.map((e) => e.id));
  const fresh = next.events.filter((e) => !seen.has(e.id));
  if (fresh.length === 1) out.push(`New log line. ${fresh[0].a11y}`);
  else if (fresh.length > 1) out.push(`${fresh.length} new log lines. Newest: ${fresh[0].a11y}`);
  return out;
}

// "Read the console": the whole screen in a few sentences.
export function consoleSentence(v: ConsoleView): string {
  const open = v.alerts.filter((a) => a.open);
  const parts: string[] = [];
  parts.push(open.length ? `${open.length} open ${open.length === 1 ? "alert" : "alerts"}: ${open.map((a) => `${SEVERITY_WORDS[a.severity]}, ${a.title}`).join("; ")}.` : "No open alerts.");
  parts.push(`Assets: ${v.assets.map((a) => `${a.spokenLabel} ${TONE_WORDS[a.tone]}`).join("; ")}.`);
  for (const m of v.meters) parts.push(`${m.label}: ${m.text}.`);
  if (v.events.length) parts.push(`Latest log line: ${v.events[0].a11y}`);
  return parts.join(" ");
}
