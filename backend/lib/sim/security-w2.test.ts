// REQ-238 (docs/sims.md 22.11): baseline security-console sims for CySA+,
// PenTest+, SecurityX and SecAI+, two each, on the REQ-231 screen and the
// security outcome profile. Each is valid, learner-paced, on its course's own
// catalog objective (one that meets the generator's selection rule), and
// names only documentation addresses and domains (RFC 5737, RFC 2606).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { Run } from "./engine/v1/engine.ts";
import { pacingEligible } from "./server-run.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { isPerformanceObjective } from "../../scripts/generate-labs-lib.ts";

const COURSES = ["CYSAPLUS", "PENTESTPLUS", "SECURITYX", "SECAIPLUS"] as const;
const W2 = ALL_DOCUMENTS.filter((e) => (COURSES as readonly string[]).includes(e.course));
const docOf = (slug: string): ScenarioDoc => loadDocument(W2.find((e) => e.slug === slug)!);

function driver(doc: ScenarioDoc) {
  const run: Run = createRun(doc, 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => {
    const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
    assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
  };
  const finish = () => {
    while (readValue(run, "busy") === true && run.state.phase === "incident") {
      const w = waits(run)[0];
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
    }
  };
  return {
    run,
    task: (action: string, params?: Record<string, string>) => {
      send({ type: "act", action, ...(params ? { params } : {}) });
      finish();
    },
    value: (n: string) => readValue(run, n),
  };
}

// Every string a learner can see, without the citations (whose URLs are real).
function visibleStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) visibleStrings(x, out);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "sources" && k !== "source") visibleStrings(x, out);
  return out;
}

const DOC_NETS = [/^192\.0\.2\.\d+$/, /^198\.51\.100\.\d+$/, /^203\.0\.113\.\d+$/];
const DOC_DOMAIN = /(^|\.)example\.(com|net|org)$|\.(test|example|invalid)$/;

describe("REQ-238 security-console sims", () => {
  test("two per course, each valid, on the console, learner-paced, security profile, engine 1.2 with endingOrder", () => {
    for (const c of COURSES) assert.equal(W2.filter((e) => e.course === c).length, 2, c);
    assert.equal(W2.length, 8);
    for (const e of W2) {
      const d = loadDocument(e);
      assert.equal(e.kind, "scenario");
      assert.equal(e.source, "authored");
      assert.deepEqual(validateScenario(d).map(String), [], e.slug);
      assert.equal(d.screen.type, "security-console");
      assert.equal(d.outcome.profile, "security");
      assert.equal(d.engine.minor, 2);
      assert.ok(d.endingOrder && d.endingOrder.length >= 2, e.slug);
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), e.slug);
      assert.equal(pacingEligible(d, "general"), false);
      const crit = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(crit >= 3 && crit <= 4, `${e.slug}: ${crit} critical criteria`);
      const classes = new Set(Object.entries(d.endings).filter(([id]) => id !== "time_up").map(([, x]) => x.class));
      assert.deepEqual([...classes].sort(), ["harm", "recovered", "target"], e.slug);
      for (const id of Object.keys(d.endings)) assert.ok(d.scoring.debrief[id], `${e.slug}: debrief for ${id}`);
      assert.ok(d.scoring.expertPath.length >= 3 && d.scoring.kpis.length >= 3, e.slug);
    }
  });

  test("each is on an active objective of its own course, distinct, and meets the generator's selection rule", () => {
    const seen = new Set<string>();
    for (const e of W2) {
      const d = loadDocument(e);
      const track = CATALOG_TRACKS.find((t) => t.code === e.course)!;
      const titles = activeUnits(track).flatMap((u) => u.objectives);
      assert.ok(titles.includes(d.objective), `${e.slug}: objective is a ${e.course} catalog title`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.includes(s), `${e.slug}: secondary "${s.slice(0, 40)}"`);
      assert.ok(isPerformanceObjective(d.objective, "general"), d.objective);
      assert.ok(!seen.has(d.objective), "one sim per objective");
      seen.add(d.objective);
    }
  });

  // FAIL-1462: a KPI on a rate-driven count printed 83.20000000000003 in the
  // debrief; a KPI with format "number" is rounded by the document.
  test("every KPI the goldens record is a whole number", () => {
    for (const e of W2) {
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as { paths: { id: string; expect: { kpis?: Record<string, unknown> } }[] };
      for (const p of g.paths) for (const [k, v] of Object.entries(p.expect.kpis ?? {})) assert.ok(typeof v === "number" && Number.isInteger(v), `${e.slug}/${p.id}: ${k} = ${v}`);
    }
  });

  test("every address and domain a learner sees is reserved for documentation", () => {
    for (const e of W2) {
      const text = visibleStrings(loadDocument(e)).join("\n");
      for (const ip of text.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? []) assert.ok(DOC_NETS.some((r) => r.test(ip)), `${e.slug}: ${ip}`);
      for (const host of text.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|info|biz|gov|edu|us|uk|ru|cn|xyz|app|dev|cloud|test|example)\b/g) ?? [])
        assert.ok(DOC_DOMAIN.test(host.toLowerCase()), `${e.slug}: ${host}`);
    }
  });
});

describe("the attacker moves on the analyst's clock", () => {
  test("CySA+: blocking the beacon address alone leaves the implant active, and it reaches a second host", () => {
    const d = driver(docOf("alert-triage-lolbin-hunt"));
    d.task("blockC2");
    for (let i = 0; i < 4; i++) d.task("watch");
    assert.equal(d.value("attackerActive"), true);
    assert.equal(typeof d.value("lateralAt"), "number");
  });

  test("CySA+: the vendor workaround closes the exposure before the emergency upgrade finishes", () => {
    const d = driver(docOf("vuln-prioritization-kev-edge"));
    d.task("workaround");
    assert.equal(d.value("vpnExposed"), false);
    assert.equal(d.value("patchDoneAt"), null);
  });

  test("PenTest+: the client acts ten minutes after a phone call, not after an email", () => {
    const call = driver(docOf("pentest-third-party-webshell"));
    call.task("callContact");
    call.task("watch");
    assert.equal(typeof call.value("clientActAt"), "number");
    const mail = driver(docOf("pentest-third-party-webshell"));
    mail.task("emailPm");
    mail.task("watch");
    assert.equal(mail.value("clientActAt"), null);
  });

  test("SecurityX: rotating twice while the service account still works lets the attacker read the new key", () => {
    const d = driver(docOf("federation-token-forgery"));
    d.task("rotate", { times: "twice" });
    assert.equal(d.value("forgingWorks"), false);
    for (let i = 0; i < 3; i++) d.task("watch");
    assert.equal(d.value("forgingWorks"), true);
  });

  test("SecAI+: a system-prompt instruction is not a control; human approval is", () => {
    const d = driver(docOf("agent-indirect-prompt-injection"));
    d.task("restrictTools", { how: "promptOnly" });
    assert.equal(d.value("refundsArmed"), true);
    d.task("restrictTools", { how: "hitl" });
    assert.equal(d.value("refundsArmed"), false);
    const r = driver(docOf("rag-assistant-data-leak"));
    r.task("restrictRetrieval", { how: "promptOnly" });
    assert.equal(r.value("sensitiveRetrievable"), true);
  });
});
