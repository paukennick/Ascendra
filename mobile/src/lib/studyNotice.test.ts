// REQ-165: the study notice -- one disclaimer for all content plus the AI
// data disclosure. Its place in the launch flow, the API client's backstop,
// its version against the server's, that its content covers what Nick asked
// for, and that its AI facts match the Privacy Policy. Also the coach-reply
// report body.
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STUDY_NOTICE_SECTIONS,
  STUDY_NOTICE_SUMMARY,
  STUDY_NOTICE_VERSION,
  StudyNoticeDeclinedError,
  isAiRequest,
  registerStudyNoticeHandler,
  studyNoticeDecision,
} from "./studyNotice.ts";
import { gateRedirect, launchGate, TERMS_VERSION, type OnboardingState } from "./legal.ts";
import { coachReportBody, SUPPORT_BODY_MAX } from "./coachReport.ts";
import { friendlyError } from "./errorMessage.ts";

(globalThis as Record<string, unknown>).__DEV__ = false;
const { api } = await import("../api/client.ts");

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const read = (p: string) => readFileSync(join(repo, p), "utf8");

const realFetch = globalThis.fetch;
let fetched: string[] = [];
function okFetch(): typeof fetch {
  return (async (url: string) => {
    fetched.push(String(url));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as unknown as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
  registerStudyNoticeHandler(null);
  fetched = [];
});

describe("which requests need the notice", () => {
  test("every route that sends the learner's own text to the model", () => {
    for (const p of [
      "/api/chat",
      "/api/grade",
      "/api/pbq",
      "/api/objectives/abc/guess-feedback",
      "/api/objectives/abc/explain-back",
      "/api/objectives/abc/lab/report",
      "/api/labs/abc/submit",
      "/api/review/sessions/s1/items/3/answer",
      "/api/units/u1/check",
    ]) {
      assert.ok(isAiRequest("POST", p), p);
    }
  });

  test("reading, non-AI writes and the notice's own request never ask", () => {
    assert.equal(isAiRequest("GET", "/api/chat?trackId=x"), false);
    for (const p of ["/api/support", "/api/onboarding/ai-notice", "/api/objectives/abc/lab", "/api/labs/abc/runs", "/api/sessions", "/api/chatty"]) {
      assert.equal(isAiRequest("POST", p), false, p);
    }
  });

  test("every server route that grades learner text with the model is listed", () => {
    // The route files whose handlers send learner-written text to Anthropic
    // (Privacy Policy section 5). A new one must be added to AI_ROUTES.
    const routes: Record<string, string> = {
      "backend/app/api/chat/route.ts": "/api/chat",
      "backend/app/api/grade/route.ts": "/api/grade",
      "backend/app/api/pbq/route.ts": "/api/pbq",
      "backend/app/api/objectives/[id]/guess-feedback/route.ts": "/api/objectives/x/guess-feedback",
      "backend/app/api/objectives/[id]/explain-back/route.ts": "/api/objectives/x/explain-back",
      "backend/app/api/objectives/[id]/lab/report/route.ts": "/api/objectives/x/lab/report",
      "backend/app/api/labs/[id]/submit/route.ts": "/api/labs/x/submit",
      "backend/app/api/review/sessions/[id]/items/[position]/answer/route.ts": "/api/review/sessions/x/items/1/answer",
      "backend/app/api/units/[id]/check/route.ts": "/api/units/x/check",
    };
    for (const [file, path] of Object.entries(routes)) {
      assert.ok(statSync(join(repo, file)).isFile(), `${file} exists`);
      assert.ok(isAiRequest("POST", path), path);
    }
  });
});

describe("the API client waits on the notice", () => {
  test("no handler registered (signed out, tests): the request goes ahead", async () => {
    globalThis.fetch = okFetch();
    await api.post("/api/chat", { message: "hi" });
    assert.equal(fetched.length, 1);
  });

  test("closed: nothing is sent and the screen gets a calm message", async () => {
    globalThis.fetch = okFetch();
    let asked = 0;
    registerStudyNoticeHandler(async () => {
      asked++;
      return false;
    });
    await assert.rejects(api.post("/api/chat", { message: "hi" }), (err: unknown) => {
      assert.ok(err instanceof StudyNoticeDeclinedError);
      assert.match(friendlyError(err), /Nothing was sent/);
      return true;
    });
    assert.equal(asked, 1);
    assert.equal(fetched.length, 0);
  });

  test("continued: the request is sent; non-AI requests never ask", async () => {
    globalThis.fetch = okFetch();
    let asked = 0;
    registerStudyNoticeHandler(async () => {
      asked++;
      return true;
    });
    await api.post("/api/grade", { answer: "x" });
    await api.post("/api/support", { kind: "ticket" });
    await api.get("/api/chat?trackId=t");
    assert.equal(asked, 1);
    assert.equal(fetched.length, 3);
  });
});

describe("asked once per account, at launch", () => {
  const state = (notice?: { needed: boolean }, terms = false, firstRun = false): OnboardingState => ({
    terms: { currentVersion: TERMS_VERSION, acceptedVersion: null, acceptedAt: null, needsAcceptance: terms },
    firstRun: { needed: firstRun, completedAt: null, goalTrackId: null, justExploring: false },
    ...(notice ? { notice: { currentVersion: STUDY_NOTICE_VERSION, acceptedAt: null, ...notice } } : {}),
  });

  test("Terms first, then the notice, then first run", () => {
    assert.equal(launchGate(state({ needed: true }, true, true)), "agree");
    assert.equal(launchGate(state({ needed: true }, false, true)), "notice");
    assert.equal(launchGate(state({ needed: false }, false, true)), "welcome");
    assert.equal(launchGate(state(undefined, false, false)), null, "a server older than this asks nothing at launch");
  });

  test("the notice keeps the Terms prompt's escape hatches", () => {
    assert.equal(gateRedirect("notice", ["(app)", "index"]), "/notice");
    assert.equal(gateRedirect("notice", ["(app)", "course", "x"]), "/notice", "a deep link into a course waits too");
    assert.equal(gateRedirect("notice", ["(app)", "notice"]), null);
    assert.equal(gateRedirect("notice", ["(app)", "account"]), null);
    assert.equal(gateRedirect("notice", ["(app)", "support"]), null);
    assert.equal(gateRedirect("notice", ["(legal)", "privacy"]), null);
  });

  test("the backstop asks until the server says accepted, or it was accepted this session", () => {
    assert.equal(studyNoticeDecision(null, false), "ask");
    assert.equal(studyNoticeDecision({}, false), "ask"); // a server older than this release
    assert.equal(studyNoticeDecision({ notice: { needed: true } }, false), "ask");
    assert.equal(studyNoticeDecision({ notice: { needed: false } }, false), "go");
    assert.equal(studyNoticeDecision(null, true), "go");
  });

  test("the app's version is the server's", () => {
    const server = read("backend/lib/study-notice.ts").match(/STUDY_NOTICE_VERSION = "([^"]+)"/)?.[1];
    assert.equal(server, STUDY_NOTICE_VERSION);
  });

  test("the launch screen is registered and the per-course and per-lab disclaimers are gone", () => {
    assert.match(read("mobile/app/(app)/_layout.tsx"), /name="notice"/);
    const course = read("mobile/app/(app)/course/[trackId]/index.tsx");
    assert.doesNotMatch(course, /DisclaimerGate|acknowledgement/);
  });
});

const allText = [STUDY_NOTICE_SUMMARY, ...STUDY_NOTICE_SECTIONS.flatMap((s) => [s.heading, ...s.lines])].join(" ");

describe("the notice covers what Nick asked for (2026-11-09)", () => {
  test("all content, AI-assisted, exam prep, may contain errors", () => {
    for (const s of ["Lessons, questions, labs, sims and the coach", "AI-assisted practice material for exam preparation", "may contain errors"]) {
      assert.ok(allText.includes(s), s);
    }
  });
  test("not professional, medical or clinical advice; clinical content named explicitly", () => {
    for (const s of ["not professional, medical or clinical advice", "Nothing in Ascendra is medical, nursing, physical-therapy, fitness", "exam preparation only", "fictional", "Never use anything here to make decisions about a real patient", "emergency services"]) {
      assert.ok(allText.toLowerCase().includes(s.toLowerCase()), s);
    }
  });
  test("not affiliated with or endorsed by any exam body", () => {
    assert.ok(allText.includes("not affiliated with or endorsed by any certification, licensing or exam body"));
  });
});

describe("the notice's AI section says what the Privacy Policy says", () => {
  const notice = STUDY_NOTICE_SECTIONS.find((s) => s.heading.includes("AI"))!.lines.join(" ");
  // legal.ts imports through the "@/" alias, which plain node cannot load;
  // section 5 is read as text.
  const legal = read("mobile/src/content/legal.ts");
  const start = legal.indexOf('"5. AI features and what they send"');
  const privacy = legal.slice(start, legal.indexOf('"6. ', start));
  test("names the provider, what is sent, what is not, and the 30-day deletion", () => {
    for (const fact of ["Anthropic", "30 days", "2 years", "not train", "name, email address and account ID are not sent"]) {
      assert.ok(notice.includes(fact), `notice: ${fact}`);
      assert.ok(privacy.includes(fact), `privacy section 5: ${fact}`);
    }
  });
});

describe("coach reply report", () => {
  test("the note comes first and the quoted reply is cut to fit the support limit", () => {
    const short = coachReportBody("  wrong drug dose ", "Reply text");
    assert.ok(short.startsWith("wrong drug dose\n\nReported coach reply:\nReply text"));
    assert.ok(coachReportBody("", "x").startsWith("(no details given)"));
    const long = coachReportBody("n".repeat(1000), "r".repeat(9000));
    assert.ok(long.length <= SUPPORT_BODY_MAX);
    assert.ok(long.endsWith("…"));
  });
});

describe("two pages, one acceptance (Play Prominent Disclosure)", () => {
  test("the AI data disclosure is on its own page; the disclaimer page holds everything else", async () => {
    const { sectionsFor, AI_DATA_HEADING } = await import("./studyNotice.ts");
    assert.deepEqual(sectionsFor("data").map((s) => s.heading), [AI_DATA_HEADING]);
    assert.ok(sectionsFor("content").every((s) => s.heading !== AI_DATA_HEADING));
    assert.equal(sectionsFor("content").length + sectionsFor("data").length, STUDY_NOTICE_SECTIONS.length);
  });
});
