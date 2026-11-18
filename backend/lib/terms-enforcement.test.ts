// REQ-219 (FAIL-1108, FAIL-1109): unit tests, no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generationSet, acceptableGenerationsIn, pendingFromRows, LEGAL_VERSIONS, CURRENT_TERMS_VERSION, EARLIER_LEGAL_VERSIONS, PREVIOUS_LEGAL_VERSIONS, UNDECLARED_LEGAL_VERSIONS, LEGACY_LEGAL_VERSIONS } from "./legal";

test("FAIL-1109: the test preload is wired into both integration scripts, and enforcement is on unless a test turns it off", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(pkg.scripts["test:db"], /--import \.\/lib\/test-setup\.ts/);
  const sh = readFileSync("scripts/ci/db-tests-as-runtime.sh", "utf8");
  assert.equal((sh.match(/--import \.\/lib\/test-setup\.ts/g) ?? []).length, 2);
  // The switch lives in requireUser, defaults to on, and nothing else in the app sets it.
  const src = readFileSync("lib/auth/requireUser.ts", "utf8");
  assert.match(src, /let termsEnforced = true;/);
});

test("FAIL-1108: the next Terms bump keeps builds that declared the version before it", () => {
  // Today: 11-10 current, 11-09 previous. The next bump to 11-12 moves 11-10 to
  // previous and pushes 11-09 onto the earlier list.
  const bumped = generationSet(
    { terms: "2026-11-12", privacy: "2026-11-12" },
    [{ terms: "2026-11-10", privacy: "2026-11-10" }, { terms: "2026-11-09", privacy: "2026-11-09" }],
    { terms: "2026-11-09", privacy: "2026-11-09" },
    { terms: "2026-11-07", privacy: "2026-11-07" }
  );
  const versions = (declared: string | null, legacy = false) =>
    acceptableGenerationsIn({ legacy, declared }, bumped).map((g) => g.version);
  assert.deepEqual(versions("2026-11-12"), ["2026-11-12"]);
  assert.deepEqual(versions("2026-11-10"), ["2026-11-12", "2026-11-10"]);
  assert.deepEqual(versions("2026-11-09"), ["2026-11-12", "2026-11-09"], "a build declaring the older previous is not stranded");
  assert.deepEqual(versions("1999-01-01"), ["2026-11-12"]);
  assert.deepEqual(versions(null, true), ["2026-11-12", "2026-11-10", "2026-11-09", "2026-11-07"]);
  // Without the list (the old single PREVIOUS), the 11-09 declarer would be refused:
  const old = generationSet(
    { terms: "2026-11-12", privacy: "2026-11-12" },
    [{ terms: "2026-11-10", privacy: "2026-11-10" }],
    { terms: "2026-11-09", privacy: "2026-11-09" },
    { terms: "2026-11-07", privacy: "2026-11-07" }
  );
  assert.deepEqual(acceptableGenerationsIn({ legacy: false, declared: "2026-11-09" }, old).map((g) => g.version), ["2026-11-12"]);
});

test("FAIL-1108: the live constants stay consistent", () => {
  // REQ-261: the documents can be bumped one at a time (the 2026-11-14 Privacy
  // Policy left the Terms at 2026-11-13), so a generation is ordered by its
  // newest document, and no document may go backwards.
  const newest = (d: { terms: string; privacy: string }) => [d.terms, d.privacy].sort().at(-1)!;
  assert.ok(newest(PREVIOUS_LEGAL_VERSIONS) < newest(LEGAL_VERSIONS));
  for (const doc of ["terms", "privacy"] as const) assert.ok(PREVIOUS_LEGAL_VERSIONS[doc] <= LEGAL_VERSIONS[doc], doc);
  for (const e of EARLIER_LEGAL_VERSIONS) assert.ok(newest(e) < newest(PREVIOUS_LEGAL_VERSIONS));
  assert.deepEqual(pendingFromRows([], { legacy: false, declared: LEGAL_VERSIONS.terms }), ["terms", "privacy"]);
  assert.deepEqual(
    pendingFromRows(
      [{ document: "terms", version: LEGAL_VERSIONS.terms }, { document: "privacy", version: LEGAL_VERSIONS.privacy }],
      { legacy: false, declared: LEGAL_VERSIONS.terms }
    ),
    []
  );
});

// REQ-261 / REQ-306 / REQ-317: Privacy-only bumps (2026-11-14, 2026-11-16,
// then 2026-11-17). REQ-327: 2026-11-18 bumped both documents (18+ simulations
// in any course). REQ-331: 2026-11-19 bumps the Privacy Policy alone
// (reviewers). What that means for each kind of account and build.
test("REQ-331: a Privacy-only bump asks for the Privacy Policy alone, and strands no installed build", () => {
  assert.equal(LEGAL_VERSIONS.privacy, "2026-11-19");
  assert.equal(LEGAL_VERSIONS.terms, "2026-11-18");
  assert.deepEqual(PREVIOUS_LEGAL_VERSIONS, { terms: "2026-11-18", privacy: "2026-11-18" });
  assert.deepEqual(EARLIER_LEGAL_VERSIONS[0], { terms: "2026-11-13", privacy: "2026-11-17" }, "the old previous pair moved to the front of the earlier list");
  const current = { legacy: false, declared: CURRENT_TERMS_VERSION };
  const prev = [{ document: "terms", version: "2026-11-18" }, { document: "privacy", version: "2026-11-18" }];
  assert.deepEqual(pendingFromRows(prev, current), ["privacy"], "an account on the previous pair is asked for the Privacy Policy only");
  assert.deepEqual(pendingFromRows([], current), ["terms", "privacy"]);
  assert.deepEqual(pendingFromRows([{ document: "terms", version: "2026-11-18" }, { document: "privacy", version: "2026-11-19" }], current), []);
  // installed builds that carry an older text declare it and are not asked again
  assert.deepEqual(pendingFromRows(prev, { legacy: false, declared: "2026-11-18" }), []);
  for (const declared of ["2026-11-18", "2026-11-17", "2026-11-16", "2026-11-14", "2026-11-13", "2026-11-10"]) {
    assert.deepEqual(acceptableGenerationsIn({ legacy: false, declared }, liveSet()).map((g) => g.version), ["2026-11-19", declared], declared);
  }
  const versions = acceptableGenerationsIn({ legacy: true }, liveSet()).map((g) => g.version);
  assert.equal(new Set(versions).size, versions.length);
  assert.deepEqual(versions, ["2026-11-19", "2026-11-18", "2026-11-17", "2026-11-16", "2026-11-14", "2026-11-13", "2026-11-10", "2026-11-09", "2026-11-07"]);
});

function liveSet() {
  return generationSet(
    LEGAL_VERSIONS,
    [PREVIOUS_LEGAL_VERSIONS, ...EARLIER_LEGAL_VERSIONS],
    UNDECLARED_LEGAL_VERSIONS,
    LEGACY_LEGAL_VERSIONS
  );
}
