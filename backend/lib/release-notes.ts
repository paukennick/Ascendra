import { billingEnabled } from "@/lib/billing-config";
import { simsEnabled } from "@/lib/sim/server-run.ts";
import { globalDailyCeilingUsd } from "@/lib/ai-access-config";

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
//
// REQ-228 (Nick, 2026-11-10): "Update What's new and the associated docs
// whenever a shipment goes out." A CHANGELOG entry marked `(learner-facing)`
// must be covered by a note dated on or after it; lib/ship-notes.test.ts
// fails CI otherwise. See .ai/playbooks/release.md "Ship notes".

// Gates an item or entry can depend on. Each is read when a request is
// served, so turning the feature on shows its notes with no deploy.
export const RELEASE_NOTE_GATES = {
  billing: () => billingEnabled(),
  // REQ-228: sims (REQ-162/190/209) are behind SIMS_ENABLED.
  sims: () => simsEnabled(),
  // REQ-228: the global daily AI ceiling (REQ-201/202) exists only when
  // AI_GLOBAL_DAILY_CEILING_USD is set.
  aiCeiling: () => globalDailyCeilingUsd() !== null,
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
  // REQ-228: the CHANGELOG requirement ids this note tells learners about.
  // Never sent to the app. lib/ship-notes.test.ts fails CI when a CHANGELOG
  // entry marked (learner-facing) names a REQ no note covers.
  covers?: string[];
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
    // REQ-222, REQ-223, REQ-225 and REQ-227, merged 2026-11-11 (UTC). The whole
    // note is about sims, so it is gated as one; REQ-226 rides in 2026-11-11-b.
    id: "2026-11-11-c",
    date: "2026-11-11",
    covers: ["REQ-222", "REQ-223", "REQ-225", "REQ-227"],
    requires: "sims",
    title: "Nine new practice scenarios",
    items: [
      {
        icon: "zap",
        headline: "Six new bedside scenarios",
        body:
          "Critical care: sepsis, diabetic ketoacidosis, stroke and bleeding after surgery. " +
          "Nurse aide: a resident who chokes and a resident found on the floor.",
      },
      {
        icon: "compass",
        headline: "Practice a client session",
        body:
          "The EPPP course has three scenarios where you lead a session with a fictional client: " +
          "a suicide risk assessment, a duty-to-warn decision and a diagnostic intake. Take them at your own pace.",
      },
      {
        icon: "tool",
        headline: "Scenario endings fixed",
        body:
          "Each scenario now reaches the same ending in the app and on our servers. " +
          "In the tamponade case, a full-dose epinephrine choice now ends as the harm it causes.",
      },
    ],
  },
  {
    // REQ-212/213, REQ-216 to REQ-220 and REQ-224, merged 2026-11-11 (UTC).
    id: "2026-11-11-b",
    date: "2026-11-11",
    covers: ["REQ-212", "REQ-213", "REQ-216", "REQ-217", "REQ-218", "REQ-219", "REQ-220", "REQ-224", "REQ-226"],
    title: "A new course, and progress you can trust",
    items: [
      {
        icon: "book-open",
        headline: "New course: Prep for the EPPP",
        body:
          "Our first mental health course follows the eight EPPP Part 1 domains at their published weights. " +
          "Mental health courses ask you once to confirm that you're 18 or older.",
      },
      {
        icon: "trending-up",
        headline: "Independent now means it stuck",
        body:
          "A topic reaches Independent when you get it right on your own and again at least a day later. " +
          "Some topics may show Guided until you answer once more.",
      },
      {
        icon: "clock",
        headline: "Reviews spaced a full day apart",
        body:
          "A review comes due a full 24 hours after your last one, not just because midnight passed. " +
          "Your study reminders follow the same rule.",
      },
      {
        icon: "info",
        headline: "We tell you why when we hold one back",
        body:
          "If a lesson or question doesn't pass our accuracy check, we try again, and if it's still held back you'll see why " +
          "in plain words. Practice scenarios work again, too.",
      },
      {
        icon: "check-circle",
        headline: "Course corrections",
        body:
          "Security+ now covers every official sub-objective, physical therapy follows the 2026 APTA Code of Ethics, " +
          "nursing and critical care lessons use current guideline values, and all text is in US English.",
      },
      {
        icon: "shield",
        headline: "Safer sign-in, steadier on your phone",
        body:
          "Authenticator codes work once, emailed sign-in codes have their own limit, we email you when Google is linked, " +
          "biometric unlock stays on, and a lost connection shows Try again.",
      },
    ],
  },
  {
    // Release 2026-11-11, batches 11 to 17 (REQ-202 to REQ-209).
    id: "2026-11-11",
    date: "2026-11-11",
    covers: ["REQ-202", "REQ-203", "REQ-204", "REQ-205", "REQ-206", "REQ-209"],
    title: "Sims at study pace, and a safer launch",
    items: [
      {
        icon: "clock",
        headline: "Sims at study pace",
        requires: "sims",
        body:
          "Clinical sims run at 3x by default, with Exam realism (1x) one tap away. Start near the moment things change, " +
          "skip quiet stretches, and save a run to finish later on any device.",
      },
      {
        icon: "eye",
        headline: "Easier on the web",
        body:
          "Clear headings and screen-reader announcements, Back that works after a reload, Enter to submit, " +
          "and a lock that truly covers the page.",
      },
      {
        icon: "shield",
        headline: "Proof before adding a sign-in method",
        body:
          "Adding an authenticator or a Google account asks you to confirm it's you, " +
          "and two open tabs no longer sign each other out.",
      },
      {
        icon: "check-circle",
        headline: "Fixes for exams and practice",
        body:
          "A double tap on Start gives you one exam, retired topics stay out of your practice, " +
          "and a question we confirm is wrong is removed from practice exams too.",
      },
      {
        icon: "zap",
        headline: "When AI writing pauses for the day",
        requires: "aiCeiling",
        body:
          "If we reach our daily AI limit, new lessons and questions wait until tomorrow (UTC). " +
          "Grading, your reviews and everything already written keep working.",
      },
      {
        icon: "info",
        headline: "Updated Terms and Privacy",
        body:
          "They now name who runs Ascendra and the law that applies, and you'll be asked to agree once. " +
          "New accounts confirm they're 16 or older.",
      },
    ],
  },
  {
    // Release 2026-11-10, batches 1 to 10 (REQ-162 to REQ-201).
    id: "2026-11-10",
    date: "2026-11-10",
    covers: ["REQ-162", "REQ-169", "REQ-174", "REQ-177", "REQ-182", "REQ-189", "REQ-190", "REQ-195", "REQ-197", "REQ-198", "REQ-199"],
    title: "New courses, quicker labs and a gentler lock",
    items: [
      {
        icon: "book-open",
        headline: "New courses",
        body:
          "Four EMS courses for the National Registry (EMR, EMT, Advanced EMT and Paramedic), " +
          "a PT School Prerequisites Refresher, and Computer Science Degree Foundations rebuilt on open textbooks.",
      },
      {
        icon: "tool",
        headline: "Lab answers checked instantly",
        body:
          "Some lab steps now ask you to put things in order, match pairs, spot the problem line, type a command or " +
          "enter a number, and they're checked the moment you answer.",
      },
      {
        icon: "rotate-ccw",
        headline: "Locks instead of signing you out",
        body:
          "After time away Ascendra locks, and you unlock right where you were. " +
          "Pick when in Settings > Security > Lock Ascendra.",
      },
      {
        icon: "compass",
        headline: "Your study profile",
        body:
          "Tell us your goal, your exams and their dates, and how much time you have. " +
          "We set your exam dates and suggest where to start. Change it any time in Settings.",
      },
      {
        icon: "bell",
        headline: "Reminders that name what's due",
        body:
          "On your phone, a study reminder now names one topic that's due and about how long it takes, " +
          "and skips days with nothing due.",
      },
      {
        icon: "star",
        headline: "Try a sim",
        requires: "sims",
        body:
          "Work a live case and get a debrief: a patient after heart surgery in CCRN Adult, " +
          "or a ticket site's launch day in AWS Solutions Architect.",
      },
    ],
  },
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
          "Stronger color contrast, bigger tap targets, clearer screen-reader labels, and less motion if your phone asks for it. " +
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
    const { requires: _gate, covers: _covers, ...entry } = n;
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
