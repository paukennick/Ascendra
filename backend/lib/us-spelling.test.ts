// REQ-220 (FAIL-1138): learner-facing text is US English. Reads the string
// content (not comments, identifiers, ids or SQL) of seed, server and app
// source and fails on any word in lib/us-spelling.ts's British list, outside
// the proper names it allows and the paths lib/us-spelling-scope.ts excludes
// (the legal text until its next version, published sims).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { britishWords, toUsSpelling, US_SPELLING_MAP } from "./us-spelling";
import { SPELLING_SCOPE, SPELLING_EXCLUDED, literalIsLearnerText, spellingExcluded } from "./us-spelling-scope";

const ROOT = join(__dirname, "..", "..");

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  };
  for (const d of SPELLING_SCOPE) walk(join(ROOT, d));
  return out;
}

function literals(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (literalIsLearnerText(ts, n)) out.push(src.slice(n.getStart(sf), n.end));
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

describe("US English spelling (REQ-220)", () => {
  test("the word list converts as expected and leaves allowed names, URLs and US words alone", () => {
    assert.equal(toUsSpelling("Recognise the organisation's behaviour"), "Recognize the organization's behavior");
    assert.equal(toUsSpelling("ORGANISATION and Centre"), "ORGANIZATION and Center");
    assert.equal(toUsSpelling("the UK's National Cyber Security Centre"), "the UK's National Cyber Security Centre");
    assert.equal(toUsSpelling("Grey Turner sign, grey matter"), "Grey Turner sign, gray matter");
    assert.equal(toUsSpelling("see https://example.org/organisation/centre"), "see https://example.org/organisation/centre");
    // Real words that only look British stay.
    for (const w of ["exercise", "enterprise", "premise", "advise", "supervise", "promise", "expertise", "compromise", "analyses", "dialogue", "organism", "specialist"]) {
      assert.equal(US_SPELLING_MAP.has(w), false, w);
    }
  });

  test("the scope reads prose, not ids, property names or SQL", () => {
    const sf = ts.createSourceFile(
      "x.ts",
      `const a = { "organisation id": 1, x: "colour", y: "pick a colour", z: \`select colour from t where id = $1\` };`,
      ts.ScriptTarget.Latest,
      true
    );
    const got: string[] = [];
    const visit = (n: ts.Node) => {
      if (literalIsLearnerText(ts, n)) got.push((n as ts.StringLiteral).text);
      ts.forEachChild(n, visit);
    };
    visit(sf);
    assert.deepEqual(got, ["pick a colour"]);
  });

  test("every excluded path says why, and the legal text is checked since its 2026-11-13 version (REQ-260)", () => {
    for (const [p, why] of SPELLING_EXCLUDED) assert.ok(why.length > 10, p);
    assert.ok(!spellingExcluded("mobile/src/content/legal.ts"));
  });

  test("no British spelling in learner-facing string content (FAIL-1138)", () => {
    const found: string[] = [];
    for (const f of sourceFiles()) {
      const rel = relative(ROOT, f).replace(/\\/g, "/");
      if (spellingExcluded(rel)) continue;
      for (const lit of literals(f)) for (const w of britishWords(lit)) found.push(`${rel}: ${w.word} -> ${w.us}`);
    }
    assert.deepEqual(found, [], "convert to US spelling (lib/us-spelling.ts), or allow a proper name there");
  });
});

// REQ-228 (FAIL-1263): only the Terms and Privacy wait for their next version
// (Nick, 2026-11-10). mobile/src/content/legal.ts is excluded whole above
// because it holds both, so the FAQ, About and Sources pages in the same file
// slipped through ("licence" in the FAQ). They are checked here.
describe("legal.ts pages that are not Terms or Privacy are US English", () => {
  test("FAQ, About and Sources", async () => {
    const { FAQ, ABOUT, SOURCES } = await import("../../mobile/src/content/legal");
    const found: string[] = [];
    for (const doc of [FAQ, ABOUT, SOURCES]) {
      const text = [doc.title, doc.intro ?? "", ...doc.sections.flatMap((s: { title: string; body: string[] }) => [s.title, ...s.body])].join("\n");
      for (const w of britishWords(text)) found.push(`${doc.title}: ${w.word} -> ${w.us}`);
    }
    assert.deepEqual(found, []);
  });
});
