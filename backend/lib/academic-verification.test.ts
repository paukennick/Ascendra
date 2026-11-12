// REQ-245: the MSCS, CMPCBS and PTPREREQ courses were checked against
// current sources on 2026-11-11 and verified. Regression tests for the
// defects that check found (FAIL-1560..1563) and for the verification dates.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { MSCS_TRACK, MSCS_UNIT_SOURCES, CMPCBS_TRACK, type SeedTrack } from "../supabase/seed/data";
import { PT_PREREQ_TRACK, PTPREREQ_SCOPE_SOURCES } from "../supabase/seed/tracks/pt-prereq";
import { activeUnits } from "../supabase/seed/catalog";
import { courseOutlineProblems, sourceDateProblems } from "./content-currency";
import { currentFactsBlock } from "./current-facts";

const VERIFIED_DAY = "2026-11-11";
const DUE = "2027-11-11T00:00:00Z";
const ACADEMIC: SeedTrack[] = [MSCS_TRACK, CMPCBS_TRACK, PT_PREREQ_TRACK];

const sourcesOf = (t: SeedTrack, title: string) => activeUnits(t).find((u) => u.title === title)?.sources ?? [];
const urlsOf = (t: SeedTrack, title: string) => sourcesOf(t, title).map((s) => s.url);

describe("REQ-245: the three academic courses are verified, like the other academic_foundational courses", () => {
  test("each is academic_foundational, verified on the day the check finished, and due for review a year later", () => {
    for (const t of ACADEMIC) {
      assert.equal(t.freshnessModel, "academic_foundational", t.code);
      assert.equal(t.sourceVerifiedAt, `${VERIFIED_DAY}T00:00:00Z`, t.code);
      assert.equal(t.contentReviewDueAt, DUE, t.code);
      assert.equal(t.sourceUrl, undefined, `${t.code}: a self-defined course keeps its curriculum as its outline`);
      assert.equal(t.curriculum?.checkedAt, VERIFIED_DAY, t.code);
      assert.deepEqual(courseOutlineProblems(t, VERIFIED_DAY), [], t.code);
    }
  });

  test("every taught unit names dated https sources, none checked after the verification day", () => {
    for (const t of ACADEMIC) {
      for (const u of activeUnits(t)) {
        assert.ok((u.sources ?? []).length >= 1, `${t.code} ${u.title}`);
        for (const s of u.sources!) assert.deepEqual(sourceDateProblems(s, VERIFIED_DAY), [], `${t.code} ${u.title}: ${s.url}`);
      }
    }
  });

  test("PTPREREQ's scope pages carry the re-read date", () => {
    assert.ok(PTPREREQ_SCOPE_SOURCES.every((s) => s.checkedAt === VERIFIED_DAY));
  });
});

describe("FAIL-1560: MSCS units cited no sources, so the lesson writer and fact-checker had none", () => {
  test("every MSCS unit has the sources mapped for it, all read on the verification day", () => {
    assert.deepEqual(Object.keys(MSCS_UNIT_SOURCES).sort(), MSCS_TRACK.units.map((u) => u.title).sort(), "one entry per unit, no stale titles");
    for (const u of MSCS_TRACK.units) {
      assert.ok(u.sources!.length >= 2, u.title);
      assert.ok(u.sources!.every((s) => s.checkedAt === VERIFIED_DAY), u.title);
    }
  });

  test("the key values a writer might remember from an older version reach the prompt", () => {
    const facts = (unit: string) => currentFactsBlock(MSCS_TRACK, unit) ?? "";
    assert.match(facts("Cybersecurity II: network defense & threat modeling"), /six functions: Govern/);
    assert.match(facts("Cybersecurity II: network defense & threat modeling"), /20 families/);
    assert.match(facts("HCI/UX: usability, interaction design & user research"), /WCAG 2\.2 is the current/);
    assert.match(facts("Sorting, recursion, and recurrences"), /Omega\(n log n\)/);
    assert.match(facts("Graph algorithms & design strategies"), /non-negative edge weights/);
    assert.match(facts("Operating systems"), /mutual exclusion, hold-and-wait, no preemption, circular wait/);
    assert.match(facts("Big data systems & data mining"), /variability/);
  });

  test("MSCS has no official outline, so no outline statements are invented for it", () => {
    for (const u of MSCS_TRACK.units) assert.ok(u.sources!.every((s) => s.outline === undefined), u.title);
  });
});

describe("FAIL-1561: the MSCS TLS objective implied TLS encrypts with public keys", () => {
  const unit = MSCS_TRACK.units.find((u) => u.title === "Cybersecurity I: cryptography & secure protocols")!;

  test("the objective keeps its slot and says how TLS 1.3 actually uses public-key cryptography", () => {
    assert.equal(unit.objectives.length, 6);
    assert.match(unit.objectives[0], /^Symmetric vs asymmetric cryptography/);
    assert.match(unit.objectives[0], /key agreement and signatures/);
    assert.ok(!unit.objectives.some((o) => /asymmetric encryption/.test(o)));
  });

  test("the unit cites the current TLS 1.3 RFC and its key-exchange facts", () => {
    const tls = unit.sources!.find((s) => /rfc9846/.test(s.url));
    assert.ok(tls, "RFC 9846, which obsoletes RFC 8446");
    assert.ok(tls!.keyValues!.some((k) => /static RSA/.test(k) && /forward secrecy/.test(k)));
    assert.ok(tls!.keyValues!.some((k) => /obsoletes RFC 8446/.test(k)));
  });
});

describe("FAIL-1562: CMPCBS taught power series as a multivariable topic", () => {
  test("the multivariable objective is multiple integration, in the same slot", () => {
    const u = activeUnits(CMPCBS_TRACK).find((x) => x.title === "Multivariable Calculus")!;
    assert.equal(u.objectives.length, 6);
    assert.equal(u.objectives[1], "Multiple integration: double and triple integrals and change of variables");
    assert.ok(!u.objectives.some((o) => /power series/i.test(o)));
  });
});

describe("FAIL-1563: CMPCBS units cited references that did not cover all their objectives", () => {
  test("each gap is covered by a reference that teaches it", () => {
    assert.ok(urlsOf(CMPCBS_TRACK, "Introduction to Computer Science").some((u) => /csed\.acm\.org/.test(u)), "networking, IP, privacy, computer crime");
    assert.ok(urlsOf(CMPCBS_TRACK, "Discrete Mathematics").includes("https://discretemath.org/"), "Boolean algebra, matrices, algorithms");
    assert.ok(urlsOf(CMPCBS_TRACK, "Introduction to Statistical Analysis").some((u) => /chance\.dartmouth/.test(u)), "calculus-based probability");
    assert.ok(urlsOf(CMPCBS_TRACK, "Numerical Methods").includes("https://fncbook.com/"), "linear systems and error analysis");
    assert.ok(urlsOf(CMPCBS_TRACK, "Mathematical Modeling and Simulation").some((u) => /siam/.test(u)), "the modeling process");
    assert.ok(urlsOf(CMPCBS_TRACK, "Mathematical Modeling and Simulation").some((u) => /chance\.dartmouth/.test(u)), "simulation");
    assert.ok(urlsOf(CMPCBS_TRACK, "Introduction to Information Systems").some((u) => /technicalwriting/.test(u)), "technical writing");
    assert.ok(urlsOf(CMPCBS_TRACK, "Information Security").some((u) => /attack\.mitre\.org/.test(u)), "attacker tactics");
  });

  test("the attacker-tactics reference carries the current ATT&CK tactic names", () => {
    const attack = sourcesOf(CMPCBS_TRACK, "Information Security").find((s) => /attack\.mitre\.org/.test(s.url))!;
    assert.ok(attack.keyValues!.some((k) => /15 Enterprise tactics/.test(k) && /Stealth/.test(k) && /Defense Impairment/.test(k)));
  });

  test("the C++ units also cite a reference read on the verification day (cppreference could not be re-read)", () => {
    for (const title of ["Programming in C++ I", "Programming in C++ II", "Data Structures and Algorithms"]) {
      assert.ok(sourcesOf(CMPCBS_TRACK, title).some((s) => /learn\.microsoft\.com/.test(s.url) && s.checkedAt === VERIFIED_DAY), title);
    }
  });
});
