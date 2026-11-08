// REQ-140: "What's new". The notes come from the server (GET /api/whats-new,
// written in backend/lib/release-notes.ts); the app keeps no copy, so a note
// can be added with a backend deploy alone. Pure helpers, tested in
// whatsNew.test.ts.
import type { LaunchGate } from "./legal.ts";

export interface WhatsNewItem {
  headline: string;
  body: string;
  icon?: string;
}

export interface WhatsNewEntry {
  id: string;
  date: string;
  title: string;
  items: WhatsNewItem[];
}

export interface WhatsNewState {
  entries: WhatsNewEntry[];
  unseenIds: string[];
  seenId: string | null;
}

const str = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

// Whatever the server sent, a well-formed state or null. A malformed entry or
// item is dropped rather than failing the whole response: "What's new" must
// never be the thing that breaks Home.
export function parseWhatsNew(data: unknown): WhatsNewState | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.entries)) return null;
  const entries: WhatsNewEntry[] = [];
  for (const raw of d.entries) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    if (!str(e.id) || !str(e.title) || !Array.isArray(e.items)) continue;
    const items: WhatsNewItem[] = [];
    for (const r of e.items) {
      if (!r || typeof r !== "object") continue;
      const i = r as Record<string, unknown>;
      if (!str(i.headline) || !str(i.body)) continue;
      items.push({ headline: i.headline, body: i.body, ...(str(i.icon) ? { icon: i.icon } : {}) });
    }
    if (items.length === 0) continue;
    entries.push({ id: e.id, date: str(e.date) ? e.date : e.id.slice(0, 10), title: e.title, items });
  }
  const known = new Set(entries.map((e) => e.id));
  const unseenIds = Array.isArray(d.unseenIds) ? d.unseenIds.filter((x): x is string => str(x) && known.has(x)) : [];
  return { entries, unseenIds, seenId: str(d.seenId) ? d.seenId : null };
}

// The note the sheet shows: the newest unseen one this session hasn't
// already dismissed. "Got it" on it marks every older note seen too (the
// server moves one marker forward), so one sheet is enough.
export function entryToShow(state: WhatsNewState | null, dismissed: ReadonlySet<string> = new Set()): WhatsNewEntry | null {
  if (!state) return null;
  const id = state.unseenIds.find((x) => !dismissed.has(x));
  return id ? state.entries.find((e) => e.id === id) ?? null : null;
}

// Home may offer the sheet only once the launch questions are settled: the
// onboarding state has loaded (null = still loading or failed, so we can't
// know whether /agree or /welcome is about to take over) and none is due.
export function mayOfferWhatsNew(onboardingLoaded: boolean, gate: LaunchGate): boolean {
  return onboardingLoaded && gate === null;
}

// A server-named icon the app can't draw becomes a plain one.
export const FALLBACK_ICON = "info";
export function iconOrFallback(name: string | undefined, has: (n: string) => boolean): string {
  return name && has(name) ? name : FALLBACK_ICON;
}

// What a screen reader says for one item: headline then sentence, as one stop.
export function itemA11yLabel(item: WhatsNewItem): string {
  const h = item.headline.trim();
  return `${/[.!?]$/.test(h) ? h : `${h}.`} ${item.body.trim()}`;
}

// Notes dismissed in this app session, per account. If "Got it" can't reach
// the server the sheet still goes away and stays away until the next launch,
// when the server (still unmarked) offers it again.
const dismissedByUser = new Map<string, Set<string>>();
export function sessionDismissed(userId: string): Set<string> {
  let s = dismissedByUser.get(userId);
  if (!s) dismissedByUser.set(userId, (s = new Set()));
  return s;
}
export function clearSessionDismissed(): void {
  dismissedByUser.clear();
}
