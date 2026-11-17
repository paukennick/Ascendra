// REQ-319: the published-facts block an unbranded course shows at the top.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { domainLine, examFactRows, examFactsOf } from "./examFacts.ts";

const facts = {
  heading: "This course follows an exam with these published facts",
  questions: "100-150 items, adaptive",
  minutes: 180,
  time: "3 hours",
  delivery: "adaptive" as const,
  passing: "700 out of 1000 points",
  eligibility: "Five years of experience",
  domains: [{ name: "Domain 1", weightPercent: 16 }, { name: "Domain 2", weightPercent: null }],
  reference: null,
};

describe("REQ-319: exam facts on the course page", () => {
  test("every published fact gets a row, in a fixed order", () => {
    assert.deepEqual(examFactRows(facts).map((r) => r.label), ["Questions", "Time", "Format", "Passing standard", "Eligibility"]);
    assert.match(examFactRows(facts)[2].value, /^Adaptive/);
    assert.match(examFactRows({ ...facts, delivery: "linear" })[2].value, /^Linear/);
  });

  test("a missing fact is left out, never shown empty", () => {
    assert.deepEqual(examFactRows({ ...facts, time: null, delivery: null, eligibility: null }).map((r) => r.label), ["Questions", "Passing standard"]);
  });

  test("domains show their weight when there is one", () => {
    assert.equal(domainLine(facts.domains[0]), "Domain 1: 16%");
    assert.equal(domainLine(facts.domains[1]), "Domain 2");
  });

  test("only an exam that carries facts gets the block (branded courses and older servers get none)", () => {
    assert.equal(examFactsOf(null), null);
    assert.equal(examFactsOf({ providerName: "CompTIA", credentialName: "CompTIA Security+" }), null);
    assert.equal(examFactsOf({ facts: { heading: 1 } }), null);
    assert.equal(examFactsOf({ providerName: null, facts })?.heading, facts.heading);
  });
});
