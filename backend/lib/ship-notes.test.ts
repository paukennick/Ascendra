// REQ-228 (Nick, 2026-11-10): "Update What's new and the associated docs
// whenever a shipment goes out." What's new sat at 2026-11-07 through two
// releases and about thirty learner-visible changes (FAIL-1261), because
// nothing failed when it was forgotten. This test is that failure.
//
// The convention (CHANGELOG.md, .ai/playbooks/release.md "Ship notes"):
// every CHANGELOG entry written after the REQ-228 entry starts
//
//   - REQ-NNN (learner-facing; ...): ...   learners can see or feel it
//   - REQ-NNN (internal; ...): ...         they can't (CI, ops, docs, agents)
//
// A learner-facing entry needs a note in backend/lib/release-notes.ts whose
// `covers` lists its REQ id, or the words "No What's new:" and a reason in
// the entry (a fix too small to announce, a feature still switched off).
// Entries below the REQ-228 entry are older than the rule and are not read.
//
// Why ids and not dates: CHANGELOG entries carry no reliable date, several
// ship on one day, and a note may be written a day after the change. An id
// link is exact and cannot be satisfied by an unrelated newer note.
//
// The same file guards two other things that drifted with every shipment:
// merge-conflict markers left in the instructions agents follow (FAIL-1260),
// and the data inventory's migration range (FAIL-1265).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { RELEASE_NOTES } from "./release-notes";

const ROOT = join(__dirname, "..", "..");
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), "utf8");

export interface ChangelogEntry {
  line: number; // 1-based, in CHANGELOG.md
  text: string;
  req: string | null;
  tag: "learner-facing" | "internal" | null;
}

const SENTINEL = "REQ-228";
const ENTRY = /^- (?:(REQ-\d+)\b)?/;
const TAG = /^- (?:REQ-\d+\s*)?\(([^)]*)\)/;

// The bullets of the "## Unreleased" section above the REQ-228 entry.
export function entriesToCheck(changelog: string): ChangelogEntry[] {
  const lines = changelog.split("\n");
  const start = lines.findIndex((l) => /^## Unreleased\b/.test(l));
  if (start < 0) throw new Error("CHANGELOG.md has no '## Unreleased' section");
  const out: ChangelogEntry[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^## /.test(l)) break;
    if (!l.startsWith("- ")) continue;
    const req = ENTRY.exec(l)?.[1] ?? null;
    if (req === SENTINEL) return out;
    const parts = (TAG.exec(l)?.[1] ?? "").split(/[;,]/).map((s) => s.trim());
    const tag = parts.includes("learner-facing") ? "learner-facing" : parts.includes("internal") ? "internal" : null;
    out.push({ line: i + 1, text: l, req, tag });
  }
  throw new Error(`CHANGELOG.md has no ${SENTINEL} entry under Unreleased: the ship-notes rule starts there`);
}

export function shipNoteProblems(entries: ChangelogEntry[], covered: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const e of entries) {
    const head = e.text.slice(0, 80);
    if (e.tag === null) {
      problems.push(`CHANGELOG.md:${e.line} has no (learner-facing) or (internal) tag after its REQ id: ${head}`);
    } else if (e.tag === "learner-facing") {
      if (/No What's new:/.test(e.text)) continue;
      if (e.req === null) problems.push(`CHANGELOG.md:${e.line} is learner-facing but names no REQ id to cover: ${head}`);
      else if (!covered.has(e.req)) {
        problems.push(
          `CHANGELOG.md:${e.line} (${e.req}) is learner-facing but no note in backend/lib/release-notes.ts covers it. ` +
            `Add a What's new note with covers: ["${e.req}"], or write "No What's new: <reason>" in the entry.`
        );
      }
    }
  }
  return problems;
}

const coveredIds = () => new Set(RELEASE_NOTES.flatMap((n) => n.covers ?? []));

describe("ship notes: learner-facing changes reach What's new", () => {
  test("every CHANGELOG entry since REQ-228 is tagged, and every learner-facing one is covered", () => {
    assert.deepEqual(shipNoteProblems(entriesToCheck(read("CHANGELOG.md")), coveredIds()), []);
  });

  test("a note only covers requirement ids, written REQ-NNN", () => {
    for (const n of RELEASE_NOTES) for (const id of n.covers ?? []) assert.match(id, /^REQ-\d{3,}$/, `${n.id}: ${id}`);
  });

  const cl = (...bullets: string[]) => ["# Changelog", "", "## Unreleased", "", ...bullets, "- REQ-228 (internal): the rule.", "- REQ-1: old."].join("\n");

  test("a forgotten note fails, naming the entry and the fix", () => {
    const p = shipNoteProblems(entriesToCheck(cl("- REQ-900 (learner-facing; FAIL-1): new thing.")), new Set());
    assert.equal(p.length, 1);
    assert.match(p[0], /REQ-900.*covers: \["REQ-900"\]/);
  });
  test("a covering note, an internal tag or a stated reason passes", () => {
    const text = cl(
      "- REQ-900 (learner-facing; FAIL-1): covered.",
      "- REQ-901 (internal): CI only.",
      "- REQ-902 (learner-facing): a typo fix. No What's new: too small to announce."
    );
    assert.deepEqual(shipNoteProblems(entriesToCheck(text), new Set(["REQ-900"])), []);
  });
  test("an untagged new entry fails; entries older than REQ-228 are not read", () => {
    const p = shipNoteProblems(entriesToCheck(cl("- REQ-903: forgot the tag.")), new Set());
    assert.equal(p.length, 1);
    assert.match(p[0], /no \(learner-facing\) or \(internal\) tag/);
    assert.deepEqual(entriesToCheck(cl()).map((e) => e.req), []);
  });
  test("the tag may share the parentheses with other ids", () => {
    const [e] = entriesToCheck(cl("- REQ-904 (FAIL-2, migration 080; learner-facing): x."));
    assert.equal(e.tag, "learner-facing");
  });
});

// FAIL-1260: the G1-G6 merge left <<<<<<< / ======= / >>>>>>> in
// .ai/checklists/pre-completion.md on master, inside the list every agent
// reads before reporting done. Nothing checked text files for them.
describe("no merge-conflict markers in instructions and docs", () => {
  const MARKER = /^(<{7}|>{7})( |$)|^={7}$/m;
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "graph-viewer") continue;
        walk(rel, out);
      } else if (/\.(md|json)$/.test(e.name)) out.push(rel);
    }
    return out;
  };
  test(".ai/, docs/ and the top-level docs", () => {
    const files = [...walk(".ai"), ...walk("docs"), "README.md", "CHANGELOG.md", "CLAUDE.md", "AGENTS.md"];
    const bad = files.filter((f) => {
      try {
        return MARKER.test(read(f));
      } catch {
        return false; // a top-level file this checkout doesn't have
      }
    });
    assert.deepEqual(bad, []);
  });
});

// FAIL-1265: the inventory said "migrations 001-070" while 071-077 added a
// per-learner table, a column holding sign-in state and a webhook log. The
// privacy text is written from the inventory, so it has to move with every
// migration. This asks for a look, not a rewrite: bump the number once the
// new migration's tables and columns are in (or don't need to be).
describe("the data inventory is checked against every migration", () => {
  test("its 'up to migration NNN' is the newest migration", () => {
    const newest = readdirSync(join(ROOT, "backend", "supabase", "migrations"))
      .map((f) => /^(\d{3})/.exec(f)?.[1])
      .filter((n): n is string => n !== undefined)
      .sort()
      .pop();
    const inv = read("docs", "legal", "data-inventory.md");
    const m = /up to migration (\d{3})\b/.exec(inv);
    assert.ok(m, "docs/legal/data-inventory.md says which migration it was checked up to ('up to migration NNN')");
    assert.equal(
      m[1],
      newest,
      `docs/legal/data-inventory.md was checked up to migration ${m[1]}, but ${newest} exists: add what it stores (or note that it stores nothing personal) and bump the number`
    );
  });
});
