// REQ-190 (docs/sims.md 13.2): what the screen reader hears, pure.
// Alarms entering or leaving are assertive and immediate. New log entries
// of kind good, bad or find and skip results are polite, at most one polite
// announcement per 10 s; several due at once are joined in one sentence.
// Nothing polite is spoken while a text field has focus. REQ-225: `news`
// carries polite sentences the screen derives itself (a client session's
// rapport or distress moving into another band), queued like log news.
// REQ-237: `urgent` carries sentences spoken at once, never rate-limited and
// spoken even while typing (a terminal error line), like an alarm that has no
// cleared state.

export const POLITE_EVERY_MS = 10_000;

export interface Announcement {
  text: string;
  assertive: boolean;
}

export interface AnnouncerState {
  alarms: string[]; // the tile alarm texts active at the last frame
  lastPoliteMs: number;
  queued: string[];
  seenLog: number; // log entries already considered
}

export function newAnnouncer(): AnnouncerState {
  return { alarms: [], lastPoliteMs: -Infinity, queued: [], seenLog: 0 };
}

export function announce(
  s: AnnouncerState,
  input: { alarms: string[]; log: { kind: string; text: string }[]; nowMs: number; typing: boolean; news?: string[]; urgent?: string[] }
): { state: AnnouncerState; out: Announcement[] } {
  const out: Announcement[] = [];
  const entered = input.alarms.filter((a) => !s.alarms.includes(a));
  const left = s.alarms.filter((a) => !input.alarms.includes(a));
  if (entered.length) out.push({ text: `Alarm: ${entered.join(". ")}.`, assertive: true });
  if (left.length) out.push({ text: `Alarm cleared: ${left.join(". ")}.`, assertive: true });
  const fresh = input.log.slice(s.seenLog).filter((l) => l.kind === "good" || l.kind === "bad" || l.kind === "find" || l.kind === "skip" || l.kind === "alarm");
  const queued = [...s.queued, ...fresh.filter((l) => l.kind !== "alarm").map((l) => l.text), ...(input.news ?? [])];
  for (const l of fresh) if (l.kind === "alarm") out.push({ text: l.text, assertive: true });
  for (const u of input.urgent ?? []) out.push({ text: u, assertive: true });
  let lastPoliteMs = s.lastPoliteMs;
  let rest = queued;
  if (queued.length && !input.typing && input.nowMs - s.lastPoliteMs >= POLITE_EVERY_MS) {
    out.push({ text: queued.slice(0, 3).join(" "), assertive: false });
    lastPoliteMs = input.nowMs;
    rest = queued.slice(3);
  }
  return { state: { alarms: input.alarms.slice(), lastPoliteMs, queued: rest.slice(-10), seenLog: input.log.length }, out };
}
