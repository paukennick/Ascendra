// REQ-332: the reviewer Feedback button and its quick note -- who sees it,
// what it records on each kind of screen, the line it shows, the timer
// behavior, the owner's links, and that it is mounted once, at the layout.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildQuickContext,
  byKind,
  canSeeFab,
  clip,
  contextLine,
  fabOnRoute,
  isTimedRoute,
  QUICK_NOTE_EMPTY,
  QUICK_NOTE_MAX,
  QUICK_TAG_LABEL,
  QUICK_TAGS,
  quickNoteAbout,
  quickNoteBadge,
  quickNoteHref,
  quickNoteLinkLabel,
  quickNotePayload,
  quickNoteProblem,
  routeIds,
  screenName,
  timerNotice,
} from "./quickNote.ts";

const T = "6f1d2b3c-4a5b-4c6d-8e7f-90a1b2c3d4e5";
const O = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d";
const U = "11111111-2222-4333-8444-555555555555";
const S = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const R = "99999999-8888-4777-8666-555555555555";
const E = "12345678-1234-4234-8234-123456789012";

const reviewer = { access: { level: "unrestricted", reviewer: { since: "2026-11-17T00:00:00Z", areas: ["mental-health"] } } };
const owner = { access: { level: "owner" } };
const learner = { access: { level: "free" } };

describe("who sees the Feedback button", () => {
  test("reviewers and owners only", () => {
    assert.equal(canSeeFab(reviewer), true);
    assert.equal(canSeeFab(owner), true);
  });
  test("never a learner, a signed-out screen, an older server or a malformed mark", () => {
    assert.equal(canSeeFab(learner), false);
    assert.equal(canSeeFab({ access: { level: "unrestricted" } }), false);
    assert.equal(canSeeFab(null), false);
    assert.equal(canSeeFab(undefined), false);
    assert.equal(canSeeFab({}), false);
    assert.equal(canSeeFab({ access: { reviewer: { areas: [] } } }), false);
    assert.equal(canSeeFab({ access: { reviewer: "yes" } }), false);
    assert.equal(canSeeFab({ access: "owner" }), false);
  });
  test("every signed-in screen except the full form and the Terms prompt", () => {
    for (const p of ["/", `/course/${T}`, `/course/${T}/lesson/${O}`, `/course/${T}/exam`, `/course/${T}/sim/${S}`, "/settings", "/feedback", "/settings/reviewer-feedback"]) {
      assert.equal(fabOnRoute(p), true, p);
    }
    assert.equal(fabOnRoute("/feedback/edit"), false);
    assert.equal(fabOnRoute("/feedback/edit/"), false);
    assert.equal(fabOnRoute("/agree"), false);
  });
  test("compact on the timed screens (practice exam, sims) and nowhere else", () => {
    assert.equal(isTimedRoute(`/course/${T}/exam`), true);
    assert.equal(isTimedRoute(`/course/${T}/sim/${S}`), true);
    assert.equal(isTimedRoute(`/course/${T}/sims`), false);
    assert.equal(isTimedRoute(`/course/${T}/lesson/${O}`), false);
    assert.equal(isTimedRoute(`/course/${T}`), false);
  });
});

describe("the context, per screen", () => {
  test("route ids: course, lesson, explain, sim and lab, plus unitId from the query", () => {
    assert.deepEqual(routeIds(`/course/${T}/lesson/${O}`, { unitId: U }), { trackId: T, objectiveId: O, simId: null, labId: null, unitId: U });
    assert.equal(routeIds(`/course/${T}/explain/${O}`).objectiveId, O);
    assert.equal(routeIds(`/course/${T}/sim/${S}`).simId, S);
    assert.equal(routeIds(`/course/${T}/lab/sec-lab-1`).labId, "sec-lab-1");
    assert.deepEqual(routeIds("/settings"), { trackId: null, objectiveId: null, simId: null, labId: null, unitId: null });
  });

  test("course page: the course and the screen", () => {
    const b = buildQuickContext({ pathname: `/course/${T}`, facts: { trackId: T, courseTitle: "NCMHCE" } });
    assert.equal(b.trackId, T);
    assert.equal(b.simId, null);
    assert.deepEqual(b.context, { route: `/course/${T}`, screen: "Course page" });
    assert.equal(contextLine(b.context, { courseTitle: "NCMHCE" }), "About: NCMHCE · Course page");
  });

  test("lesson: unit, objective, step and the practice question", () => {
    const b = buildQuickContext({
      pathname: `/course/${T}/lesson/${O}`,
      params: { trackId: T, objectiveId: O, unitId: U, objectiveTitle: "Phishing" },
      facts: { trackId: T, unitId: U, objectiveId: O, lessonTitle: "Phishing", lessonStage: "fade", item: { kind: "lesson", id: O } },
    });
    assert.deepEqual(b.context, { route: `/course/${T}/lesson/${O}`, screen: "Lesson", unitId: U, objectiveId: O, lessonStage: "fade", itemKind: "lesson", itemId: O });
    assert.equal(contextLine(b.context, { courseTitle: "Security+", unitTitle: "Threats", lessonTitle: "Phishing" }), "About: Security+ · Unit ‘Threats’ · Lesson ‘Phishing’ · Guided practice · question");
  });

  test("lesson opened by a deep link (no facts): the route still names the lesson and unit", () => {
    const b = buildQuickContext({ pathname: `/course/${T}/lesson/${O}`, params: { unitId: U } });
    assert.equal(b.context.objectiveId, O);
    assert.equal(b.context.unitId, U);
    assert.equal(contextLine(b.context), "About: Lesson");
  });

  test("practice exam: session and question number", () => {
    const b = buildQuickContext({
      pathname: `/course/${T}/exam`,
      facts: { trackId: T, courseTitle: "Security+", exam: { sessionId: E, question: 4, count: 10 }, item: { kind: "exam", position: 7 } },
    });
    assert.deepEqual(b.context, { route: `/course/${T}/exam`, screen: "Practice exam", itemKind: "exam", itemPosition: 7, examSessionId: E, examQuestion: 4, examQuestionCount: 10 });
    assert.equal(contextLine(b.context, { courseTitle: "Security+" }), "About: Security+ · Practice exam · question 4 of 10");
  });

  test("sim mid-run: sim id, run, phase and sim time", () => {
    const b = buildQuickContext({
      pathname: `/course/${T}/sim/${S}`,
      facts: { trackId: T, sim: { id: S, title: "Client at risk after a job loss", runId: R, phase: "assess", phaseLabel: "Risk assessment", tick: 270, clock: "04:30" } },
    });
    assert.equal(b.simId, S);
    assert.equal(b.trackId, T);
    assert.deepEqual(b.context, { route: `/course/${T}/sim/${S}`, screen: "Simulation", simRunId: R, simPhase: "assess", simPhaseLabel: "Risk assessment", simTick: 270, simClock: "04:30" });
    assert.equal(
      contextLine(b.context, { courseTitle: "NCMHCE", simTitle: "Client at risk after a job loss" }),
      "About: NCMHCE · Sim ‘Client at risk after a job loss’ · Risk assessment · sim time 04:30"
    );
  });

  test("sim brief (before a run): the sim from the route", () => {
    const b = buildQuickContext({ pathname: `/course/${T}/sim/${S}` });
    assert.equal(b.simId, S);
    assert.equal(contextLine(b.context, { simTitle: "Client at risk" }), "About: Sim ‘Client at risk’");
    assert.equal(contextLine(b.context), "About: Simulation");
  });

  test("quiz, review and lab", () => {
    const q = buildQuickContext({ pathname: `/course/${T}/quiz`, facts: { trackId: T, objectiveId: O, lessonTitle: "Phishing", item: { kind: "quiz", id: R } } });
    assert.equal(q.context.itemKind, "quiz");
    assert.equal(q.context.itemId, R);
    assert.equal(contextLine(q.context, { lessonTitle: "Phishing" }), "About: Lesson ‘Phishing’ · quiz question");
    const r = buildQuickContext({ pathname: "/review-session", facts: { objectiveId: O, item: { kind: "review", id: E, position: 3 } } });
    assert.equal(r.trackId, null);
    assert.equal(contextLine(r.context), "About: Lesson · review question 3");
    const l = buildQuickContext({ pathname: `/course/${T}/lab/sec-lab-1`, facts: { trackId: T, lab: { id: "sec-lab-1", title: "Harden SSH" } } });
    assert.equal(l.context.labId, "sec-lab-1");
    assert.equal(contextLine(l.context, { labTitle: "Harden SSH" }), "About: Lab ‘Harden SSH’");
  });

  test("a screen outside a course: route and screen only", () => {
    const b = buildQuickContext({ pathname: "/settings/access" });
    assert.deepEqual(b, { trackId: null, simId: null, context: { route: "/settings/access", screen: "Settings" } });
    assert.equal(contextLine(b.context), "About: Settings");
  });

  test("facts about another course never label this screen", () => {
    const other = "77777777-7777-4777-8777-777777777777";
    const b = buildQuickContext({ pathname: `/course/${T}`, facts: { trackId: other, courseTitle: "Other", objectiveId: O, lessonStage: "solo" } });
    assert.equal(b.trackId, T);
    assert.equal(b.context.objectiveId, undefined);
    assert.equal(b.context.lessonStage, undefined);
  });

  test("only real ids link the row; the query string never goes in the route", () => {
    const b = buildQuickContext({ pathname: "/course/not-a-uuid/sim/also-not?title=Secret" });
    assert.equal(b.trackId, null);
    assert.equal(b.simId, null);
    assert.equal(b.context.route, "/course/not-a-uuid/sim/also-not");
  });

  test("screen names and long titles", () => {
    assert.equal(screenName("/"), "Home");
    assert.equal(screenName("/something-new"), "This screen");
    assert.equal(clip("A very long simulation title that goes on and on", 20), "A very long simulat…");
    assert.equal(clip("Short"), "Short");
  });
});

describe("the sheet", () => {
  test("the note is required and bounded; the tag is optional", () => {
    assert.equal(quickNoteProblem(""), QUICK_NOTE_EMPTY);
    assert.equal(quickNoteProblem("   \n "), QUICK_NOTE_EMPTY);
    assert.equal(quickNoteProblem("x".repeat(QUICK_NOTE_MAX + 1)), `Keep the note under ${QUICK_NOTE_MAX} characters.`);
    assert.equal(quickNoteProblem("The dose is off"), null);
  });
  test("what it sends", () => {
    const built = buildQuickContext({ pathname: `/course/${T}/sim/${S}`, facts: { trackId: T, sim: { id: S, phase: "a" } } });
    assert.deepEqual(quickNotePayload("  Too fast  ", "unrealistic", built), {
      kind: "quick",
      note: "Too fast",
      tag: "unrealistic",
      trackId: T,
      simId: S,
      context: { route: `/course/${T}/sim/${S}`, screen: "Simulation", simPhase: "a" },
    });
  });
  test("six tags, worded as the brief asks", () => {
    assert.deepEqual(QUICK_TAGS.map((t) => QUICK_TAG_LABEL[t]), ["Inaccurate", "Unrealistic", "Unclear", "Sensitive-topic concern", "Bug", "Praise"]);
  });
  test("the clock: an exam's keeps running and the sheet says so; a sim's is paused while the sheet is open", () => {
    assert.match(timerNotice({ kind: "exam", running: true }, false)!, /keeps running/);
    assert.match(timerNotice({ kind: "sim", running: true }, true)!, /paused while this is open, and runs again when you close it/);
    assert.equal(timerNotice({ kind: "sim", running: false }, false), null);
    assert.equal(timerNotice(null, false), null);
  });
});

describe("the lists", () => {
  const base = { trackId: T, trackTitle: "NCMHCE", simId: null, simTitle: null, texts: { otherComments: "Unclear wording" } };
  test("the owner's link opens the exact lesson, sim or lab where it can", () => {
    assert.equal(quickNoteHref({ ...base, simId: S, context: { simPhase: "a" } }), `/course/${T}/sim/${S}`);
    assert.equal(quickNoteHref({ ...base, context: { objectiveId: O, unitId: U, route: `/course/${T}/lesson/${O}` } }), `/course/${T}/lesson/${O}?unitId=${U}`);
    assert.equal(quickNoteHref({ ...base, context: { objectiveId: O, route: `/course/${T}/explain/${O}` } }), `/course/${T}/explain/${O}`);
    assert.equal(quickNoteHref({ ...base, context: { labId: "sec-lab-1" } }), `/course/${T}/lab/sec-lab-1`);
    assert.equal(quickNoteHref({ ...base, context: { examSessionId: E, examQuestion: 2 } }), `/course/${T}/exam`);
    assert.equal(quickNoteHref({ ...base, context: null }), `/course/${T}`);
    assert.equal(quickNoteHref({ ...base, trackId: null, context: { route: "/settings" } }), null);
    assert.equal(quickNoteLinkLabel({ simId: S, context: null }), "Open the sim");
    assert.equal(quickNoteLinkLabel({ simId: null, context: { objectiveId: O } }), "Open the lesson");
  });
  test("tag badge, about line and the kind filter", () => {
    assert.equal(quickNoteBadge({ quickTag: "sensitive" }), "Quick note · Sensitive-topic concern");
    assert.equal(quickNoteBadge({ quickTag: null }), "Quick note");
    assert.equal(quickNoteBadge({ quickTag: "made-up" }), "Quick note");
    assert.equal(
      quickNoteAbout({ ...base, kind: "quick", unitTitle: "Assessment", objectiveTitle: "Suicide risk", context: { screen: "Lesson", objectiveId: O, lessonStage: "teach" } }),
      "About: NCMHCE · Unit ‘Assessment’ · Lesson ‘Suicide risk’ · Teach"
    );
    const list = [{ kind: "quick" as const }, { kind: "form" as const }, {}];
    assert.equal(byKind(list, "quick").length, 1);
    assert.equal(byKind(list, "form").length, 2); // an older server's rows are the full form
    assert.equal(byKind(list, "all").length, 3);
  });
});

// ---------------------------------------------------------------------------
// Static checks: mounted once, at the layout; gated; screens speak.
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe("mounted once, at the layout", () => {
  test("the signed-in layout renders <ReviewerFeedbackFab /> exactly once, under the stack, for native and web alike", () => {
    const layout = read("app/(app)/_layout.tsx");
    assert.equal(layout.match(/<ReviewerFeedbackFab\b/g)?.length, 1);
    assert.match(layout, /const column = \(\s*<>\s*\{stack\}\s*<ReviewerFeedbackFab \/>\s*<\/>\s*\);/);
    assert.match(layout, /<View style=\{styles\.content\}>\{column\}<\/View>/);
    assert.match(layout, /\{column\}\n\s*<\/View>\n\s*<\/View>/);
  });
  test("no other file mounts it", () => {
    const files = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "src"))].filter((f) => !f.endsWith("app/(app)/_layout.tsx") && !f.endsWith(".test.ts"));
    const mounting = files.filter((f) => /<ReviewerFeedbackFab\b/.test(readFileSync(f, "utf8")));
    assert.deepEqual(mounting, []);
  });
  test("it renders nothing unless signed in as a reviewer or owner, off the excluded routes", () => {
    const src = read("src/components/ReviewerFab.tsx");
    assert.match(src, /const allowed = status === "signedIn" && canSeeFab\(user\);/);
    assert.match(src, /const shown = allowed && fabOnRoute\(pathname\);/);
    assert.match(src, /if \(!shown\) return null;/);
    // Every render path is after the gate.
    assert.ok(src.indexOf("if (!shown) return null;") < src.indexOf("<SheetModal"));
    assert.ok(src.indexOf("if (!shown) return null;") < src.indexOf('testID="reviewer-fab"'));
  });
  test("it has an accessible label, sits in its own gutter (never over content) and steps aside for the keyboard", () => {
    const src = read("src/components/ReviewerFab.tsx");
    assert.match(src, /accessibilityLabel=\{FAB_A11Y_LABEL\}/);
    assert.match(src, /height: FAB_GUTTER \+ insets\.bottom, paddingBottom: insets\.bottom/);
    assert.doesNotMatch(src.slice(src.indexOf("gutter: {"), src.indexOf("pill: {")), /position: "absolute"/);
    assert.match(src, /const hideGutter = keyboard\.up && !open && !wide;/);
  });
  test("opening never navigates; only the Full feedback form link does, and a sim's clock is paused, then resumed on close", () => {
    const src = read("src/components/ReviewerFab.tsx");
    const open = src.slice(src.indexOf("const openSheet"), src.indexOf("const close"));
    assert.doesNotMatch(open, /router\./);
    assert.match(open, /timer\?\.kind === "sim" && timer\.running && timer\.pause/);
    const close = src.slice(src.indexOf("const close"), src.indexOf("const send"));
    assert.match(close, /if \(opts\.resume && pausedTimer\.current\?\.resume\) pausedTimer\.current\.resume\(\);/);
    assert.equal(src.match(/router\.push/g)?.length, 1);
    const sim = read("app/(app)/course/[trackId]/sim/[simId].tsx");
    assert.match(sim, /\{ kind: "sim", running: clockRunning, pause: \(\) => sim\.pause\("learner"\), resume: sim\.resume \}/);
    const exam = read("app/(app)/course/[trackId]/exam.tsx");
    assert.match(exam, /\{ kind: "exam", running: true \}/);
  });
  test("the course, lesson, exam, sim, quiz, review and lab screens tell it where the reviewer is", () => {
    for (const p of [
      "app/(app)/course/[trackId]/index.tsx",
      "app/(app)/course/[trackId]/lesson/[objectiveId].tsx",
      "app/(app)/course/[trackId]/exam.tsx",
      "app/(app)/course/[trackId]/sim/[simId].tsx",
      "app/(app)/course/[trackId]/quiz.tsx",
      "app/(app)/review-session.tsx",
      "app/(app)/course/[trackId]/lab/[labId].tsx",
    ]) {
      assert.match(read(p), /useReviewerFacts\(/, p);
    }
  });
});
