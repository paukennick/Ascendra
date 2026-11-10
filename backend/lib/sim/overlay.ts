// REQ-190 (docs/sims.md 19.4 item 1, 4.7): difficulty bands. A band is one
// base scenario plus a JSON merge-patch (RFC 7396) applied before the
// document is compiled and validated, so SAA and SAP share one launch day.
// The patch runs on the base SOURCE (modules not yet spliced, 4.8), the
// result is validated as its own document and gets its own content hash.
//
// RFC 7396 replaces arrays whole. Adding a catalogue entry or a trigger
// would then copy every base row into the band and drift when the base
// changes, so a band may also `append` items to an existing array, named
// by a JSON pointer, before the merge-patch runs. Nothing else is extended.
//
// The linter (bandProblems) checks what a patch can get wrong silently:
// every patched or deleted path exists in the base, except new keys in the
// id-keyed maps (params, state, actions, timers, ...) and optional fields
// the schema allows; every append pointer names an existing array; and no
// outcome threshold, or param the band declares as a threshold, is looser
// than the base.
import { PROFILE_THRESHOLDS } from "./engine/v1/validate.ts";
import type { Problem, ScenarioDoc } from "./engine/v1/types.ts";

export interface BandFile {
  band: string; // "sap"
  base: { course: string; slug: string }; // the base scenario it patches
  slug: string; // the compiled document's slug (its file name)
  label: string; // "Professional (SAP)"
  // Params that act as thresholds, with the direction that tightens them,
  // checked against the base like outcome thresholds ("params.budget": "lower").
  tighten?: Record<string, "lower" | "higher">;
  append?: Record<string, unknown[]>; // JSON pointer -> items appended to that array
  patch: Record<string, unknown>; // RFC 7396 merge-patch over the base source
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function clone<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

// RFC 7396 section 2, verbatim in behaviour.
export function mergePatch(target: unknown, patch: unknown): unknown {
  if (!isObj(patch)) return clone(patch);
  const out: Record<string, unknown> = isObj(target) ? clone(target) : {};
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    if (v === null) delete out[k];
    else out[k] = mergePatch(out[k], v);
  }
  return out;
}

function unescapePointer(tok: string): string {
  return tok.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function resolvePointer(doc: unknown, pointer: string): { ok: true; value: unknown } | { ok: false; reason: string } {
  if (pointer === "") return { ok: true, value: doc };
  if (!pointer.startsWith("/")) return { ok: false, reason: "a JSON pointer starts with /" };
  let cur: unknown = doc;
  for (const raw of pointer.slice(1).split("/")) {
    const tok = unescapePointer(raw);
    if (Array.isArray(cur)) {
      if (!/^(0|[1-9][0-9]*)$/.test(tok) || Number(tok) >= cur.length) return { ok: false, reason: `no item ${tok}` };
      cur = cur[Number(tok)];
    } else if (isObj(cur)) {
      if (!(tok in cur)) return { ok: false, reason: `no key "${tok}"` };
      cur = cur[tok];
    } else return { ok: false, reason: `"${tok}" is below a scalar` };
  }
  return { ok: true, value: cur };
}

// Maps whose keys are author-chosen ids: a band may add new keys there.
// Paths are dotted, with * for one id segment.
const OPEN_MAPS = [
  "params",
  "catalogs",
  "catalogs.*.fields",
  "state",
  "state.*.fields",
  "history",
  "derived",
  "tables",
  "phases",
  "actions",
  "timers",
  "timers.*.with",
  "prompts",
  "reasoning",
  "endings",
  "outcome.thresholds",
  "scoring.debrief",
  "modules",
];

// Optional fields of the schema's objects. A band may set one the base
// left out; the compiled document is validated afterwards, so a field put
// where the schema has no such field still fails.
const OPTIONAL_FIELDS = new Set([
  "random",
  "catalogs",
  "history",
  "tables",
  "prompts",
  "modules",
  "secondaryObjectives",
  "safetyNote",
  "handover",
  "howItWorks",
  "calendar",
  "level",
  "bedside",
  "unit",
  "source",
  "precision",
  "when",
  "available",
  "why",
  "params",
  "wait",
  "interruptsSkip",
  "with",
  "class",
  "phase",
  "trigger",
  "critical",
  "expert",
  "feedback",
  "note",
  "url",
  "recheckBy",
]);

function matches(pattern: string, path: string[]): boolean {
  const p = pattern.split(".");
  if (p.length !== path.length) return false;
  return p.every((seg, i) => seg === "*" || seg === path[i]);
}

function openMap(path: string[]): boolean {
  if (path[0] === "modules" && path.length >= 3 && path[2] === "with") return true; // module inputs are free JSON
  return OPEN_MAPS.some((m) => matches(m, path));
}

function walkPatch(base: unknown, patch: Record<string, unknown>, path: string[], out: Problem[]): void {
  for (const k of Object.keys(patch)) {
    const here = [...path, k];
    const label = `band.patch.${here.join(".")}`;
    const v = patch[k];
    const has = isObj(base) && k in base;
    if (v === null) {
      if (!has) out.push({ level: "error", path: label, message: "deletes a path the base does not have" });
      continue;
    }
    if (!has) {
      if (!openMap(path) && !OPTIONAL_FIELDS.has(k)) out.push({ level: "error", path: label, message: `the base has no "${here.join(".")}" and it is neither a new id in an id-keyed map nor an optional field (typo?)` });
      continue;
    }
    const b = (base as Record<string, unknown>)[k];
    if (isObj(v)) {
      if (!isObj(b)) out.push({ level: "error", path: label, message: "patches an object over a value that is not an object" });
      else walkPatch(b, v, here, out);
    } else if (isObj(b)) out.push({ level: "error", path: label, message: "replaces an object with a non-object; delete it with null first if that is meant" });
  }
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function readPath(doc: unknown, dotted: string): unknown {
  let cur: unknown = doc;
  for (const k of dotted.split(".")) {
    if (!isObj(cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}

export interface BandCompile {
  source: Record<string, unknown> | null; // the patched base source, modules not yet spliced
  problems: Problem[];
}

// Structural checks plus the patch itself. Threshold checks need the
// compiled documents and are in thresholdProblems below.
export function applyBand(baseSource: Record<string, unknown>, band: BandFile): BandCompile {
  const problems: Problem[] = [];
  if (!isObj(band.patch)) return { source: null, problems: [{ level: "error", path: "band.patch", message: "a band's patch must be a JSON object (RFC 7396)" }] };
  walkPatch(baseSource, band.patch, [], problems);
  for (const k of ["schemaVersion", "engine"]) if (k in band.patch) problems.push({ level: "error", path: `band.patch.${k}`, message: "a band may not change the format or the engine; that is the base's" });
  if (isObj(band.patch.outcome) && "profile" in band.patch.outcome) problems.push({ level: "error", path: "band.patch.outcome.profile", message: "a band keeps its base's outcome profile, so thresholds compare" });
  let work: unknown = clone(baseSource);
  for (const ptr of Object.keys(band.append ?? {})) {
    const items = (band.append ?? {})[ptr];
    const r = resolvePointer(work, ptr);
    if (!r.ok) problems.push({ level: "error", path: `band.append.${ptr}`, message: `pointer does not resolve in the base: ${r.reason}` });
    else if (!Array.isArray(r.value)) problems.push({ level: "error", path: `band.append.${ptr}`, message: "append targets an array; this path is not one" });
    else if (!Array.isArray(items) || !items.length) problems.push({ level: "error", path: `band.append.${ptr}`, message: "append needs a non-empty list of items" });
    else {
      const dotted = ptr.slice(1).split("/").map(unescapePointer);
      if (readPath(band.patch, dotted.join(".")) !== undefined) problems.push({ level: "error", path: `band.append.${ptr}`, message: "the patch also replaces this array; append or replace, not both" });
      // ids must stay unique where items carry them (catalogue rows, triggers, processes, criteria)
      const ids = new Set((r.value as unknown[]).map((x) => (isObj(x) ? x.id : undefined)).filter((x) => x !== undefined));
      for (const it of items) if (isObj(it) && it.id !== undefined && ids.has(it.id)) problems.push({ level: "error", path: `band.append.${ptr}`, message: `id "${String(it.id)}" is already in the base array` });
      (r.value as unknown[]).push(...clone(items));
    }
  }
  if (problems.some((p) => p.level === "error")) return { source: null, problems };
  const patched = mergePatch(work, band.patch) as Record<string, unknown>;
  if (band.slug) patched.slug = band.slug;
  return { source: patched, problems };
}

// Compiled base vs compiled band: no outcome threshold is dropped or loosened
// (direction from the profile defaults, 9.2), and every param the band names
// in `tighten` exists in both and is no looser.
export function thresholdProblems(base: ScenarioDoc, banded: ScenarioDoc, band: BandFile): Problem[] {
  const out: Problem[] = [];
  const defaults = PROFILE_THRESHOLDS[base.outcome.profile] ?? {};
  for (const k of Object.keys(base.outcome.thresholds)) {
    const b = base.outcome.thresholds[k].value;
    const t = banded.outcome.thresholds[k];
    if (!t) {
      out.push({ level: "error", path: `outcome.thresholds.${k}`, message: "the band drops a threshold the base has (a dropped threshold is the loosest possible)" });
      continue;
    }
    const dir = defaults[k]?.tighter ?? (band.tighten ?? {})[`outcome.thresholds.${k}`];
    if (!dir) {
      if (t.value !== b) out.push({ level: "error", path: `outcome.thresholds.${k}`, message: `changed from ${b} to ${t.value}, but no direction is known; add it to the band's tighten map` });
      continue;
    }
    if (dir === "lower" ? t.value > b : t.value < b) out.push({ level: "error", path: `outcome.thresholds.${k}`, message: `${t.value} is looser than the base's ${b} (tighter is ${dir}); a band may tighten, never loosen` });
  }
  for (const key of Object.keys(band.tighten ?? {})) {
    const dir = (band.tighten ?? {})[key];
    if (key.startsWith("outcome.thresholds.")) continue;
    const m = /^params\.([A-Za-z0-9_]+)$/.exec(key);
    if (!m) {
      out.push({ level: "error", path: `band.tighten.${key}`, message: "name a param as params.<id> or a threshold as outcome.thresholds.<id>" });
      continue;
    }
    const b = num(base.params[m[1]]?.value);
    const t = num(banded.params[m[1]]?.value);
    if (b === null || t === null) {
      out.push({ level: "error", path: `band.tighten.${key}`, message: "the param must exist with a number value in the base and the band" });
      continue;
    }
    if (dir === "lower" ? t > b : t < b) out.push({ level: "error", path: `params.${m[1]}`, message: `${t} is looser than the base's ${b} (tighter is ${dir})` });
  }
  return out;
}

export type { Json };
