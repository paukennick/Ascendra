// REQ-209 (docs/sims.md 5.4a-5.4e): pace, focused start, the calm-skip offer,
// teaching prompts and chapter breaks, as the app decides them. Pure: every
// rule that touches sim state lives in the engine (calmSkip, teachingDue,
// chapterDue); this file adds only what the engine cannot know (wall-clock
// idle time, labels, what to say aloud) and turns the learner's choices into
// commands. None of it changes sim state.
import { calmSkip, chapterDue, clockMode, simTimeText, teachingDue } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import type { Pace, ScenarioDoc, Source, WaitInfo } from "../engine/v1/types.ts";
import type { CommandInput, Pacing } from "./session.ts";

export const PACE_STUDY: Pace = 3;
export const PACE_EXAM: Pace = 1;
// "Nothing has changed for about 30 real seconds" (the brief's number).
export const CALM_IDLE_MS = 30_000;

// ---- pace ----

// Real milliseconds per sim tick at a pace; the frame clock (clock.ts) takes it.
export function tickMsFor(pace: Pace): number {
  return 1000 / pace;
}

export interface PaceOption {
  pace: Pace;
  label: string;
  hint: string;
  selected: boolean;
  a11y: string;
}

export function paceOptions(current: Pace): PaceOption[] {
  return [
    {
      pace: PACE_STUDY,
      label: "Study pace (3x)",
      hint: "One real minute is three sim minutes. Same patient, same timings, less waiting.",
      selected: current === PACE_STUDY,
      a11y: `Study pace, three times. One real minute is three sim minutes.${current === PACE_STUDY ? " Selected." : ""}`,
    },
    {
      pace: PACE_EXAM,
      label: "Exam realism (1x)",
      hint: "One real minute is one sim minute. A full case takes as long as it would at the bedside.",
      selected: current === PACE_EXAM,
      a11y: `Exam realism, real time. One real minute is one sim minute.${current === PACE_EXAM ? " Selected." : ""}`,
    },
  ];
}

// A scenario's pace can be changed any time the run is open and offers pacing.
export function paceChangeable(run: Run, pacing: Pacing): boolean {
  return pacing.eligible && !run.state.ended;
}

export function paceNote(pace: Pace): string {
  return pace === PACE_STUDY ? "Study pace: 3x" : "Exam realism: 1x";
}

// The sim clock, shown prominently and read aloud with the pace.
export function simClock(run: Run, pacing: Pacing): { text: string; elapsed: string; spoken: string } {
  const text = simTimeText(run);
  const seconds = run.state.tick * run.c.dt;
  const min = Math.floor(seconds / 60);
  const elapsed = min >= 1 ? `${min} min elapsed` : "just started";
  const pace = pacing.eligible && clockMode(run) === "running" ? `. ${paceNote(run.pace)}` : "";
  return { text, elapsed, spoken: `Sim time ${text}, ${elapsed}${pace}` };
}

// ---- launch: pace and start point, chosen before the clock first runs ----

export interface LaunchChoice {
  pace: Pace;
  start: "full" | "focused";
}

export interface LaunchView {
  paces: PaceOption[];
  starts: { id: "full" | "focused"; label: string; summary: string }[];
  defaults: LaunchChoice;
}

// A fresh run of a scenario that offers pacing asks once. A run that already
// has commands (every run begun before REQ-209) is never asked.
export function needsLaunchChoice(run: Run, pacing: Pacing): boolean {
  return pacing.eligible && run.lastSeq === 0 && !run.state.ended;
}

export function launchView(doc: ScenarioDoc, pacing: Pacing, choice: LaunchChoice): LaunchView {
  const starts: LaunchView["starts"] = [{ id: "full", label: "Full case", summary: "From the handover, with the quiet minutes before anything changes." }];
  if (doc.focusedStart) starts.push({ id: "focused", label: doc.focusedStart.label, summary: doc.focusedStart.summary });
  return { paces: paceOptions(choice.pace), starts, defaults: { pace: pacing.defaultPace, start: "full" } };
}

// The commands the launch card issues, in order. "Full case" adds no begin
// command, so its log is the same as a run before REQ-209 apart from the pace.
export function launchCommands(doc: ScenarioDoc, pacing: Pacing, choice: LaunchChoice): CommandInput[] {
  if (!pacing.eligible) return [];
  const out: CommandInput[] = [];
  if (choice.start === "focused" && doc.focusedStart) out.push({ type: "begin", start: "focused" });
  out.push({ type: "pace", pace: choice.pace });
  return out;
}

// ---- the calm-skip offer ----

export interface IdleState {
  signature: string;
  since: number;
}

// What counts as "something changed": a new log line or finding, a command,
// a phase change, or a prompt or reasoning moment opening. Wall-clock idle
// time counts only while the clock is running.
export function idleSignature(run: Run): string {
  return `${run.log.length}|${run.findings.length}|${run.lastSeq}|${run.state.phase}|${run.state.openPrompt ?? ""}|${run.state.openReasoning ?? ""}`;
}

export function trackIdle(prev: IdleState | null, run: Run, nowMs: number, running: boolean): { state: IdleState; idleMs: number } {
  const signature = idleSignature(run);
  if (!prev || prev.signature !== signature || !running) return { state: { signature, since: nowMs }, idleMs: 0 };
  return { state: prev, idleMs: Math.max(0, nowMs - prev.since) };
}

export interface CalmOffer {
  wait: WaitInfo;
  label: string;
  a11y: string;
  simSeconds: number;
}

export function spanWords(seconds: number): string {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} seconds`;
  const min = Math.round(seconds / 60);
  return min === 1 ? "about 1 minute" : `about ${min} minutes`;
}

// "Skip to the next change", or null. The engine decides whether anything is
// alarming, pending or due soon; the app adds the 30 real seconds of quiet.
export function calmOffer(run: Run, pacing: Pacing, idleMs: number): CalmOffer | null {
  if (!pacing.eligible || idleMs < CALM_IDLE_MS) return null;
  const wait = calmSkip(run);
  if (!wait) return null;
  const simSeconds = (wait.due - run.state.tick) * run.c.dt;
  return {
    wait,
    label: "Skip to the next change",
    a11y: `Skip to the next change: ${wait.skipLabel}. Skips ${spanWords(simSeconds)} of simulated time. It stops early if an alarm or a result comes in.`,
    simSeconds,
  };
}

// ---- teaching prompts: shown while a named wait runs, answered by choice ----

export interface TeachOffer {
  id: string;
  ask: string;
  choices: { id: string; label: string }[];
}

export function teachOffer(run: Run, pacing: Pacing): TeachOffer | null {
  if (!pacing.eligible) return null;
  const due = teachingDue(run);
  return due ? { id: due.id, ask: due.prompt.ask, choices: due.prompt.choices.map((c) => ({ id: c.id, label: c.label })) } : null;
}

export interface TeachFeedback {
  matched: boolean;
  headline: string;
  expected: string;
  explain: string;
  source: Pick<Source, "cite" | "url" | "note">;
}

// Shown right after the answer. Not scored: the headline says so.
export function teachFeedback(doc: ScenarioDoc, promptId: string, choiceId: string): TeachFeedback | null {
  const tp = (doc.teaching ?? {})[promptId];
  if (!tp) return null;
  const expected = tp.choices.find((c) => c.id === tp.expect)?.label ?? "";
  const matched = tp.expect === choiceId;
  return {
    matched,
    headline: matched ? "That matches the evidence. (Not scored.)" : `The evidence points to: ${expected}. (Not scored.)`,
    expected,
    explain: tp.explain,
    source: { cite: tp.source.cite, url: tp.source.url, note: tp.source.note },
  };
}

// ---- chapters ----

export interface ChapterOffer {
  id: string;
  title: string;
  continueLabel: string;
  laterLabel: string;
  a11y: string;
}

// The boundary reached and not yet answered. The app pauses the clock while
// it is shown, so the learner is never raced by it.
export function chapterOffer(run: Run, pacing: Pacing): ChapterOffer | null {
  if (!pacing.eligible) return null;
  const c = chapterDue(run);
  if (!c) return null;
  return {
    id: c.id,
    title: c.label,
    continueLabel: "Continue",
    laterLabel: "Save and finish later",
    a11y: `Chapter done: ${c.label}. The clock is paused. Continue now, or save and finish later. Your run is saved either way and picks up here, on any device.`,
  };
}

export function chapterCommand(offer: ChapterOffer, choice: "continue" | "later"): CommandInput {
  return { type: "chapter", chapter: offer.id, choice };
}
