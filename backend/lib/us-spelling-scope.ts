// REQ-220 (FAIL-1138): which source text the US-spelling check reads. Shared
// by lib/us-spelling.test.ts; test-only (it takes the TypeScript compiler as
// an argument so nothing at runtime imports it).
//
// Read: the string content of literals, template text and JSX text in
// learner-facing source. Not read: comments, identifiers, property names,
// import paths, type literals, single tokens with no space (ids, slugs, enum
// values such as 'cancelled' stored in the database), and SQL.

// Repo-relative directories.
export const SPELLING_SCOPE = ["backend/supabase/seed", "backend/app", "backend/lib", "mobile/app", "mobile/src"];

// Repo-relative path prefixes left out, each with its reason.
export const SPELLING_EXCLUDED: ReadonlyArray<[string, string]> = [
  // The legal text moved to US spelling with the 2026-11-13 version (REQ-260),
  // as REQ-220 planned, so it is checked like the rest of the app.
  // A sim version's text is part of its content hash and golden replays
  // (docs/sims.md); existing versions are left as published.
  ["backend/supabase/seed/sims/", "published sim versions (docs/sims.md versioning)"],
  ["backend/lib/sim/", "sim engine text replayed by the goldens"],
  ["mobile/src/sim/engine/", "byte-identical copy of backend/lib/sim/engine (engine copy drift test)"],
  // The word list itself.
  ["backend/lib/us-spelling.ts", "the British word list"],
  ["backend/lib/us-spelling.test.ts", "the check's own examples"],
  ["backend/lib/us-spelling-seed.dbtest.ts", "British titles on purpose, to test the seed's spelling-only retitle"],
];

export function spellingExcluded(rel: string): boolean {
  const p = rel.replace(/\\/g, "/");
  if (p.includes("/node_modules/")) return true;
  return SPELLING_EXCLUDED.some(([prefix]) => p.startsWith(prefix));
}

const SQL = /\$\d|::[a-z]|\binsert into\b|\bupdate \w+ set\b|\bdelete from\b|\bselect\b[\s\S]*\bfrom\b|\bwhere\b[\s\S]*=|\bjoin\b[\s\S]*\bon\b/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ts = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

export function literalIsLearnerText(ts: Ts, n: Node): boolean {
  const k = ts.SyntaxKind;
  const isLit =
    n.kind === k.StringLiteral ||
    n.kind === k.NoSubstitutionTemplateLiteral ||
    n.kind === k.TemplateHead ||
    n.kind === k.TemplateMiddle ||
    n.kind === k.TemplateTail ||
    n.kind === k.JsxText;
  if (!isLit) return false;
  const p = n.parent;
  if (p) {
    if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === n) return false;
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return false;
    if (ts.isLiteralTypeNode(p)) return false;
    if (ts.isElementAccessExpression(p) && p.argumentExpression === n) return false;
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === "require") return false;
  }
  // A template's parts are judged as a whole (SQL split by ${...}).
  let text: string = n.text ?? "";
  if (n.kind === k.TemplateHead || n.kind === k.TemplateMiddle || n.kind === k.TemplateTail) {
    const tpl = n.kind === k.TemplateHead ? p : p?.parent;
    if (tpl && ts.isTemplateExpression(tpl)) text = tpl.getText();
  }
  if (!/\s/.test(text.trim())) return false; // one token: an id, slug, key or enum value
  if (SQL.test(text)) return false;
  return true;
}
