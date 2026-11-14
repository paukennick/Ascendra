// REQ-219 (FAIL-1108, FAIL-1109): unit tests, no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generationSet, acceptableGenerationsIn, pendingFromRows, LEGAL_VERSIONS, EARLIER_LEGAL_VERSIONS, PREVIOUS_LEGAL_VERSIONS, UNDECLARED_LEGAL_VERSIONS, LEGACY_LEGAL_VERSIONS } from "./legal";

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

// REQ-261: the 2026-11-14 Privacy Policy is a bump of one document. What that
// means for each kind of account and build, on the live constants.
test("REQ-261: a Privacy-only bump asks for the Privacy Policy only, and strands no installed build", () => {
  assert.equal(LEGAL_VERSIONS.privacy, "2026-11-14");
  assert.equal(LEGAL_VERSIONS.terms, "2026-11-13", "the Terms did not change");
  const current = { legacy: false, declared: LEGAL_VERSIONS.privacy };
  // accepted the 2026-11-13 pair: the web app and an updated build ask for the Privacy Policy only
  const old = [{ document: "terms", version: "2026-11-13" }, { document: "privacy", version: "2026-11-13" }];
  assert.deepEqual(pendingFromRows(old, current), ["privacy"]);
  // a new account accepts both at once
  assert.deepEqual(pendingFromRows([], current), ["terms", "privacy"]);
  assert.deepEqual(pendingFromRows([...old.slice(0, 1), { document: "privacy", version: "2026-11-14" }], current), []);
  // an installed build that carries the 2026-11-13 text declares it: its own pair is enough, so it is not asked again
  assert.deepEqual(pendingFromRows(old, { legacy: false, declared: "2026-11-13" }), []);
  assert.deepEqual(acceptableGenerationsIn({ legacy: false, declared: "2026-11-13" }, liveSet()).map((g) => g.version), ["2026-11-14", "2026-11-13"]);
  // and one from before that (2026-11-10), which PREVIOUS_LEGAL_VERSIONS held until now, is still accepted
  assert.deepEqual(acceptableGenerationsIn({ legacy: false, declared: "2026-11-10" }, liveSet()).map((g) => g.version), ["2026-11-14", "2026-11-10"]);
  assert.deepEqual(pendingFromRows([{ document: "terms", version: "2026-11-10" }, { document: "privacy", version: "2026-11-10" }], { legacy: false, declared: "2026-11-10" }), []);
  // the single-string versions are all different, so no version stands for two pairs
  const versions = acceptableGenerationsIn({ legacy: true }, liveSet()).map((g) => g.version);
  assert.equal(new Set(versions).size, versions.length);
  assert.deepEqual(versions, ["2026-11-14", "2026-11-13", "2026-11-10", "2026-11-09", "2026-11-07"]);
});

function liveSet() {
  return generationSet(
    LEGAL_VERSIONS,
    [PREVIOUS_LEGAL_VERSIONS, ...EARLIER_LEGAL_VERSIONS],
    UNDECLARED_LEGAL_VERSIONS,
    LEGACY_LEGAL_VERSIONS
  );
}
