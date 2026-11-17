// REQ-314 (docs/sims.md 22.27): the sandbox report's view model, pure. The
// report reveals itself as the analyst works: static findings, the process
// tree (each process under its parent, with its depth), the network calls
// (defanged), then the analyst's own indicators and draft rules with a status
// in words, and the hosts in scope with the console's tones. Defensive only:
// the document carries no payload and nothing runnable (lint), and the screen
// shows text, never a link.
import type { Run } from "../engine/v1/engine.ts";
import type { ConsoleTone, IndicatorTone, IndicatorType, RuleTone } from "../engine/v1/types.ts";
import { burst, oneOf, text, truthy, value } from "./bindings.ts";

export const INDICATOR_TONE_WORDS: Record<IndicatorTone, string> = { unreviewed: "not reviewed", confirmed: "confirmed malicious", benign: "benign", actioned: "blocked or shared" };
export const RULE_TONE_WORDS: Record<RuleTone, string> = { draft: "draft", tested: "tested", noisy: "too noisy", deployed: "deployed" };
export const HOST_TONE_WORDS: Record<ConsoleTone, string> = { ok: "normal", watch: "under watch", bad: "infected", held: "contained" };
export const INDICATOR_TYPE_WORDS: Record<IndicatorType, string> = { hash: "File hash", domain: "Domain", ip: "IP address", url: "URL", file: "File path", registry: "Registry key", mutex: "Mutex", other: "Indicator" };
const I_TONES: readonly IndicatorTone[] = ["unreviewed", "confirmed", "benign", "actioned"];
const R_TONES: readonly RuleTone[] = ["draft", "tested", "noisy", "deployed"];
const H_TONES: readonly ConsoleTone[] = ["ok", "watch", "bad", "held"];

export interface ReportLineView { id: string; label: string; text: string; flag: boolean; depth: number; a11y: string }
export interface IndicatorView { id: string; type: IndicatorType; value: string; status: string; tone: IndicatorTone; a11y: string }
export interface RuleView { id: string; kind: "yara" | "sigma" | "other"; label: string; text: string; status: string; tone: RuleTone; a11y: string }
export interface HostView { id: string; label: string; spokenLabel: string; kind: string; status: string; tone: ConsoleTone; a11y: string }

export interface SandboxView {
  sample: { name: string; summary: string };
  static: ReportLineView[];
  processes: ReportLineView[];
  network: ReportLineView[];
  indicators: IndicatorView[];
  rules: RuleView[];
  hosts: HostView[];
  meters: { id: string; label: string; text: string }[];
  flagged: number;
}

const mark = (flag: boolean): string => (flag ? "Malicious. " : "");

export function sandboxView(run: Run): SandboxView | null {
  const b = run.c.doc.screen.sandbox;
  if (!b) return null;
  const stat = b.static
    .filter((l) => truthy(run, l.when))
    .map((l) => {
      const t = text(run, l.text);
      const flag = truthy(run, l.flag);
      return { id: l.id, label: l.label, text: t, flag, depth: 0, a11y: `${mark(flag)}${l.label}: ${t}` };
    });
  // A process shows only once it and every ancestor are shown; depth is its
  // place in the tree (the validator puts parents first).
  const depth = new Map<string, number>();
  const processes: ReportLineView[] = [];
  for (const p of b.processes) {
    if (!truthy(run, p.when)) continue;
    if (p.parent !== undefined && !depth.has(p.parent)) continue;
    const d = p.parent === undefined ? 0 : (depth.get(p.parent) ?? 0) + 1;
    depth.set(p.id, d);
    const t = text(run, p.detail);
    const flag = truthy(run, p.flag);
    const parent = p.parent !== undefined ? b.processes.find((x) => x.id === p.parent)?.image : undefined;
    processes.push({ id: p.id, label: p.image, text: t, flag, depth: d, a11y: `${mark(flag)}Process ${p.image}${parent ? `, started by ${parent}` : ""}, level ${d + 1}: ${t}` });
  }
  const network = b.network
    .filter((n) => truthy(run, n.when))
    .map((n) => {
      const dest = text(run, n.dest);
      const t = text(run, n.detail);
      const flag = truthy(run, n.flag);
      return { id: n.id, label: `${n.proto} ${dest}`, text: t, flag, depth: 0, a11y: `${mark(flag)}${n.proto} to ${dest}: ${t}` };
    });
  const indicators = b.indicators
    .filter((x) => truthy(run, x.when))
    .map((x) => {
      const tone = oneOf(value(run, x.tone), I_TONES, "unreviewed");
      const v = text(run, x.value);
      const status = text(run, x.status);
      return { id: x.id, type: x.type, value: v, status, tone, a11y: `${INDICATOR_TYPE_WORDS[x.type]} ${v}: ${INDICATOR_TONE_WORDS[tone]}. ${status}` };
    });
  const rules = b.rules
    .filter((x) => truthy(run, x.when))
    .map((x) => {
      const tone = oneOf(value(run, x.tone), R_TONES, "draft");
      const status = text(run, x.status);
      return { id: x.id, kind: x.kind, label: x.label, text: text(run, x.text), status, tone, a11y: `${x.kind === "other" ? "Detection" : x.kind.toUpperCase()} rule ${x.label}: ${RULE_TONE_WORDS[tone]}. ${status}. Rule text: ${text(run, x.text)}` };
    });
  const hosts = b.hosts.map((h) => {
    const tone = oneOf(value(run, h.tone), H_TONES, "watch");
    const status = text(run, h.status);
    return { id: h.id, label: h.label, spokenLabel: h.spokenLabel, kind: h.kind, status, tone, a11y: `${h.spokenLabel}, ${h.kind}: ${HOST_TONE_WORDS[tone]}. ${status}` };
  });
  const meters = (b.meters ?? []).map((m) => ({ id: m.id, label: m.label, text: text(run, m.value) }));
  const flagged = [...stat, ...processes, ...network].filter((l) => l.flag).length;
  return { sample: { name: b.sample.name, summary: text(run, b.sample.summary) }, static: stat, processes, network, indicators, rules, hosts, meters, flagged };
}

// Spoken at once: a host in scope that is infected (as an open console alert).
export function sandboxAlarmTexts(v: SandboxView | null): string[] {
  return v ? v.hosts.filter((h) => h.tone === "bad").map((h) => `${h.spokenLabel} infected`) : [];
}

// Polite news: new report lines (one sentence, a count for a burst), a host's
// tone, an indicator's or a rule's new tone.
export function sandboxNews(prev: SandboxView | null, next: SandboxView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  const seen = new Set([...prev.static, ...prev.processes, ...prev.network].map((l) => l.id));
  const fresh = [...next.static, ...next.processes, ...next.network].filter((l) => !seen.has(l.id)).map((l) => l.a11y);
  out.push(...burst(fresh.reverse(), "New in the report.", "new report lines."));
  for (const h of next.hosts) {
    const p = prev.hosts.find((x) => x.id === h.id);
    if (p && p.tone !== h.tone && h.tone !== "bad") out.push(`${h.spokenLabel} now ${HOST_TONE_WORDS[h.tone]}.`);
  }
  for (const i of next.indicators) {
    const p = prev.indicators.find((x) => x.id === i.id);
    if (!p || p.tone !== i.tone) out.push(`${INDICATOR_TYPE_WORDS[i.type]} ${i.value}: ${INDICATOR_TONE_WORDS[i.tone]}.`);
  }
  for (const r of next.rules) {
    const p = prev.rules.find((x) => x.id === r.id);
    if (!p || p.tone !== r.tone || p.status !== r.status) out.push(`Rule ${r.label}: ${RULE_TONE_WORDS[r.tone]}. ${r.status}`);
  }
  return out;
}

// "Read the report": the sample, the counts, every flagged line, the hosts.
export function sandboxSentence(v: SandboxView): string {
  const parts: string[] = [`Sample ${v.sample.name}: ${v.sample.summary}.`];
  const flagged = [...v.static, ...v.processes, ...v.network].filter((l) => l.flag);
  parts.push(`${v.static.length} static findings, ${v.processes.length} processes, ${v.network.length} network calls; ${flagged.length} marked malicious.`);
  for (const l of flagged) parts.push(l.a11y.replace(/^Malicious\. /, "") + ".");
  if (v.indicators.length) parts.push(`Indicators: ${v.indicators.map((i) => `${INDICATOR_TYPE_WORDS[i.type]} ${i.value} ${INDICATOR_TONE_WORDS[i.tone]}`).join("; ")}.`);
  if (v.rules.length) parts.push(`Rules: ${v.rules.map((r) => `${r.label} ${RULE_TONE_WORDS[r.tone]}`).join("; ")}.`);
  parts.push(`Hosts: ${v.hosts.map((h) => `${h.spokenLabel} ${HOST_TONE_WORDS[h.tone]}`).join("; ")}.`);
  for (const m of v.meters) parts.push(`${m.label}: ${m.text}.`);
  return parts.join(" ");
}
