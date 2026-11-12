// REQ-249: the course card's sims badge and Explore's "Has sims" filter.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasSims, matchesSimsFilter, showSimsFilter, simBadge, simCountOf } from "./courseSims.ts";
import { exploreEmpty } from "./emptyStates.ts";
import { BADGE_WASH, blend, contrastRatio } from "./contrast.ts";
import { colors, readableOn } from "./theme.ts";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(here, "..", "..", p), "utf8");

describe("sim count and badge rule", () => {
  test("only a whole number above zero counts; an older server's missing field is 0", () => {
    assert.equal(simCountOf({ sim_count: 3 }), 3);
    for (const bad of [undefined, null, 0, -1, 1.5, Number.NaN]) assert.equal(simCountOf({ sim_count: bad as number }), 0, String(bad));
    assert.equal(simCountOf({}), 0);
    assert.equal(hasSims({ sim_count: 1 }), true);
    assert.equal(hasSims({}), false);
  });

  test("no sims, no badge; one and many read naturally, with a spoken label", () => {
    assert.equal(simBadge({ sim_count: 0 }), null);
    assert.equal(simBadge({}), null);
    assert.deepEqual(simBadge({ sim_count: 1 }), { label: "1 sim", accessibilityLabel: "Has 1 simulation" });
    assert.deepEqual(simBadge({ sim_count: 2 }), { label: "2 sims", accessibilityLabel: "Has 2 simulations" });
  });

  test("the badge is text plus an icon, in the accent badge colors that meet 4.5:1", () => {
    const wash = blend(colors.accent, BADGE_WASH, colors.card);
    assert.ok(contrastRatio(readableOn(colors.accent, wash), wash) >= 4.5);
    const card = read("src/components/CourseCard.tsx");
    assert.match(card, /<Badge label=\{sims\.label\} color=\{colors\.accent\} icon="activity" \/>/);
    // The badge row is outside the reading order, so the card's button says it.
    assert.match(card, /sims \? ` \$\{sims\.accessibilityLabel\}\.` : ""/);
    assert.match(card, /flexWrap: "wrap"/, "a fourth badge wraps on a narrow phone");
  });
});

describe("Explore's Has sims filter", () => {
  const tracks = [
    { id: "a", sim_count: 2 },
    { id: "b", sim_count: 0 },
    { id: "c" },
  ];

  test("off: everything passes; on: only courses with sims", () => {
    assert.deepEqual(tracks.filter((t) => matchesSimsFilter(t, false)).map((t) => t.id), ["a", "b", "c"]);
    assert.deepEqual(tracks.filter((t) => matchesSimsFilter(t, true)).map((t) => t.id), ["a"]);
  });

  test("the chip shows only when some listed course has sims", () => {
    assert.equal(showSimsFilter(tracks), true);
    assert.equal(showSimsFilter([{ sim_count: 0 }, {}]), false, "sims switched off");
    assert.equal(showSimsFilter([]), false);
    assert.equal(showSimsFilter(null), false);
  });

  test("the empty state names the filter", () => {
    const e = exploreEmpty("kubernetes", { simsOnly: true });
    assert.match(e.title, /simulations/);
    assert.match(e.message, /kubernetes/);
    assert.match(e.message, /Turn off "Has sims"/);
    assert.equal(e.action?.to, "support");
    assert.match(exploreEmpty("", { simsOnly: true }).message, /Turn off "Has sims"/);
    assert.equal(exploreEmpty("x").title, "No courses match", "unchanged without the filter");
  });

  test("the screen ANDs it with the other filters, hides it with no sims, and labels it", () => {
    const src = read("app/(app)/explore.tsx");
    assert.match(src, /const simsActive = simsOnly && simsFilterShown;/, "a hidden chip filters nothing");
    const filter = src.slice(src.indexOf("const filtered = useMemo"), src.indexOf("const sections ="));
    for (const check of ["categorySlug && t.category_slug !== categorySlug", "matchesFreshnessFilter(t, freshnessFilter)", "matchesSimsFilter(t, simsActive)", "haystack.includes(q)"]) {
      assert.ok(filter.includes(check), check);
    }
    assert.match(src, /\{simsFilterShown \? \(/);
    assert.match(src, /aria-label="Filter by simulations"/);
    assert.match(src, /accessibilityLabel="Only courses with simulations"/);
    assert.match(src, /exploreEmpty\(query, \{ simsOnly: simsActive \}\)/);
  });
});
