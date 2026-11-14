// REQ-299: the dialog, the Release notes screen and grouping by date. REQ-300: the version on a note.
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
  dialogA11yLabel,
  entryToShow,
  groupByDate,
  FALLBACK_ICON,
  iconOrFallback,
  itemA11yLabel,
  mayOfferWhatsNew,
  parseWhatsNew,
  sessionDismissed,
  versionLabel,
  RELEASE_NOTES_ROUTE,
  type WhatsNewEntry,
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

  test("only Home offers the dialog, and not while its menu is open", () => {
    assert.match(home, /useWhatsNewOnFocus\(\)/);
    assert.match(home, /<WhatsNewDialog entry=\{sidebarOpen \? null : whatsNew\.entry\}/);
    for (const screen of ["agree.tsx", "welcome.tsx", "course/[trackId]/exam.tsx", "course/[trackId]/lesson/[objectiveId].tsx"]) {
      assert.doesNotMatch(read(`app/(app)/${screen}`), /WhatsNew/, screen);
    }
  });
  test("the dialog waits for the launch questions, hides on blur without marking, and fails silently", () => {
    assert.match(comp, /mayOfferWhatsNew\(onboarding !== null, gate\)/);
    assert.match(comp, /focused\.current = false;\s*setEntry\(null\);/);
    assert.equal((comp.match(/\.catch\(\(\) => undefined\)/g) ?? []).length, 2);
  });
  test("Got it marks the note seen on the server", () => {
    assert.match(comp, /api\.post\("\/api\/whats-new\/seen", \{ id: entry\.id \}\)/);
    assert.match(comp, /label=\{WHATS_NEW_GOT_IT\}/);
  });
  test("REQ-299: a centered fade dialog, not a bottom sheet; reduced motion turns the fade off", () => {
    assert.match(comp, /animationType=\{reduced \? "none" : "fade"\}/);
    assert.doesNotMatch(comp, /"slide"/);
    assert.match(comp, /justifyContent: "center"/);
    assert.doesNotMatch(comp, /justifyContent: "flex-end"/);
  });
  test("REQ-299: it goes through SheetModal (hidden under the lock), never React Native's Modal", () => {
    assert.match(comp, /import \{ SheetModal \} from "@\/components\/SheetModal"/);
    assert.doesNotMatch(comp, /import \{[^}]*\bModal\b[^}]*\} from "react-native"/);
  });
  test("REQ-299: a screen-reader title, a modal boundary, and every way out closes it", () => {
    assert.match(comp, /"aria-label": dialogA11yLabel\(entry, date\)/);
    assert.match(comp, /<H2>\{entry\.title\}<\/H2>/); // a real heading
    assert.match(comp, /accessibilityViewIsModal/);
    assert.match(comp, /onRequestClose=\{onDismiss\}/); // Escape (web) and back (Android)
    // Close button, backdrop tap, Got it, and See all each call onDismiss.
    assert.equal((comp.match(/onPress=\{onDismiss\}/g) ?? []).length, 3);
    assert.match(comp, /accessibilityLabel=\{WHATS_NEW_CLOSE_LABEL\}/);
  });
  test("REQ-299: the backdrop is not a tab stop, so the Close button is the first one in the dialog", () => {
    assert.match(comp, /accessible=\{false\}\s*focusable=\{false\}/);
    assert.ok(comp.indexOf("focusable={false}") < comp.indexOf('accessibilityLabel={WHATS_NEW_CLOSE_LABEL}'));
  });
  test("REQ-299: Settings > About and the dialog both open Release notes, which is registered and titled", () => {
    assert.match(settings, /label=\{RELEASE_NOTES_LABEL\} onPress=\{\(\) => router\.push\(RELEASE_NOTES_ROUTE\)\}/);
    assert.doesNotMatch(settings, /label="What's new"/);
    assert.match(comp, /router\.push\(RELEASE_NOTES_ROUTE\)/);
    assert.equal(RELEASE_NOTES_ROUTE, "/release-notes");
    assert.match(layout, /name="release-notes" options=\{\{ title: "Release notes" \}\}/);
    assert.match(layout, /name="whats-new"/);
  });
  test("REQ-299: the old /whats-new route redirects to Release notes", () => {
    assert.match(read("app/(app)/whats-new.tsx"), /<Redirect href=\{RELEASE_NOTES_ROUTE\} \/>/);
  });
  test("REQ-299: the Release notes screen groups by date and shows each note's version; it marks nothing seen", () => {
    const screen = read("app/(app)/release-notes.tsx");
    assert.match(screen, /groupByDate\(entries \?\? \[\]\)/);
    assert.match(screen, /versionLabel\(entry\)/);
    assert.doesNotMatch(screen, /whats-new\/seen/);
  });
  test("the app keeps no copy of the notes", () => {
    assert.doesNotMatch(comp + read("app/(app)/release-notes.tsx"), /Hands-on practice labs|Gentle study reminders/);
  });
});

describe("REQ-299 / REQ-300: dates, versions and the dialog's spoken title", () => {
  const e = (id: string, appVersion?: string): WhatsNewEntry => ({ ...entry(id), ...(appVersion ? { appVersion } : {}) });

  test("notes group by the day they shipped, newest day first, same-day notes together in the server's order", () => {
    const groups = groupByDate([e("2026-11-12-d"), e("2026-11-12-c"), e("2026-11-10"), e("2026-11-07")]);
    assert.deepEqual(groups.map((g) => g.date), ["2026-11-12", "2026-11-10", "2026-11-07"]);
    assert.deepEqual(groups[0].entries.map((x) => x.id), ["2026-11-12-d", "2026-11-12-c"]);
    assert.deepEqual(groupByDate([]), []);
  });
  test("a list that arrives out of order still shows the newest day first", () => {
    assert.deepEqual(groupByDate([e("2026-11-07"), e("2026-11-12-a"), e("2026-11-07-b")]).map((g) => g.date), ["2026-11-12", "2026-11-07"]);
  });
  test("the app version is kept only when it is plain x.y.z, and shown as 'Version x.y.z'", () => {
    const s = parseWhatsNew({
      entries: [
        { ...entry("2027-01-03"), appVersion: "2.1.0" },
        { ...entry("2027-01-02"), appVersion: "2.1.0+evil" },
        { ...entry("2027-01-01"), appVersion: 4 },
        entry("2026-12-31"),
      ],
      unseenIds: [],
    })!;
    assert.deepEqual(s.entries.map((x) => x.appVersion), ["2.1.0", undefined, undefined, undefined]);
    assert.equal(versionLabel(s.entries[0]), "Version 2.1.0");
    assert.equal(versionLabel(s.entries[1]), null); // an older server sends none: nothing is shown
  });
  test("the dialog is announced with its title, date and version", () => {
    assert.equal(dialogA11yLabel(e("2026-11-12-d", "2.0.0"), "Thursday, November 12, 2026"), "What's new: Title 2026-11-12-d. Thursday, November 12, 2026, Version 2.0.0.");
    assert.equal(dialogA11yLabel(e("2026-11-12-d"), "Thursday, November 12, 2026"), "What's new: Title 2026-11-12-d. Thursday, November 12, 2026.");
  });
});
