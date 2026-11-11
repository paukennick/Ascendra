import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BADGE_WASH, blend, contrastRatio, ensureContrast } from "./contrast.ts";
import { categoryAccent, colors, courseAccent, getCourseIcon, readableOn } from "./theme.ts";

// REQ-113 (Audit 3 mobile M1, FAIL-259): every colour pair the app draws
// text or a control boundary with, checked against WCAG AA. This fails if a
// theme change drops any pair below 4.5:1 (text) or 3:1 (icons, outlines).

const TEXT = 4.5;
const NON_TEXT = 3;

type Pair = [name: string, fg: string, bg: string, min: number];

const surfaces = { bg: colors.bg, card: colors.card, cardAlt: colors.cardAlt } as const;

function themePairs(): Pair[] {
  const pairs: Pair[] = [];
  for (const [sn, s] of Object.entries(surfaces)) {
    for (const f of ["text", "muted", "mutedDim", "link", "good", "warn", "bad"] as const) {
      pairs.push([`${f} text on ${sn}`, colors[f], s, TEXT]);
    }
    pairs.push([`accent icon/border on ${sn}`, colors.accent, s, NON_TEXT]);
  }
  pairs.push(["primary button / active chip / user bubble text", colors.accentText, colors.accent, TEXT]);
  pairs.push(["danger button text", "#2A0509", colors.bad, TEXT]);
  pairs.push(["disabled button text (muted on the ghost surface)", colors.muted, colors.cardAlt, TEXT]);
  pairs.push(["text field outline vs the field", colors.inputBorder, colors.cardAlt, NON_TEXT]);
  pairs.push(["text field outline vs the card around it", colors.inputBorder, colors.card, NON_TEXT]);
  pairs.push(["text field outline vs the screen", colors.inputBorder, colors.bg, NON_TEXT]);
  pairs.push(["placeholder text in a field", colors.mutedDim, colors.cardAlt, TEXT]);
  pairs.push(["avatar initials on accentDim", colors.link, colors.accentDim, TEXT]);
  pairs.push(["text on accentDim (selected option)", colors.text, colors.accentDim, TEXT]);
  for (const f of ["good", "warn", "bad"] as const) {
    pairs.push([`${f} on ${f}Dim`, colors[f], colors[`${f}Dim`], TEXT]);
  }
  pairs.push(["error banner text on its wash", colors.bad, blend(colors.bad, 0.08, colors.card), TEXT]);
  // Badge text as Badge draws it: readableOn(colour, its wash over a card).
  for (const f of ["accent", "good", "warn", "bad", "muted", "mutedDim", "link"] as const) {
    const wash = blend(colors[f], BADGE_WASH, colors.card);
    pairs.push([`${f} badge text on its wash`, readableOn(colors[f], wash), wash, TEXT]);
  }
  return pairs;
}

describe("theme contrast (WCAG AA)", () => {
  for (const [name, fg, bg, min] of themePairs()) {
    test(`${name}: ${fg} on ${bg} >= ${min}:1`, () => {
      const r = contrastRatio(fg, bg);
      assert.ok(r >= min, `${name} is ${r.toFixed(2)}:1, below ${min}:1`);
    });
  }

  test("every course and category accent is drawn as an icon at 3:1 or better on a card", () => {
    const tracks = [
      ...Object.keys(courseAccent).map((code) => ({ code, track_type: "certification" })),
      ...Object.keys(categoryAccent).map((slug) => ({ code: `X-${slug}`, category_slug: slug, track_type: "certification" })),
      { code: "CUSTOM", track_type: "graduate" },
    ];
    for (const t of tracks) {
      const { iconColor, accent } = getCourseIcon(t);
      assert.ok(contrastRatio(iconColor, colors.card) >= NON_TEXT, `${t.code}: ${iconColor} (from ${accent})`);
    }
  });
});

describe("contrast helpers", () => {
  test("ratios match the WCAG reference values", () => {
    assert.equal(contrastRatio("#000000", "#FFFFFF").toFixed(2), "21.00");
    assert.equal(contrastRatio("#777777", "#FFFFFF").toFixed(2), "4.48");
  });

  test("the old theme values fail, so the test can catch a regression", () => {
    assert.ok(contrastRatio("#14151B", "#4C6FEF") < TEXT, "old primary button text 4.19:1");
    assert.ok(contrastRatio("#767A89", colors.cardAlt) < TEXT, "old mutedDim 3.66:1");
    assert.ok(contrastRatio(colors.border, colors.cardAlt) < NON_TEXT, "old field outline 1.20:1");
  });

  test("ensureContrast lifts only as far as needed and leaves a passing color alone", () => {
    assert.equal(ensureContrast("#FFFFFF", colors.card, 4.5), "#FFFFFF");
    const lifted = ensureContrast("#7A2E2E", colors.card, 3);
    assert.ok(contrastRatio(lifted, colors.card) >= 3);
    assert.ok(contrastRatio(lifted, colors.card) < 3.3, "not pushed to white");
  });
});

// Printed so the ratios can be quoted in the change record.
export function contrastReport(): string[] {
  return themePairs().map(([name, fg, bg, min]) => `${contrastRatio(fg, bg).toFixed(2)}  (min ${min})  ${name}`);
}
