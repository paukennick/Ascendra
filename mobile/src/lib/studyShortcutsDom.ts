// REQ-290: the DOM half of the study keyboard shortcuts (web only). It listens
// on the document in the capture phase, keeps only the key presses that belong
// to ONE question area, and hands what the rules in studyShortcuts.ts accept to
// the screen's handlers. No React here, and nothing is imported from the DOM
// globals: the node and the document are passed in, so a test can fake them.
//
// "Focus is in the question area" means one of:
//   - the event's target is inside the area (a button, an option, the text), or
//   - nothing has focus (the target is the page body) and the learner's last
//     focus or click was inside this area. A focused option that is replaced
//     (the choices turn into the graded result, the next question has fewer
//     options) leaves focus on the body; without this the keys would die in the
//     middle of a lesson or exam. Focus or a click anywhere else ends it.
// The area also has to be on screen: not display:none (an earlier screen kept
// mounted under this one), not inert (the app lock) and not aria-hidden.
//
// A key that is handled is stopped (preventDefault + stopPropagation) so that
// an option's own Enter handling cannot run as well: a Pressable presses on
// the Enter KEY UP, and when the next question reuses the same element that
// would answer the new question. The web idle timer listens on the window in
// the capture phase for this reason (src/auth/AuthContext.tsx, FAIL-1900).

import {
  classifyTarget,
  resolveKey,
  type ElementLike,
  type KeyLike,
  type ShortcutAction,
  type Surface,
} from "./studyShortcuts.ts";

// false: the screen declines, the key keeps its normal job. true: handled.
// A string: handled, and said to a screen reader (a live announcement).
export type HandlerResult = boolean | string;

export interface ShortcutHandlers {
  choose?(index: number): HandlerResult;
  enter?(): HandlerResult;
  next?(): HandlerResult;
  previous?(): HandlerResult;
  flag?(): HandlerResult;
  pause?(): HandlerResult;
  help?(): HandlerResult;
}

export interface NodeLike {
  contains(other: unknown): boolean;
  closest?(selector: string): unknown;
  getClientRects?(): { length: number };
  isConnected?: boolean;
}

export interface EventLike extends KeyLike {
  target?: unknown;
  preventDefault?(): void;
  stopPropagation?(): void;
}

// `any` on the listener: the real Document's overloads are typed per event name.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface DocLike {
  body?: unknown;
  documentElement?: unknown;
  activeElement?: unknown;
  addEventListener(type: string, listener: (ev: any) => void, options?: boolean | { capture?: boolean }): void;
  removeEventListener(type: string, listener: (ev: any) => void, options?: boolean | { capture?: boolean }): void;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export interface AttachOptions {
  node: NodeLike;
  doc: DocLike;
  surface: Surface;
  // How many answer keys are live right now (0 when there are no choices on screen).
  choices(): number;
  // The setting. Read at every key press.
  enabled(): boolean;
  // Read at every key press, so a screen can hand over fresh closures each render.
  handlers(): ShortcutHandlers;
  announce?(message: string): void;
  now?(): number;
}

export function isOnScreen(node: NodeLike): boolean {
  if (node.isConnected === false) return false;
  if (node.closest?.("[inert],[aria-hidden='true']")) return false;
  if (node.getClientRects && node.getClientRects().length === 0) return false;
  return true;
}

function run(action: ShortcutAction, h: ShortcutHandlers): HandlerResult | undefined {
  switch (action.type) {
    case "choose":
      return h.choose?.(action.index);
    case "enter":
      return h.enter?.();
    case "next":
      return h.next?.();
    case "previous":
      return h.previous?.();
    case "flag":
      return h.flag?.();
    case "pause":
      return h.pause?.();
    case "help":
      return h.help?.();
  }
}

// The next area that appears while nothing has focus inherits "the learner was
// working in a question area". Without it, Enter on "Continue" mounted the next
// check and its keys stayed dead until the learner clicked into it.
// It lasts a few seconds, so a stale one cannot arm an area opened much later.
export const CARRY_MS = 5000;
let carryUntil = 0;

// Starts listening; the returned function stops.
export function attachStudyShortcuts(opts: AttachOptions): () => void {
  const { node, doc } = opts;
  const now = opts.now ?? Date.now;
  let armed = now() < carryUntil;
  carryUntil = 0;
  const nothingFocusedNow = () => doc.activeElement == null || doc.activeElement === doc.body || doc.activeElement === doc.documentElement;

  const onFocusIn = (ev: { target?: unknown }) => {
    armed = node.contains(ev.target);
    carryUntil = 0;
  };
  const onPointerDown = (ev: { target?: unknown }) => {
    armed = node.contains(ev.target);
    carryUntil = 0;
  };
  const onKeyDown = (ev: EventLike) => {
    if (!opts.enabled()) return;
    const target = ev.target;
    const inside = target != null && node.contains(target);
    const nothingFocused = target == null || target === doc.body || target === doc.documentElement;
    if (!inside && !(armed && nothingFocused)) return;
    if (!isOnScreen(node)) return;
    const kind = inside ? classifyTarget(target as ElementLike) : "area";
    const action = resolveKey(ev, kind, opts.surface, opts.choices());
    if (!action) return;
    const result = run(action, opts.handlers());
    if (result === undefined || result === false) return;
    ev.preventDefault?.();
    ev.stopPropagation?.();
    armed = true;
    if (typeof result === "string" && result) opts.announce?.(result);
  };

  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("focusin", onFocusIn, true);
  doc.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    carryUntil = armed && nothingFocusedNow() ? now() + CARRY_MS : 0;
    doc.removeEventListener("keydown", onKeyDown, true);
    doc.removeEventListener("focusin", onFocusIn, true);
    doc.removeEventListener("pointerdown", onPointerDown, true);
  };
}
