// REQ-076/REQ-080: the coach's opening framing is now built from track
// context. These pin the behaviour that matters: certification tracks are
// framed around their exam, healthcare tracks get the clinical caveat, and a
// track with no taxonomy still gets a sane generic line.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { coachRules, goalLine, domainFraming, withRules, chatSystemPrompt } from "./prompts";

describe("goalLine", () => {
  test("certification tracks name the credential, exam code and provider", () => {
    const line = goalLine({
      trackTitle: "AWS Solutions Architect Associate",
      trackType: "certification",
      credentialName: "AWS Certified Solutions Architect - Associate",
      examCode: "SAA-C03",
      providerName: "Amazon Web Services",
    });
    assert.equal(
      line,
      "pass the AWS Certified Solutions Architect - Associate (exam SAA-C03) from Amazon Web Services exam"
    );
  });

  test("falls back to the track title when the credential row is missing", () => {
    assert.equal(goalLine({ trackTitle: "NPTE-PT", trackType: "certification" }), "pass the NPTE-PT exam");
  });

  test("academic/graduate tracks are framed as coursework; anything else as competence", () => {
    assert.match(goalLine({ trackTitle: "MSCS", trackType: "graduate" }), /master the coursework/);
    assert.match(goalLine({ trackTitle: "Python", trackType: "skills" }), /job-ready competence/);
  });

  test("no context at all is still a sensible sentence, and never the old Security+ line", () => {
    assert.equal(goalLine(), "close real gaps in the material they are studying");
    assert.doesNotMatch(coachRules(), /Security\+/);
  });
});

describe("domainFraming", () => {
  test("healthcare tracks carry the clinical exam-prep caveat", () => {
    const framing = domainFraming({
      trackTitle: "NCLEX-RN",
      trackType: "certification",
      categorySlug: "healthcare-nursing",
      categoryName: "Healthcare & Nursing",
      subcategoryName: "NCLEX Preparation",
    });
    assert.match(framing, /Subject area: Healthcare & Nursing \/ NCLEX Preparation/);
    assert.match(framing, /not clinical guidance/);
    assert.match(framing, /certifying body's own terminology/);
  });

  test("unit weight is stated only when present and positive", () => {
    assert.match(domainFraming({ trackTitle: "x", unitWeight: 24 }), /24% of the exam's weight/);
    assert.doesNotMatch(domainFraming({ trackTitle: "x", unitWeight: 0 }), /weight/);
    assert.doesNotMatch(domainFraming({ trackTitle: "x", unitWeight: null }), /weight/);
  });

  test("a bare track adds no framing block", () => {
    assert.equal(domainFraming({ trackTitle: "x" }), "");
    assert.equal(domainFraming(), "");
  });
});

describe("withRules / chatSystemPrompt", () => {
  test("task text follows the rules block, separated by a rule", () => {
    const out = withRules("TASK", { trackTitle: "T", trackType: "skills" });
    assert.ok(out.startsWith("You are a demanding but practical study coach"));
    assert.ok(out.endsWith("\n\n---\n\nTASK"));
  });

  test("chat prompt tells the coach to re-grade pasted disputes on substance", () => {
    const out = chatSystemPrompt({
      trackTitle: "Security+",
      ctx: { trackTitle: "Security+", trackType: "certification" },
    });
    assert.match(out, /re-grade it yourself/);
    assert.match(out, /pass the Security\+ exam/);
  });
});
