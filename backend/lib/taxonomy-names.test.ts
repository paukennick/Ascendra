// REQ-318 (migration 087): category and subcategory names name no exam
// body's mark as their head. A "nominative" body (catalog-trademarks.test.ts)
// may follow in plain text as a track label, "Cloud Certifications (AWS
// track)"; an "unstated" body (NCSBN) is not named at all. Slugs are
// unchanged, so the seed and links keep working. Pure test over the SQL.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";

const dir = join(__dirname, "..", "supabase", "migrations");
const sql = readFileSync(join(dir, "087_taxonomy_names_without_marks.sql"), "utf8");
const code = sql.replace(/--.*$/gm, "");

// Marks of covered bodies as they appeared in taxonomy names.
const MARKS = /\b(AWS|Amazon|Microsoft|Azure|Google|CompTIA|PMI|CNCF|Linux Foundation|Kubernetes|Red Hat|OpenShift|Docker|NCLEX|NCSBN)\b/;
// Unstated or permission bodies: never named, not even as a track label.
const NEVER = /\b(NCLEX|NCSBN|ISC2|EC-Council|NBCC|BCEN|ISACA|ITIL|PeopleCert)\b/;

const rows = (re: RegExp) => [...code.matchAll(re)].map((m) => m.slice(1));
const cats = rows(/\('([a-z-]+)', '([^']+)'\)/g).filter(([slug]) => !slug.includes(" "));
const subs = rows(/\('([a-z-]+)', '([a-z-]+)', '([^']+)'\)/g);

// Every name an earlier migration gave a row, last one wins (file order).
function earlierNames(): Map<string, string> {
  const names = new Map<string, string>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql") && x < "087").sort()) {
    const text = readFileSync(join(dir, f), "utf8").replace(/--.*$/gm, "");
    for (const m of text.matchAll(/\('([a-z0-9-]+)','([a-z0-9-]+)','([^']+)','(?:certification_aligned|technology_aligned|academic_foundational)',\d+\)/g))
      names.set(`sub:${m[1]}/${m[2]}`, m[3]);
    // A category row: slug, a capitalized name, description (a subcategory row has two slugs first).
    for (const m of text.matchAll(/\('([a-z0-9-]+)','([A-Z][^']*)','[^']*','(?:certification_aligned|technology_aligned|academic_foundational)',\d+\)/g))
      names.set(`cat:${m[1]}`, m[2]);
  }
  return names;
}

describe("REQ-318: taxonomy names without marks (migration 087)", () => {
  test("087 renames five categories and eleven subcategories", () => {
    assert.equal(cats.length, 5);
    assert.equal(subs.length, 11);
  });

  test("no new name starts with a mark; a mark appears only as a '(... track)' label", () => {
    for (const [, name] of [...cats.map(([s, n]) => [s, n]), ...subs.map(([, s, n]) => [s, n])]) {
      const head = name.replace(/\s*\([^)]*track\)$/, "");
      assert.doesNotMatch(head, MARKS, name);
      assert.doesNotMatch(name, NEVER, name);
    }
  });

  test("every earlier category or subcategory name that named a mark is renamed, by its existing slug", () => {
    const earlier = earlierNames();
    const renamed = new Set([...cats.map(([s]) => `cat:${s}`), ...subs.map(([c, s]) => `sub:${c}/${s}`)]);
    const marked = [...earlier].filter(([, name]) => MARKS.test(name)).map(([k]) => k).sort();
    assert.ok(marked.length >= 14, `found ${marked.length}`);
    for (const k of marked) assert.ok(renamed.has(k), `${k} (${earlier.get(k)}) still names a mark`);
    for (const k of renamed) assert.ok(earlier.has(k), `${k} is not an existing slug`);
  });

  test("the catalog's subcategory slugs are unchanged, so the seed still resolves them", () => {
    const slugs = new Set(CATALOG_TRACKS.map((t) => t.subcategorySlug));
    for (const s of ["aws-certifications", "azure-certifications", "gcp-certifications", "comptia-certifications", "pmi-certifications", "cncf-certifications", "nclex-preparation"])
      assert.ok(slugs.has(s), s);
  });

  test("idempotent: plain updates guarded by 'is distinct from', no inserts or deletes", () => {
    assert.doesNotMatch(code, /\binsert\b|\bdelete\b|\bdrop\b|\balter\b/i);
    assert.equal((code.match(/\bupdate\b/gi) ?? []).length, 3);
    assert.equal((code.match(/is distinct from/g) ?? []).length, 3);
  });
});
