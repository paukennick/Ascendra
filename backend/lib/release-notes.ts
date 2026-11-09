import { billingEnabled } from "@/lib/billing-config";

// REQ-140: the ONE place "What's new" text lives, like lib/study-notice.ts
// for the lab disclaimer. The app renders what GET /api/whats-new sends and
// keeps no copy, so a note is added or corrected with a backend deploy and no
// app-store update.
//
// Adding a release: put a new entry FIRST. Its id is the release date
// (YYYY-MM-DD; add -b, -c ... for a second note on the same day) and never
// changes once shipped: each learner's "seen" marker stores it. Write for
// learners, in plain warm words, and only claim what that release really
// ships (check CHANGELOG.md). An item about a feature that is switched off
// takes `requires` so nobody reads about something they can't use.
// lib/release-notes.test.ts checks ids, order, lengths and icons.

// Gates an item or entry can depend on. Each is read when a request is
// served, so turning the feature on shows its notes with no deploy.
export const RELEASE_NOTE_GATES = {
  billing: () => billingEnabled(),
} satisfies Record<string, () => boolean>;
export type ReleaseNoteGate = keyof typeof RELEASE_NOTE_GATES;

// Feather icon names the app already uses (mobile/src/... @expo/vector-icons
// Feather). Kept to this list so a note can't name an icon the app lacks;
// the app also falls back to a plain dot for anything it doesn't know.
export const RELEASE_NOTE_ICONS = [
  "tool",
  "trending-up",
  "bell",
  "eye",
  "flag",
  "shield",
  "zap",
  "star",
  "book-open",
  "clock",
  "rotate-ccw",
  "check-circle",
  "compass",
  "smartphone",
  "info",
] as const;
export type ReleaseNoteIcon = (typeof RELEASE_NOTE_ICONS)[number];

export interface ReleaseNoteItem {
  headline: string;
  body: string;
  icon?: ReleaseNoteIcon;
  requires?: ReleaseNoteGate;
}

export interface ReleaseNote {
  id: string;
  date: string; // YYYY-MM-DD, shown to learners
  title: string;
  items: ReleaseNoteItem[];
  requires?: ReleaseNoteGate;
}

export const RELEASE_NOTE_LIMITS = {
  idMax: 32, // app_users.whats_new_seen_id is varchar(32)
  titleMax: 60,
  headlineMax: 48,
  bodyMax: 220,
  itemsMin: 3,
  itemsMax: 6,
};

// Newest first.
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: "2026-11-07",
    date: "2026-11-07",
    title: "Labs, honest progress and a calmer app",
    items: [
      {
        icon: "tool",
        headline: "Hands-on practice labs",
        body:
          "Build something real or work through a short case, and see every part scored with the model answer beside yours. " +
          "Labs are practice only: they may contain errors and aren't professional advice.",
      },
      {
        icon: "trending-up",
        headline: "Progress that means what it says",
        body:
          "Your level now rises when you get it right on your own, in your own words, not after a peek at the choices, " +
          "so it shows what you can really do.",
      },
      {
        icon: "bell",
        headline: "Gentle study reminders",
        body:
          "Off unless you turn them on in Settings. You pick the days and the time, and they never arrive in your quiet hours.",
      },
      {
        icon: "eye",
        headline: "Easier to see, hear and use",
        body:
          "Stronger colour contrast, bigger tap targets, clearer screen-reader labels, and less motion if your phone asks for it. " +
          "The Android app is also about 11 MB smaller.",
      },
      {
        icon: "flag",
        headline: "Report a problem, right where it is",
        body: "Spot something wrong in a question or a lesson? Tap Report a problem under it and we'll take a look.",
      },
      {
        icon: "shield",
        headline: "Stronger account security",
        body:
          "Changing your email now asks you to confirm it's you, and your old address gets a link to cancel the change if it wasn't.",
      },
    ],
  },
];

export function gateOpen(gate: ReleaseNoteGate | undefined): boolean {
  return gate === undefined || RELEASE_NOTE_GATES[gate]();
}

// The notes this server shows right now: gated items removed, and an entry
// left with no items dropped. Pure apart from reading the gates.
export function visibleReleaseNotes(
  notes: ReleaseNote[] = RELEASE_NOTES,
  open: (gate: ReleaseNoteGate | undefined) => boolean = gateOpen
): ReleaseNote[] {
  const out: ReleaseNote[] = [];
  for (const n of notes) {
    if (!open(n.requires)) continue;
    const items = n.items.filter((i) => open(i.requires)).map(({ requires: _r, ...rest }) => rest);
    if (items.length === 0) continue;
    const { requires: _gate, ...entry } = n;
    out.push({ ...entry, items });
  }
  return out;
}

// What a brand-new account is marked as having seen: the newest note,
// gated or not, so nothing written before someone joined is "new" to them.
export const LATEST_RELEASE_NOTE_ID: string = RELEASE_NOTES[0].id;

// Ids compare in "C" (code-unit) order, the same as the SQL marker update.
export function compareNoteIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
