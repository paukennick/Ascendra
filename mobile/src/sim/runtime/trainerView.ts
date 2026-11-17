// REQ-314 (docs/sims.md 20, 22.27): the client trainer's view model, pure, like
// the session's and the treatment session's. The client and how they present
// now; gauges read in words; short read-outs (heart rate, RPE, the talk test)
// with a flag; the intake (PAR-Q+ questions paraphrased) with flagged answers;
// the assessment findings; the current program; the journal of check-ins,
// food records and weeks, newest first; and the scope-of-practice and stop
// rules, always shown, a met rule spoken at once.
import type { Run } from "../engine/v1/engine.ts";
import { bandWord, burst, clockAt, seconds, text, truthy, value } from "./bindings.ts";

export interface TrainerGaugeView { id: string; label: string; spokenLabel: string; value: number; max: number; word: string; a11y: string }
export interface TrainerLineView { id: string; label: string; text: string; flag: boolean; a11y: string }
export interface TrainerRuleView { id: string; label: string; text: string; met: boolean; a11y: string }
export interface JournalView { id: string; text: string; time: string; at: number; a11y: string }

export interface TrainerView {
  client: { name: string; presentation: string };
  gauges: TrainerGaugeView[];
  readings: TrainerLineView[];
  rules: TrainerRuleView[];
  intakeLabel: string | null;
  intake: TrainerLineView[];
  findings: TrainerLineView[];
  programLabel: string | null;
  program: string[];
  journal: JournalView[];
}

const flagWord = (f: boolean): string => (f ? "Flag. " : "");

export function trainerView(run: Run, journalLimit = 30): TrainerView | null {
  const tr = run.c.doc.screen.trainer;
  if (!tr) return null;
  const gauges = tr.gauges.map((g) => {
    const raw = value(run, g.value);
    const v = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    const word = bandWord(v, g.bands, g.words);
    return { id: g.id, label: g.label, spokenLabel: g.spokenLabel, value: v, max: g.max, word, a11y: `${g.spokenLabel}: ${word}` };
  });
  const readings = (tr.readings ?? [])
    .filter((r) => truthy(run, r.when, true))
    .map((r) => {
      const t = text(run, r.value);
      const flag = truthy(run, r.flag);
      return { id: r.id, label: r.label, text: t, flag, a11y: `${flagWord(flag)}${r.spokenLabel}: ${t}` };
    });
  const rules = tr.rules.map((r) => {
    const met = truthy(run, r.met);
    const t = text(run, r.text);
    return { id: r.id, label: r.label, text: t, met, a11y: `${r.label}, ${met ? "applies now" : "does not apply now"}: ${t}` };
  });
  const intake = (tr.intake?.items ?? [])
    .filter((it) => truthy(run, it.when))
    .map((it) => {
      const t = text(run, it.answer);
      const flag = truthy(run, it.flag);
      return { id: it.id, label: it.question, text: t, flag, a11y: `${flagWord(flag)}${it.question} Answer: ${t}` };
    });
  const findings = (tr.findings ?? [])
    .filter((m) => truthy(run, m.when))
    .map((m) => {
      const t = text(run, m.result);
      const flag = truthy(run, m.flag);
      return { id: m.id, label: m.label, text: t, flag, a11y: `${flagWord(flag)}${m.label}: ${t}` };
    });
  const program = (tr.program?.items ?? []).filter((it) => truthy(run, it.when)).map((it) => text(run, it.label));
  const journal = (tr.journal ?? [])
    .map((j, i) => ({ j, i }))
    .filter(({ j }) => truthy(run, j.when))
    .map(({ j, i }) => {
      const at = seconds(run, j.at);
      const time = clockAt(run, at);
      const t = text(run, j.text);
      return { i, v: { id: j.id, text: t, time, at, a11y: `${time}: ${t}` } };
    })
    .sort((x, y) => y.v.at - x.v.at || y.i - x.i)
    .slice(0, journalLimit)
    .map((x) => x.v);
  return {
    client: { name: tr.client.name, presentation: text(run, tr.client.presentation) },
    gauges,
    readings,
    rules,
    intakeLabel: tr.intake?.label ?? null,
    intake,
    findings,
    programLabel: tr.program?.label ?? null,
    program,
    journal,
  };
}

// Spoken at once: a met rule (a stop sign, a referral line crossed), a flagged
// reading, a flagged intake answer or finding.
export function trainerAlarmTexts(v: TrainerView | null): string[] {
  if (!v) return [];
  return [
    ...v.rules.filter((r) => r.met).map((r) => `${r.label}: ${r.text}`),
    ...v.readings.filter((r) => r.flag).map((r) => `${r.label}: ${r.text}`),
    ...v.intake.filter((r) => r.flag).map((r) => `Intake flag: ${r.label} ${r.text}`),
    ...v.findings.filter((r) => r.flag).map((r) => `Finding: ${r.label}, ${r.text}`),
  ];
}

// Polite news: a gauge's word, a new unflagged finding or intake answer, a
// program change, new journal entries (one sentence for a burst).
export function trainerNews(prev: TrainerView | null, next: TrainerView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  for (const g of next.gauges) {
    const p = prev.gauges.find((x) => x.id === g.id);
    if (p && p.word !== g.word) out.push(`${g.spokenLabel} now ${g.word}.`);
  }
  const seen = new Set([...prev.intake, ...prev.findings].map((l) => l.id));
  for (const l of [...next.intake, ...next.findings]) if (!seen.has(l.id) && !l.flag) out.push(`${l.a11y}`);
  if (next.program.join("|") !== prev.program.join("|") && next.program.length) out.push(`Program updated: ${next.program[next.program.length - 1]}`);
  const js = new Set(prev.journal.map((j) => j.id));
  out.push(...burst(next.journal.filter((j) => !js.has(j.id)).map((j) => j.a11y), "New journal entry.", "new journal entries."));
  return out;
}

// "Read the client": presentation, gauges, readings, rules that apply, flags.
export function trainerSentence(v: TrainerView): string {
  const parts: string[] = [`${v.client.name}: ${v.client.presentation}.`];
  parts.push(v.gauges.map((g) => g.a11y).join("; ") + ".");
  if (v.readings.length) parts.push(v.readings.map((r) => `${r.label} ${r.text}`).join("; ") + ".");
  const met = v.rules.filter((r) => r.met);
  parts.push(met.length ? `Applies now: ${met.map((r) => r.label).join("; ")}.` : "No stop or referral rule applies now.");
  const flags = [...v.intake, ...v.findings].filter((l) => l.flag);
  if (flags.length) parts.push(`Flags: ${flags.map((l) => `${l.label} ${l.text}`).join("; ")}.`);
  if (v.program.length) parts.push(`Program: ${v.program.join("; ")}.`);
  if (v.journal.length) parts.push(`Latest journal entry: ${v.journal[0].a11y}`);
  return parts.join(" ");
}
