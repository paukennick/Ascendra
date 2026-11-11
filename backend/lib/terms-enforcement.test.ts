// REQ-219 (FAIL-1108, FAIL-1109): unit tests, no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generationSet, acceptableGenerationsIn, pendingFromRows, LEGAL_VERSIONS, EARLIER_LEGAL_VERSIONS, PREVIOUS_LEGAL_VERSIONS } from "./legal";

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
  assert.ok(PREVIOUS_LEGAL_VERSIONS.terms < LEGAL_VERSIONS.terms);
  for (const e of EARLIER_LEGAL_VERSIONS) assert.ok(e.terms < PREVIOUS_LEGAL_VERSIONS.terms);
  assert.deepEqual(pendingFromRows([], { legacy: false, declared: LEGAL_VERSIONS.terms }), ["terms", "privacy"]);
  assert.deepEqual(
    pendingFromRows(
      [{ document: "terms", version: LEGAL_VERSIONS.terms }, { document: "privacy", version: LEGAL_VERSIONS.privacy }],
      { legacy: false, declared: LEGAL_VERSIONS.terms }
    ),
    []
  );
});
