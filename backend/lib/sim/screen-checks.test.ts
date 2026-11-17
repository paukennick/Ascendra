// FAIL-2122 (wave 2026-11-17): merging four screen branches by union put each
// later screen's check call inside the previous screen's check function,
// after its early return, so the data, governance, tabletop, facility,
// sandbox and trainer bindings were validated only when another screen's
// bindings existed. Every screen's check must run for a document of that
// type on its own: a screen type with no bindings is an error.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { validateScenario } from "./engine/v1/index.ts";
import type { ScenarioDoc } from "./engine/v1/index.ts";

const BINDINGS: Record<string, string> = {
  "security-console": "console",
  terminal: "terminal",
  "project-dashboard": "dashboard",
  "service-desk": "desk",
  data: "data",
  "governance-board": "governance",
  tabletop: "tabletop",
  "facility-console": "facility",
  "sandbox-report": "sandbox",
  trainer: "trainer",
};

test("each screen type's own check runs: a screen with no bindings is an error", () => {
  const e = ALL_DOCUMENTS.find((d) => d.slug === "departing-engineer-usb-evidence");
  assert.ok(e);
  const base = loadDocument(e);
  for (const [type, key] of Object.entries(BINDINGS)) {
    const d = JSON.parse(JSON.stringify(base)) as ScenarioDoc;
    const screen = d.screen as unknown as Record<string, unknown>;
    for (const k of Object.values(BINDINGS)) delete screen[k];
    screen.type = type;
    const errors = validateScenario(d);
    assert.ok(errors.some((x) => x.startsWith(`screen.${key}: `)), `${type}: ${errors.slice(0, 3).join(" | ")}`);
  }
});
