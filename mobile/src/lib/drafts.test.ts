import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_DRAFT_MAX,
  DRAFT_MAX_AGE_MS,
  SUPPORT_LIMITS,
  chatDraftKey,
  chatDraftPayload,
  chatDraftText,
  decodeDraft,
  emptySupportFields,
  encodeDraft,
  parseSupportFields,
  pbqDraftKey,
  supportDraftKey,
  supportDraftPayload,
} from "./drafts.ts";

const now = 1_800_000_000_000;

describe("draft keys", () => {
  test("are per user and per thread", () => {
    assert.notEqual(chatDraftKey("u1", "t1"), chatDraftKey("u2", "t1"));
    assert.notEqual(chatDraftKey("u1", "t1"), chatDraftKey("u1", "t2"));
    assert.notEqual(supportDraftKey("u1", "ticket"), supportDraftKey("u1", "course_request"));
    assert.notEqual(supportDraftKey("u1", "ticket"), supportDraftKey("u2", "ticket"));
    assert.notEqual(pbqDraftKey("u1", "a"), pbqDraftKey("u1", "b"));
    assert.notEqual(pbqDraftKey("u1", "a"), pbqDraftKey("u2", "a"));
  });
  test("chat, support and pbq keys never collide", () => {
    const keys = new Set([chatDraftKey("u", "x"), supportDraftKey("u", "ticket"), pbqDraftKey("u", "x")]);
    assert.equal(keys.size, 3);
  });
});

describe("draft envelope", () => {
  test("round-trips a fresh payload", () => {
    assert.equal(decodeDraft(encodeDraft("hello", now - 1000), now), "hello");
  });
  test("discards stale, future-dated, malformed and wrong-version entries", () => {
    assert.equal(decodeDraft(encodeDraft("x", now - DRAFT_MAX_AGE_MS - 1), now), null);
    assert.equal(decodeDraft(encodeDraft("x", now + 3_600_000), now), null);
    assert.equal(decodeDraft("{nope", now), null);
    assert.equal(decodeDraft(null, now), null);
    assert.equal(decodeDraft(JSON.stringify({ v: 2, savedAt: now, payload: "x" }), now), null);
    assert.equal(decodeDraft(JSON.stringify({ v: 1, savedAt: now, payload: 5 }), now), null);
    assert.equal(decodeDraft(JSON.stringify({ v: 1, payload: "x" }), now), null);
    assert.equal(decodeDraft(JSON.stringify([1, 2]), now), null);
  });
});

describe("chat draft", () => {
  test("blank text is not kept (so emptying the box clears the draft)", () => {
    assert.equal(chatDraftPayload("", null), null);
    assert.equal(chatDraftPayload("   \n", null), null);
    assert.equal(chatDraftPayload("what is a VPC?", null), "what is a VPC?");
  });
  test("the untouched prefill is not kept, an edited one is", () => {
    const prefill = 'About "Subnets": ';
    assert.equal(chatDraftPayload(prefill, prefill), null);
    assert.equal(chatDraftPayload(prefill + "why /28?", prefill), prefill + "why /28?");
  });
  test("restored text is length-bounded and never blank", () => {
    assert.equal(chatDraftText("hi"), "hi");
    assert.equal(chatDraftText("   "), null);
    assert.equal(chatDraftText("a".repeat(CHAT_DRAFT_MAX + 50))!.length, CHAT_DRAFT_MAX);
  });
});

describe("support draft", () => {
  test("an all-blank form is not kept", () => {
    assert.equal(supportDraftPayload(emptySupportFields()), null);
    assert.equal(supportDraftPayload({ ...emptySupportFields(), subject: "  " }), null);
  });
  test("round-trips the fields", () => {
    const f = { subject: "Bug", body: "It broke", courseName: "AWS SAA", courseSourceUrl: "https://x.test" };
    assert.deepEqual(parseSupportFields(supportDraftPayload(f)!), f);
  });
  test("a single filled field is enough to keep", () => {
    const p = supportDraftPayload({ ...emptySupportFields(), body: "only details" });
    assert.equal(parseSupportFields(p!)?.body, "only details");
  });
  test("tolerates missing, wrong-typed and oversized fields", () => {
    const f = parseSupportFields(JSON.stringify({ subject: 5, body: "x".repeat(SUPPORT_LIMITS.body + 10), extra: true }));
    assert.equal(f?.subject, "");
    assert.equal(f?.body.length, SUPPORT_LIMITS.body);
    assert.equal(parseSupportFields("{bad"), null);
    assert.equal(parseSupportFields("null"), null);
    assert.equal(parseSupportFields(JSON.stringify({ subject: 7 })), null);
  });
});
