// REQ-331: the reviewer rules that need no database -- the mark form and the
// feedback form, checked before anything is stored, and that every new route
// checks on the server who may use it.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EMPTY_FEEDBACK_MESSAGE,
  FEEDBACK_TEXT_MAX,
  RATINGS,
  REVIEWER_AREAS_MAX,
  REVIEWER_ROLES,
  TEXTS,
  TRIED,
  parseFeedbackFilter,
  parseFeedbackInput,
  parseMarkInput,
} from "./reviewers-config";

const ID = "6f1d2b3c-4a5b-4c6d-8e7f-90a1b2c3d4e5";

describe("marking a reviewer", () => {
  test("an address, optional category slugs (duplicates dropped) and an optional note", () => {
    assert.deepEqual(parseMarkInput({ email: " Pat@Example.TEST " }), { email: "pat@example.test", areas: [], note: null });
    assert.deepEqual(parseMarkInput({ email: "pat@example.test", areas: ["mental-health", "mental-health", "healthcare-nursing"], note: "  Counselor  " }), {
      email: "pat@example.test",
      areas: ["mental-health", "healthcare-nursing"],
      note: "Counselor",
    });
  });
  test("refuses a bad address, bad areas, too many areas and a long or unstorable note", () => {
    assert.equal(typeof parseMarkInput({ email: "nope" }), "string");
    assert.equal(typeof parseMarkInput({ email: "a@b.test", areas: "mental-health" }), "string");
    assert.equal(typeof parseMarkInput({ email: "a@b.test", areas: ["Mental Health"] }), "string");
    assert.equal(typeof parseMarkInput({ email: "a@b.test", areas: Array.from({ length: REVIEWER_AREAS_MAX + 1 }, (_, i) => `c${i}`) }), "string");
    assert.equal(typeof parseMarkInput({ email: "a@b.test", note: "x".repeat(501) }), "string");
    assert.equal(typeof parseMarkInput({ email: "a@b.test", note: "bad \u0000" }), "string");
    assert.equal(typeof parseMarkInput({ email: "a@b.test", note: 5 }), "string");
  });
});

describe("the feedback form", () => {
  const full = {
    trackId: ID.toUpperCase(),
    simId: null,
    name: " Dr. Pat Lee ",
    role: "psychologist",
    roleOther: "ignored unless Other",
    areas: ["EPPP", "EPPP", " WA jurisprudence "],
    tried: ["sims", "lessons"],
    ratings: { accuracy: 4, simRealism: 5, sensitive: 3, usefulness: 4, ease: 2 },
    texts: { wrongOrOutdated: " DSM edition note ", simsRealistic: "", heavyTopics: "Handled well", missing: null, otherComments: undefined },
    recommend: "maybe",
    followUp: true,
  };
  test("parses the whole form: trims text, drops empties, orders what was tried, lowercases ids", () => {
    const f = parseFeedbackInput(full);
    assert.ok(typeof f !== "string");
    assert.equal(f.trackId, ID);
    assert.equal(f.name, "Dr. Pat Lee");
    assert.equal(f.role, "psychologist");
    assert.equal(f.roleOther, null, "roleOther is kept only for Other");
    assert.deepEqual(f.areas, ["EPPP", "WA jurisprudence"]);
    assert.deepEqual(f.tried, ["lessons", "sims"]);
    assert.deepEqual(f.ratings, { accuracy: 4, simRealism: 5, sensitive: 3, usefulness: 4, ease: 2 });
    assert.deepEqual(f.texts, { wrongOrOutdated: "DSM edition note", simsRealistic: null, heavyTopics: "Handled well", missing: null, otherComments: null });
    assert.equal(f.recommend, "maybe");
    assert.equal(f.followUp, true);
  });
  test("Other keeps its own words", () => {
    const f = parseFeedbackInput({ role: "other", roleOther: "School counselor", recommend: "yes" });
    assert.ok(typeof f !== "string");
    assert.equal(f.roleOther, "School counselor");
  });
  test("every field is optional, but an empty form is refused with words for the reviewer", () => {
    assert.equal(parseFeedbackInput({}), EMPTY_FEEDBACK_MESSAGE);
    assert.equal(parseFeedbackInput({ name: "Pat", tried: ["sims"], followUp: false }), EMPTY_FEEDBACK_MESSAGE);
    assert.ok(typeof parseFeedbackInput({ ratings: { ease: 1 } }) !== "string");
    assert.ok(typeof parseFeedbackInput({ texts: { missing: "Ethics cases" } }) !== "string");
    assert.ok(typeof parseFeedbackInput({ recommend: "no" }) !== "string");
  });
  test("refuses out-of-range ratings, unknown choices, bad ids and long or unstorable text", () => {
    for (const bad of [0, 6, 2.5, "3", true]) assert.match(String(parseFeedbackInput({ ratings: { accuracy: bad } })), /ratings\.accuracy/);
    assert.match(String(parseFeedbackInput({ role: "doctor", recommend: "yes" })), /role must be/);
    assert.match(String(parseFeedbackInput({ tried: ["games"], recommend: "yes" })), /tried must/);
    assert.match(String(parseFeedbackInput({ recommend: "sure" })), /recommend must/);
    assert.match(String(parseFeedbackInput({ followUp: "yes", recommend: "yes" })), /followUp/);
    assert.match(String(parseFeedbackInput({ trackId: "abc", recommend: "yes" })), /trackId/);
    assert.match(String(parseFeedbackInput({ simId: 7, recommend: "yes" })), /simId/);
    assert.match(String(parseFeedbackInput({ texts: { missing: "x".repeat(FEEDBACK_TEXT_MAX + 1) } })), /too long/);
    assert.match(String(parseFeedbackInput({ texts: { missing: "half \uD83D" } })), /can't be stored/);
    assert.match(String(parseFeedbackInput({ name: "x".repeat(121), recommend: "yes" })), /too long/);
    assert.equal(typeof parseFeedbackInput([]), "string");
    assert.equal(typeof parseFeedbackInput(null), "string");
  });
  test("the field lists match the migration's check and the app's copy", () => {
    const sql = readFileSync(join(import.meta.dirname, "../supabase/migrations/088_reviewers.sql"), "utf8");
    assert.match(sql, new RegExp(`reviewer_role in \\(${REVIEWER_ROLES.map((r) => `'${r}'`).join(", ")}\\)`));
    assert.match(sql, new RegExp(`tried <@ array\\[${TRIED.map((t) => `'${t}'`).join(", ")}\\]`));
    for (const c of [...Object.values(RATINGS), ...Object.values(TEXTS)]) assert.match(sql, new RegExp(`\\b${c}\\b`), c);
    const app = readFileSync(join(import.meta.dirname, "../../mobile/src/lib/reviewers.ts"), "utf8");
    for (const r of REVIEWER_ROLES) assert.match(app, new RegExp(`"${r}"`), `app role ${r}`);
    for (const t of TRIED) assert.match(app, new RegExp(`"${t}"`), `app tried ${t}`);
    for (const k of [...Object.keys(RATINGS), ...Object.keys(TEXTS)]) assert.match(app, new RegExp(`\\b${k}\\b`), `app field ${k}`);
  });
});

test("the owner filter takes account and course ids only", () => {
  assert.deepEqual(parseFeedbackFilter(new URL("https://x.test/api/access/reviewer-feedback")), { reviewerId: null, trackId: null });
  assert.deepEqual(parseFeedbackFilter(new URL(`https://x.test/a?reviewer=${ID.toUpperCase()}&course=${ID}`)), { reviewerId: ID, trackId: ID });
  assert.equal(typeof parseFeedbackFilter(new URL("https://x.test/a?course=1")), "string");
});

// Every new route checks who is asking on the server, before it reads or writes.
test("REQ-331: owner routes call requireOwner and reviewer routes requireReviewer in every handler", () => {
  const root = join(import.meta.dirname, "../app/api");
  const files: Array<[string, string]> = [
    ["access/reviewers/route.ts", "requireOwner"],
    ["access/reviewers/[id]/route.ts", "requireOwner"],
    ["access/reviewer-feedback/route.ts", "requireOwner"],
    ["reviewer/feedback/route.ts", "requireReviewer"],
    ["reviewer/feedback/[id]/route.ts", "requireReviewer"],
  ];
  for (const [f, guard] of files) {
    const src = readFileSync(join(root, f), "utf8");
    const handlers = src.split(/export async function (?:GET|POST|PUT|DELETE)\(/).slice(1);
    assert.ok(handlers.length > 0, f);
    for (const h of handlers) assert.match(h, new RegExp(`await ${guard}\\(user\\.id\\)`), `${f} checks ${guard}`);
  }
});
