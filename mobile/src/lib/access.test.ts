// REQ-144: unrestricted access on the phone -- who sees Settings > Access,
// what the plan line says, and the wiring rules (the Access row only behind
// showAccessSettings, the screen itself refusing non-owners, Plans showing
// unrestricted instead of upgrade prompts).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  accessPlanLine,
  grantFormProblem,
  grantStatusLine,
  hasUnrestricted,
  historyLine,
  parseAccess,
  showAccessSettings,
  type AccessGrant,
} from "./access.ts";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, "..", "..", rel), "utf8");

describe("who sees Settings > Access", () => {
  test("owners only: not unrestricted accounts, not ordinary learners, not an older server", () => {
    assert.equal(showAccessSettings({ access: { level: "owner", grantedBy: null, expiresAt: null } }), true);
    assert.equal(showAccessSettings({ access: { level: "unrestricted", grantedBy: "Nick", expiresAt: null } }), false);
    assert.equal(showAccessSettings({ access: null }), false);
    assert.equal(showAccessSettings({}), false, "a server without REQ-144 sends no access");
    assert.equal(showAccessSettings(null), false);
    assert.equal(showAccessSettings({ access: { level: "admin" } }), false, "unknown levels are nothing");
  });

  test("hasUnrestricted covers both levels", () => {
    assert.equal(hasUnrestricted({ access: { level: "owner" } }), true);
    assert.equal(hasUnrestricted({ access: { level: "unrestricted" } }), true);
    assert.equal(hasUnrestricted({ access: undefined }), false);
    assert.deepEqual(parseAccess({ level: "unrestricted", grantedBy: 5 }), { level: "unrestricted", grantedBy: null, expiresAt: null });
  });
});

describe("words", () => {
  test("the plan line names the giver and the end date", () => {
    assert.equal(accessPlanLine({ level: "unrestricted", grantedBy: "Nick", expiresAt: null }), "Unrestricted access, granted by Nick");
    assert.match(accessPlanLine({ level: "unrestricted", grantedBy: "Nick", expiresAt: "2027-06-30T23:59:59.999Z" }, "en-US"), /^Unrestricted access, granted by Nick until Jun 30, 2027$/);
    assert.equal(accessPlanLine({ level: "owner", grantedBy: null, expiresAt: null }), "Owner, unrestricted access");
    assert.equal(accessPlanLine(null), "");
  });

  test("grant status and history lines", () => {
    const g: AccessGrant = { id: "1", email: "a@b.co", status: "waiting", grantedAt: "2026-11-07T00:00:00Z", grantedBy: "Nick", expiresAt: null, note: null, claimedAt: null };
    assert.equal(grantStatusLine(g), "Waiting for sign-up, no end date");
    assert.match(grantStatusLine({ ...g, status: "ended", expiresAt: "2026-11-01T12:00:00Z" }, "en-US"), /^Ended, ended Nov 1, 2026$/);
    assert.match(historyLine({ at: "2026-11-07T12:00:00Z", action: "revoke", email: "a@b.co", by: "Nick", detail: {} }, "en-US"), /Access removed from a@b\.co by Nick$/);
  });

  test("the grant form", () => {
    assert.equal(grantFormProblem("friend@example.com", null, "", "2026-11-07"), null);
    assert.equal(grantFormProblem("friend@example.com", "2026-11-07", "beta", "2026-11-07"), null);
    assert.match(grantFormProblem("friend", null, "", "2026-11-07")!, /email/);
    assert.match(grantFormProblem("a@b.co", "2026-11-06", "", "2026-11-07")!, /end date/);
    assert.match(grantFormProblem("a@b.co", null, "x".repeat(501), "2026-11-07")!, /500/);
  });
});

describe("wiring", () => {
  test("the Settings Access row is behind showAccessSettings; the plan row shows unrestricted even with plans off", () => {
    const s = read("app/(app)/settings.tsx");
    assert.match(s, /showAccessSettings\(user\)\s*\?[\s\S]*?router\.push\("\/settings\/access"\)/);
    assert.equal((s.match(/\/settings\/access/g) ?? []).length, 1, "one way in");
    assert.match(s, /accessPlanLine\(/);
  });

  test("the Access screen refuses non-owners itself, and is registered", () => {
    const a = read("app/(app)/settings/access.tsx");
    assert.match(a, /if \(!showAccessSettings\(user\)\)/);
    assert.match(a, /\/api\/access\/grants/);
    assert.match(read("app/(app)/_layout.tsx"), /name="settings\/access"/);
  });

  test("Plans shows unrestricted access instead of upgrade prompts, and the upgrade sheet offers no plans", () => {
    const p = read("app/(app)/plans.tsx");
    assert.match(p, /if \(unrestricted\)/);
    const b = read("src/billing/BillingContext.tsx");
    // REQ-170: "nothing left to buy" is now "the plans cover every course" (was tier === "pro").
    assert.match(b, /canUpgrade = !me\?\.coversEverything && !hasUnrestricted\(user\)/);
  });
});
