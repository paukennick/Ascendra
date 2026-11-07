// REQ-119 (Audit 3 product): terms version and launch gate, the course
// page's next step, vendor disclaimers, study reminders, exam outcomes,
// empty states, first-run course list and the privacy page's AI facts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gateRedirect, launchGate, TERMS_VERSION, type OnboardingState } from "./legal.ts";
import { nextCourseStep, type StepUnit } from "./nextStep.ts";
import { TRADEMARK_OWNERS, vendorDisclaimer } from "./vendor.ts";
import {
  DEFAULT_REMINDERS,
  GUILT_PATTERNS,
  inQuietHours,
  parseReminderPrefs,
  reminderError,
  reminderKey,
  reminderSchedule,
  REMINDER_MESSAGES,
  shiftTime,
} from "./reminders.ts";
import { outcomeDateError, outcomeResponse, parseScore } from "./examOutcome.ts";
import { courseRequestPrefill, exploreEmpty, reviewEmpty } from "./emptyStates.ts";
import { pickableCourses, FIRST_RUN_LIST_MAX } from "./firstRun.ts";
import { localDataOwner, userLocalDataKeys } from "./localData.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const read = (p: string) => readFileSync(join(repo, p), "utf8");

const state = (needsAcceptance: boolean, needed: boolean): OnboardingState => ({
  terms: { currentVersion: TERMS_VERSION, acceptedVersion: null, acceptedAt: null, needsAcceptance },
  firstRun: { needed, completedAt: null, goalTrackId: null, justExploring: false },
});

describe("terms version and the launch gate (H5, M2)", () => {
  test("the app's terms version is the server's current one", () => {
    const m = read("backend/lib/legal.ts").match(/CURRENT_TERMS_VERSION = "([^"]+)"/);
    assert.equal(m?.[1], TERMS_VERSION);
  });
  test("terms first, then first run; unknown state asks nothing", () => {
    assert.equal(launchGate(null), null);
    assert.equal(launchGate(state(true, true)), "agree");
    assert.equal(launchGate(state(false, true)), "welcome");
    assert.equal(launchGate(state(false, false)), null);
  });
  test("the terms prompt covers the app but leaves legal pages, account and support reachable", () => {
    assert.equal(gateRedirect("agree", ["(app)"]), "/agree");
    assert.equal(gateRedirect("agree", ["(app)", "course", "[trackId]"]), "/agree");
    assert.equal(gateRedirect("agree", ["(app)", "agree"]), null);
    assert.equal(gateRedirect("agree", ["(legal)", "terms"]), null);
    assert.equal(gateRedirect("agree", ["(app)", "account"]), null);
    assert.equal(gateRedirect("agree", ["(app)", "account", "sessions"]), null);
    assert.equal(gateRedirect("agree", ["(app)", "support"]), null);
    assert.equal(gateRedirect("agree", ["(auth)", "login"]), null);
  });
  test("first run only replaces Home: a deep link or reminder tap is never blocked", () => {
    assert.equal(gateRedirect("welcome", ["(app)"]), "/welcome");
    assert.equal(gateRedirect("welcome", ["(app)", "index"]), "/welcome");
    assert.equal(gateRedirect("welcome", ["(app)", "course", "[trackId]"]), null);
    assert.equal(gateRedirect("welcome", ["(app)", "explore"]), null);
    assert.equal(gateRedirect("welcome", ["(app)", "welcome"]), null);
    assert.equal(gateRedirect(null, ["(app)"]), null);
  });
});

const o = (id: string, mastery_status?: StepUnit["objectives"] extends (infer T)[] | undefined ? T extends { mastery_status?: infer S } ? S : never : never) => ({
  id,
  title: `Objective ${id}`,
  mastery_status,
});

describe("course page primary button (M4)", () => {
  test("nothing started: Start course, at the first objective", () => {
    const s = nextCourseStep([{ id: "u1", objectives: [o("a"), o("b")] }, { id: "u2", objectives: [o("c")] }]);
    assert.equal(s?.kind, "start");
    assert.equal(s?.label, "Start course");
    assert.equal(s && "objectiveId" in s ? s.objectiveId : null, "a");
  });
  test("FAIL-402: a first unfinished unit with no objectives listed no longer makes the button do nothing", () => {
    // The old button took the first unit whose counts said unfinished and
    // looked only inside it; an empty objective list there meant no action.
    const s = nextCourseStep([
      { id: "u0", objectives: [] },
      { id: "u1", objectives: [o("a", "Independent"), o("b")] },
    ]);
    assert.equal(s?.kind, "continue");
    assert.equal(s && "objectiveId" in s ? s.objectiveId : null, "b");
    assert.equal(s && "unitId" in s ? s.unitId : null, "u1");
  });
  test("a half-done objective comes before a new one, in course order", () => {
    const s = nextCourseStep([
      { id: "u1", objectives: [o("a", "Independent"), o("b")] },
      { id: "u2", objectives: [o("c", "Guided")] },
    ]);
    assert.equal(s && "objectiveId" in s ? s.objectiveId : null, "c");
    assert.equal(s?.label, "Continue");
  });
  test("everything Independent or above: Review; no objectives at all: no button", () => {
    assert.equal(nextCourseStep([{ id: "u1", objectives: [o("a", "Independent"), o("b", "Transfer-ready")] }])?.kind, "review");
    assert.equal(nextCourseStep([{ id: "u1", objectives: [] }]), null);
    assert.equal(nextCourseStep(null), null);
  });
});

describe("vendor disclaimers (M6)", () => {
  test("names the exam's own provider", () => {
    const line = vendorDisclaimer({ providerName: "Amazon Web Services", credentialName: "AWS Certified Solutions Architect" }, "certification");
    assert.match(line!, /not affiliated with or endorsed by Amazon Web Services/);
    assert.match(line!, /trademarks belong to their owners/);
    assert.doesNotMatch(line!, /CompTIA/);
  });
  test("a certification course without a known provider still says it; other courses say nothing", () => {
    assert.match(vendorDisclaimer(null, "certification")!, /the body that runs this exam/);
    assert.equal(vendorDisclaimer(null, "graduate"), null);
  });
  test("FAIL-406: the Disclaimer page lists the catalog's trademark owners, not only CompTIA", () => {
    const page = read("mobile/app/(legal)/disclaimer.tsx");
    assert.match(page, /TRADEMARK_OWNERS/);
    for (const name of ["CompTIA", "Amazon Web Services (AWS)", "Microsoft", "Google Cloud", "Project Management Institute (PMI)"]) {
      assert.ok(TRADEMARK_OWNERS.includes(name), name);
    }
  });
});

describe("study reminders (M7)", () => {
  test("off by default", () => {
    assert.equal(DEFAULT_REMINDERS.enabled, false);
    assert.equal(parseReminderPrefs(null).enabled, false);
    assert.deepEqual(reminderSchedule(DEFAULT_REMINDERS), []);
  });
  test("quiet hours wrap past midnight and a reminder can't be set inside them", () => {
    assert.equal(inQuietHours(23 * 60, 21 * 60, 8 * 60), true);
    assert.equal(inQuietHours(7 * 60, 21 * 60, 8 * 60), true);
    assert.equal(inQuietHours(8 * 60, 21 * 60, 8 * 60), false);
    assert.equal(inQuietHours(12 * 60, 13 * 60, 14 * 60), false);
    assert.equal(inQuietHours(12 * 60, 12 * 60, 12 * 60), false);
    const p = { ...DEFAULT_REMINDERS, enabled: true, time: 22 * 60 };
    assert.match(reminderError(p)!, /quiet hours/);
    assert.deepEqual(reminderSchedule(p), []);
    assert.match(reminderError({ ...DEFAULT_REMINDERS, enabled: true, days: [] })!, /at least one day/);
  });
  test("one weekly reminder per chosen day, at the chosen time (expo weekday 1 = Sunday)", () => {
    const slots = reminderSchedule({ ...DEFAULT_REMINDERS, enabled: true, days: [0, 3], time: 18 * 60 + 45 });
    assert.deepEqual(slots.map((s) => [s.weekday, s.hour, s.minute]), [[1, 18, 45], [4, 18, 45]]);
  });
  test("every message is kind: no streaks, no 'you missed', no pressure", () => {
    for (const m of REMINDER_MESSAGES) {
      for (const bad of GUILT_PATTERNS) {
        assert.doesNotMatch(`${m.title} ${m.body}`, bad, `${m.title}: ${bad}`);
      }
    }
  });
  test("stored settings that don't parse, or are invalid, come back off", () => {
    assert.equal(parseReminderPrefs("{nope").enabled, false);
    assert.equal(parseReminderPrefs(JSON.stringify({ enabled: true, days: [1], time: 23 * 60 })).enabled, false);
    const ok = parseReminderPrefs(JSON.stringify({ enabled: true, days: [5, 1, 1, 9], time: 600, quietStart: 1290, quietEnd: 480 }));
    assert.equal(ok.enabled, true);
    assert.deepEqual(ok.days, [1, 5]);
  });
  test("times step round the clock", () => {
    assert.equal(shiftTime(0, -15), 24 * 60 - 15);
    assert.equal(shiftTime(24 * 60 - 15, 15), 0);
  });
  test("the settings are per user and swept by Log out", () => {
    const key = reminderKey("user-1");
    assert.equal(localDataOwner(key), "user-1");
    assert.deepEqual(userLocalDataKeys([key, reminderKey("user-2"), "ascendra.reminders"], "user-1"), [key]);
  });
});

describe("I took the exam", () => {
  test("score is optional; when given it is a plain number", () => {
    assert.deepEqual(parseScore(""), { ok: true, value: null });
    assert.deepEqual(parseScore(" 750 "), { ok: true, value: 750 });
    assert.deepEqual(parseScore("82,5"), { ok: true, value: 82.5 });
    assert.equal(parseScore("-4").ok, false);
    assert.equal(parseScore("abc").ok, false);
    assert.equal(parseScore("100001").ok, false);
  });
  test("the date is required and can't be in the future", () => {
    assert.ok(outcomeDateError(null, "2026-11-07"));
    assert.ok(outcomeDateError("2026-11-20", "2026-11-07"));
    assert.equal(outcomeDateError("2026-11-08", "2026-11-07"), null); // time zones
    assert.equal(outcomeDateError("2026-10-01", "2026-11-07"), null);
  });
  test("the response is kind either way", () => {
    const failed = outcomeResponse("failed");
    assert.doesNotMatch(`${failed.title} ${failed.message}`, /fail(ed|ure)|unfortunately|sorry you|should have/i);
    assert.match(failed.message, /still here/);
    assert.match(outcomeResponse("passed").title, /Congratulations/);
    assert.equal(outcomeResponse("not_said").title, "Thanks");
  });
});

describe("empty states (item 8, L1, L2)", () => {
  test("FAIL-403: Review doesn't tell someone who hasn't learned anything that they're 'all caught up'", () => {
    const fresh = reviewEmpty(null);
    assert.notEqual(fresh.title, "All caught up");
    assert.match(fresh.message, /Study a lesson/);
    assert.ok(fresh.action);
    assert.equal(reviewEmpty("2026-11-09").title, "All caught up");
  });
  test("Explore's empty search offers a course request carrying the search", () => {
    const e = exploreEmpty("kubernetes");
    assert.equal(e.action?.to, "support");
    assert.match(e.message, /kubernetes/);
    assert.equal(courseRequestPrefill("  Kubernetes   CKA "), "Kubernetes CKA");
    assert.equal(courseRequestPrefill("   "), null);
    const long = courseRequestPrefill("x".repeat(199) + "😀");
    assert.equal(long, "x".repeat(199)); // never half an emoji
    assert.equal(courseRequestPrefill("y".repeat(500))!.length, 200);
  });
});

describe("first-run course list", () => {
  const tracks = Array.from({ length: 30 }, (_, i) => ({
    id: `t${i}`,
    title: i === 7 ? "CompTIA Security+" : `Course ${i}`,
    code: i === 7 ? "SY0-701" : `C${i}`,
    category_name: i % 2 ? "Cloud" : "Security",
    category_sort_order: i % 2,
  }));
  test("short list with a count of the rest", () => {
    const r = pickableCourses(tracks, "");
    assert.equal(r.items.length, FIRST_RUN_LIST_MAX);
    assert.equal(r.more, 30 - FIRST_RUN_LIST_MAX);
  });
  test("searches title, code and category; prefix matches first", () => {
    assert.deepEqual(pickableCourses(tracks, "sy0").items.map((t) => t.id), ["t7"]);
    assert.equal(pickableCourses(tracks, "security").items[0].id, "t7");
    assert.equal(pickableCourses(tracks, "cloud").items.length, FIRST_RUN_LIST_MAX);
  });
});

describe("privacy policy AI facts (H3)", () => {
  const page = read("mobile/app/(legal)/privacy.tsx");
  test("FAIL-405: names Anthropic and every feature that sends what a learner types", () => {
    assert.doesNotMatch(page, /\[AI provider to confirm\]/);
    assert.match(page, /Anthropic/);
    for (const feature of [/Ask the coach/, /first guess/, /explain it back/i, /lab reports/, /PBQ/, /review answers/, /unit-check answers/]) {
      assert.match(page, feature);
    }
    assert.match(page, /may not train its models/);
    assert.match(page, /within 30 days/);
    assert.match(page, /Draft for legal review/);
  });
});
