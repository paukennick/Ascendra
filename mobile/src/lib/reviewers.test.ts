// REQ-331: reviewers in the app -- who sees the form, what the form sends, and
// the lines the lists show.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  aboutLine,
  areaWords,
  canGiveFeedback,
  EMPTY_FORM_PROBLEM,
  feedbackHref,
  formFrom,
  formProblem,
  isReviewer,
  itemHref,
  markFormProblem,
  newForm,
  parseReviewer,
  payloadFrom,
  ratingsLine,
  recommendLine,
  reviewerSettingsLine,
  reviewerStatusLine,
  roleLine,
  splitAreas,
  toggle,
  triedLine,
  unmarkMessage,
  whenLine,
  type Feedback,
} from "./reviewers.ts";
import { historyLine } from "./access.ts";
import { titleForPath } from "./routeTitles.ts";

const root = join(import.meta.dirname, "..", "..");
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8");

const reviewerAccess = { level: "unrestricted", grantedBy: "Nick", expiresAt: null, reviewer: { since: "2026-11-17T10:00:00Z", areas: ["mental-health"] } };

describe("who is a reviewer", () => {
  test("only a well-formed mark from the server; owners can open the form too", () => {
    assert.deepEqual(parseReviewer(reviewerAccess), { since: "2026-11-17T10:00:00Z", areas: ["mental-health"] });
    assert.equal(parseReviewer({ level: "unrestricted", reviewer: null }), null);
    assert.equal(parseReviewer({ level: "unrestricted" }), null, "an older server sends no mark");
    assert.equal(parseReviewer({ reviewer: { areas: [] } }), null);
    assert.equal(parseReviewer(null), null);
    assert.equal(isReviewer({ access: reviewerAccess }), true);
    assert.equal(canGiveFeedback({ access: reviewerAccess }), true);
    assert.equal(canGiveFeedback({ access: { level: "owner" } }), true);
    assert.equal(isReviewer({ access: { level: "owner" } }), false);
    assert.equal(canGiveFeedback({ access: { level: "unrestricted", reviewer: null } }), false);
    assert.equal(canGiveFeedback({ access: null }), false);
    assert.equal(canGiveFeedback(null), false);
  });
  test("Settings says what being a reviewer means, 18+ notices included", () => {
    const line = reviewerSettingsLine({ since: "2026-11-17T10:00:00Z", areas: ["mental-health"] }, "en-US");
    assert.match(line, /for Mental health/);
    assert.match(line, /18\+ notices still apply/);
    assert.equal(areaWords("healthcare-nursing"), "Healthcare nursing");
  });
});

describe("the form", () => {
  test("a new form takes the account's name and the course or sim it came from", () => {
    const f = newForm({ name: "Pat", areas: ["Mental Health"], trackId: "t1", simId: "s1", contextAreas: ["NCMHCE", "Intake session"] });
    assert.equal(f.name, "Pat");
    assert.equal(f.areasText, "NCMHCE, Intake session");
    assert.deepEqual(f.tried, ["sims"], "opened from a sim's results");
    assert.equal(newForm({ areas: ["Mental Health"] }).areasText, "Mental Health", "else the reviewer's own areas");
  });
  test("an empty form is refused before sending, in the server's words", () => {
    const f = newForm({});
    assert.equal(formProblem(f), EMPTY_FORM_PROBLEM);
    assert.equal(formProblem({ ...f, recommend: "yes" }), null);
    assert.equal(formProblem({ ...f, ratings: { ...f.ratings, ease: 3 } }), null);
    assert.equal(formProblem({ ...f, texts: { ...f.texts, missing: "  " } }), EMPTY_FORM_PROBLEM);
    assert.match(String(formProblem({ ...f, recommend: "yes", texts: { ...f.texts, missing: "x".repeat(5001) } })), /too long/);
  });
  test("what is sent: trimmed, empties as null, areas split, Other's words only for Other", () => {
    const f = { ...newForm({ trackId: "t1" }), name: " Pat ", role: "lcsw" as const, roleOther: "x", areasText: "NCE; NCE, ASWB\n", tried: ["sims", "lessons"] as ("sims" | "lessons")[] };
    const p = payloadFrom({ ...f, texts: { ...f.texts, missing: " ethics " }, recommend: "maybe", followUp: false });
    assert.equal(p.name, "Pat");
    assert.equal(p.roleOther, null);
    assert.deepEqual(p.areas, ["NCE", "ASWB"]);
    assert.deepEqual(p.tried, ["lessons", "sims"]);
    assert.equal(p.texts.missing, "ethics");
    assert.equal(p.texts.heavyTopics, null);
    assert.equal(p.trackId, "t1");
    assert.equal(p.followUp, false);
    assert.deepEqual(splitAreas(" a , b ,a"), ["a", "b"]);
    assert.deepEqual(toggle(["a"], "a"), []);
    assert.deepEqual(toggle(["a"], "b"), ["a", "b"]);
  });
  test("a saved submission comes back into the form unchanged", () => {
    const saved: Feedback = {
      id: "f1",
      trackId: "t1",
      trackTitle: "Exam Prep for NCMHCE",
      simId: null,
      simTitle: null,
      name: "Pat",
      role: "other",
      roleOther: "School counselor",
      areas: ["NCMHCE"],
      tried: ["tutor", "lessons"],
      ratings: { accuracy: 4, ease: 2 },
      texts: { missing: "More ethics" },
      recommend: "yes",
      followUp: true,
      createdAt: "2026-11-17T10:00:00Z",
      updatedAt: "2026-11-18T10:00:00Z",
    };
    const f = formFrom(saved);
    assert.equal(f.role, "other");
    assert.equal(f.roleOther, "School counselor");
    assert.deepEqual(f.tried, ["lessons", "tutor"]);
    assert.deepEqual(f.ratings, { accuracy: 4, simRealism: null, sensitive: null, usefulness: null, ease: 2 });
    assert.equal(f.texts.missing, "More ethics");
    assert.equal(f.texts.heavyTopics, "");
    const p = payloadFrom(f);
    assert.equal(p.roleOther, "School counselor");
    assert.deepEqual(p.ratings, { accuracy: 4, simRealism: null, sensitive: null, usefulness: null, ease: 2 });
  });
});

describe("lines and links", () => {
  const f: Feedback = {
    id: "f1",
    trackId: "t1",
    trackTitle: "Exam Prep for NCE",
    simId: "s1",
    simTitle: "Intake session",
    name: null,
    role: "lpc",
    roleOther: null,
    areas: [],
    tried: ["sims", "exam"],
    ratings: { accuracy: 5, sensitive: 4 },
    texts: {},
    recommend: "maybe",
    followUp: false,
    createdAt: "2026-11-17T10:00:00Z",
    updatedAt: "2026-11-17T10:00:10Z",
  };
  test("what the lists show", () => {
    assert.equal(aboutLine(f), "Exam Prep for NCE · Intake session");
    assert.equal(aboutLine({ trackTitle: null, simTitle: null }), "General feedback");
    assert.equal(roleLine(f), "LPC / LMHC / LPCC");
    assert.equal(roleLine({ role: "other", roleOther: "Peer specialist" }), "Other: Peer specialist");
    assert.equal(ratingsLine(f), "Content accuracy 5/5 · Handling of sensitive topics 4/5");
    assert.equal(recommendLine(f), "Would recommend: Maybe · No follow-up");
    assert.equal(triedLine(f), "Practice exam, Session sims");
    assert.doesNotMatch(whenLine(f, "en-US"), /edited/, "a save seconds later is not an edit");
    assert.match(whenLine({ ...f, updatedAt: "2026-11-19T10:00:00Z" }, "en-US"), /edited/);
  });
  test("links carry ids only, to the form, the course or the sim", () => {
    assert.equal(feedbackHref(), "/feedback/edit");
    assert.equal(feedbackHref({ trackId: "t 1", simId: "s1" }), "/feedback/edit?trackId=t%201&simId=s1");
    assert.equal(itemHref(f), "/course/t1/sim/s1");
    assert.equal(itemHref({ trackId: "t1", simId: null }), "/course/t1");
    assert.equal(itemHref({ trackId: null, simId: null }), null);
  });
  test("the owner's reviewer list and what removing one does", () => {
    const g = { id: "g", email: "pat@example.test", status: "active" as const, reviewer: { since: "2026-11-17T10:00:00Z", areas: ["mental-health"], note: null, addedAccess: true } };
    assert.match(reviewerStatusLine(g, (s) => (s === "mental-health" ? "Mental Health" : s), "en-US"), /^Active, reviewer since .*Reviews: Mental Health$/);
    assert.match(unmarkMessage(g), /and the access that came with it/);
    assert.match(unmarkMessage({ ...g, reviewer: { ...g.reviewer, addedAccess: false } }), /keeps the unrestricted access they had before/);
    assert.equal(markFormProblem("nope", ""), "Enter an email address.");
    assert.equal(markFormProblem("a@b.test", "x".repeat(501)), "Keep the note under 500 characters.");
    assert.equal(markFormProblem("a@b.test", ""), null);
    assert.match(historyLine({ at: "2026-11-17T10:00:00Z", action: "reviewer_on", email: "pat@example.test", by: "Nick", detail: {} }, "en-US"), /Reviewer mark given to pat@example.test by Nick/);
    assert.match(historyLine({ at: "2026-11-17T10:00:00Z", action: "reviewer_off", email: "pat@example.test", by: null, detail: {} }, "en-US"), /Reviewer mark removed from/);
  });
});

describe("screens and entry points", () => {
  test("every new route has a title and a stack entry", () => {
    assert.equal(titleForPath("/feedback"), "Your feedback | Ascendra");
    assert.equal(titleForPath("/feedback/edit"), "Give feedback | Ascendra");
    assert.equal(titleForPath("/settings/reviewer-feedback"), "Reviewer feedback | Ascendra");
    const layout = read("app", "(app)", "_layout.tsx");
    for (const n of ["feedback/index", "feedback/edit", "settings/reviewer-feedback"]) assert.match(layout, new RegExp(`name="${n}"`), n);
  });
  test("Give feedback is in Settings and the Home footer, and carries the course on the course page and the sim on its results", () => {
    assert.match(read("app", "(app)", "settings.tsx"), /REVIEWER_BADGE[\s\S]*GIVE_FEEDBACK_LABEL[\s\S]*router\.push\("\/feedback"\)/);
    assert.match(read("app", "(app)", "index.tsx"), /canGiveFeedback\(user\) \? \(\[\[GIVE_FEEDBACK_LABEL, "\/feedback"\]\]/);
    assert.match(read("app", "(app)", "course", "[trackId]", "index.tsx"), /<GiveFeedbackButton trackId=\{trackId\} \/>/);
    const sim = read("app", "(app)", "course", "[trackId]", "sim", "[simId].tsx");
    const debrief = sim.slice(sim.indexOf("sim.status === \"done\" && sim.debrief"));
    assert.match(debrief, /<GiveFeedbackButton trackId=\{trackId\} simId=/);
  });
  test("the form points to Report a problem and leaving with changes asks first", () => {
    const form = read("app", "(app)", "feedback", "edit.tsx");
    assert.match(form, /REPORT_POINTER/);
    assert.match(form, /addListener\("beforeRemove"/);
    assert.match(form, /statusRef\.current !== "signedIn"/, "never held against a sign-out or lock");
    assert.doesNotMatch(form, /router\.back\(/);
  });
  test("no new native module: only packages the store build already has", () => {
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
    for (const f of [
      ["app", "(app)", "feedback", "edit.tsx"],
      ["app", "(app)", "feedback", "index.tsx"],
      ["app", "(app)", "settings", "reviewer-feedback.tsx"],
      ["src", "components", "GiveFeedback.tsx"],
    ]) {
      for (const m of read(...f).matchAll(/from "([^"@.][^"]*|@[^/"]+\/[^/"]+)[^"]*"/g)) {
        if (m[1].startsWith("@/")) continue;
        assert.ok(m[1] in pkg.dependencies || m[1] === "react", `${f.join("/")} imports ${m[1]}`);
      }
    }
  });
});
