// REQ-295 (Nick, 2026-11-14): the lab density fill. For every course the
// fill has reached, each active unit has at least the labs the rule asks for
// -- one per unit, plus six per course split by exam weight, at most three
// per unit (and never more than the unit has objectives) -- each on its own
// objective, and every lab the fill added cites its own dated sources.
// docs/labs-coverage.md has the measurement for the whole catalog.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { SOURCE_KINDS } from "../supabase/seed/sources";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { apportion, POLICY_DEFAULTS, LAB_PLAN_TOP_UPS } from "../scripts/generate-labs-lib";

// Courses the fill has brought up to the rule, with the slugs it added.
export const FILLED: Readonly<Record<string, readonly string[]>> = {
  PYTHON: ["truthiness-stock-label", "unboundlocal-counter", "word-count-dict-patterns", "csv-to-json-inventory", "super-and-the-mro", "stdlib-for-an-on-call-script"],
  JAVASCRIPT: ["coercion-cart-total", "closure-rate-limiter", "shallow-copy-leaks-edits", "event-loop-log-order", "nullish-settings-defaults"],
  SECPLUS: ["web-attack-log-triage"],
};

export function ruleFor(code: string): number[] {
  const units = activeUnits(CATALOG_TRACKS.find((t) => t.code === code)!);
  const extras = apportion(POLICY_DEFAULTS.hybridExtras, units.map((u) => u.weight ?? null));
  return units.map((u, i) => (u.objectives.length ? Math.min(POLICY_DEFAULTS.hybridUnitCap, 1 + extras[i], u.objectives.length) : 0));
}

describe("lab density fill (REQ-295)", () => {
  for (const [code, added] of Object.entries(FILLED)) {
    test(`${code}: every unit meets the rule, one lab per objective, added labs are interactive and sourced`, () => {
      const set = LAB_SETS.find((s) => s.trackCode === code)!;
      const units = activeUnits(CATALOG_TRACKS.find((t) => t.code === code)!);
      const got = units.map((u) => set.labs.filter((l) => u.objectives.includes(l.objective)).length);
      const want = ruleFor(code);
      got.forEach((n, i) => assert.ok(n >= want[i], `${code} unit ${i + 1} (${units[i].title}): ${n} < ${want[i]}`));
      // The plan the other density tests use agrees with the rule (a top-up).
      if (LAB_PLAN_TOP_UPS[code]) assert.deepEqual([...LAB_PLAN_TOP_UPS[code]], want, `${code} top-up`);
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      for (const slug of added) {
        const lab = set.labs.find((l) => l.slug === slug);
        assert.ok(lab, `${code}/${slug}`);
        assert.ok((lab!.sources ?? []).length > 0, `${code}/${slug}: dated value sources`);
        for (const s of lab!.sources!) {
          assert.ok((SOURCE_KINDS as readonly string[]).includes(s.kind), `${code}/${slug}: ${s.url}`);
          assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/, `${code}/${slug}: ${s.url}`);
        }
        assert.ok(lab!.steps.some((st) => st.parts.some((p) => p.interactive)), `${code}/${slug}: at least one rule-graded part`);
      }
    });
  }
});
