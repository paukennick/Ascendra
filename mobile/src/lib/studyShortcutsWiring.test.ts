// REQ-290: static checks that the study keyboard shortcuts are wired the way
// the rules need (the logic itself is tested in studyShortcuts.test.ts). These
// read source files, like the other wiring tests here; they don't prove browser
// behavior, which the web e2e would (mobile/e2e/README.md).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("FAIL-1900: the idle timer sees keys that a handler stops", () => {
  const auth = read("src/auth/AuthContext.tsx");
  test("activity listeners are on the window in the capture phase, added and removed alike", () => {
    // A shortcut (or a button pressed with Enter) stops the key before it
    // bubbles to the window; a bubble-phase listener never saw it, so a learner
    // working only on the keyboard went idle and was locked mid-exam.
    assert.match(auth, /window\.addEventListener\(evt, markActive, \{ passive: true, capture: true \}\)/);
    assert.match(auth, /window\.removeEventListener\(evt, markActive, \{ capture: true \}\)/);
    assert.doesNotMatch(auth, /window\.addEventListener\(evt, markActive, \{ passive: true \}\)/);
  });
  test("the shortcut listener stops a handled key (so this matters) and runs in the capture phase", () => {
    const dom = read("src/lib/studyShortcutsDom.ts");
    assert.match(dom, /ev\.stopPropagation\?\.\(\)/);
    assert.match(dom, /addEventListener\("keydown", onKeyDown, true\)/);
  });
});

describe("the screens that take study shortcuts", () => {
  const surfaces: Array<[string, string, string]> = [
    ["app/(app)/course/[trackId]/exam.tsx", "exam", "the exam"],
    ["app/(app)/course/[trackId]/lesson/[objectiveId].tsx", "check", "the lesson check"],
    ["app/(app)/review-session.tsx", "check", "Today's review"],
    ["app/(app)/course/[trackId]/quiz.tsx", "quiz", "Quiz me"],
    ["app/(app)/course/[trackId]/compare.tsx", "check", "comparison practice"],
    ["src/components/teachSteps.tsx", "check", "the Teach step check"],
    ["app/(app)/course/[trackId]/lab/[labId].tsx", "lab", "a lab step"],
    ["app/(app)/course/[trackId]/sim/[simId].tsx", "sim", "a simulation"],
  ];
  for (const [file, surface, name] of surfaces) {
    test(`${name} wraps its question in a ${surface} area`, () => {
      const src = read(file);
      assert.match(src, /import \{[^}]*StudyShortcutArea[^}]*\} from "@\/components\/StudyShortcuts"/);
      assert.match(src, new RegExp(`<StudyShortcutArea[^>]*surface="${surface}"`));
    });
  }
  test("the exam has N, P and F and Enter only once a question is answered", () => {
    const src = read("app/(app)/course/[trackId]/exam.tsx");
    for (const h of ["onChoose", "onEnter", "onNext", "onPrevious", "onFlag"]) assert.match(src, new RegExp(`${h}=`), h);
    assert.match(src, /if \(submitting \|\| !item\.answered\) return false/);
    // Enter on the last question opens the review screen (REQ-298); it never submits the exam itself.
    assert.match(src, /actions\.openReview\(\);\s*return "Review your answers/);
    // N, P and F drive the same moves as the buttons (REQ-298's ExamNavActions).
    for (const a of ["actions.next()", "actions.previous()", "actions.toggleFlag()"]) assert.ok(src.includes(a), a);
    assert.doesNotMatch(src, /onEnter=\{[^}]*submit\(/);
  });
  test("a simulation takes Space only: no key picks a decision that commits at once", () => {
    const src = read("app/(app)/course/[trackId]/sim/[simId].tsx");
    const area = src.slice(src.indexOf("<StudyShortcutArea"), src.indexOf(">", src.indexOf("onPause=")));
    assert.match(area, /onPause=/);
    for (const h of ["onChoose", "onEnter", "onNext", "onPrevious", "onFlag"]) assert.doesNotMatch(area, new RegExp(`${h}=`), h);
    assert.match(area, /surface="sim"/);
  });
  test("a lab picks a line only when the step has exactly one select-lines part", () => {
    const src = read("app/(app)/course/[trackId]/lab/[labId].tsx");
    assert.match(src, /selectParts\.length === 1/);
  });
  test("every answer list that takes a key is marked as one (so a focused option counts as an answer)", () => {
    for (const f of [
      "src/components/ExamQuestion.tsx",
      "app/(app)/course/[trackId]/lesson/[objectiveId].tsx",
      "app/(app)/review-session.tsx",
      "app/(app)/course/[trackId]/quiz.tsx",
      "app/(app)/course/[trackId]/compare.tsx",
      "src/components/teachSteps.tsx",
      "src/components/LabInteractive.tsx",
    ]) {
      assert.match(read(f), /\{\.\.\.answerListProps\}/, f);
    }
  });
  test("the confidence pickers are not marked as answer lists", () => {
    assert.doesNotMatch(read("app/(app)/course/[trackId]/lesson/[objectiveId].tsx").split("function ConfidencePicker")[1] ?? "", /answerListProps/);
  });
});

describe("the component", () => {
  const src = read("src/components/StudyShortcuts.tsx");
  test("web only: a phone gets a plain View", () => {
    assert.match(src, /if \(Platform\.OS !== "web"\) return <View style=\{props\.style\}>\{props\.children\}<\/View>/);
  });
  test("the ? list is a labeled dialog through SheetModal, closed by Escape and a Close button", () => {
    assert.match(src, /<SheetModal/);
    assert.doesNotMatch(src, /import \{[^}]*\bModal\b[^}]*\} from "react-native"/);
    assert.match(src, /"aria-label": SHORTCUTS_TITLE/);
    assert.match(src, /onRequestClose=\{onClose\}/);
    assert.match(src, /accessibilityLabel="Close keyboard shortcuts"/);
    assert.match(src, /role: "list"/);
    assert.match(src, /role: "listitem"/);
  });
  test("the backdrop is not a tab stop, so focus lands on Close", () => {
    assert.match(src, /style=\{styles\.backdrop\} onPress=\{onClose\} focusable=\{false\}/);
  });
  test("what a key does is announced to a screen reader", () => {
    assert.match(src, /<LiveAnnouncement message=\{said\}/);
    assert.match(src, /announce: setSaid/);
  });
  test("the list has a button that turns the shortcuts off, and a failed save is said", () => {
    assert.match(src, /label=\{SHORTCUTS_OFF_LABEL\}/);
    assert.match(src, /SHORTCUTS_SAVE_FAILED/);
  });
  test("the listener reads the setting at each key (the switch takes effect at once)", () => {
    assert.match(src, /enabled: \(\) => studyShortcutsSetting\.isEnabled\(\)/);
  });
  test("the number beside an option is hidden from a screen reader and shown only when on", () => {
    assert.match(src, /"aria-hidden": true/);
    assert.match(src, /Platform\.OS !== "web" \|\| !enabled/);
  });
});

describe("Settings and the words", () => {
  test("Settings has a Keyboard shortcuts switch, web only, with a name and a state", () => {
    const src = read("app/(app)/settings.tsx");
    assert.match(src, /Platform\.OS === "web" \? \(/);
    assert.match(src, /label=\{SHORTCUTS_SETTINGS_LABEL\}/);
    assert.match(src, /accessibilityRole="switch"/);
    assert.match(src, /accessibilityState=\{\{ checked: shortcutsOn \}\}/);
    assert.match(src, /setShortcutsOn\(next\)/);
  });
  test("the FAQ explains the keys, that typing is never intercepted, and where the switch is", () => {
    const { FAQ } = readFaq();
    const entry = FAQ.sections.find((s) => /keyboard shortcuts/i.test(s.title));
    assert.ok(entry, "FAQ has a keyboard shortcuts entry");
    const text = entry.body.join(" ");
    for (const must of ["1 to 9 or A to D", "Enter", "N goes to the next", "F flags", "Space", "Esc", "typing in a box", "Settings", "Turn off keyboard shortcuts"]) {
      assert.ok(text.includes(must), must);
    }
  });
  test("the web e2e README says what the shortcuts add to its checks", () => {
    assert.match(read("e2e/README.md"), /keyboard shortcuts/i);
  });
});

function readFaq(): { FAQ: { sections: Array<{ title: string; body: string[] }> } } {
  // legal.ts is plain data; read the FAQ section out of it as text.
  const src = read("src/content/legal.ts");
  const start = src.indexOf("export const FAQ");
  const end = src.indexOf("export const LEGAL_DOCS");
  const body = src.slice(start, end);
  const sections: Array<{ title: string; body: string[] }> = [];
  const re = /title: "([^"]+)",\s*body: \[([\s\S]*?)\],\s*\},/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const strings = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1].replace(/\\"/g, '"'));
    sections.push({ title: m[1], body: strings });
  }
  return { FAQ: { sections } };
}
