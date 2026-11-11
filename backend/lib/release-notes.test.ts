// REQ-140: the "What's new" notes are valid, and the unseen rule is right.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LATEST_RELEASE_NOTE_ID,
  RELEASE_NOTE_GATES,
  RELEASE_NOTE_ICONS,
  RELEASE_NOTE_LIMITS as L,
  RELEASE_NOTES,
  visibleReleaseNotes,
  type ReleaseNote,
  type ReleaseNoteGate,
} from "./release-notes";
import { unseenNoteIds } from "./whats-new";

const ID = /^\d{4}-\d{2}-\d{2}(-[a-z])?$/;

describe("release notes are well formed", () => {
  test("ids are unique, dated, short and strictly newest first", () => {
    const ids = RELEASE_NOTES.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const n of RELEASE_NOTES) {
      assert.match(n.id, ID, n.id);
      assert.ok(n.id.length <= L.idMax);
      assert.ok(n.id.startsWith(n.date), `${n.id} starts with its date ${n.date}`);
      assert.ok(!Number.isNaN(Date.parse(`${n.date}T00:00:00Z`)), n.date);
    }
    for (let i = 1; i < ids.length; i++) assert.ok(ids[i - 1] > ids[i], `${ids[i - 1]} before ${ids[i]}`);
    assert.equal(LATEST_RELEASE_NOTE_ID, ids[0]);
  });

  test("titles, items, headlines and bodies stay within their lengths", () => {
    for (const n of RELEASE_NOTES) {
      assert.ok(n.title.trim().length > 0 && n.title.length <= L.titleMax, n.title);
      assert.ok(n.items.length >= L.itemsMin && n.items.length <= L.itemsMax, `${n.id}: ${n.items.length} items`);
      for (const i of n.items) {
        assert.ok(i.headline.trim().length > 0 && i.headline.length <= L.headlineMax, i.headline);
        assert.ok(i.body.trim().length > 0 && i.body.length <= L.bodyMax, `${i.headline}: ${i.body.length} chars`);
        assert.match(i.body, /[.!?]$/, `${i.headline} body ends a sentence`);
        if (i.icon !== undefined) assert.ok((RELEASE_NOTE_ICONS as readonly string[]).includes(i.icon), i.icon);
        if (i.requires !== undefined) assert.ok(i.requires in RELEASE_NOTE_GATES, i.requires);
      }
      if (n.requires !== undefined) assert.ok(n.requires in RELEASE_NOTE_GATES, n.requires);
    }
  });

  test("every icon a note may use is one the app already draws", () => {
    // The app ships Feather; these names must appear in its own screens so
    // a note never relies on an icon nobody has looked at in the app.
    const root = join(__dirname, "..", "..", "mobile");
    const sources = ["app", "src"].map((d) => listTsx(join(root, d)).map((f) => readFileSync(f, "utf8")).join("\n")).join("\n");
    for (const icon of RELEASE_NOTE_ICONS) assert.ok(sources.includes(`"${icon}"`), icon);
  });

  test("ungated notes never mention plans or prices (billing is off)", () => {
    for (const n of RELEASE_NOTES) {
      if (n.requires === "billing") continue;
      for (const i of n.items) {
        if (i.requires === "billing") continue;
        assert.doesNotMatch(`${i.headline} ${i.body}`, /\b(price|pricing|subscri\w*|plans?|plus|pro|free tier|upgrade)\b|\$\d/i, i.headline);
      }
    }
  });
});

describe("gates", () => {
  const notes: ReleaseNote[] = [
    {
      id: "2027-01-02",
      date: "2027-01-02",
      title: "Gated",
      requires: "billing",
      items: [{ headline: "a", body: "a." }],
    },
    {
      id: "2027-01-01",
      date: "2027-01-01",
      title: "Mixed",
      items: [
        { headline: "open", body: "x." },
        { headline: "billing", body: "y.", requires: "billing" },
      ],
    },
    { id: "2026-12-01", date: "2026-12-01", title: "Only gated", items: [{ headline: "z", body: "z.", requires: "billing" }] },
  ];
  const closed = (g: ReleaseNoteGate | undefined) => g === undefined;
  const open = () => true;

  test("a closed gate hides the item, an entry gated whole, and an entry left empty", () => {
    const v = visibleReleaseNotes(notes, closed);
    assert.deepEqual(v.map((n) => n.id), ["2027-01-01"]);
    assert.deepEqual(v[0].items.map((i) => i.headline), ["open"]);
  });
  test("an open gate shows everything, without the gate names", () => {
    const v = visibleReleaseNotes(notes, open);
    assert.equal(v.length, 3);
    assert.ok(v.every((n) => !("requires" in n) && n.items.every((i) => !("requires" in i))));
  });
  test("the billing gate follows BILLING_ENABLED", () => {
    const before = process.env.BILLING_ENABLED;
    try {
      delete process.env.BILLING_ENABLED;
      assert.equal(RELEASE_NOTE_GATES.billing(), false);
      process.env.BILLING_ENABLED = "on";
      assert.equal(RELEASE_NOTE_GATES.billing(), true);
    } finally {
      if (before === undefined) delete process.env.BILLING_ENABLED;
      else process.env.BILLING_ENABLED = before;
    }
  });
});

describe("REQ-228 gates", () => {
  function withEnv(name: string, value: string | undefined, fn: () => void) {
    const before = process.env[name];
    try {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
      fn();
    } finally {
      if (before === undefined) delete process.env[name];
      else process.env[name] = before;
    }
  }
  test("the sims gate follows SIMS_ENABLED", () => {
    withEnv("SIMS_ENABLED", undefined, () => assert.equal(RELEASE_NOTE_GATES.sims(), false));
    withEnv("SIMS_ENABLED", "true", () => assert.equal(RELEASE_NOTE_GATES.sims(), true));
  });
  test("the aiCeiling gate is open only when a ceiling is set", () => {
    withEnv("AI_GLOBAL_DAILY_CEILING_USD", undefined, () => assert.equal(RELEASE_NOTE_GATES.aiCeiling(), false));
    withEnv("AI_GLOBAL_DAILY_CEILING_USD", "5", () => assert.equal(RELEASE_NOTE_GATES.aiCeiling(), true));
  });
  test("every note about sims is gated on sims", () => {
    for (const n of RELEASE_NOTES) {
      if (n.requires === "sims") continue;
      for (const i of n.items) {
        if (/\bsims?\b/i.test(`${i.headline} ${i.body}`)) assert.equal(i.requires, "sims", i.headline);
      }
    }
  });
});

describe("unseen notes", () => {
  const e = (id: string): ReleaseNote => ({ id, date: id.slice(0, 10), title: id, items: [] });
  const entries = [e("2027-02-01"), e("2026-12-24-b"), e("2026-12-24"), e("2026-11-07")];
  test("never dismissed: only the newest, once", () => {
    assert.deepEqual(unseenNoteIds(entries, null), ["2027-02-01"]);
  });
  test("everything newer than the marker, newest first; same-day suffixes order after the plain date", () => {
    assert.deepEqual(unseenNoteIds(entries, "2026-11-07"), ["2027-02-01", "2026-12-24-b", "2026-12-24"]);
    assert.deepEqual(unseenNoteIds(entries, "2026-12-24"), ["2027-02-01", "2026-12-24-b"]);
    assert.deepEqual(unseenNoteIds(entries, "2027-02-01"), []);
  });
  test("a marker for a note no longer shown still compares by date", () => {
    assert.deepEqual(unseenNoteIds(entries, "2027-01-15"), ["2027-02-01"]);
    assert.deepEqual(unseenNoteIds([], null), []);
  });
});

function listTsx(dir: string): string[] {
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return listTsx(p);
    return /\.tsx?$/.test(n) && !n.endsWith(".test.ts") ? [p] : [];
  });
}
