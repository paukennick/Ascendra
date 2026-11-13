// REQ-224 / REQ-259: the 18+ mature-content notice for mental health courses
// -- its version against the server's, its wording and attestation, when to
// ask (per course), the form's validation (date of birth the first time only,
// attestation always), the under-18 view, and the API client's backstop (a 403
// "mature_content_required" naming a course asks, then resends once; closing
// the notice or an under-18 account sends nothing more).
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptFailure,
  MATURE_ATTESTATION_STATEMENT,
  MATURE_CONTENT_NOTICE_VERSION,
  MATURE_NOTICE_LINES,
  MATURE_UNDERAGE_LINES,
  MatureContentBlockedError,
  MatureContentDeclinedError,
  matureRefusalTarget,
  needsMatureConfirmation,
  noticeMode,
  parseMatureState,
  registerMatureContentHandler,
  validateMatureForm,
  type MatureAnswer,
  type MatureState,
} from "./matureContent.ts";
import { friendlyError } from "./errorMessage.ts";

(globalThis as Record<string, unknown>).__DEV__ = false;
const { api } = await import("../api/client.ts");

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const read = (p: string) => readFileSync(join(repo, p), "utf8");

const TRACK = "00000000-0000-4000-8000-0000000000a1";
const TRACK2 = "00000000-0000-4000-8000-0000000000a2";
const realFetch = globalThis.fetch;
let fetched: string[] = [];
const REFUSAL = { code: "mature_content_required", category: "mental-health", trackId: TRACK, noticeVersion: MATURE_CONTENT_NOTICE_VERSION, minAge: 18, error: "x" };
// Refuses until `confirmed` is set, then answers 200.
function gatedFetch(state: { confirmed: boolean }): typeof fetch {
  return (async (url: string) => {
    fetched.push(String(url));
    if (!state.confirmed) return new Response(JSON.stringify(REFUSAL), { status: 403 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as unknown as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
  registerMatureContentHandler(null);
  fetched = [];
});

const stateOf = (over: Partial<MatureState> = {}): MatureState => ({
  noticeVersion: MATURE_CONTENT_NOTICE_VERSION,
  dateOfBirthOnFile: true,
  ageStatus: "adult",
  acknowledgedTrackIds: [],
  ...over,
});
const mh = (id: string) => ({ id, category_slug: "mental-health" });

describe("the notice", () => {
  test("its version is the server's (backend/lib/mature-content.ts)", () => {
    const m = read("backend/lib/mature-content.ts").match(/MATURE_CONTENT_NOTICE_VERSION = "([^"]+)"/);
    assert.equal(m?.[1], MATURE_CONTENT_NOTICE_VERSION);
  });
  test("says what the material is, that it is fictional practice and where to get help", () => {
    const text = MATURE_NOTICE_LINES.join(" ");
    for (const w of [/suicide/, /abuse/, /violence/, /trauma/, /fictional/, /988/]) assert.match(text, w);
  });
  test("the attestation is the agreed clause: true to the best of my knowledge, and 18 or older", () => {
    assert.equal(MATURE_ATTESTATION_STATEMENT, "I confirm the information I've given is true to the best of my knowledge, and I'm 18 or older.");
  });
  test("the under-18 message is kind, says why it is locked and who to contact", () => {
    const text = MATURE_UNDERAGE_LINES("help@example.test").join(" ");
    assert.match(text, /18 or older/);
    assert.match(text, /can't be changed in the app/);
    assert.match(text, /help@example\.test/);
  });
  test("the Mental Health category exists in migration 077 and is the only gated one", () => {
    assert.match(read("backend/supabase/migrations/077_mental_health_mature_content.sql"), /check \(category_slug in \('mental-health'\)\)/);
  });
});

describe("when to ask: per course", () => {
  test("only a mental health course without an acknowledgment of this course at the current version", () => {
    assert.equal(needsMatureConfirmation({ id: "x", category_slug: "healthcare-nursing" }, null, new Set()), false);
    assert.equal(needsMatureConfirmation({ id: "x", category_slug: null }, null, new Set()), false);
    assert.equal(needsMatureConfirmation(null, null, new Set()), false);
    assert.equal(needsMatureConfirmation(mh(TRACK), null, new Set()), true, "unknown state asks");
    assert.equal(needsMatureConfirmation(mh(TRACK), stateOf(), new Set()), true);
    assert.equal(needsMatureConfirmation(mh(TRACK), stateOf({ acknowledgedTrackIds: [TRACK] }), new Set()), false);
    assert.equal(needsMatureConfirmation(mh(TRACK2), stateOf({ acknowledgedTrackIds: [TRACK] }), new Set()), true, "another course asks again");
    assert.equal(needsMatureConfirmation(mh(TRACK), stateOf({ acknowledgedTrackIds: [TRACK], noticeVersion: "2026-11-10" }), new Set()), true, "an old version asks again");
    assert.equal(needsMatureConfirmation(mh(TRACK), stateOf(), new Set([TRACK])), false, "acknowledged in this session");
    assert.equal(needsMatureConfirmation(mh(TRACK2), stateOf(), new Set([TRACK])), true);
  });
  test("reads the server's refusal for a course and nothing else", () => {
    assert.deepEqual(matureRefusalTarget(403, REFUSAL), { trackId: TRACK, category: "mental-health" });
    assert.equal(matureRefusalTarget(403, { ...REFUSAL, trackId: undefined }), null, "no course named: nothing to acknowledge");
    assert.equal(matureRefusalTarget(403, { code: "study_notice_required" }), null);
    assert.equal(matureRefusalTarget(403, { code: "mature_content_underage" }), null);
    assert.equal(matureRefusalTarget(402, REFUSAL), null);
    assert.equal(matureRefusalTarget(403, null), null);
  });
  test("parses the state; anything unreadable is null (and so asks)", () => {
    assert.deepEqual(
      parseMatureState({ noticeVersion: MATURE_CONTENT_NOTICE_VERSION, dateOfBirthOnFile: true, ageStatus: "adult", acknowledgedTrackIds: [TRACK, 5] }),
      stateOf({ acknowledgedTrackIds: [TRACK] })
    );
    assert.equal(parseMatureState({ categories: [] }), null, "the answer of a server before REQ-259");
    assert.equal(parseMatureState(null), null);
    assert.equal(parseMatureState({ noticeVersion: "v", acknowledgedTrackIds: [], ageStatus: "weird" })?.ageStatus, "unknown");
  });
});

describe("what the notice shows", () => {
  test("a date of birth only while none is on file; a closed message under 18", () => {
    assert.equal(noticeMode(null), "form_with_dob");
    assert.equal(noticeMode(stateOf({ dateOfBirthOnFile: false, ageStatus: "unknown" })), "form_with_dob");
    assert.equal(noticeMode(stateOf()), "form");
    assert.equal(noticeMode(stateOf({ ageStatus: "under_18" })), "blocked");
  });
});

describe("the form's validation", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  const base = { needsDateOfBirth: true, day: "15", month: "1", year: "1990", attested: true };
  test("first time: a valid date and the attestation send both", () => {
    assert.deepEqual(validateMatureForm(base, now), { ok: true, body: { attested: true, dateOfBirth: "1990-01-15" } });
  });
  test("later courses: no date is asked or sent, even if the boxes hold something", () => {
    assert.deepEqual(validateMatureForm({ ...base, needsDateOfBirth: false, day: "", month: "", year: "" }, now), { ok: true, body: { attested: true } });
    assert.deepEqual(validateMatureForm({ ...base, needsDateOfBirth: false }, now), { ok: true, body: { attested: true } });
  });
  test("the attestation is required every time", () => {
    for (const needsDateOfBirth of [true, false]) {
      const r = validateMatureForm({ ...base, needsDateOfBirth, attested: false }, now);
      assert.equal(r.ok, false);
      assert.match((r as { errors: { attested?: string } }).errors.attested ?? "", /Tick the box/);
    }
  });
  test("an empty, impossible, future or too-early date is refused with its own sentence, and the attestation error is kept apart", () => {
    const err = (over: Partial<typeof base>) => (validateMatureForm({ ...base, ...over }, now) as { errors: { dateOfBirth?: string; attested?: string } }).errors;
    assert.match(err({ day: "", month: "", year: "" }).dateOfBirth ?? "", /Enter your date of birth/);
    assert.match(err({ day: "31", month: "2" }).dateOfBirth ?? "", /doesn't exist/);
    assert.match(err({ day: "1", month: "1", year: "2027" }).dateOfBirth ?? "", /in the past/);
    assert.match(err({ year: "1850" }).dateOfBirth ?? "", /1900 or later/);
    const both = err({ year: "", attested: false });
    assert.ok(both.dateOfBirth && both.attested);
  });
});

describe("reading the accept route's refusals", () => {
  test("under 18 locks the notice; a missing date of birth asks for it; the rest is an error to show", () => {
    assert.deepEqual(acceptFailure(403, { code: "mature_content_underage" }), { kind: "underage" });
    assert.deepEqual(acceptFailure(400, { code: "date_of_birth_required" }), { kind: "needs_dob" });
    assert.deepEqual(acceptFailure(400, { code: "date_of_birth_invalid" }), { kind: "other" });
    assert.deepEqual(acceptFailure(409, { code: "mature_notice_outdated" }), { kind: "other" });
    assert.deepEqual(acceptFailure(500, null), { kind: "other" });
  });
});

describe("the API client's backstop", () => {
  test("a refused course request asks for THAT course, records, and is sent once more", async () => {
    const state = { confirmed: false };
    globalThis.fetch = gatedFetch(state);
    const asked: string[] = [];
    registerMatureContentHandler(async (target, source) => {
      asked.push(`${target.category}:${target.trackId}:${source}`);
      state.confirmed = true;
      return "confirmed";
    });
    assert.deepEqual(await api.get(`/api/courses/${TRACK}`), { ok: true });
    assert.deepEqual(asked, [`mental-health:${TRACK}:course`]);
    assert.equal(fetched.length, 2);
  });
  test("the intake form's save is asked as 'intake'", async () => {
    const state = { confirmed: false };
    globalThis.fetch = gatedFetch(state);
    const asked: string[] = [];
    registerMatureContentHandler(async (_t, source) => {
      asked.push(source);
      state.confirmed = true;
      return "confirmed";
    });
    await api.put("/api/intake", { targets: [] });
    assert.deepEqual(asked, ["intake"]);
  });
  test("closing the notice sends nothing more and gives a plain message", async () => {
    globalThis.fetch = gatedFetch({ confirmed: false });
    registerMatureContentHandler(async () => "declined");
    await assert.rejects(api.get("/api/courses/c1"), (e: unknown) => e instanceof MatureContentDeclinedError);
    assert.equal(fetched.length, 1);
    assert.match(friendlyError(new MatureContentDeclinedError()), /18 or older/);
  });
  test("an under-18 account sends nothing more and is told the course is locked, and where to write", async () => {
    globalThis.fetch = gatedFetch({ confirmed: false });
    registerMatureContentHandler(async () => "blocked");
    await assert.rejects(api.get("/api/courses/c1"), (e: unknown) => e instanceof MatureContentBlockedError);
    assert.equal(fetched.length, 1);
    assert.match(friendlyError(new MatureContentBlockedError()), /locked.*Support/);
  });
  test("asks at most once per request, even if the server refuses again", async () => {
    globalThis.fetch = gatedFetch({ confirmed: false });
    let asks = 0;
    registerMatureContentHandler(async (): Promise<MatureAnswer> => {
      asks += 1;
      return "confirmed";
    });
    await assert.rejects(api.get("/api/courses/c1"), (e: unknown) => (e as { status?: number }).status === 403);
    assert.equal(asks, 1);
    assert.equal(fetched.length, 2);
  });
  test("a refusal that names no course (an older server) is just an error", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ ...REFUSAL, trackId: undefined }), { status: 403 })) as unknown as typeof fetch;
    registerMatureContentHandler(async () => "confirmed");
    await assert.rejects(api.get("/api/courses/c1"), (e: unknown) => (e as { status?: number }).status === 403);
  });
  test("with no handler (signed out, tests) the 403 is just an error", async () => {
    globalThis.fetch = gatedFetch({ confirmed: false });
    await assert.rejects(api.get("/api/courses/c1"), (e: unknown) => (e as { status?: number }).status === 403);
    assert.equal(fetched.length, 1);
  });
});

describe("where the app asks first", () => {
  test("the intake form calls ensure() with the course; Explore's category filter no longer asks; the provider is mounted at the root", () => {
    assert.match(read("mobile/src/components/IntakeForm.tsx"), /mature\.ensure\(t, "intake"\)/);
    assert.doesNotMatch(read("mobile/app/(app)/explore.tsx"), /useMatureContent|mature\.ensure/);
    assert.match(read("mobile/app/_layout.tsx"), /<MatureContentProvider>/);
    assert.match(read("mobile/src/components/MatureContentNotice.tsx"), /SheetModal/);
    assert.doesNotMatch(read("mobile/src/components/MatureContentNotice.tsx"), /from "react-native";[^\n]*\bModal\b/);
  });
  test("the notice shows the date boxes only in form_with_dob mode and always the attestation checkbox", () => {
    const src = read("mobile/src/components/MatureContentNotice.tsx");
    assert.match(src, /mode === "form_with_dob" \?/);
    assert.match(src, /<Checkbox checked=\{ticked\}[^>]*label=\{MATURE_ATTESTATION_STATEMENT\}/);
  });
});
