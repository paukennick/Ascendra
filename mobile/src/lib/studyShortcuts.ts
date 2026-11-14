// REQ-290 (Nick, 2026-11-09): study keyboard shortcuts on the web. This file is
// the pure half, with no React, no DOM and no storage import, so every rule can
// be tested: what a key press means, which targets are never intercepted, what
// the "?" list says, and how the on/off setting is read and kept. The DOM
// wiring is studyShortcutsDom.ts; the screens use src/components/StudyShortcuts.tsx.
//
// The rules, in the order they are applied (WCAG 2.1.4 Character Key Shortcuts
// asks for at least one of: off switch, remap, active only on focus -- there is
// an off switch AND the keys act only inside the question area):
//
//   1. Nothing happens while the learner is typing: a text box, a select, a
//      contenteditable region, a slider, a combo box.
//   2. Nothing happens with Ctrl, Alt or Command held (browser and screen
//      reader commands), while a key is held down (repeat), during IME
//      composition, or when something else already handled the event. Shift is
//      ignored too, except for "?" which is typed with it. Caps Lock is fine.
//   3. Enter and Space belong to buttons, links and options: pressing them on
//      one does what the control does. Space only acts on the area itself (not
//      on any control). Enter acts on the area or on an answer option.
//   4. Answer keys (1 to 9, A to D) act on the area or an answer option, not on
//      other controls (a confidence radio on "3" must not answer "C").
//   5. N, P, F and ? act on the area, an answer option or any other control.
//   6. A screen may decline (return false); then the key keeps its normal job.

export type Surface = "check" | "exam" | "quiz" | "lab" | "sim";

export type ShortcutAction =
  | { type: "choose"; index: number }
  | { type: "enter" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "flag" }
  | { type: "pause" }
  | { type: "help" };

// text: typing. answer: an option inside an answer list (data-study-answers).
// control: any other button, link, radio, switch... area: anything else.
export type TargetKind = "text" | "answer" | "control" | "area";

export interface KeyLike {
  key?: unknown;
  keyCode?: number;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
}

// The few things read from a DOM element, so tests can pass plain objects.
export interface ElementLike {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
  getAttribute?(name: string): string | null;
  closest?(selector: string): ElementLike | null;
}

// The marker an answer list carries (dataSet={{ studyAnswers: "1" }} on web).
export const ANSWERS_ATTRIBUTE = "data-study-answers";

interface SurfaceRules {
  choose: boolean;
  enter: boolean;
  next: boolean;
  previous: boolean;
  flag: boolean;
  pause: boolean;
}

const NONE: SurfaceRules = { choose: false, enter: false, next: false, previous: false, flag: false, pause: false };

export const SURFACES: Record<Surface, SurfaceRules> = {
  // A lesson check, Today's review, comparison practice, a Teach step's quick check.
  check: { ...NONE, choose: true, enter: true },
  // A timed sprint or a mock exam.
  exam: { ...NONE, choose: true, enter: true, next: true, previous: true, flag: true },
  // Quiz me: an option is an answer at once, there is no separate Submit.
  quiz: { ...NONE, choose: true, enter: true },
  // A lab step that has a "select the lines" part.
  lab: { ...NONE, choose: true, enter: true },
  // A simulation: the clock only. Its choices commit a decision at once, so no key picks one.
  sim: { ...NONE, pause: true },
};

const TEXT_INPUT_EXCLUDED = new Set(["checkbox", "radio", "button", "submit", "reset", "image", "file", "color"]);
const TEXT_ROLES = new Set(["textbox", "searchbox", "combobox", "spinbutton", "slider", "listbox", "grid", "tree", "application"]);
const CONTROL_ROLES = new Set([
  "button",
  "link",
  "radio",
  "checkbox",
  "switch",
  "tab",
  "menuitem",
  "menuitemradio",
  "menuitemcheckbox",
  "option",
  "treeitem",
]);
const ANSWER_ROLES = new Set(["radio", "checkbox", "option", "button"]);
const TEXT_SELECTOR =
  'textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"],[role="searchbox"],[role="combobox"],[role="spinbutton"],[role="slider"],[role="listbox"]';

function roleOf(el: ElementLike): string | null {
  const raw = el.getAttribute?.("role");
  if (!raw) return null;
  return raw.trim().split(/\s+/)[0]?.toLowerCase() || null;
}

// What kind of thing has focus (or was clicked). Anything unknown is "area".
export function classifyTarget(el: ElementLike | null | undefined): TargetKind {
  if (!el) return "area";
  const tag = (el.tagName ?? "").toLowerCase();
  const role = roleOf(el);
  if (tag === "textarea" || tag === "select") return "text";
  if (tag === "input" && !TEXT_INPUT_EXCLUDED.has((el.type ?? el.getAttribute?.("type") ?? "text").toLowerCase())) return "text";
  if (el.isContentEditable) return "text";
  if (role && TEXT_ROLES.has(role)) return "text";
  // A text box's own children (a rich editor's spans) are typing too.
  if (el.closest?.(TEXT_SELECTOR)) return "text";

  const nativeControl = tag === "button" || tag === "a" || tag === "summary" || tag === "input" || tag === "label";
  const control = nativeControl || (role !== null && CONTROL_ROLES.has(role));
  if (!control) return "area";
  const inAnswers = !!el.closest?.(`[${ANSWERS_ATTRIBUTE}]`);
  const answerLike = tag === "input" || tag === "button" || (role !== null && ANSWER_ROLES.has(role));
  return inAnswers && answerLike ? "answer" : "control";
}

function isSpace(key: string): boolean {
  return key === " " || key === "Spacebar";
}

// What a key press means here, or null to leave it alone.
export function resolveKey(ev: KeyLike, kind: TargetKind, surface: Surface, choices: number): ShortcutAction | null {
  if (kind === "text") return null;
  if (ev.ctrlKey || ev.altKey || ev.metaKey) return null;
  if (ev.repeat || ev.isComposing || ev.defaultPrevented || ev.keyCode === 229) return null;
  const key = ev.key;
  if (typeof key !== "string" || key.length === 0) return null;
  const rules = SURFACES[surface];

  // "?" is typed with Shift on most layouts, so it is checked before Shift is refused.
  if (key === "?") return { type: "help" };
  if (ev.shiftKey) return null;

  if (key === "Enter") return rules.enter && (kind === "area" || kind === "answer") ? { type: "enter" } : null;
  if (isSpace(key)) return rules.pause && kind === "area" ? { type: "pause" } : null;

  if (key.length !== 1) return null;
  const k = key.toLowerCase();
  if (rules.choose && (kind === "area" || kind === "answer")) {
    let index = -1;
    if (k >= "1" && k <= "9") index = Number(k) - 1;
    else if (k >= "a" && k <= "d") index = k.charCodeAt(0) - 97;
    if (index >= 0) return index < choices ? { type: "choose", index } : null;
  }
  if (k === "n" && rules.next) return { type: "next" };
  if (k === "p" && rules.previous) return { type: "previous" };
  if (k === "f" && rules.flag) return { type: "flag" };
  return null;
}

// ---------------------------------------------------------------------------
// The "?" list
// ---------------------------------------------------------------------------

export interface ShortcutRow {
  keys: string;
  does: string;
}

const CHOOSE_KEYS = "1 to 9, or A to D";

// Spelled out, so a screen reader says "1 to 9, or A to D" and not "1 dash 9".
export function shortcutRows(surface: Surface): ShortcutRow[] {
  const rows: ShortcutRow[] = [];
  if (surface === "check") {
    rows.push({ keys: CHOOSE_KEYS, does: "Choose that answer (A is 1, B is 2, C is 3, D is 4)" });
    rows.push({ keys: "Enter", does: "Check your answer; once you have the result, go on" });
  } else if (surface === "exam") {
    rows.push({ keys: CHOOSE_KEYS, does: "Choose that answer; on a pick-more-than-one question, select or clear it" });
    rows.push({ keys: "Enter", does: "Go to the next question once you have answered this one; on the last one, open Review and submit" });
    rows.push({ keys: "N", does: "Next question" });
    rows.push({ keys: "P", does: "Previous question" });
    rows.push({ keys: "F", does: "Flag or unflag this question for review" });
  } else if (surface === "quiz") {
    rows.push({ keys: CHOOSE_KEYS, does: "Answer with that option; it counts as a try, the same as tapping it" });
    rows.push({ keys: "Enter", does: "Next question, once this one is done" });
  } else if (surface === "lab") {
    rows.push({ keys: CHOOSE_KEYS, does: "Select or clear that numbered line (the first nine lines)" });
    rows.push({ keys: "Enter", does: "Check your answer" });
  } else {
    rows.push({ keys: "Space", does: "Pause, or run the clock again (when focus is not on a button)" });
  }
  rows.push({ keys: "?", does: "Show this list" });
  rows.push({ keys: "Esc", does: "Close this list or any open dialog" });
  return rows;
}

export const SHORTCUTS_TITLE = "Keyboard shortcuts";

export const SHORTCUTS_RULES_NOTE =
  "These keys work while you are in the question. They never work while you are typing in a box, or with Ctrl, Alt or Command held. Enter and Space still press the button or link you are on.";

export const SHORTCUTS_HINT = "Press ? for keyboard shortcuts.";

export const SHORTCUTS_SETTINGS_LABEL = "Keyboard shortcuts";
export const SHORTCUTS_SETTINGS_NOTE =
  "Single keys while you study: 1 to 9 or A to D to answer, Enter to check or go on, N, P and F in exams, Space to pause a simulation, ? for the list. They never work while you type. Web only.";
export const SHORTCUTS_OFF_LABEL = "Turn off keyboard shortcuts";
export const SHORTCUTS_OFF_NOTE = "You can turn them back on in Settings, under Study.";
export const SHORTCUTS_SAVE_FAILED = "Your choice applies until you close this page, but it couldn't be saved on this device.";

// ---------------------------------------------------------------------------
// The setting: a device preference (like the lock timer), on unless turned off.
// ---------------------------------------------------------------------------

export const STUDY_SHORTCUTS_KEY = "ascendra_study_shortcuts";

export function parseStudyShortcuts(raw: unknown): boolean {
  return raw !== "off";
}

export function serializeStudyShortcuts(on: boolean): "on" | "off" {
  return on ? "on" : "off";
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}

export interface StudyShortcutsSetting {
  // True once the saved choice has been read. Until then no shortcut acts, so a
  // learner who turned them off is never caught by one in the first moments.
  isReady(): boolean;
  isEnabled(): boolean;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  // Applies at once; resolves false when the choice could not be saved.
  set(on: boolean): Promise<boolean>;
  snapshot(): string;
}

export function createStudyShortcutsSetting(storage: KeyValueStorage): StudyShortcutsSetting {
  let enabled = true;
  let ready = false;
  let loading: Promise<void> | null = null;
  // A choice made before the stored one was read wins over it.
  let touched = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    isReady: () => ready,
    isEnabled: () => ready && enabled,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    snapshot: () => (ready ? serializeStudyShortcuts(enabled) : "loading"),
    load() {
      loading ??= (async () => {
        try {
          const raw = await storage.getItem(STUDY_SHORTCUTS_KEY);
          if (!touched) enabled = parseStudyShortcuts(raw);
        } catch {
          // Unreadable storage: the default (on) stands.
        }
        ready = true;
        notify();
      })();
      return loading;
    },
    async set(on) {
      touched = true;
      enabled = on;
      ready = true;
      notify();
      try {
        await storage.setItem(STUDY_SHORTCUTS_KEY, serializeStudyShortcuts(on));
        return true;
      } catch {
        return false;
      }
    },
  };
}
