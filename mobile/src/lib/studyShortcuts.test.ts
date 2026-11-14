// REQ-290: the rules of the study keyboard shortcuts (src/lib/studyShortcuts.ts),
// how they listen (src/lib/studyShortcutsDom.ts, on a faked document) and the
// answer helpers the screens use. Nick's decision, 2026-11-09: 1-4 or A-D
// answer, Enter submits and goes on, Esc closes, N/P/F in exams, Space pauses
// sims, ? lists them; single keys only while focus is in the question area,
// never in a text field, and they can be turned off (WCAG 2.1.4).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ANSWERS_ATTRIBUTE,
  STUDY_SHORTCUTS_KEY,
  SURFACES,
  classifyTarget,
  createStudyShortcutsSetting,
  parseStudyShortcuts,
  resolveKey,
  serializeStudyShortcuts,
  shortcutRows,
  type ElementLike,
  type Surface,
} from "./studyShortcuts.ts";
import { CARRY_MS, attachStudyShortcuts, type EventLike, type ShortcutHandlers } from "./studyShortcutsDom.ts";
import { examChoiceAnnouncement, examChoiceResponse } from "./examPractice.ts";
import { encodeSelect, toggleSelectLineAt, type InteractiveInput } from "./labInteractive.ts";

// A stand-in for a DOM element: the tag, role and type, and whether it sits
// inside an answer list or a text region.
function el(tag: string, o: { role?: string; type?: string; editable?: boolean; inAnswers?: boolean; inText?: boolean } = {}): ElementLike {
  return {
    tagName: tag.toUpperCase(),
    type: o.type,
    isContentEditable: o.editable ?? false,
    getAttribute: (name) => (name === "role" ? o.role ?? null : name === "type" ? o.type ?? null : null),
    closest: (sel) => {
      if (o.inAnswers && sel.includes(ANSWERS_ATTRIBUTE)) return {};
      if (o.inText && sel.includes("textarea")) return {};
      return null;
    },
  };
}

const press = (key: string, extra: Record<string, unknown> = {}) => ({ key, ...extra });

describe("classifyTarget: what has focus", () => {
  test("typing surfaces are text", () => {
    assert.equal(classifyTarget(el("textarea")), "text");
    assert.equal(classifyTarget(el("input", { type: "text" })), "text");
    assert.equal(classifyTarget(el("input")), "text");
    assert.equal(classifyTarget(el("input", { type: "email" })), "text");
    assert.equal(classifyTarget(el("input", { type: "number" })), "text");
    assert.equal(classifyTarget(el("select")), "text");
    assert.equal(classifyTarget(el("div", { editable: true })), "text");
    assert.equal(classifyTarget(el("div", { role: "textbox" })), "text");
    assert.equal(classifyTarget(el("div", { role: "combobox" })), "text");
    assert.equal(classifyTarget(el("div", { role: "slider" })), "text");
    assert.equal(classifyTarget(el("span", { inText: true })), "text");
  });
  test("an input that is not for typing is a control", () => {
    for (const type of ["checkbox", "radio", "button", "submit"]) assert.equal(classifyTarget(el("input", { type })), "control", type);
  });
  test("buttons, links and roles are controls", () => {
    assert.equal(classifyTarget(el("button")), "control");
    assert.equal(classifyTarget(el("a")), "control");
    assert.equal(classifyTarget(el("div", { role: "button" })), "control");
    assert.equal(classifyTarget(el("div", { role: "radio" })), "control");
    assert.equal(classifyTarget(el("div", { role: "switch" })), "control");
  });
  test("an option inside an answer list is an answer; the same role outside is a control", () => {
    assert.equal(classifyTarget(el("div", { role: "radio", inAnswers: true })), "answer");
    assert.equal(classifyTarget(el("div", { role: "checkbox", inAnswers: true })), "answer");
    assert.equal(classifyTarget(el("div", { role: "button", inAnswers: true })), "answer");
    assert.equal(classifyTarget(el("div", { role: "radio" })), "control");
  });
  test("plain content, the page and nothing are the area", () => {
    assert.equal(classifyTarget(el("div")), "area");
    assert.equal(classifyTarget(el("p")), "area");
    assert.equal(classifyTarget(el("div", { role: "group" })), "area");
    assert.equal(classifyTarget(null), "area");
    assert.equal(classifyTarget(undefined), "area");
  });
});

describe("resolveKey: nothing while typing, nothing with modifiers", () => {
  test("a text target never triggers anything, ? and Enter included", () => {
    for (const key of ["1", "a", "n", "p", "f", " ", "Enter", "?"]) {
      assert.equal(resolveKey(press(key), "text", "exam", 4), null, key);
    }
  });
  test("Ctrl, Alt and Command leave every key alone", () => {
    for (const mod of ["ctrlKey", "altKey", "metaKey"]) {
      for (const key of ["1", "a", "n", "Enter", "?"]) assert.equal(resolveKey(press(key, { [mod]: true }), "area", "exam", 4), null, `${mod} ${key}`);
    }
  });
  test("a held key, IME composition, an event already handled and keyCode 229 are ignored", () => {
    assert.equal(resolveKey(press("Enter", { repeat: true }), "area", "exam", 4), null);
    assert.equal(resolveKey(press("a", { isComposing: true }), "area", "exam", 4), null);
    assert.equal(resolveKey(press("a", { defaultPrevented: true }), "area", "exam", 4), null);
    assert.equal(resolveKey(press("a", { keyCode: 229 }), "area", "exam", 4), null);
  });
  test("Shift is refused for everything except ?; Caps Lock (an upper-case key, no Shift) works", () => {
    assert.deepEqual(resolveKey(press("?", { shiftKey: true }), "area", "check", 0), { type: "help" });
    assert.equal(resolveKey(press("N", { shiftKey: true }), "area", "exam", 4), null);
    assert.equal(resolveKey(press("Enter", { shiftKey: true }), "area", "exam", 4), null);
    assert.deepEqual(resolveKey(press("N"), "area", "exam", 4), { type: "next" });
    assert.deepEqual(resolveKey(press("B"), "area", "check", 4), { type: "choose", index: 1 });
  });
  test("a missing or odd key does nothing", () => {
    assert.equal(resolveKey({}, "area", "exam", 4), null);
    assert.equal(resolveKey({ key: 5 }, "area", "exam", 4), null);
    assert.equal(resolveKey(press(""), "area", "exam", 4), null);
    assert.equal(resolveKey(press("Dead"), "area", "exam", 4), null);
    assert.equal(resolveKey(press("Tab"), "area", "exam", 4), null);
    assert.equal(resolveKey(press("Escape"), "area", "exam", 4), null);
  });
});

describe("resolveKey: answer keys", () => {
  test("1-9 and A-D choose, up to the number of choices", () => {
    assert.deepEqual(resolveKey(press("1"), "area", "check", 4), { type: "choose", index: 0 });
    assert.deepEqual(resolveKey(press("4"), "answer", "check", 4), { type: "choose", index: 3 });
    assert.equal(resolveKey(press("5"), "area", "check", 4), null);
    assert.deepEqual(resolveKey(press("6"), "area", "exam", 6), { type: "choose", index: 5 });
    assert.deepEqual(resolveKey(press("a"), "area", "check", 4), { type: "choose", index: 0 });
    assert.deepEqual(resolveKey(press("D"), "area", "check", 4), { type: "choose", index: 3 });
    assert.equal(resolveKey(press("d"), "area", "check", 3), null);
    assert.equal(resolveKey(press("0"), "area", "check", 4), null);
    assert.equal(resolveKey(press("e"), "area", "check", 6), null);
  });
  test("with no choices on screen the answer keys do nothing", () => {
    assert.equal(resolveKey(press("1"), "area", "check", 0), null);
    assert.equal(resolveKey(press("a"), "area", "exam", 0), null);
  });
  test("a button, a link or a confidence radio on 3 never answers C", () => {
    assert.equal(resolveKey(press("3"), "control", "exam", 4), null);
    assert.equal(resolveKey(press("c"), "control", "exam", 4), null);
  });
  test("a surface without choices (a sim) never picks", () => {
    assert.equal(resolveKey(press("1"), "area", "sim", 4), null);
    assert.equal(resolveKey(press("a"), "area", "sim", 4), null);
  });
});

describe("resolveKey: Enter, Space, N, P, F and ?", () => {
  test("Enter acts on the area and on an answer, never on a button or link", () => {
    assert.deepEqual(resolveKey(press("Enter"), "area", "check", 4), { type: "enter" });
    assert.deepEqual(resolveKey(press("Enter"), "answer", "exam", 4), { type: "enter" });
    assert.equal(resolveKey(press("Enter"), "control", "exam", 4), null);
  });
  test("a sim has no Enter shortcut", () => {
    assert.equal(resolveKey(press("Enter"), "area", "sim", 0), null);
  });
  test("Space pauses a sim only from the area itself, not from any control or answer", () => {
    assert.deepEqual(resolveKey(press(" "), "area", "sim", 0), { type: "pause" });
    assert.deepEqual(resolveKey(press("Spacebar"), "area", "sim", 0), { type: "pause" });
    assert.equal(resolveKey(press(" "), "control", "sim", 0), null);
    assert.equal(resolveKey(press(" "), "answer", "sim", 0), null);
    assert.equal(resolveKey(press(" "), "area", "exam", 4), null);
    assert.equal(resolveKey(press(" "), "area", "check", 4), null);
  });
  test("N, P and F are for exams only, and work from a control too", () => {
    assert.deepEqual(resolveKey(press("n"), "area", "exam", 4), { type: "next" });
    assert.deepEqual(resolveKey(press("p"), "control", "exam", 4), { type: "previous" });
    assert.deepEqual(resolveKey(press("f"), "answer", "exam", 4), { type: "flag" });
    for (const s of ["check", "quiz", "lab", "sim"] as Surface[]) {
      for (const key of ["n", "p", "f"]) assert.equal(resolveKey(press(key), "area", s, 4), null, `${s} ${key}`);
    }
  });
  test("? opens the list anywhere but a text box, on every surface", () => {
    for (const s of Object.keys(SURFACES) as Surface[]) {
      for (const kind of ["area", "answer", "control"] as const) assert.deepEqual(resolveKey(press("?"), kind, s, 0), { type: "help" }, `${s} ${kind}`);
    }
  });
});

describe("the ? list", () => {
  test("every surface lists ? and Esc, and the keys it uses", () => {
    for (const s of Object.keys(SURFACES) as Surface[]) {
      const keys = shortcutRows(s).map((r) => r.keys);
      assert.ok(keys.includes("?"), s);
      assert.ok(keys.includes("Esc"), s);
    }
    const exam = shortcutRows("exam").map((r) => r.keys);
    for (const k of ["Enter", "N", "P", "F"]) assert.ok(exam.includes(k), k);
    assert.ok(shortcutRows("sim").some((r) => r.keys === "Space"));
    assert.ok(!shortcutRows("check").some((r) => r.keys === "N"));
  });
  test("rows are spelled out for a screen reader, with no dash between 1 and 9", () => {
    for (const s of Object.keys(SURFACES) as Surface[]) {
      for (const r of shortcutRows(s)) {
        assert.doesNotMatch(r.keys, /[-–—]/, r.keys);
        assert.ok(r.does.length > 8, r.does);
      }
    }
    assert.ok(shortcutRows("exam")[0].keys.includes("1 to 9"));
  });
  test("each row names a key a surface really resolves", () => {
    // The list and the rules can't drift: what is listed does something.
    const check = (s: Surface, key: string, kind: "area" | "answer" = "area") => resolveKey(press(key), kind, s, 4);
    assert.ok(check("exam", "n") && check("exam", "p") && check("exam", "f") && check("exam", "Enter") && check("exam", "1"));
    assert.ok(check("check", "Enter") && check("check", "a"));
    assert.ok(check("quiz", "Enter") && check("quiz", "b"));
    assert.ok(check("lab", "Enter") && check("lab", "3"));
    assert.ok(check("sim", " "));
  });
});

describe("the setting", () => {
  function memory(initial: string | null = null, failWrites = false, failReads = false) {
    const data = new Map<string, string>();
    if (initial !== null) data.set(STUDY_SHORTCUTS_KEY, initial);
    return {
      data,
      storage: {
        getItem: async (k: string) => {
          if (failReads) throw new Error("read");
          return data.get(k) ?? null;
        },
        setItem: async (k: string, v: string) => {
          if (failWrites) throw new Error("write");
          data.set(k, v);
        },
      },
    };
  }
  test("on unless the stored value is exactly 'off'", () => {
    assert.equal(parseStudyShortcuts(null), true);
    assert.equal(parseStudyShortcuts("on"), true);
    assert.equal(parseStudyShortcuts("garbage"), true);
    assert.equal(parseStudyShortcuts(undefined), true);
    assert.equal(parseStudyShortcuts("off"), false);
    assert.equal(serializeStudyShortcuts(false), "off");
    assert.equal(serializeStudyShortcuts(true), "on");
  });
  test("a device preference key, not tied to a user", () => {
    assert.match(STUDY_SHORTCUTS_KEY, /^ascendra_study_shortcuts$/);
  });
  test("no shortcut acts until the saved choice has been read", async () => {
    const m = memory("off");
    const s = createStudyShortcutsSetting(m.storage);
    assert.equal(s.isEnabled(), false);
    assert.equal(s.isReady(), false);
    await s.load();
    assert.equal(s.isReady(), true);
    assert.equal(s.isEnabled(), false);
  });
  test("a fresh device is on after loading", async () => {
    const s = createStudyShortcutsSetting(memory().storage);
    assert.equal(s.isEnabled(), false);
    await s.load();
    assert.equal(s.isEnabled(), true);
  });
  test("turning off applies at once, is saved, and a reload keeps it", async () => {
    const m = memory();
    const s = createStudyShortcutsSetting(m.storage);
    await s.load();
    let notified = 0;
    s.subscribe(() => notified++);
    assert.equal(await s.set(false), true);
    assert.equal(s.isEnabled(), false);
    assert.ok(notified >= 1);
    assert.equal(m.data.get(STUDY_SHORTCUTS_KEY), "off");
    const again = createStudyShortcutsSetting(m.storage);
    await again.load();
    assert.equal(again.isEnabled(), false);
    await s.set(true);
    assert.equal(m.data.get(STUDY_SHORTCUTS_KEY), "on");
  });
  test("a choice made before the stored one is read wins over it", async () => {
    const m = memory("off");
    const s = createStudyShortcutsSetting(m.storage);
    const loading = s.load();
    await s.set(true);
    await loading;
    assert.equal(s.isEnabled(), true);
  });
  test("a save that fails still applies for the session and says so", async () => {
    const s = createStudyShortcutsSetting(memory(null, true).storage);
    await s.load();
    assert.equal(await s.set(false), false);
    assert.equal(s.isEnabled(), false);
  });
  test("unreadable storage leaves the default (on) and the setting ready", async () => {
    const s = createStudyShortcutsSetting(memory(null, false, true).storage);
    await s.load();
    assert.equal(s.isReady(), true);
    assert.equal(s.isEnabled(), true);
  });
  test("the snapshot changes when the value does, for subscribers", async () => {
    const s = createStudyShortcutsSetting(memory().storage);
    assert.equal(s.snapshot(), "loading");
    await s.load();
    assert.equal(s.snapshot(), "on");
    await s.set(false);
    assert.equal(s.snapshot(), "off");
  });
});

// ---------------------------------------------------------------------------
// The listener, on a fake document
// ---------------------------------------------------------------------------

type Listener = (ev: unknown) => void;
function fakeDoc() {
  const listeners: Record<string, Listener[]> = {};
  const body = { name: "body" };
  const doc = {
    body,
    documentElement: { name: "html" },
    activeElement: body as unknown,
    addEventListener(type: string, l: Listener) {
      (listeners[type] ??= []).push(l);
    },
    removeEventListener(type: string, l: Listener) {
      listeners[type] = (listeners[type] ?? []).filter((x) => x !== l);
    },
  };
  const fire = (type: string, ev: Record<string, unknown>) => {
    const log = { prevented: false, stopped: false };
    const full = { ...ev, preventDefault: () => (log.prevented = true), stopPropagation: () => (log.stopped = true) };
    for (const l of [...(listeners[type] ?? [])]) l(full);
    return log;
  };
  return { doc, fire, count: (t: string) => (listeners[t] ?? []).length, body };
}

function fakeNode(inside: Set<unknown>, opts: { visible?: boolean; inert?: boolean } = {}) {
  return {
    contains: (o: unknown) => inside.has(o),
    closest: (sel: string) => (opts.inert && sel.includes("inert") ? {} : null),
    getClientRects: () => ({ length: opts.visible === false ? 0 : 1 }),
    isConnected: true,
  };
}

function setup(surface: Surface = "exam", over: { choices?: number; enabled?: () => boolean; handlers?: ShortcutHandlers; nodeOpts?: { visible?: boolean; inert?: boolean } } = {}) {
  const f = fakeDoc();
  const area = { name: "area" };
  const answer = { name: "answer", ...el("div", { role: "radio", inAnswers: true }) };
  const textbox = { name: "text", ...el("textarea") };
  const button = { name: "button", ...el("button") };
  const outside = { name: "outside", ...el("div") };
  const inside = new Set<unknown>([area, answer, textbox, button]);
  const calls: string[] = [];
  const said: string[] = [];
  const handlers: ShortcutHandlers = over.handlers ?? {
    choose: (i) => (calls.push(`choose ${i}`), `Chose ${i}`),
    enter: () => (calls.push("enter"), true),
    next: () => (calls.push("next"), true),
    previous: () => (calls.push("previous"), true),
    flag: () => (calls.push("flag"), true),
    pause: () => (calls.push("pause"), true),
    help: () => (calls.push("help"), true),
  };
  let t = 1000;
  const detach = attachStudyShortcuts({
    node: fakeNode(inside, over.nodeOpts),
    doc: f.doc,
    surface,
    choices: () => over.choices ?? 4,
    enabled: over.enabled ?? (() => true),
    handlers: () => handlers,
    announce: (m) => said.push(m),
    now: () => t,
  });
  return { ...f, area, answer, textbox, button, outside, calls, said, detach, tick: (ms: number) => (t += ms) };
}

describe("the listener: only inside the question area", () => {
  test("a key pressed on an answer or the area is handled, stopped and announced", () => {
    const s = setup();
    const log = s.fire("keydown", { key: "b", target: s.answer });
    assert.deepEqual(s.calls, ["choose 1"]);
    assert.deepEqual(log, { prevented: true, stopped: true });
    assert.deepEqual(s.said, ["Chose 1"]);
    s.fire("keydown", { key: "n", target: s.area });
    s.fire("keydown", { key: "?", target: s.button });
    assert.deepEqual(s.calls, ["choose 1", "next", "help"]);
  });
  test("a key pressed outside the area does nothing, even while armed", () => {
    const s = setup();
    s.fire("focusin", { target: s.area });
    const log = s.fire("keydown", { key: "n", target: s.outside });
    assert.deepEqual(s.calls, []);
    assert.deepEqual(log, { prevented: false, stopped: false });
  });
  test("a text box inside the area is never intercepted", () => {
    const s = setup();
    for (const key of ["1", "a", "n", "f", "Enter", " ", "?"]) {
      const log = s.fire("keydown", { key, target: s.textbox });
      assert.equal(log.prevented, false, key);
      assert.equal(log.stopped, false, key);
    }
    assert.deepEqual(s.calls, []);
  });
  test("Enter on a button inside the area is left to the button", () => {
    const s = setup();
    const log = s.fire("keydown", { key: "Enter", target: s.button });
    assert.deepEqual(s.calls, []);
    assert.equal(log.prevented, false);
  });
  test("modifier keys are left alone", () => {
    const s = setup();
    const log = s.fire("keydown", { key: "n", ctrlKey: true, target: s.area });
    assert.deepEqual(s.calls, []);
    assert.equal(log.prevented, false);
  });
});

describe("the listener: off switch, declining and the screen state", () => {
  test("turned off, nothing is handled or stopped (the key keeps its job)", () => {
    let on = false;
    const s = setup("exam", { enabled: () => on });
    for (const key of ["1", "n", "Enter", "?"]) {
      const log = s.fire("keydown", { key, target: s.answer });
      assert.equal(log.prevented, false, key);
      assert.equal(log.stopped, false, key);
    }
    assert.deepEqual(s.calls, []);
    on = true;
    s.fire("keydown", { key: "n", target: s.answer });
    assert.deepEqual(s.calls, ["next"]);
  });
  test("a handler that declines leaves the key alone", () => {
    const s = setup("exam", { handlers: { enter: () => false, next: () => false } });
    const a = s.fire("keydown", { key: "Enter", target: s.answer });
    const b = s.fire("keydown", { key: "n", target: s.area });
    assert.deepEqual([a.prevented, a.stopped, b.prevented, b.stopped], [false, false, false, false]);
  });
  test("an action the screen has no handler for is left alone", () => {
    const s = setup("exam", { handlers: {} });
    assert.equal(s.fire("keydown", { key: "f", target: s.area }).prevented, false);
  });
  test("no answer keys when no choices are on screen", () => {
    const s = setup("exam", { choices: 0 });
    assert.equal(s.fire("keydown", { key: "1", target: s.answer }).prevented, false);
    assert.deepEqual(s.calls, []);
  });
  test("an area that is hidden, inert (the app lock) or not on screen ignores keys", () => {
    for (const nodeOpts of [{ visible: false }, { inert: true }]) {
      const s = setup("exam", { nodeOpts });
      assert.equal(s.fire("keydown", { key: "n", target: s.area }).prevented, false);
      assert.deepEqual(s.calls, []);
    }
  });
  test("a sim area: Space pauses from the area, a button keeps its Space", () => {
    const s = setup("sim", { choices: 0 });
    assert.equal(s.fire("keydown", { key: " ", target: s.button }).prevented, false);
    assert.equal(s.fire("keydown", { key: " ", target: s.area }).prevented, true);
    assert.deepEqual(s.calls, ["pause"]);
  });
  test("detaching removes every listener", () => {
    const s = setup();
    assert.equal(s.count("keydown"), 1);
    s.detach();
    assert.equal(s.count("keydown") + s.count("focusin") + s.count("pointerdown"), 0);
  });
});

describe("the listener: focus lost to the page body", () => {
  test("after a click or focus inside, a key on the body still counts (the focused option was replaced)", () => {
    const s = setup();
    s.fire("keydown", { key: "n", target: s.body });
    assert.deepEqual(s.calls, []);
    s.fire("focusin", { target: s.answer });
    s.fire("keydown", { key: "n", target: s.body });
    assert.deepEqual(s.calls, ["next"]);
  });
  test("a click inside arms it; a click or focus elsewhere disarms it", () => {
    const s = setup();
    s.fire("pointerdown", { target: s.area });
    s.fire("keydown", { key: "n", target: s.body });
    s.fire("pointerdown", { target: s.outside });
    s.fire("keydown", { key: "n", target: s.body });
    s.fire("focusin", { target: s.area });
    s.fire("focusin", { target: s.outside });
    s.fire("keydown", { key: "p", target: s.body });
    assert.deepEqual(s.calls, ["next"]);
  });
  test("handling a key keeps it armed", () => {
    const s = setup();
    s.fire("focusin", { target: s.answer });
    s.fire("keydown", { key: "n", target: s.answer });
    s.fire("keydown", { key: "n", target: s.body });
    assert.deepEqual(s.calls, ["next", "next"]);
  });
  test("a body key is the area, so Enter and Space work there and a text box does not exist", () => {
    const s = setup("sim", { choices: 0 });
    s.fire("pointerdown", { target: s.area });
    assert.equal(s.fire("keydown", { key: " ", target: s.body }).prevented, true);
  });
});

describe("the listener: the next area inherits the working state, briefly", () => {
  test("a new area on the same document starts armed within the window, not after it", () => {
    const f = fakeDoc();
    const mk = (now: () => number) => {
      const area = {};
      const calls: string[] = [];
      const detach = attachStudyShortcuts({
        node: fakeNode(new Set([area])),
        doc: f.doc,
        surface: "check",
        choices: () => 4,
        enabled: () => true,
        handlers: () => ({ choose: (i) => (calls.push(`choose ${i}`), true) }),
        now,
      });
      return { area, calls, detach };
    };
    let t = 0;
    const first = mk(() => t);
    f.fire("focusin", { target: first.area });
    first.detach(); // nothing focused now: the body
    t = 100;
    const second = mk(() => t);
    f.fire("keydown", { key: "2", target: f.body });
    assert.deepEqual(second.calls, ["choose 1"]);
    second.detach();
    // Too late: a stale carry must not arm an area opened much later.
    const third = mk(() => t);
    t += 10;
    third.detach();
    t += CARRY_MS + 1;
    const fourth = mk(() => t);
    f.fire("keydown", { key: "2", target: f.body });
    assert.deepEqual(fourth.calls, []);
    fourth.detach();
  });
  test("leaving by clicking elsewhere does not carry", () => {
    const f = fakeDoc();
    const area = {};
    const calls: string[] = [];
    const attach = () =>
      attachStudyShortcuts({
        node: fakeNode(new Set([area])),
        doc: f.doc,
        surface: "check",
        choices: () => 4,
        enabled: () => true,
        handlers: () => ({ choose: (i) => (calls.push(`choose ${i}`), true) }),
        now: () => 0,
      });
    const one = attach();
    f.fire("focusin", { target: area });
    f.fire("pointerdown", { target: { elsewhere: true } });
    one();
    const two = attach();
    f.fire("keydown", { key: "1", target: f.body });
    assert.deepEqual(calls, []);
    two();
  });
});

// ---------------------------------------------------------------------------
// What the screens do with a key
// ---------------------------------------------------------------------------

describe("exam answers", () => {
  const mc = { format: "multiple_choice", choices: ["a", "b", "c", "d"] } as const;
  const mr = { format: "multiple_response", choices: ["a", "b", "c", "d", "e"], selectCount: 2 } as const;
  test("multiple choice picks that option", () => {
    assert.deepEqual(examChoiceResponse(mc, null, 2), { choice: 2 });
    assert.deepEqual(examChoiceResponse(mc, { choice: 0 }, 3), { choice: 3 });
  });
  test("multiple response toggles, never past selectCount", () => {
    assert.deepEqual(examChoiceResponse(mr, null, 1), { choices: [1] });
    assert.deepEqual(examChoiceResponse(mr, { choices: [1] }, 3), { choices: [1, 3] });
    assert.deepEqual(examChoiceResponse(mr, { choices: [1, 3] }, 3), { choices: [1] });
    assert.deepEqual(examChoiceResponse(mr, { choices: [1, 3] }, 4), { choices: [1, 3] });
  });
  test("a key past the last choice, or another format, does nothing", () => {
    assert.equal(examChoiceResponse(mc, null, 4), null);
    assert.equal(examChoiceResponse(mc, null, -1), null);
    assert.equal(examChoiceResponse(mc, null, 1.5), null);
    assert.equal(examChoiceResponse({ format: "ordering", choices: ["a"] }, null, 0), null);
    assert.equal(examChoiceResponse({ format: "matching", choices: undefined }, null, 0), null);
  });
  test("the announcement says selected, cleared, or that the limit is reached", () => {
    assert.equal(examChoiceAnnouncement(mc, null, { choice: 1 }, 1), "Selected B. b");
    assert.equal(examChoiceAnnouncement(mr, { choices: [1] }, { choices: [1, 3] }, 3), "Selected D. d");
    assert.equal(examChoiceAnnouncement(mr, { choices: [1, 3] }, { choices: [1] }, 3), "Cleared D. d");
    assert.match(examChoiceAnnouncement(mr, { choices: [1, 3] }, { choices: [1, 3] }, 4), /2 at most/);
  });
});

describe("lab select lines", () => {
  const SELECT: Extract<InteractiveInput, { type: "select" }> = {
    type: "select",
    display: "log",
    header: null,
    lines: [
      { id: "L1", text: "one" },
      { id: "L2", text: "two" },
      { id: "L3", text: "three" },
    ],
  };
  test("the numbered line toggles, in display order", () => {
    const a = toggleSelectLineAt("", SELECT, 2);
    assert.deepEqual(a, { value: encodeSelect(["L3"], SELECT), nowSelected: true });
    const b = toggleSelectLineAt(a!.value, SELECT, 0);
    assert.equal(b!.value, encodeSelect(["L1", "L3"], SELECT));
    const c = toggleSelectLineAt(b!.value, SELECT, 2);
    assert.deepEqual(c, { value: encodeSelect(["L1"], SELECT), nowSelected: false });
    assert.deepEqual(toggleSelectLineAt(c!.value, SELECT, 0), { value: "", nowSelected: false });
  });
  test("a line that does not exist does nothing", () => {
    assert.equal(toggleSelectLineAt("", SELECT, 3), null);
    assert.equal(toggleSelectLineAt("", SELECT, -1), null);
    assert.equal(toggleSelectLineAt("", SELECT, 0.5), null);
  });
});
