// REQ-113 (Audit 3 mobile M1): WCAG 2.x contrast, computed rather than
// eyeballed, so the theme can be checked by a test (src/lib/contrast.test.ts)
// and colours that come from data (course and category accents) can be made
// readable at run time.
//
// Text needs 4.5:1 against what is behind it (WCAG 1.4.3, AA); icons, input
// outlines and other non-text marks need 3:1 (1.4.11).

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

export function rgbToHex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function luminance(c: string | Rgb): number {
  const [r, g, b] = typeof c === "string" ? hexToRgb(c) : c;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// `fg` drawn at `alpha` over `bg` (what a translucent wash looks like).
export function blend(fg: string, alpha: number, bg: string): string {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return rgbToHex(f.map((v, i) => v * alpha + b[i] * (1 - alpha)) as Rgb);
}

// `color` moved toward white (on a dark background) or black (on a light
// one) just far enough to reach `min` against `bg`. Unchanged when it already
// does. Used for course accents, which are picked for identity, not contrast.
export function ensureContrast(color: string, bg: string, min: number): string {
  if (contrastRatio(color, bg) >= min) return color.toUpperCase();
  const towards: Rgb = luminance(bg) < 0.5 ? [255, 255, 255] : [0, 0, 0];
  const c = hexToRgb(color);
  for (let step = 1; step <= 100; step++) {
    const t = step / 100;
    const mixed = rgbToHex(c.map((v, i) => v + (towards[i] - v) * t) as Rgb);
    if (contrastRatio(mixed, bg) >= min) return mixed;
  }
  return rgbToHex(towards);
}

// A badge's text sits on a 16% wash of its own colour over a card.
export const BADGE_WASH = 0.16;
