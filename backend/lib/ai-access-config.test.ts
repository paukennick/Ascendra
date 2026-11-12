// REQ-201: the pure rules of the AI access modes and the global daily
// ceiling -- every mode x user type x feature, billing off and on.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  AI_ACCESS_MODES,
  AI_FEATURES,
  COACH_PREVIEW_MESSAGE,
  GLOBAL_PAUSE_MESSAGE,
  LESSON_PREPARING_MESSAGE,
  REGENERATE_PREVIEW_MESSAGE,
  aiAccessMode,
  aiAccessModeIsValid,
  aiAccessWarnings,
  aiGlobalCeilingIsValid,
  aiLimited,
  aiVerdict,
  aiPilotCoachIsValid,
  aiPilotGradedIsValid,
  ceilingVerdict,
  coachLimitMessage,
  pilotCoachMessagesPerDay,
  pilotGradedAnswersPerDay,
  globalDailyCeilingUsd,
  gradedPreviewMessage,
  nextUtcDayStart,
  utcDayStart,
  type AiAccessMode,
  type AiFeature,
  type AiUserKind,
  type AiVerdict,
} from "./ai-access-config";
import { BULK_GRANT_MAX, parseBulkGrantInput, splitEmailList } from "./account-access-config";
import { ALLOWANCE_DEFAULTS, allowanceLimit } from "./billing-config";

describe("AI_ACCESS_MODE", () => {
  test("unset or empty is all (today's behavior)", () => {
    assert.equal(aiAccessMode({}), "all");
    assert.equal(aiAccessMode({ AI_ACCESS_MODE: "" }), "all");
    assert.equal(aiAccessMode({ AI_ACCESS_MODE: "  " }), "all");
    assert.equal(aiAccessModeIsValid({}), true);
  });

  test("the three values, any case and spacing", () => {
    for (const m of AI_ACCESS_MODES) {
      assert.equal(aiAccessMode({ AI_ACCESS_MODE: ` ${m.toUpperCase()} ` }), m);
      assert.equal(aiAccessModeIsValid({ AI_ACCESS_MODE: m }), true);
    }
  });

  test("an unrecognized value fails toward spending less (granted) and is reported as invalid", () => {
    for (const v of ["grant", "paid-only", "on", "true", "1"]) {
      assert.equal(aiAccessMode({ AI_ACCESS_MODE: v }), "granted", v);
      assert.equal(aiAccessModeIsValid({ AI_ACCESS_MODE: v }), false, v);
    }
  });

  test("independent of BILLING_ENABLED: the env read ignores it", () => {
    assert.equal(aiAccessMode({ AI_ACCESS_MODE: "granted", BILLING_ENABLED: "true" }), "granted");
    assert.equal(aiAccessMode({ BILLING_ENABLED: "true" }), "all");
  });
});

// The whole matrix, written out so a change to any cell is a visible diff.
// B = billing (unchanged), X = blocked, C = counted (Free's 3 a day), O = open.
const MATRIX: Record<string, Record<AiUserKind, Record<AiFeature, AiVerdict>>> = {};
const B = "billing", X = "blocked", C = "counted", O = "open";
const full = { coach: B, regenerate: B, written_grading: B, shared_lesson: B } as const;
const freeAi = { coach: X, regenerate: X, written_grading: C, shared_lesson: O } as const;
MATRIX["all/off"] = { owner: full, granted: full, paying: full, ordinary: full };
MATRIX["all/on"] = { owner: full, granted: full, paying: full, ordinary: full };
MATRIX["granted/off"] = { owner: full, granted: full, paying: freeAi, ordinary: freeAi };
MATRIX["granted/on"] = { owner: full, granted: full, paying: freeAi, ordinary: freeAi };
MATRIX["paid/off"] = { owner: full, granted: full, paying: full, ordinary: freeAi };
MATRIX["paid/on"] = { owner: full, granted: full, paying: full, ordinary: full };

describe("mode x user x feature", () => {
  for (const mode of AI_ACCESS_MODES) {
    for (const billingOn of [false, true]) {
      const key = `${mode}/${billingOn ? "on" : "off"}`;
      for (const user of ["owner", "granted", "paying", "ordinary"] as AiUserKind[]) {
        test(`${key} ${user}`, () => {
          for (const f of AI_FEATURES) {
            assert.equal(aiVerdict(mode, user, f, billingOn), MATRIX[key][user][f], `${key} ${user} ${f}`);
          }
          const limited = MATRIX[key][user].coach === X;
          assert.equal(aiLimited(mode, user, billingOn), limited);
        });
      }
    }
  }

  test("all mode never limits anyone (byte-for-byte today)", () => {
    for (const u of ["owner", "granted", "paying", "ordinary"] as AiUserKind[]) {
      for (const b of [false, true]) assert.equal(aiLimited("all", u, b), false);
    }
  });

  test("owners and granted accounts are never limited in any mode", () => {
    for (const m of AI_ACCESS_MODES) for (const u of ["owner", "granted"] as AiUserKind[]) for (const b of [false, true]) assert.equal(aiLimited(m, u, b), false);
  });

  test("a limited learner still gets shared lessons; grading is counted, never blocked", () => {
    for (const m of ["granted", "paid"] as AiAccessMode[]) {
      assert.equal(aiVerdict(m, "ordinary", "shared_lesson", false), "open");
      assert.equal(aiVerdict(m, "ordinary", "written_grading", false), "counted");
    }
  });
});

describe("REQ-246: pilot-only allowances", () => {
  test("AI_PILOT_COACH_MESSAGES_PER_DAY: unset, empty or 0 = 0 (today's behavior); a whole number counts", () => {
    assert.equal(pilotCoachMessagesPerDay({}), 0);
    assert.equal(pilotCoachMessagesPerDay({ AI_PILOT_COACH_MESSAGES_PER_DAY: "" }), 0);
    assert.equal(pilotCoachMessagesPerDay({ AI_PILOT_COACH_MESSAGES_PER_DAY: "0" }), 0);
    assert.equal(pilotCoachMessagesPerDay({ AI_PILOT_COACH_MESSAGES_PER_DAY: " 10 " }), 10);
    for (const v of [undefined, "", "0", "10"]) {
      assert.equal(aiPilotCoachIsValid(v === undefined ? {} : { AI_PILOT_COACH_MESSAGES_PER_DAY: v }), true, String(v));
    }
  });

  test("AI_PILOT_COACH_MESSAGES_PER_DAY: invalid values fall back to 0 and are reported", () => {
    for (const v of ["-1", "2.5", "ten", "1e3", "none", "10 a day", "99999999999999999999"]) {
      assert.equal(pilotCoachMessagesPerDay({ AI_PILOT_COACH_MESSAGES_PER_DAY: v }), 0, v);
      assert.equal(aiPilotCoachIsValid({ AI_PILOT_COACH_MESSAGES_PER_DAY: v }), false, v);
      assert.match(aiAccessWarnings({ AI_PILOT_COACH_MESSAGES_PER_DAY: v }).join(" "), /AI_PILOT_COACH_MESSAGES_PER_DAY .*treated as 0/, v);
    }
  });

  test("AI_PILOT_GRADED_ANSWERS_PER_DAY: unset or invalid = null (Free's allowance applies); a whole number counts", () => {
    assert.equal(pilotGradedAnswersPerDay({}), null);
    assert.equal(pilotGradedAnswersPerDay({ AI_PILOT_GRADED_ANSWERS_PER_DAY: " " }), null);
    assert.equal(pilotGradedAnswersPerDay({ AI_PILOT_GRADED_ANSWERS_PER_DAY: "20" }), 20);
    assert.equal(pilotGradedAnswersPerDay({ AI_PILOT_GRADED_ANSWERS_PER_DAY: "0" }), 0);
    for (const v of ["-3", "twenty", "3.5"]) {
      assert.equal(pilotGradedAnswersPerDay({ AI_PILOT_GRADED_ANSWERS_PER_DAY: v }), null, v);
      assert.equal(aiPilotGradedIsValid({ AI_PILOT_GRADED_ANSWERS_PER_DAY: v }), false, v);
      assert.match(aiAccessWarnings({ AI_PILOT_GRADED_ANSWERS_PER_DAY: v }).join(" "), /AI_PILOT_GRADED_ANSWERS_PER_DAY .*Free's graded-answer allowance/, v);
    }
    assert.deepEqual(aiAccessWarnings({ AI_ACCESS_MODE: "granted", AI_PILOT_COACH_MESSAGES_PER_DAY: "10", AI_PILOT_GRADED_ANSWERS_PER_DAY: "20" }), []);
  });

  test("the coach verdict: counted for a limited learner above 0, blocked at 0, and only for a limited learner", () => {
    for (const mode of AI_ACCESS_MODES) {
      for (const billingOn of [false, true]) {
        for (const user of ["owner", "granted", "paying", "ordinary"] as AiUserKind[]) {
          const limited = aiLimited(mode, user, billingOn);
          assert.equal(aiVerdict(mode, user, "coach", billingOn, 10), limited ? "counted" : "billing", `${mode}/${billingOn} ${user}`);
          assert.equal(aiVerdict(mode, user, "coach", billingOn, 0), aiVerdict(mode, user, "coach", billingOn), "0 is the default");
          // The other features never change with the pilot coach count.
          for (const f of ["regenerate", "written_grading", "shared_lesson"] as AiFeature[]) {
            assert.equal(aiVerdict(mode, user, f, billingOn, 10), aiVerdict(mode, user, f, billingOn), `${f}`);
          }
        }
      }
    }
    assert.equal(aiVerdict("granted", "ordinary", "coach", false, 10), "counted");
    assert.equal(aiVerdict("granted", "ordinary", "coach", false, 0), "blocked");
    assert.equal(aiVerdict("all", "ordinary", "coach", false, 10), "billing", "goes away when the mode is all");
    assert.equal(aiVerdict("paid", "ordinary", "coach", true, 10), "billing", "and when paid mode meets billing on");
  });

  test("the pilot settings never change the billing tiers' counts (Free stays coach 0 / graded 3)", () => {
    const env = { AI_PILOT_COACH_MESSAGES_PER_DAY: "10", AI_PILOT_GRADED_ANSWERS_PER_DAY: "20" };
    assert.equal(ALLOWANCE_DEFAULTS.coach_message.limits.free, 0);
    assert.equal(ALLOWANCE_DEFAULTS.graded_answer.limits.free, 3);
    assert.equal(allowanceLimit("coach_message", "free", env), 0);
    assert.equal(allowanceLimit("graded_answer", "free", env), 3);
    // Why the pilot has its own graded name: the billing override is Free's count once billing is on.
    assert.equal(allowanceLimit("graded_answer", "free", { BILLING_ALLOWANCE_GRADED_ANSWER_FREE: "20" }), 20);
  });

  test("the coach-limit words: calm, what still works, no plan or price", () => {
    const m = coachLimitMessage(10, "in about 5 hours");
    assert.equal(m, "You've used today's 10 coach messages. More open up in about 5 hours; lessons, practice and review keep working.");
    assert.doesNotMatch(m, /\bPlus\b|\bPro\b|upgrade|\$|price|\bplans?\b|subscri/i);
  });
});

describe("AI_GLOBAL_DAILY_CEILING_USD", () => {
  test("unset, empty, off, 0, negative or junk = no ceiling", () => {
    for (const v of [undefined, "", "off", "OFF", "0", "-5", "abc"]) {
      assert.equal(globalDailyCeilingUsd(v === undefined ? {} : { AI_GLOBAL_DAILY_CEILING_USD: v }), null, String(v));
    }
    assert.equal(aiGlobalCeilingIsValid({ AI_GLOBAL_DAILY_CEILING_USD: "abc" }), false);
    assert.equal(aiGlobalCeilingIsValid({ AI_GLOBAL_DAILY_CEILING_USD: "-1" }), false);
    assert.equal(aiGlobalCeilingIsValid({}), true);
  });

  test("a positive number of dollars", () => {
    assert.equal(globalDailyCeilingUsd({ AI_GLOBAL_DAILY_CEILING_USD: " 25 " }), 25);
    assert.equal(globalDailyCeilingUsd({ AI_GLOBAL_DAILY_CEILING_USD: "7.5" }), 7.5);
  });

  test("at the ceiling: chat and regenerate pause and new shared lessons wait, for all but owners; grading never stops", () => {
    for (const u of ["granted", "paying", "ordinary"] as AiUserKind[]) {
      assert.equal(ceilingVerdict("coach", u, true), "paused");
      assert.equal(ceilingVerdict("regenerate", u, true), "paused");
      assert.equal(ceilingVerdict("shared_lesson", u, true), "preparing");
      assert.equal(ceilingVerdict("written_grading", u, true), "open");
    }
    for (const f of AI_FEATURES) {
      assert.equal(ceilingVerdict(f, "owner", true), "open", `owner ${f}`);
      for (const u of ["owner", "granted", "paying", "ordinary"] as AiUserKind[]) assert.equal(ceilingVerdict(f, u, false), "open");
    }
  });

  test("the UTC day", () => {
    const now = new Date("2026-11-09T23:59:59.000Z");
    assert.equal(utcDayStart(now).toISOString(), "2026-11-09T00:00:00.000Z");
    assert.equal(nextUtcDayStart(now).toISOString(), "2026-11-10T00:00:00.000Z");
    assert.equal(nextUtcDayStart(new Date("2026-12-31T05:00:00Z")).toISOString(), "2027-01-01T00:00:00.000Z");
  });
});

describe("wording: honest, no upsell or pricing while billing is off", () => {
  const all = [COACH_PREVIEW_MESSAGE, REGENERATE_PREVIEW_MESSAGE, gradedPreviewMessage(3, "in about 5 hours"), GLOBAL_PAUSE_MESSAGE, LESSON_PREPARING_MESSAGE];
  test("no plan names, prices or upgrade words", () => {
    for (const m of all) assert.doesNotMatch(m, /\bPlus\b|\bPro\b|upgrade|\$|price|\bplans?\b|subscri/i, m);
  });
  test("says it is a limited preview, and what still works", () => {
    assert.match(COACH_PREVIEW_MESSAGE, /^The AI coach is in limited preview/);
    assert.match(REGENERATE_PREVIEW_MESSAGE, /limited preview/);
    assert.match(gradedPreviewMessage(3, "in about 5 hours"), /limited preview: 3 a day.*in about 5 hours/);
    assert.match(LESSON_PREPARING_MESSAGE, /being prepared.*try again later/i);
    for (const m of all) assert.match(m, /keeps? working|still works/);
  });
});

describe("health warnings", () => {
  test("nothing in the default configuration or a valid one", () => {
    assert.deepEqual(aiAccessWarnings({}), []);
    assert.deepEqual(aiAccessWarnings({ AI_ACCESS_MODE: "granted", AI_GLOBAL_DAILY_CEILING_USD: "5" }), []);
    assert.deepEqual(aiAccessWarnings({ AI_ACCESS_MODE: "paid", BILLING_ENABLED: "true" }), []);
  });
  test("a typo, a junk ceiling, and granted left on after billing launches", () => {
    assert.match(aiAccessWarnings({ AI_ACCESS_MODE: "grant" })[0], /treated as granted/);
    assert.match(aiAccessWarnings({ AI_GLOBAL_DAILY_CEILING_USD: "five" })[0], /no global AI ceiling/);
    assert.match(aiAccessWarnings({ AI_ACCESS_MODE: "granted", BILLING_ENABLED: "on" })[0], /AI_ACCESS_MODE=paid at launch/);
  });
});

describe("bulk invite input (Settings > Access)", () => {
  const NOW = new Date("2026-11-09T12:00:00Z");
  test("addresses in a string or array, split, normalized and de-duplicated", () => {
    assert.deepEqual(splitEmailList("a@x.io, b@x.io;\nc@x.io  d@x.io"), ["a@x.io", "b@x.io", "c@x.io", "d@x.io"]);
    assert.deepEqual(splitEmailList(["a@x.io", 3, "b@x.io c@x.io"]), ["a@x.io", "b@x.io", "c@x.io"]);
    const r = parseBulkGrantInput({ emails: "A@X.io\na@x.io\nb@x.io", note: " AI pilot ", until: "2026-12-31" }, NOW);
    assert.ok(typeof r !== "string");
    assert.deepEqual(r.emails, ["a@x.io", "b@x.io"]);
    assert.equal(r.note, "AI pilot");
    assert.equal(r.until?.toISOString(), "2026-12-31T23:59:59.999Z");
  });
  test("all or nothing: one bad address refuses the lot, and the size is capped", () => {
    assert.match(parseBulkGrantInput({ emails: "a@x.io, nope" }, NOW) as string, /Not an email address: nope/);
    assert.match(parseBulkGrantInput({ emails: "" }, NOW) as string, /at least one/);
    const many = Array.from({ length: BULK_GRANT_MAX + 1 }, (_, i) => `p${i}@x.io`);
    assert.match(parseBulkGrantInput({ emails: many }, NOW) as string, /At most 50/);
    assert.match(parseBulkGrantInput({ emails: "a@x.io", until: "2020-01-01" }, NOW) as string, /future/);
  });
});
