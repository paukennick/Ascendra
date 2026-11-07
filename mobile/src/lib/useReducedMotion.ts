import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// REQ-113 (Audit 3 mobile L1): the sidebar slide, the press-scale on buttons
// and cards, and progress-bar fills ignored the system "Remove animations" /
// "Reduce motion" setting. One shared reading of it, kept current.
let reduced = false;
let started = false;
const listeners = new Set<(v: boolean) => void>();

function start() {
  if (started) return;
  started = true;
  AccessibilityInfo.isReduceMotionEnabled?.()
    .then((v) => set(!!v))
    .catch(() => undefined);
  AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v: boolean) => set(!!v));
}
function set(v: boolean) {
  reduced = v;
  listeners.forEach((l) => l(v));
}

export function isReducedMotion(): boolean {
  start();
  return reduced;
}

export function useReducedMotion(): boolean {
  start();
  const [v, setV] = useState(reduced);
  useEffect(() => {
    listeners.add(setV);
    setV(reduced);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}
