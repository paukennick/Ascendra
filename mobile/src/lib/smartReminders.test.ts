// REQ-197: reminders that say what and why, the lock-screen setting, the
// email switches and the dictation tip. Pure modules only.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BODY_MAX,
  DEFAULT_REMINDERS,
  GENERIC_REMINDER,
  GUILT_PATTERNS,
  TITLE_MAX,
  localDay,
  parsePlan,
  parseReminderPrefs,
  reminderSchedule,
  reminderText,
  type PlanReminder,
} from "./reminders.ts";
import { ACCOUNT_EMAILS_NOTE, EMAIL_PREF_ROWS, NOT_SENDING_YET, parseEmailPrefs } from "./emailPrefs.ts";
import { DICTATION_HINT, dictationHintKey, lengthCounter, lengthProblem, showDictationHint } from "./dictation.ts";
import { localDataOwner } from "./localData.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const read = (p: string) => readFileSync(join(repo, p), "utf8");

const r = (over: Partial<PlanReminder> = {}): PlanReminder => ({
  date: "2026-11-10",
  trackId: "t1",
  course: "Security+",
  topic: "Incident response",
  questionCount: 6,
  minutes: 5,
  examInDays: 11,
  ...over,
});

describe("reminder text", () => {
  test("Nick's shape: '<course>: <topic>' and 'Due for review · N questions, ~M min · exam in D days'", () => {
    assert.deepEqual(reminderText(r(), true), {
      title: "Security+: Incident response",
      body: "Due for review · 6 questions, ~5 min · exam in 11 days",
    });
    assert.equal(reminderText(r({ examInDays: null }), true).body, "Due for review · 6 questions, ~5 min");
    assert.equal(reminderText(r({ minutes: null, examInDays: null, questionCount: 1 }), true).body, "Due for review · 1 question");
    assert.equal(reminderText(r({ examInDays: 0 }), true).body, "Due for review · 6 questions, ~5 min · exam today");
    assert.equal(reminderText(r({ examInDays: 1 }), true).body, "Due for review · 6 questions, ~5 min · exam in 1 day");
  });

  test("length: title within ~40 and body within ~60, even at the extremes", () => {
    const worst = r({
      course: "Cloud DevOps Engin…",
      topic: "Designing continuous delivery with Cloud Deploy, including Kustomize and Skaffold",
      questionCount: 12,
      minutes: 120,
      examInDays: 1095,
    });
    const t = reminderText(worst, true);
    assert.ok(t.title.length <= TITLE_MAX, `${t.title.length}: ${t.title}`);
    assert.ok(t.body.length <= BODY_MAX, `${t.body.length}: ${t.body}`);
    assert.ok(t.title.startsWith("Cloud DevOps Engin…: Designing"), t.title);
    const longCourse = reminderText(r({ course: "A".repeat(50) }), true);
    assert.ok(longCourse.title.length <= TITLE_MAX);
    assert.ok(GENERIC_REMINDER.title.length <= TITLE_MAX && GENERIC_REMINDER.body.length <= BODY_MAX);
  });

  test("honest and kind: no 'fading', no recall percentage, no guilt", () => {
    for (const b of [r(), r({ examInDays: 2 }), r({ minutes: null })]) {
      const t = reminderText(b, true);
      for (const bad of GUILT_PATTERNS) assert.doesNotMatch(`${t.title} ${t.body}`, bad, String(bad));
    }
    for (const phrase of ["Don't lose your streak", "Incident response is fading", "Recall at 62%", "You missed a day", "Come back"]) {
      assert.ok(GUILT_PATTERNS.some((p) => p.test(phrase)), phrase);
    }
  });

  test("'Show topic on lock screen' off: a generic line that names nothing", () => {
    const t = reminderText(r({ course: "CCRN", topic: "Sepsis" }), false);
    assert.deepEqual(t, GENERIC_REMINDER);
    assert.doesNotMatch(`${t.title} ${t.body}`, /CCRN|Sepsis/);
  });
});

describe("the lock-screen setting", () => {
  test("on by default, kept when stored, older stored settings read as on", () => {
    assert.equal(DEFAULT_REMINDERS.showTopic, true);
    assert.equal(parseReminderPrefs(JSON.stringify({ enabled: false, showTopic: false })).showTopic, false);
    assert.equal(parseReminderPrefs(JSON.stringify({ enabled: true, days: [1], time: 600, quietStart: 1290, quietEnd: 480 })).showTopic, true);
  });
});

describe("scheduling from the plan", () => {
  const on = { ...DEFAULT_REMINDERS, enabled: true, days: [0, 1, 2, 3, 4, 5, 6], time: 19 * 60 };

  test("at most one a day, only on plan days, never in the past", () => {
    const now = new Date(2026, 10, 9, 20, 0); // after today's 19:00
    const plan = [r({ date: "2026-11-09" }), r({ date: "2026-11-10" }), r({ date: "2026-11-10", topic: "Other" }), r({ date: "2026-11-12" })];
    const slots = reminderSchedule(on, plan, now);
    assert.deepEqual(slots.map((s) => localDay(s.at)), ["2026-11-10", "2026-11-12"]);
    assert.equal(slots[0].title, "Security+: Incident response");
  });

  test("no plan, no reminder (a day with nothing due is skipped)", () => {
    assert.deepEqual(reminderSchedule(on, [], new Date(2026, 10, 9, 8, 0)), []);
  });

  test("lock-screen off reaches the scheduled text", () => {
    const [s] = reminderSchedule({ ...on, showTopic: false }, [r()], new Date(2026, 10, 9, 8, 0));
    assert.equal(s.title, GENERIC_REMINDER.title);
  });

  test("a malformed plan from the server schedules nothing", () => {
    assert.deepEqual(parsePlan(null), []);
    assert.deepEqual(parsePlan({ reminders: [{ date: "x" }, r({ questionCount: 0 }), r({ examInDays: -1 })] }), []);
    assert.equal(parsePlan({ reminders: [r()] }).length, 1);
  });

  test("web stays without reminders, and says so", () => {
    const screen = read("mobile/app/(app)/settings/reminders.tsx");
    assert.match(screen, /web version doesn&apos;t send any/);
    const scheduler = read("mobile/src/lib/reminderScheduler.ts");
    assert.match(scheduler, /remindersSupported = Platform\.OS === "ios" \|\| Platform\.OS === "android"/);
    assert.doesNotMatch(scheduler, /getExpoPushTokenAsync|getDevicePushTokenAsync/, "no push token");
  });

  test("the plan cache is per user and swept at Log out", () => {
    assert.equal(localDataOwner("ascendra.reminderPlan.user-1"), "user-1");
    assert.equal(localDataOwner(dictationHintKey("user-2")), "user-2");
  });
});

describe("email switches", () => {
  test("three rows, plain words, parsed strictly", () => {
    assert.deepEqual(EMAIL_PREF_ROWS.map((x) => x.key), ["examChanges", "examCountdown", "weeklyDigest"]);
    for (const row of EMAIL_PREF_ROWS) {
      for (const bad of GUILT_PATTERNS) assert.doesNotMatch(row.detail, bad, row.label);
    }
    assert.match(ACCOUNT_EMAILS_NOTE, /always arrive/);
    assert.deepEqual(
      parseEmailPrefs({
        preferences: { examChanges: true, examCountdown: false, weeklyDigest: false },
        emailVerified: true,
        sending: { examChanges: true, examCountdown: true, weeklyDigest: false },
      }),
      {
        prefs: { examChanges: true, examCountdown: false, weeklyDigest: false },
        verified: true,
        sending: { examChanges: true, examCountdown: true, weeklyDigest: false },
      }
    );
    for (const bad of GUILT_PATTERNS) assert.doesNotMatch(NOT_SENDING_YET, bad);
    assert.equal(parseEmailPrefs({ preferences: { examChanges: "yes" } }), null);
  });
});

describe("dictation tip", () => {
  test("phones only, once per learner", () => {
    assert.equal(DICTATION_HINT, "Tip: tap the mic on your keyboard to dictate");
    assert.equal(showDictationHint("ios", false, "u"), true);
    assert.equal(showDictationHint("android", false, "u"), true);
    assert.equal(showDictationHint("web", false, "u"), false);
    assert.equal(showDictationHint("ios", true, "u"), false);
    assert.equal(showDictationHint("ios", false, null), false);
  });

  test("long dictated text is never cut: the three fields have no maxLength and say how much is over", () => {
    for (const f of [
      "mobile/app/(app)/course/[trackId]/chat.tsx",
      "mobile/app/(app)/course/[trackId]/explain/[objectiveId].tsx",
      "mobile/app/(app)/course/[trackId]/lab/[labId].tsx",
    ]) {
      const src = read(f);
      assert.doesNotMatch(src, /maxLength=/, f);
      assert.match(src, /<DictationHint \/>/, f);
    }
    assert.equal(lengthProblem("a".repeat(4000), 4000), null);
    assert.match(lengthProblem("a".repeat(4012), 4000)!, /^12 characters over the 4,000 limit\. .*nothing has been cut/);
    assert.equal(lengthCounter("a".repeat(100), 4000), null);
    assert.equal(lengthCounter("a".repeat(3700), 4000), "3,700 / 4,000");
  });
});
