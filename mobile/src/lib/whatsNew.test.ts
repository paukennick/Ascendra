// REQ-140: "What's new" on the app side -- reading the server's response
// defensively, which note the sheet shows, when Home may offer it, icon
// fallback, screen-reader text, and the wiring rules (Home only, after the
// launch questions, hidden on blur, never a wall).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearSessionDismissed,
  entryToShow,
  FALLBACK_ICON,
  iconOrFallback,
  itemA11yLabel,
  mayOfferWhatsNew,
  parseWhatsNew,
  sessionDismissed,
  type WhatsNewState,
} from "./whatsNew.ts";

const here = dirname(fileURLToPath(import.meta.url));
const mobile = join(here, "..", "..");
const read = (p: string) => readFileSync(join(mobile, p), "utf8");

const item = (h: string) => ({ headline: h, body: `${h} body.` });
const entry = (id: string) => ({ id, date: id.slice(0, 10), title: `Title ${id}`, items: [item("a"), item("b"), item("c")] });

describe("parseWhatsNew", () => {
  test("keeps a well-formed response as is", () => {
    const data = { entries: [entry("2027-01-01"), entry("2026-11-07")], unseenIds: ["2027-01-01"], seenId: "2026-11-07" };
    assert.deepEqual(parseWhatsNew(data), data);
  });
  test("anything that isn't a response is null, never a throw", () => {
    for (const d of [null, undefined, "x", 3, [], {}, { entries: "no" }]) assert.equal(parseWhatsNew(d), null, JSON.stringify(d));
  });
  test("drops malformed entries and items, and unseen ids it has no entry for", () => {
    const s = parseWhatsNew({
      entries: [
        { id: "2027-01-01", title: "", items: [item("a")] },
        { id: "2026-12-01", title: "ok", items: [item("a"), { headline: "no body" }, null, { headline: "", body: "x." }] },
        { id: "2026-11-01", title: "empty", items: [] },
        "junk",
      ],
      unseenIds: ["2027-01-01", "2026-12-01", 5, "nope"],
      seenId: 7,
    })!;
    assert.deepEqual(s.entries.map((e) => e.id), ["2026-12-01"]);
    assert.deepEqual(s.entries[0].items, [item("a")]);
    assert.equal(s.entries[0].date, "2026-12-01");
    assert.deepEqual(s.unseenIds, ["2026-12-01"]);
    assert.equal(s.seenId, null);
  });
  test("an icon is kept only when it is a non-empty string", () => {
    const s = parseWhatsNew({ entries: [{ ...entry("2027-01-01"), items: [{ ...item("a"), icon: "bell" }, { ...item("b"), icon: 3 }] }], unseenIds: [] })!;
    assert.equal(s.entries[0].items[0].icon, "bell");
    assert.ok(!("icon" in s.entries[0].items[1]));
  });
});

describe("entryToShow", () => {
  const state: WhatsNewState = { entries: [entry("2027-01-01"), entry("2026-11-07")], unseenIds: ["2027-01-01", "2026-11-07"], seenId: null };
  test("the newest unseen note", () => {
    assert.equal(entryToShow(state)?.id, "2027-01-01");
  });
  test("skips notes already dismissed this session", () => {
    assert.equal(entryToShow(state, new Set(["2027-01-01"]))?.id, "2026-11-07");
    assert.equal(entryToShow(state, new Set(["2027-01-01", "2026-11-07"])), null);
  });
  test("nothing unseen or nothing loaded: no sheet", () => {
    assert.equal(entryToShow({ ...state, unseenIds: [] }), null);
    assert.equal(entryToShow(null), null);
  });
  test("session dismissals are per account and cleared together", () => {
    clearSessionDismissed();
    sessionDismissed("u1").add("2027-01-01");
    assert.equal(sessionDismissed("u2").size, 0);
    assert.ok(sessionDismissed("u1").has("2027-01-01"));
    clearSessionDismissed();
    assert.equal(sessionDismissed("u1").size, 0);
  });
});

describe("when Home may offer it", () => {
  test("only after the launch questions have loaded and none is due", () => {
    assert.equal(mayOfferWhatsNew(true, null), true);
    assert.equal(mayOfferWhatsNew(false, null), false); // still loading or failed: /welcome might be next
    assert.equal(mayOfferWhatsNew(true, "agree"), false);
    assert.equal(mayOfferWhatsNew(true, "welcome"), false);
  });
});

describe("accessibility helpers", () => {
  test("an unknown icon falls back to one the app has", () => {
    const has = (n: string) => n === "bell" || n === FALLBACK_ICON;
    assert.equal(iconOrFallback("bell", has), "bell");
    assert.equal(iconOrFallback("not-an-icon", has), FALLBACK_ICON);
    assert.equal(iconOrFallback(undefined, has), FALLBACK_ICON);
  });
  test("each item is read as one stop: headline, then the sentence", () => {
    assert.equal(itemA11yLabel({ headline: "Gentle reminders", body: "Off unless you turn them on." }), "Gentle reminders. Off unless you turn them on.");
    assert.equal(itemA11yLabel({ headline: "Done!", body: "Yes." }), "Done! Yes.");
  });
});

describe("wiring", () => {
  const home = read("app/(app)/index.tsx");
  const comp = read("src/components/WhatsNew.tsx");
  const settings = read("app/(app)/settings.tsx");
  const layout = read("app/(app)/_layout.tsx");

  test("only Home offers the sheet, and not while its menu is open", () => {
    assert.match(home, /useWhatsNewOnFocus\(\)/);
    assert.match(home, /<WhatsNewSheet entry=\{sidebarOpen \? null : whatsNew\.entry\}/);
    for (const screen of ["agree.tsx", "welcome.tsx", "course/[trackId]/exam.tsx", "course/[trackId]/lesson/[objectiveId].tsx"]) {
      assert.doesNotMatch(read(`app/(app)/${screen}`), /WhatsNew/, screen);
    }
  });
  test("the sheet waits for the launch questions, hides on blur without marking, and fails silently", () => {
    assert.match(comp, /mayOfferWhatsNew\(onboarding !== null, gate\)/);
    assert.match(comp, /focused\.current = false;\s*setEntry\(null\);/);
    assert.equal((comp.match(/\.catch\(\(\) => undefined\)/g) ?? []).length, 2);
  });
  test("Got it marks the note seen on the server", () => {
    assert.match(comp, /api\.post\("\/api\/whats-new\/seen", \{ id: entry\.id \}\)/);
    assert.match(comp, /label="Got it"/);
  });
  test("reduced motion, a header, a modal boundary and a back-button close", () => {
    assert.match(comp, /animationType=\{reduced \? "none" : "slide"\}/);
    assert.match(comp, /accessibilityRole="header"/);
    assert.match(comp, /accessibilityViewIsModal/);
    assert.match(comp, /onRequestClose=\{onDismiss\}/);
  });
  test("Settings links to the history screen, which is registered", () => {
    assert.match(settings, /label="What's new" onPress=\{\(\) => router\.push\("\/whats-new"\)\}/);
    assert.match(layout, /name="whats-new"/);
  });
  test("the app keeps no copy of the notes", () => {
    assert.doesNotMatch(comp + read("app/(app)/whats-new.tsx"), /Hands-on practice labs|Gentle study reminders/);
  });
});
