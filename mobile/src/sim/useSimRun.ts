import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Crypto from "expo-crypto";
import { api, ApiError } from "@/api/client";
import { friendlyError } from "@/lib/errorMessage";
import type { ScenarioDoc, WaitInfo } from "./engine/v1/types.ts";
import { capsHeaders } from "./runtime/caps.ts";
import { planFrame, type Anchor } from "./runtime/clock.ts";
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
// What this release does not do yet (docs/sims.md 5.9, Phase 1c): keep the
// unsent queue in device storage across an app kill, and keep the screen
// awake. A queue that cannot be sent stays in memory and is retried.

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
  const [status, setStatus] = useState<SimStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paused, setPaused] = useState(true);
  const [debrief, setDebrief] = useState<SimDebrief | null>(null);
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const session = useRef<Session | null>(null);
  const docs = useRef(new Map<string, ScenarioDoc>());
  const device = useRef<string>(Crypto.randomUUID());
  const anchor = useRef<Anchor | null>(null);
  const lastFrame = useRef(0);
  const lastBeat = useRef(0);
  const syncing = useRef<Promise<void> | null>(null);
  const opened = useRef<{ moment: string; openedSeq: number; openedTick: number } | null>(null);
  const attemptIds = useRef(new Map<string, string>());
  const finishing = useRef(false);

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
    } catch (err) {
      finishing.current = false;
      setStatus("ready");
      setNotice(`Your run is saved. The ending and debrief appear once the server confirms them. ${friendlyError(err, { kept: true })}`);
    }
  }, []);

  const start = useCallback(
    async (restart: boolean) => {
      setStatus("loading");
      setError(null);
      setNotice(null);
      setDebrief(null);
      finishing.current = false;
      opened.current = null;
      try {
        const cached = [...docs.current.keys()].pop() ?? null;
        const p = await api.post<RunPayload>(`/api/sims/${simId}/runs`, { restart, deviceId: device.current, cachedHash: cached }, { headers: capsHeaders() });
        const doc = p.clientDocument ?? docs.current.get(p.clientHash);
        if (!doc) throw new Error("The simulation could not be loaded. Please try again.");
        docs.current.set(p.clientHash, doc);
        session.current = openSession(p, doc);
        attemptIds.current.clear();
        setPaused(true);
        anchor.current = null;
        setStatus("ready");
        if (p.run.status !== "open") {
          const d = await api.get<SimDebrief>(`/api/sims/runs/${p.run.id}/debrief`, { headers: capsHeaders() });
          setDebrief(d);
          setStatus("done");
        } else if (session.current.run.state.ended) {
          void finish();
        }
      } catch (err) {
        setStatus("error");
        setError(friendlyError(err));
      }
    },
    [simId, finish]
  );

  // Sends the queue (and the tick, as a heartbeat). One sync at a time.
  const flush = useCallback(
    async (withTick: boolean): Promise<void> => {
      const s = session.current;
      if (!s) return;
      if (syncing.current) await syncing.current.catch(() => undefined);
      if (!s.pending.length && !withTick) return;
      const sent = s.pending.slice();
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
          if ((r.rejected && sent.some((c) => c.seq === r.rejected!.seq)) || r.desync) {
            setNotice("The run was out of step with the server and has been reloaded from the server's copy.");
            await start(false);
          }
        } catch (err) {
          const c = code(err);
          if (c === "lease_lost") {
            setStatus("lease_lost");
            setPaused(true);
            setNotice("This run continued on another device.");
          } else if (c === "sync_too_fast") {
            /* a heartbeat too soon: the next one carries it */
          } else if (c === "seq_conflict" || c === "seq_gap" || c === "too_fast") {
            await start(false);
          } else {
            setNotice(`Not saved to the server yet; it will be sent when you're back online. ${friendlyError(err, { kept: true })}`);
          }
        }
      })();
      syncing.current = p;
      await p;
      if (syncing.current === p) syncing.current = null;
    },
    [start]
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
      void flush(false);
      if (s.run.state.ended) void finish();
      return true;
    },
    [status, bump, flush, finish]
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
    async (w: WaitInfo) => {
      const s = session.current;
      if (!s) return;
      await flush(false);
      try {
        const r = await api.post<SyncResult>(
          `/api/sims/runs/${s.runId}/skip`,
          { leaseEpoch: s.leaseEpoch, seq: s.run.lastSeq + 1, tick: s.run.state.tick, timer: w.timer, instance: w.instance },
          { headers: capsHeaders() }
        );
        if (r.command) {
          const a = applyServerCommand(s, r.command);
          if (!a.ok) await start(false);
        }
        setNotice(r.stoppedBy ? `Skip stopped early: ${r.stoppedBy}.` : null);
        anchor.current = { tick: s.run.state.tick, atMs: now() };
        bump();
        if (s.run.state.ended) void finish();
      } catch (err) {
        if (code(err) === "replay_behind") {
          await flush(true);
          setNotice("Synced with the server. Try the skip again.");
        } else setNotice(friendlyError(err));
      }
    },
    [flush, start, bump, finish]
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
        const plan = planFrame(anchor.current, s.run.state.tick, t, lastFrame.current || t);
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
    submitReasoning,
    closeReasoning,
    finish,
    quit: () => command({ type: "end", reason: "learner_quit" }),
  };
}
