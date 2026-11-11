// REQ-226 (FAIL-1241): the server answers 403 { code: "terms_required" } from a
// signed-in route when the account has not accepted the Terms and Privacy Policy
// this build must accept (REQ-219). The API client hands it to the onboarding
// provider, which reloads the launch state so the launch gate opens the Terms
// screen -- the same shape as study_notice_required (FAIL-1061). JavaScript
// only: no native or app.json change.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gateRedirect, isTermsRequired, launchGate, shouldReloadForTerms, TERMS_REQUIRED_CODE, type OnboardingState } from "./legal.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const state = (needsAcceptance: boolean): OnboardingState => ({
  terms: { currentVersion: "2026-11-10", acceptedVersion: needsAcceptance ? null : "2026-11-10", acceptedAt: null, needsAcceptance },
  firstRun: { needed: false, completedAt: null, goalTrackId: null, justExploring: false },
});

describe("isTermsRequired", () => {
  test("only a 403 carrying the terms_required code", () => {
    assert.equal(TERMS_REQUIRED_CODE, "terms_required");
    assert.equal(isTermsRequired(403, { error: "Please agree", code: "terms_required", pending: ["terms"] }), true);
    assert.equal(isTermsRequired(403, { code: "study_notice_required" }), false);
    assert.equal(isTermsRequired(403, { code: "update_required" }), false);
    assert.equal(isTermsRequired(403, { error: "Forbidden" }), false);
    assert.equal(isTermsRequired(401, { code: "terms_required" }), false);
    assert.equal(isTermsRequired(200, { code: "terms_required" }), false);
    assert.equal(isTermsRequired(403, null), false);
    assert.equal(isTermsRequired(403, "terms_required"), false);
  });
});

describe("shouldReloadForTerms: once, not a loop", () => {
  test("reloads when the launch state is unknown or says nothing is waiting", () => {
    assert.equal(shouldReloadForTerms(null), true);
    assert.equal(shouldReloadForTerms(state(false)), true);
  });
  test("does nothing when the Terms are already waiting (the gate is already sending the learner there)", () => {
    assert.equal(shouldReloadForTerms(state(true)), false);
  });
});

describe("what the reload leads to", () => {
  test("a state that needs the Terms opens the existing Terms screen from anywhere in the app", () => {
    const gate = launchGate(state(true));
    assert.equal(gate, "agree");
    assert.equal(gateRedirect(gate, ["(app)", "course", "[trackId]"]), "/agree");
    assert.equal(gateRedirect(gate, ["(app)", "index"]), "/agree");
    // Already there, and the pages a person reads or leaves from, stay put.
    assert.equal(gateRedirect(gate, ["(app)", "agree"]), null);
    assert.equal(gateRedirect(gate, ["(app)", "account"]), null);
    assert.equal(gateRedirect(gate, ["(app)", "support"]), null);
  });
});

describe("the API client", () => {
  async function withClient(
    responses: { status: number; body: unknown }[],
    body: (c: { api: typeof import("../api/client.ts").api; fetches: string[]; hooks: typeof import("../api/client.ts") }) => Promise<void>
  ) {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const hooks = await import("../api/client.ts");
    const realFetch = globalThis.fetch;
    const fetches: string[] = [];
    let i = 0;
    globalThis.fetch = (async (url: string) => {
      fetches.push(String(url));
      const r = responses[Math.min(i++, responses.length - 1)];
      return new Response(JSON.stringify(r.body), { status: r.status });
    }) as typeof fetch;
    hooks.registerAuthHooks({ getAccessToken: () => "t", refresh: async () => ({ ok: true }) as never, onAuthExpired: () => undefined });
    try {
      await body({ api: hooks.api, fetches, hooks });
    } finally {
      hooks.registerTermsRequiredHook(null);
      hooks.registerStudyNoticeRequiredHook(null);
      globalThis.fetch = realFetch;
    }
  }

  const refused = { status: 403, body: { error: "Please agree to the updated Terms of Service and Privacy Policy to keep using Ascendra.", code: "terms_required", pending: ["terms", "privacy"] } };

  test("a 403 terms_required calls the hook once, is not retried, and the screen still gets the error", async () => {
    await withClient([refused], async ({ api, fetches, hooks }) => {
      let calls = 0;
      let studyNotice = 0;
      hooks.registerTermsRequiredHook(() => void calls++);
      hooks.registerStudyNoticeRequiredHook(() => void studyNotice++);
      await assert.rejects(api.get("/api/units/x/anything"), (err: { status?: number; data?: { code?: string }; message?: string }) => {
        assert.equal(err.status, 403);
        assert.equal(err.data?.code, "terms_required");
        assert.match(err.message ?? "", /agree/i);
        return true;
      });
      assert.equal(calls, 1);
      assert.equal(studyNotice, 0, "the study-notice hook is not triggered by the Terms");
      assert.equal(fetches.length, 1, "nothing is retried automatically");
    });
  });

  test("a POST is not retried either", async () => {
    await withClient([refused], async ({ api, fetches, hooks }) => {
      let calls = 0;
      hooks.registerTermsRequiredHook(() => void calls++);
      await assert.rejects(api.post("/api/chat", { message: "hi" }));
      assert.equal(calls, 1);
      assert.equal(fetches.length, 1);
    });
  });

  test("other refusals do not open the Terms", async () => {
    for (const r of [
      { status: 403, body: { error: "Nope", code: "something_else" } },
      { status: 403, body: { error: "Nope" } },
      { status: 400, body: { error: "Bad", code: "terms_required" } },
      { status: 500, body: { error: "Oops" } },
    ]) {
      await withClient([r], async ({ api, hooks }) => {
        let calls = 0;
        hooks.registerTermsRequiredHook(() => void calls++);
        await assert.rejects(api.get("/api/units/x/anything"));
        assert.equal(calls, 0, JSON.stringify(r));
      });
    }
  });

  test("a hook that throws never replaces the request's own error", async () => {
    await withClient([refused], async ({ api, hooks }) => {
      hooks.registerTermsRequiredHook(() => {
        throw new Error("hook broke");
      });
      await assert.rejects(api.get("/api/units/x/anything"), (err: { status?: number }) => err.status === 403);
    });
  });

  test("without a registered hook (signed out, or a test) the error is just thrown", async () => {
    await withClient([refused], async ({ api }) => {
      await assert.rejects(api.get("/api/units/x/anything"), (err: { status?: number }) => err.status === 403);
    });
  });
});

describe("wiring (source)", () => {
  test("the onboarding provider registers the hook per account, reloads through the same one-at-a-time guard, and clears it on sign-out", () => {
    const src = read("../auth/OnboardingContext.tsx");
    assert.match(src, /registerTermsRequiredHook\(\(\) => \{\s*if \(shouldReloadForTerms\(stateRef\.current\)\) reload\(\);/);
    assert.match(src, /registerStudyNoticeRequiredHook\(reload\)/);
    assert.equal((src.match(/registerTermsRequiredHook\(null\)/g) ?? []).length, 2, "cleared when signed out and when the effect is torn down");
    assert.match(src, /if \(reloading\.current\) return;/);
  });
  test("the client checks the code in the same place as the study notice and does not retry", () => {
    const src = read("../api/client.ts");
    assert.match(src, /if \(isTermsRequired\(status, data\) && onTermsRequired\)/);
    assert.doesNotMatch(src, /isTermsRequired[^\n]*request<T>\(/);
  });
  test("the reload route stays exempt from the Terms on the server, or the reload would be refused too", () => {
    const route = readFileSync(new URL("../../../backend/app/api/onboarding/route.ts", import.meta.url), "utf8");
    assert.match(route, /requireUser\(req, \{ termsOptional: true \}\)/);
  });
});
