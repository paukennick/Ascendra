// REQ-243 (Nick, 2026-11-11): every notification channel sits under one
// Notifications section in Settings. The screen can't be rendered in a node
// test, so the section layout is checked as source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const settings = readFileSync(new URL("../../app/(app)/settings.tsx", import.meta.url), "utf8");

// Each section is a SectionHeader followed by its rows up to the next header.
function section(label: string): string {
  const start = settings.indexOf(`<SectionHeader label="${label}" />`);
  assert.ok(start >= 0, `a "${label}" section exists`);
  const next = settings.indexOf("<SectionHeader", start + 1);
  return settings.slice(start, next < 0 ? undefined : next);
}

test("study reminders and email are under Notifications, not Study", () => {
  const notifications = section("Notifications");
  assert.match(notifications, /label="Study reminders"/);
  assert.match(notifications, /label="Email"/);
  const study = section("Study");
  assert.doesNotMatch(study, /label="Study reminders"|label="Email"/);
  assert.match(study, /label="Study profile"/);
});

test("no notification row is left in any other section", () => {
  const rows = [...settings.matchAll(/router\.push\("\/settings\/(reminders|emails)"\)/g)];
  assert.equal(rows.length, 2);
  const notifications = section("Notifications");
  for (const r of rows) assert.ok(notifications.includes(r[0]), `${r[1]} row sits under Notifications`);
});
