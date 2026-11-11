// REQ-224: the 18+ mature-content notice for mental health courses -- its
// version against the server's, its wording, when to ask, and the API
// client's backstop (a 403 "mature_content_required" asks, then resends once;
// closing the notice sends nothing more).
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MATURE_CONFIRM_STATEMENT,
  MATURE_CONTENT_NOTICE_VERSION,
  MATURE_NOTICE_LINES,
  MatureContentDeclinedError,
  matureRefusalCategory,
  needsMatureConfirmation,
  parseMatureState,
  registerMatureContentHandler,
} from "./matureContent.ts";
import { friendlyError } from "./errorMessage.ts";

(globalThis as Record<string, unknown>).__DEV__ = false;
const { api } = await import("../api/client.ts");

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const read = (p: string) => readFileSync(join(repo, p), "utf8");

const realFetch = globalThis.fetch;
let fetched: string[] = [];
const REFUSAL = { code: "mature_content_required", category: "mental-health", noticeVersion: MATURE_CONTENT_NOTICE_VERSION, minAge: 18, error: "x" };
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

describe("the notice", () => {
  test("its version is the server's (backend/lib/mature-content.ts)", () => {
    const m = read("backend/lib/mature-content.ts").match(/MATURE_CONTENT_NOTICE_VERSION = "([^"]+)"/);
    assert.equal(m?.[1], MATURE_CONTENT_NOTICE_VERSION);
  });
  test("says what the material is, that it is fictional practice, where to get help, and asks for 18+", () => {
    const text = MATURE_NOTICE_LINES.join(" ");
    for (const w of [/suicide/, /abuse/, /violence/, /trauma/, /fictional/, /988/]) assert.match(text, w);
    assert.match(MATURE_CONFIRM_STATEMENT, /18 or older/);
  });
  test("the Mental Health category exists in migration 077 and is the only gated one", () => {
    assert.match(read("backend/supabase/migrations/077_mental_health_mature_content.sql"), /check \(category_slug in \('mental-health'\)\)/);
  });
});

describe("when to ask", () => {
  const confirmed = parseMatureState({ categories: [{ category: "mental-health", confirmed: true, confirmedAt: "2026-11-10T00:00:00Z", noticeVersion: MATURE_CONTENT_NOTICE_VERSION }] });
  test("only for a mature category without a confirmation of the current version", () => {
    assert.equal(needsMatureConfirmation("healthcare-nursing", null, new Set()), false);
    assert.equal(needsMatureConfirmation(null, null, new Set()), false);
    assert.equal(needsMatureConfirmation("mental-health", null, new Set()), true, "unknown state asks");
    assert.equal(needsMatureConfirmation("mental-health", [], new Set()), true);
    assert.equal(needsMatureConfirmation("mental-health", confirmed, new Set()), false);
    assert.equal(needsMatureConfirmation("mental-health", [{ ...confirmed[0], noticeVersion: "2020-01-01" }], new Set()), true, "an old version asks again");
    assert.equal(needsMatureConfirmation("mental-health", [], new Set(["mental-health"])), false, "confirmed in this session");
  });
  test("reads the server's refusal and nothing else", () => {
    assert.equal(matureRefusalCategory(403, REFUSAL), "mental-health");
    assert.equal(matureRefusalCategory(403, { code: "study_notice_required" }), null);
    assert.equal(matureRefusalCategory(402, REFUSAL), null);
    assert.equal(matureRefusalCategory(403, null), null);
  });
});

describe("the API client's backstop", () => {
  test("a refused course request asks, records, and is sent once more", async () => {
    const state = { confirmed: false };
    globalThis.fetch = gatedFetch(state);
    const asked: string[] = [];
    registerMatureContentHandler(async (category, source) => {
      asked.push(`${category}:${source}`);
      state.confirmed = true;
      return true;
    });
    assert.deepEqual(await api.get("/api/courses/c1"), { ok: true });
    assert.deepEqual(asked, ["mental-health:course"]);
    assert.equal(fetched.length, 2);
  });
  test("the intake form's save is asked as 'intake'", async () => {
    const state = { confirmed: false };
    globalThis.fetch = gatedFetch(state);
    const asked: string[] = [];
    registerMatureContentHandler(async (_c, source) => {
      asked.push(source);
      state.confirmed = true;
      return true;
    });
    await api.put("/api/intake", { targets: [] });
    assert.deepEqual(asked, ["intake"]);
  });
  test("closing the notice sends nothing more and gives a plain message", async () => {
    globalThis.fetch = gatedFetch({ confirmed: false });
    registerMatureContentHandler(async () => false);
    await assert.rejects(api.get("/api/courses/c1"), (e: unknown) => e instanceof MatureContentDeclinedError);
    assert.equal(fetched.length, 1);
    assert.match(friendlyError(new MatureContentDeclinedError()), /18 or older/);
  });
  test("asks at most once per request, even if the server refuses again", async () => {
    globalThis.fetch = gatedFetch({ confirmed: false });
    let asks = 0;
    registerMatureContentHandler(async () => {
      asks += 1;
      return true;
    });
    await assert.rejects(api.get("/api/courses/c1"), (e: unknown) => (e as { status?: number }).status === 403);
    assert.equal(asks, 1);
    assert.equal(fetched.length, 2);
  });
  test("with no handler (signed out, tests) the 403 is just an error", async () => {
    globalThis.fetch = gatedFetch({ confirmed: false });
    await assert.rejects(api.get("/api/courses/c1"), (e: unknown) => (e as { status?: number }).status === 403);
    assert.equal(fetched.length, 1);
  });
});

describe("where the app asks first", () => {
  test("the intake form and Explore's category filter call ensure(); the provider is mounted at the root", () => {
    assert.match(read("mobile/src/components/IntakeForm.tsx"), /mature\.ensure\(t\.category_slug, "intake"\)/);
    assert.match(read("mobile/app/(app)/explore.tsx"), /mature\.ensure\(c\.slug, "catalog"\)/);
    assert.match(read("mobile/app/_layout.tsx"), /<MatureContentProvider>/);
    assert.match(read("mobile/src/components/MatureContentNotice.tsx"), /SheetModal/);
    assert.doesNotMatch(read("mobile/src/components/MatureContentNotice.tsx"), /from "react-native";[^\n]*\bModal\b/);
  });
});
