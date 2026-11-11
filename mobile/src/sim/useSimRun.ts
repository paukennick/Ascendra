import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Crypto from "expo-crypto";
import { api, ApiError } from "@/api/client";
import { friendlyError } from "@/lib/errorMessage";
import { useAuth } from "@/auth/AuthContext";
import { localDataGuard } from "@/lib/localData";
import { journalBackend } from "./journalStore";
import { discardNotice, journalKey, journalWriter, loadJournal, makeJournal, planJournal, SEND_BATCH, type DiscardReason, type JournalWriter } from "./runtime/journal.ts";
import type { ScenarioDoc, WaitInfo } from "./engine/v1/types.ts";
import { capsHeaders } from "./runtime/caps.ts";
import { planFrame, type Anchor } from "./runtime/clock.ts";
import { CALM_IDLE_MS, calmOffer, chapterCommand, chapterOffer, launchCommands, tickMsFor, trackIdle, type IdleState, type LaunchChoice } from "./runtime/pacing.ts";
import type { Pace } from "./engine/v1/types.ts";
import { accepted, applyServerCommand, clockRuns, issue, localHash, openSession, step, type CommandInput, type RunPayload, type Session } from "./runtime/session.ts";

// REQ-190 (docs/sims.md 5.4, 5.7, 5.9, 7, 10): one run on this device.
//
// Time: a running phase advances one tick per second of real time while the
// learner has the clock running (src/sim/runtime/clock.ts). The run starts
// paused; leaving the app pauses it; a frame gap over 3 s pauses it. Turns
// phases and waits move only through a skip, which the SERVER builds (the
// skip route), so the due tick is always the server's.
//
// Sync: every command is applied locally and queued, then sent at once; a
// heartbeat reports the tick every 10 s while the clock runs. The server
// replays and answers with what it accepted. A rejection or a hash mismatch
// reloads the run from the server, whose replay is the record. The ending's
// headline and the debrief come from the server's finish route only.
//
// REQ-199 (5.9): the unsent queue is also written to device storage before
// each send (src/sim/runtime/journal.ts) and trimmed on every
// acknowledgement, so an app kill, a crash or an over-the-air reload loses
// nothing. "Continue the run" replays the journal through the step route
// (idempotent by seq), or discards it, with a plain notice, when the run
// ended or moved on elsewhere or the served version changed. Not done yet:
// keeping the screen awake.

export interface SimDebrief {
  runId: string;
  title: string;
  ending: string | null;
  endingLabel: string;
  outcomeClass: "target" | "recovered" | "harm" | null;
  rating: "good" | "mediocre" | "bad" | null;
  processScore: number | null;
  criteria: { id: string; label: string; weight: number; critical: boolean; score: "met" | "partial" | "missed" | "na"; why: string }[];
  reasoning: { moment: string; label: string; score: string }[];
  kpis: { id: string; label: string; value: string; expert?: string }[];
  headline: string;
  body: string;
  timeline: { tick: number; time: string; text: string; kind: string }[];
  skips: number;
  pausedSeconds: number;
  seed: number;
  expertPath: { at: string; text: string }[];
  modelReasoning: string;
  reasoningAnswers: { moment: string; question: string; answer: string; status: string; verdict: string | null; feedback: string; modelAnswer: string }[];
  attempt: { id: string; verdict: string; assisted: boolean; assistReason: string | null } | null;
  endReason: string;
  // REQ-209: present only for a run that used the feature
  pacing?: { startPace: 1 | 3; finalPace: 1 | 3; changes: number; studyTicks: number; examTicks: number; note: string };
  focusedStart?: { tick: number; time: string; label: string };
  calmSkips?: number;
  teaching?: { prompt: string; ask: string; chosen: string; expected: string; matched: boolean }[];
  chapters?: { chapter: string; label: string; choice: "continue" | "later"; time: string }[];
}

export interface ReasoningResult {
  momentId: string;
  status: "graded" | "grader_failed";
  verdict: "correct" | "partial" | "incorrect" | null;
  feedback: string;
  partScores: { part: string; score: string; comment: string }[];
  fixNext: string | null;
  modelAnswer: string;
  replayed: boolean;
}

interface SyncResult {
  acceptedThrough: number;
  tick: number;
  serverHash: string;
  rejected: { seq: number; reason: string } | null;
  ended: { reason: string } | null;
  stoppedAt: number | null;
  stoppedBy: string | null;
  desync: boolean;
  command?: import("./engine/v1/types.ts").Command;
}

const FRAME_MS = 250;
const HEARTBEAT_MS = 10_000;
const now = (): number => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now());

function code(err: unknown): string | null {
  const d = err instanceof ApiError ? (err.data as { code?: unknown } | null) : null;
  return d && typeof d.code === "string" ? d.code : null;
}

export type SimStatus = "idle" | "loading" | "ready" | "finishing" | "done" | "lease_lost" | "error";

export function useSimRun(simId: string) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SimStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paused, setPaused] = useState(true);
  const [debrief, setDebrief] = useState<SimDebrief | null>(null);
  // REQ-209: the skip offer is on, the last teaching answer (for its feedback),
  // and a chapter break the learner chose to finish later.
  const [calmOn, setCalmOn] = useState(false);
  const [teachResult, setTeachResult] = useState<{ prompt: string; choice: string } | null>(null);
  const [savedLater, setSavedLater] = useState(false);
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const session = useRef<Session | null>(null);
  const docs = useRef(new Map<string, ScenarioDoc>());
  const device = useRef<string>(Crypto.randomUUID());
  const anchor = useRef<Anchor | null>(null);
  const lastFrame = useRef(0);
  const lastBeat = useRef(0);
  const idle = useRef<IdleState | null>(null);
  const chapterPausedFor = useRef<string | null>(null);
  const syncing = useRef<Promise<void> | null>(null);
  const opened = useRef<{ moment: string; openedSeq: number; openedTick: number } | null>(null);
  const attemptIds = useRef(new Map<string, string>());
  const finishing = useRef(false);
  // The run the journal belongs to (from the start route).
  const runMeta = useRef<{ runId: string; versionId: string; clientHash: string } | null>(null);
  const userId = user?.id ?? null;
  const writer = useMemo<JournalWriter | null>(() => {
    if (!userId) return null;
    const key = journalKey(userId, simId);
    return journalWriter(journalBackend, key, () => localDataGuard.mayWrite(key));
  }, [userId, simId]);
  const writerRef = useRef(writer);
  writerRef.current = writer;

  // Writes the current unsent queue to the device (an empty queue removes it).
  const persist = useCallback((): Promise<void> => {
    const s = session.current;
    const w = writerRef.current;
    const m = runMeta.current;
    if (!w) return Promise.resolve();
    if (!s || !m) return w.save(null);
    return w.save(makeJournal(simId, m, s.pending, Date.now()));
  }, [simId]);
  const dropJournal = useCallback((): Promise<void> => writerRef.current?.save(null) ?? Promise.resolve(), []);

  const finish = useCallback(async () => {
    const s = session.current;
    if (!s || finishing.current) return;
    finishing.current = true;
    setStatus("finishing");
    try {
      await flushRef.current(true);
      const d = await api.post<SimDebrief>(`/api/sims/runs/${s.runId}/finish`, { leaseEpoch: s.leaseEpoch, tick: s.run.state.tick }, { headers: capsHeaders() });
      setDebrief(d);
      setStatus("done");
      void writerRef.current?.save(null);
    } catch (err) {
      finishing.current = false;
      setStatus("ready");
      setNotice(`Your run is saved. The ending and debrief appear once the server confirms them. ${friendlyError(err, { kept: true })}`);
    }
  }, []);

  // `carry` is a notice that must survive the reload (a reload clears the
  // notice line, which used to wipe the message that announced it).
  const start = useCallback(
    async (restart: boolean, carry?: string) => {
      setStatus("loading");
      setError(null);
      setNotice(carry ?? null);
      setDebrief(null);
      finishing.current = false;
      opened.current = null;
      idle.current = null;
      chapterPausedFor.current = null;
      setCalmOn(false);
      setTeachResult(null);
      setSavedLater(false);
      try {
        // Anything still being written lands before it is read back.
        await writerRef.current?.settled();
        const w = writerRef.current;
        const journal = w && userId && !restart ? await loadJournal(journalBackend, journalKey(userId, simId), simId) : null;
        if (restart) await dropJournal();
        const cached = [...docs.current.keys()].pop() ?? null;
        const p = await api.post<RunPayload>(`/api/sims/${simId}/runs`, { restart, deviceId: device.current, cachedHash: cached }, { headers: capsHeaders() });
        const doc = p.clientDocument ?? docs.current.get(p.clientHash);
        if (!doc) throw new Error("The simulation could not be loaded. Please try again.");
        docs.current.set(p.clientHash, doc);
        runMeta.current = { runId: p.run.id, versionId: p.run.versionId, clientHash: p.clientHash };
        const plan = planJournal(journal, p);
        let replayed: Session | null = null;
        let dropped: { reason: DiscardReason; lost: number } | null = plan.kind === "discard" ? plan : null;
        if (plan.kind === "replay") {
          try {
            replayed = openSession({ ...p, commands: [...p.commands, ...plan.commands] }, doc);
            replayed.pending = plan.commands.slice();
          } catch {
            dropped = { reason: "refused", lost: plan.commands.length };
          }
        }
        session.current = replayed ?? openSession(p, doc);
        if (dropped) setNotice(discardNotice(dropped.reason, dropped.lost));
        else if (replayed) setNotice(`Restored ${replayed.pending.length === 1 ? "1 action" : `${replayed.pending.length} actions`} made before the app closed; sending ${replayed.pending.length === 1 ? "it" : "them"} to the server.`);
        if (plan.kind !== "none") await persist();
        attemptIds.current.clear();
        setPaused(true);
        anchor.current = null;
        setStatus("ready");
        if (p.run.status !== "open") {
          const d = await api.get<SimDebrief>(`/api/sims/runs/${p.run.id}/debrief`, { headers: capsHeaders() });
          setDebrief(d);
          setStatus("done");
        } else {
          if (replayed) void flushRef.current(false);
          if (session.current.run.state.ended) void finish();
        }
      } catch (err) {
        setStatus("error");
        setError(friendlyError(err));
      }
    },
    [simId, finish, userId, persist, dropJournal]
  );

  // Sends the queue (and the tick, as a heartbeat). One sync at a time.
  const flush = useCallback(
    async (withTick: boolean): Promise<void> => {
      const s = session.current;
      if (!s) return;
      if (syncing.current) await syncing.current.catch(() => undefined);
      // Write-ahead: every queued command is on the device before it is sent.
      await writerRef.current?.settled();
      if (session.current !== s) return;
      if (!s.pending.length && !withTick) return;
      const sent = s.pending.slice(0, SEND_BATCH);
      const tick = s.run.state.tick;
      const p = (async () => {
        try {
          const r = await api.post<SyncResult>(
            `/api/sims/runs/${s.runId}/commands`,
            { leaseEpoch: s.leaseEpoch, commands: sent, ...(withTick ? { tick, stateHash: localHash(s) } : {}) },
            { headers: capsHeaders() }
          );
          accepted(s, r.acceptedThrough);
          lastBeat.current = now();
          if (r.rejected && sent.some((c) => c.seq === r.rejected!.seq)) {
            // The server refused a command: the journal holds it and what
            // followed, which can never be accepted now.
            const lost = s.pending.length;
            await dropJournal();
            await start(false, `${discardNotice("refused", lost)} The run was reloaded from the server's copy.`);
          } else if (r.desync) {
            await persist();
            await start(false, "The run was out of step with the server and has been reloaded from the server's copy.");
          } else {
            await persist();
            if (s.pending.length && sent.length === SEND_BATCH) void flushRef.current(false);
          }
        } catch (err) {
          const c = code(err);
          if (c === "lease_lost") {
            const lost = s.pending.length;
            await dropJournal();
            s.pending = [];
            setStatus("lease_lost");
            setPaused(true);
            setNotice(lost ? discardNotice("lease_lost", lost) : "This run continued on another device.");
          } else if (c === "run_ended") {
            // Finished or restarted on another device.
            const lost = s.pending.length;
            await dropJournal();
            s.pending = [];
            setPaused(true);
            const msg = lost ? discardNotice("ended", lost) : "This run ended on another device.";
            try {
              const d = await api.get<SimDebrief>(`/api/sims/runs/${s.runId}/debrief`, { headers: capsHeaders() });
              setDebrief(d);
              setStatus("done");
              setNotice(msg);
            } catch {
              session.current = null;
              setStatus("idle");
              setError(msg);
            }
          } else if (c === "sync_too_fast") {
            /* a heartbeat too soon: the next one carries it */
          } else if (c === "seq_conflict" || c === "seq_gap" || c === "too_fast") {
            const lost = s.pending.length;
            await dropJournal();
            await start(false, lost ? discardNotice(c === "too_fast" ? "refused" : "moved_on", lost) : undefined);
          } else {
            setNotice(`Not saved to the server yet; it will be sent when you're back online. ${friendlyError(err, { kept: true })}`);
          }
        }
      })();
      syncing.current = p;
      await p;
      if (syncing.current === p) syncing.current = null;
    },
    [start, persist, dropJournal]
  );
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const command = useCallback(
    (input: CommandInput): boolean => {
      const s = session.current;
      if (!s || status !== "ready") return false;
      const r = issue(s, input);
      if (!r.ok) {
        setNotice(r.reason);
        return false;
      }
      if (r.stoppedBy) setNotice(`Stopped early: ${r.stoppedBy}.`);
      bump();
      // Journal first; flush waits for the write before sending.
      void persist();
      void flush(false);
      if (s.run.state.ended) void finish();
      return true;
    },
    [status, bump, flush, finish, persist]
  );

  const pause = useCallback(
    (reason: "learner" | "background" | "stall" | "idle") => {
      if (paused || !session.current || session.current.run.state.ended) return;
      setPaused(true);
      command({ type: "pause", reason });
      void flush(true);
    },
    [paused, command, flush]
  );

  const resume = useCallback(() => {
    const s = session.current;
    if (!s || !paused) return;
    command({ type: "resume" });
    anchor.current = { tick: s.run.state.tick, atMs: now() };
    lastFrame.current = now();
    setPaused(false);
  }, [paused, command]);

  // The skip route: the server builds the skip to its own due tick.
  const skipTo = useCallback(
    async (w: WaitInfo, opts?: { calm?: boolean }) => {
      const s = session.current;
      if (!s) return;
      await flush(false);
      try {
        const r = await api.post<SyncResult>(
          `/api/sims/runs/${s.runId}/skip`,
          { leaseEpoch: s.leaseEpoch, seq: s.run.lastSeq + 1, tick: s.run.state.tick, timer: w.timer, instance: w.instance, ...(opts?.calm ? { calm: true } : {}) },
          { headers: capsHeaders() }
        );
        if (r.command) {
          const a = applyServerCommand(s, r.command);
          if (!a.ok) await start(false);
        }
        setNotice(r.stoppedBy ? `Skip stopped early: ${r.stoppedBy}.` : null);
        anchor.current = { tick: s.run.state.tick, atMs: now() };
        idle.current = null;
        setCalmOn(false);
        bump();
        if (s.run.state.ended) void finish();
      } catch (err) {
        if (code(err) === "no_offer") {
          setCalmOn(false);
          setNotice("That skip is not available right now.");
        } else if (code(err) === "replay_behind") {
          await flush(true);
          setNotice("Synced with the server. Try the skip again.");
        } else setNotice(friendlyError(err));
      }
    },
    [flush, start, bump, finish]
  );

  // REQ-209: change the pace (study 3x, exam realism 1x) at any time. The
  // clock re-anchors so the change takes effect from now, not from the start.
  const choosePace = useCallback(
    (pace: Pace) => {
      const s = session.current;
      if (!s || !s.pacing.eligible || s.run.pace === pace) return;
      if (command({ type: "pace", pace })) anchor.current = { tick: s.run.state.tick, atMs: now() };
    },
    [command]
  );

  // REQ-209: the launch card's choice, then the clock. "Full case" adds no
  // begin command; a focused start is evolved by the engine from the normal start.
  const launch = useCallback(
    (choice: LaunchChoice) => {
      const s = session.current;
      if (!s) return;
      for (const input of launchCommands(s.doc, s.pacing, choice)) if (!command(input)) return;
      resume();
    },
    [command, resume]
  );

  const answerChapter = useCallback(
    async (choice: "continue" | "later") => {
      const s = session.current;
      if (!s) return;
      const offer = chapterOffer(s.run, s.pacing);
      if (!offer) return;
      if (!command(chapterCommand(offer, choice))) return;
      chapterPausedFor.current = null;
      if (choice === "later") {
        await flush(true);
        setSavedLater(true);
      } else if (paused && clockRuns(s)) resume();
    },
    [command, flush, paused, resume]
  );

  const answerTeach = useCallback(
    (prompt: string, choice: string) => {
      if (command({ type: "teach", prompt, choice })) setTeachResult({ prompt, choice });
    },
    [command]
  );

  const submitReasoning = useCallback(
    async (answer: string): Promise<ReasoningResult> => {
      const s = session.current;
      const o = opened.current;
      if (!s || !o) throw new Error("No question is open.");
      await flush(true);
      let id = attemptIds.current.get(o.moment);
      if (!id) {
        id = Crypto.randomUUID();
        attemptIds.current.set(o.moment, id);
      }
      const res = await api.post<ReasoningResult>(
        `/api/sims/runs/${s.runId}/reasoning`,
        { momentId: o.moment, openedSeq: o.openedSeq, openedTick: o.openedTick, answer, clientAttemptId: id },
        { headers: capsHeaders() }
      );
      s.graded.push(o.moment);
      return res;
    },
    [flush]
  );

  const closeReasoning = useCallback(
    (answered: boolean) => {
      const o = opened.current;
      if (!o) return;
      if (command({ type: "reason", moment: o.moment, answered })) opened.current = null;
    },
    [command]
  );

  // The frame loop: real time in a running phase, the reasoning moment's
  // opening point, the end of the run, and the heartbeat.
  useEffect(() => {
    if (status !== "ready") return;
    const id = setInterval(() => {
      const s = session.current;
      if (!s) return;
      const t = now();
      if (!paused && clockRuns(s) && anchor.current) {
        const plan = planFrame(anchor.current, s.run.state.tick, t, lastFrame.current || t, tickMsFor(s.run.pace));
        if (plan.stall) {
          lastFrame.current = t;
          pause("stall");
          setNotice("Paused: the app was interrupted.");
          return;
        }
        let moved = false;
        for (let i = 0; i < plan.steps; i++) moved = step(s) || moved;
        if (plan.reanchor) anchor.current = plan.reanchor;
        if (moved) bump();
      }
      lastFrame.current = t;
      // REQ-209: a chapter break pauses the clock once, then waits for the learner.
      const ch = chapterOffer(s.run, s.pacing);
      if (ch && !paused && chapterPausedFor.current !== ch.id) {
        chapterPausedFor.current = ch.id;
        pause("learner");
        setNotice(`Chapter done: ${ch.title}. The clock is paused.`);
      }
      // REQ-209: the skip offer after about 30 real seconds of nothing changing.
      const tracked = trackIdle(idle.current, s.run, t, !paused && clockRuns(s));
      idle.current = tracked.state;
      const offered = !!calmOffer(s.run, s.pacing, tracked.idleMs);
      setCalmOn((prev) => (prev === offered ? prev : offered));
      if (s.run.state.openReasoning && (!opened.current || opened.current.moment !== s.run.state.openReasoning)) {
        opened.current = { moment: s.run.state.openReasoning, openedSeq: s.run.lastSeq, openedTick: s.run.state.tick };
        bump();
      }
      if (s.run.state.ended && !finishing.current) void finish();
      if (!paused && clockRuns(s) && t - lastBeat.current > HEARTBEAT_MS) {
        lastBeat.current = t;
        void flush(true);
      }
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [status, paused, pause, bump, finish, flush]);

  // Leaving the app pauses the run (decision R1: no background hold).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") pause("background");
    });
    return () => sub.remove();
  }, [pause]);

  return {
    status,
    error,
    notice,
    setNotice,
    paused,
    debrief,
    session: session.current,
    reasoningOpened: opened.current,
    start,
    command,
    pause,
    resume,
    skipTo,
    pacing: session.current?.pacing ?? null,
    choosePace,
    launch,
    calmOn,
    calm: calmOn && session.current ? calmOffer(session.current.run, session.current.pacing, CALM_IDLE_MS) : null,
    chapter: session.current ? chapterOffer(session.current.run, session.current.pacing) : null,
    answerChapter,
    teachResult,
    answerTeach,
    dismissTeach: () => setTeachResult(null),
    savedLater,
    keepGoing: () => setSavedLater(false),
    submitReasoning,
    closeReasoning,
    finish,
    quit: () => command({ type: "end", reason: "learner_quit" }),
  };
}
