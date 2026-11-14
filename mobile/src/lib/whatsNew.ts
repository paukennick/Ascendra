// REQ-299: the newest unseen note opens once as a dialog ("What's new"); every
// note is on the "Release notes" screen, newest first, grouped by date.
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
  // REQ-300: the app version the note shipped in; absent from an older server.
  appVersion?: string;
  items: WhatsNewItem[];
}

export interface WhatsNewState {
  entries: WhatsNewEntry[];
  unseenIds: string[];
  seenId: string | null;
}

const PLAIN_SEMVER = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
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
    entries.push({
      id: e.id,
      date: str(e.date) ? e.date : e.id.slice(0, 10),
      title: e.title,
      ...(typeof e.appVersion === "string" && PLAIN_SEMVER.test(e.appVersion) ? { appVersion: e.appVersion } : {}),
      items,
    });
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

// REQ-299: what the dialog and the Release notes screen say. One place, so the
// two agree and a test can pin the words.
export const WHATS_NEW_KICKER = "What's new";
export const WHATS_NEW_CLOSE_LABEL = "Close what's new";
export const WHATS_NEW_GOT_IT = "Got it";
export const RELEASE_NOTES_LABEL = "Release notes";
export const RELEASE_NOTES_LINK_LABEL = "See all release notes";
export const RELEASE_NOTES_ROUTE = "/release-notes";
export const RELEASE_NOTES_EMPTY = "Notes about new features will show up here.";

// "Version 2.1.0", or null for a note that carries none (an older server).
export function versionLabel(entry: Pick<WhatsNewEntry, "appVersion">): string | null {
  return entry.appVersion ? `Version ${entry.appVersion}` : null;
}

// What a screen reader announces when the dialog opens: the kicker, the
// note's title and when it is from.
export function dialogA11yLabel(entry: WhatsNewEntry, dateText: string): string {
  const v = versionLabel(entry);
  return `${WHATS_NEW_KICKER}: ${entry.title}. ${dateText}${v ? `, ${v}` : ""}.`;
}

export interface DateGroup {
  date: string; // YYYY-MM-DD
  entries: WhatsNewEntry[];
}

// Release notes grouped by the date they shipped, newest day first and, within
// a day, in the order the server sent them (newest first). Several notes on one
// day (2026-11-12-a ... -d) share one date heading.
export function groupByDate(entries: readonly WhatsNewEntry[]): DateGroup[] {
  const byDate = new Map<string, WhatsNewEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date);
    if (list) list.push(e);
    else byDate.set(e.date, [e]);
  }
  return [...byDate.entries()]
    .map(([date, list]) => ({ date, entries: list }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
