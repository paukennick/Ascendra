// REQ-190 (docs/sims.md 4.8, 19.4 item 3): tap-to-the-beat compressions.
// The learner taps the compression rhythm on a large pad. The app measures
// the rate and the longest pause from tap timestamps on its own monotonic
// clock and sends them as INTEGERS in a command ("cpr <rate> <pause>"); the
// engine never reads live timing, so a replay on any device scores the same.
//
// Scored by the module: good when the rate is 100-120 a minute and no pause
// is over 10 s. A measurement is sent every MEASURE_EVERY_MS while tapping
// and when the learner stops, so the 2-minute rhythm check always has a
// recent one.

export const MEASURE_EVERY_MS = 15_000;
export const MIN_TAPS = 4;
// A pause this long ends a burst: the measurement is sent at once.
export const STOP_AFTER_MS = 3_000;

export interface TapMeasure {
  rate: number; // compressions per minute, integer
  longestPause: number; // seconds, integer
  taps: number;
}

// The rate over the taps in the window and the longest gap, including the
// gap from the last tap to `endMs` (a learner who stopped is pausing).
export function measureTaps(taps: readonly number[], endMs: number): TapMeasure | null {
  if (taps.length < MIN_TAPS) return null;
  const first = taps[0];
  const last = taps[taps.length - 1];
  const span = last - first;
  if (!(span > 0)) return null;
  const rate = Math.round((60_000 * (taps.length - 1)) / span);
  let gap = Math.max(0, endMs - last);
  for (let i = 1; i < taps.length; i++) gap = Math.max(gap, taps[i] - taps[i - 1]);
  return { rate: clampInt(rate, 0, 400), longestPause: clampInt(Math.round(gap / 1000), 0, 3600), taps: taps.length };
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.trunc(v)));
}

export function cprCommandText(m: Pick<TapMeasure, "rate" | "longestPause">): string {
  return `cpr ${m.rate} ${m.longestPause}`;
}

// The module's pad: a command param whose pattern is "cpr {rate:int} {pause:int}".
export function isTapPadParam(p: { kind: string; patterns?: { pattern: string }[] }): boolean {
  return p.kind === "command" && (p.patterns ?? []).some((x) => /^cpr \{rate:int\} \{pause:int\}$/.test(x.pattern.trim()));
}

// What the pad says while the learner taps (and speaks after a send).
export function tapFeedback(m: TapMeasure | null): string {
  if (!m) return "Tap the pad at the compression rate. Keep going.";
  const rate = m.rate < 100 ? "too slow" : m.rate > 120 ? "too fast" : "on target";
  const pause = m.longestPause > 10 ? `, longest pause ${m.longestPause} seconds: too long` : "";
  return `${m.rate} per minute, ${rate}${pause}.`;
}

// The window the next measurement reads: taps since the last send.
export function windowAfter(taps: readonly number[], sinceMs: number): number[] {
  return taps.filter((t) => t >= sinceMs);
}
