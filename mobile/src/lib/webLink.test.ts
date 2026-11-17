import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { linkProps, webLink } from "./webLink.ts";

// FAIL-2442: the Home footer links (About, FAQ, Disclaimer, ...) and the
// sign-in screen's Terms and Privacy links had role="link" and no href, so on
// the web Enter did nothing (same cause as the sidebar's FAIL-2441).

function click(mods: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean } = {}) {
  let prevented = 0;
  return { e: { ...mods, preventDefault: () => void prevented++ }, prevented: () => prevented };
}

describe("webLink / linkProps", () => {
  test("web: a real href, and a plain click or Enter navigates in the app without a page load", () => {
    let went = 0;
    const p = linkProps("web", "/faq", () => void went++);
    assert.equal(p.href, "/faq");
    const c = click();
    p.onPress(c.e);
    assert.equal(went, 1);
    assert.equal(c.prevented(), 1);
  });

  test("web: Ctrl, Cmd or Shift click is left to the browser (new tab or window)", () => {
    for (const mods of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
      let went = 0;
      const c = click(mods);
      webLink("/terms", () => void went++).onPress(c.e);
      assert.equal(went, 0, JSON.stringify(mods));
      assert.equal(c.prevented(), 0, JSON.stringify(mods));
    }
  });

  test("native: no href and onPress navigates as before, whatever the event", () => {
    for (const os of ["ios", "android"]) {
      let went = 0;
      const p = linkProps(os, "/privacy", () => void went++);
      assert.equal("href" in p, false, os);
      const c = click({ ctrlKey: true });
      p.onPress(c.e);
      assert.equal(went, 1, os);
      assert.equal(c.prevented(), 0, os);
    }
  });
});

// The opening JSX tag that starts at `start`, read with brace depth and
// string quotes, so an arrow function's `=>` inside an attribute doesn't end it.
function tagAt(src: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote && src[i - 1] !== "\\") quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return src.slice(start, i + 1);
  }
  return src.slice(start);
}

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function linkTags(src: string): string[] {
  const tags: string[] = [];
  for (const m of src.matchAll(/<[A-Z][A-Za-z.]*\b/g)) {
    const tag = tagAt(src, m.index!);
    if (/\b(?:accessibilityRole|role)="link"/.test(tag)) tags.push(tag);
  }
  return tags;
}

describe("FAIL-2442: every link in the app is a real anchor on the web", () => {
  test("the Home footer and the sign-in Terms and Privacy links spread linkProps", () => {
    const home = linkTags(readFileSync("app/(app)/index.tsx", "utf8"));
    assert.equal(home.length, 1, "the footer's one link tag, rendered per link");
    assert.match(home[0], /\{\.\.\.linkProps\(Platform\.OS, path, \(\) => router\.push\(path\)\)\}/);
    const login = linkTags(readFileSync("app/(auth)/login.tsx", "utf8"));
    assert.equal(login.length, 2, "Terms and Privacy");
    assert.match(login[0], /\{\.\.\.linkProps\(Platform\.OS, "\/terms", /);
    assert.match(login[1], /\{\.\.\.linkProps\(Platform\.OS, "\/privacy", /);
  });

  test("no element with a link role anywhere in app/ or src/ lacks an href", () => {
    const missing: string[] = [];
    let seen = 0;
    for (const f of [...tsxFiles("app"), ...tsxFiles("src")]) {
      for (const tag of linkTags(readFileSync(f, "utf8"))) {
        seen++;
        if (!/\{\.\.\.(?:linkProps|webLink)\(|\bhref=/.test(tag)) missing.push(`${f}: ${tag.slice(0, 80)}`);
      }
    }
    assert.ok(seen >= 6, `found only ${seen} link tags; the scan is broken`);
    assert.deepEqual(missing, []);
  });
});
