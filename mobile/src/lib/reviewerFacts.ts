import { useEffect, useRef, useSyncExternalStore } from "react";
import { useIsFocused } from "expo-router";
import type { ScreenFacts, TimerKind } from "@/lib/quickNote";

// REQ-332: what the focused screen tells the reviewer Feedback button about
// where the reviewer is (src/lib/quickNote.ts ScreenFacts), and the screen's
// clock, if it has one. Only the FOCUSED screen speaks: a screen publishes
// while focused and is forgotten when it blurs or unmounts, so a screen left
// behind in the stack never labels the one on top. Nothing here is sent
// anywhere until a reviewer sends a quick note, and screens publish for every
// signed-in user only because they cannot know cheaply who is a reviewer;
// it is an in-memory variable, never stored.

export interface ScreenTimer {
  kind: TimerKind;
  running: boolean;
  // Sims only: the engine's own learner pause (never scored) and resume.
  pause?: () => void;
  resume?: () => void;
}

interface Current {
  owner: object | null;
  facts: ScreenFacts | null;
  timer: ScreenTimer | null;
  // Facts that change every second (a sim's tick and clock), read only when
  // the sheet opens, so the button doesn't re-render with the clock.
  live: (() => ScreenFacts | null) | null;
}

let current: Current = { owner: null, facts: null, timer: null, live: null };
const listeners = new Set<() => void>();
// Course titles seen this session, by id, for screens that know only the id.
const courseTitles = new Map<string, string>();

function emit() {
  for (const l of listeners) l();
}

export function publishFacts(owner: object, facts: ScreenFacts | null, timer: ScreenTimer | null, live: (() => ScreenFacts | null) | null = null) {
  if (facts?.trackId && facts.courseTitle) courseTitles.set(facts.trackId, facts.courseTitle);
  current = { owner, facts, timer, live };
  emit();
}

export function forgetFacts(owner: object) {
  if (current.owner !== owner) return;
  current = { owner: null, facts: null, timer: null, live: null };
  emit();
}

export function knownCourseTitle(trackId: string | null | undefined): string | null {
  return trackId ? courseTitles.get(trackId) ?? null : null;
}

export function rememberCourseTitle(trackId: string, title: string) {
  courseTitles.set(trackId, title);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => current;

// The Feedback button reads this.
export function useCurrentFacts(): Current {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

// A screen calls this with what it knows. `facts` is compared by value, so an
// object literal per render is fine; the timer's functions are read when used.
export function useReviewerFacts(facts: ScreenFacts | null, timer: ScreenTimer | null = null, live?: () => ScreenFacts | null) {
  const owner = useRef({}).current;
  const focused = useIsFocused();
  const key = JSON.stringify(facts);
  const timerKey = timer ? `${timer.kind}:${timer.running}` : "";
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const liveRef = useRef(live);
  liveRef.current = live;
  useEffect(() => {
    if (!focused) {
      forgetFacts(owner);
      return;
    }
    const t = timerRef.current;
    publishFacts(
      owner,
      facts,
      t ? { kind: t.kind, running: t.running, pause: () => timerRef.current?.pause?.(), resume: () => timerRef.current?.resume?.() } : null,
      () => liveRef.current?.() ?? null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- by value (key, timerKey)
  }, [focused, key, timerKey, owner]);
  useEffect(() => () => forgetFacts(owner), [owner]);
}
