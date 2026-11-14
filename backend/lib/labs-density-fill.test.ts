// REQ-295 (Nick, 2026-11-14): the lab density fill. For every course the
// fill has reached, each active unit has at least the labs the rule asks for
// -- one per unit, plus six per course split by exam weight, at most three
// per unit (and never more than the unit has objectives) -- each on its own
// objective, and every lab the fill added cites its own dated sources (or,
// when its values are its own code's observed output, says so).
// docs/labs-coverage.md has the measurement for the whole catalog.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { SOURCE_KINDS } from "../supabase/seed/sources";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { apportion, POLICY_DEFAULTS, LAB_PLAN_TOP_UPS, unitPlan } from "../scripts/generate-labs-lib";

// Courses the fill has brought up to the rule, with the slugs it added.
export const FILLED: Readonly<Record<string, readonly string[]>> = {
  PYTHON: ["truthiness-stock-label", "unboundlocal-counter", "word-count-dict-patterns", "csv-to-json-inventory", "super-and-the-mro", "stdlib-for-an-on-call-script"],
  JAVASCRIPT: ["coercion-cart-total", "closure-rate-limiter", "shallow-copy-leaks-edits", "event-loop-log-order", "nullish-settings-defaults"],
  SECPLUS: ["web-attack-log-triage"],
  CNA: ["cna-sudden-confusion-report"],
  NASMCPT: ["emergency-on-the-gym-floor"],
  APLUS_CORE1: ["aplus1-cloud-model-by-scenario"],
  NETWORKPLUS: ["route-selection-default-and-pat"],
  LINUXPLUS: ["firewalld-open-https-permanently"],
  PENTESTPLUS: ["critical-finding-escalation", "read-nmap-service-scan", "password-attack-findings", "session-cookie-weaknesses", "persistence-scoping-and-removal"],
  SECAIPLUS: ["rag-pipeline-data-exposure", "ai-agent-in-cicd-guardrails", "responsible-ai-risk-register"],
  AZ900: ["sign-in-methods-for-each-need"],
  AZ305: ["compute-ha-by-failure-scope"],
  DP900: ["file-format-for-each-dataset", "ingestion-elt-pipeline-plan"],
  GCPDBE: ["read-replica-lag-and-routing"],
  GCPMLE: ["training-serving-preprocessing-skew"],
  DATAPLUS: ["data-source-for-each-question", "cleanse-and-standardize-customer-list"],
  TECHPLUS: ["techplus-number-systems", "techplus-network-device-roles", "techplus-os-components", "techplus-backup-plan"],
  AUTOOPSPLUS: ["make-the-script-idempotent", "slo-error-budget-release-call"],
  CLOUDNETX: ["availability-technology-for-each-need"],
  DATAAI: ["distribution-for-each-process", "unsupervised-method-for-each-task", "crisp-dm-project-walkthrough"],
  PROJECTPLUS: ["projectplus-charter-review", "projectplus-closing-sequence", "projectplus-quality-charts"],
  PMISP: ["sp-baseline-change-control"],
  CSPP: ["cspp-governance-framework-fit"],
  KCSA: ["compliance-scan-to-evidence"],
  CAPA: ["argo-events-flow-order"],
  CCA: ["clustermesh-benefits-and-prereqs"],
  MSCS: ["spot-the-broken-heaps", "truth-table-and-equivalences", "choose-a-sort-by-property", "dfs-order-by-hand", "topological-order-of-courses"],
  MSHI: ["choose-the-observational-data-source"],
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
      // The plan the generator and the other density tests use agrees with
      // the rule (through a LAB_PLAN_TOP_UPS entry where the verb heuristic
      // alone plans fewer), so a later wave cannot plan this course down.
      const plan = unitPlan({ code, family: "general", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) }, "hybrid");
      assert.deepEqual(plan, want, `${code}: unitPlan follows the rule${LAB_PLAN_TOP_UPS[code] ? "" : " (add a LAB_PLAN_TOP_UPS entry)"}`);
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      for (const slug of added) {
        const lab = set.labs.find((l) => l.slug === slug);
        assert.ok(lab, `${code}/${slug}`);
        // Dated value sources actually read for the lab, or -- for a lab whose
        // values are the observed output of its own code -- the reason why not.
        const own = lab!.sources ?? [];
        assert.ok(own.length > 0 || (lab!.noValueSource ?? "").length > 20, `${code}/${slug}: dated value sources or a reason`);
        assert.ok(!(own.length > 0 && lab!.noValueSource), `${code}/${slug}: not both`);
        for (const s of own) {
          assert.ok((SOURCE_KINDS as readonly string[]).includes(s.kind), `${code}/${slug}: ${s.url}`);
          assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/, `${code}/${slug}: ${s.url}`);
        }
        assert.ok(lab!.steps.some((st) => st.parts.some((p) => p.interactive)), `${code}/${slug}: at least one rule-graded part`);
      }
    });
  }
});
