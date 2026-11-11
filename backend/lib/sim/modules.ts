// REQ-190 (docs/sims.md 4.8): shared capability modules. A module is a
// document-level fragment (params, state, derived, phases, actions, timers,
// triggers, endings, criteria, KPIs, debrief) that a host scenario splices
// in before validation, configured by the host's inputs:
//
//   "modules": { "code": { "use": "code-acls@1", "with": { "entry": "...", ... } } }
//
// The alias must be the module's prefix, and every id the fragment adds
// starts with it, so two modules (or a module and its host) cannot collide.
// Inputs are substituted textually: a string that is exactly "{{a.b}}" takes
// the input's JSON value, "{{...a}}" inside an array spreads the input's
// items there, and "{{a.b}}" inside a longer string takes its text (a list
// or object is written as JSON, so a list of strings becomes a list literal
// in an expression). An entry with "$onlyIf" is spliced only when the named
// input has the given value. The spliced document is then validated like any other,
// so a module adds nothing the engine does not already run.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Problem } from "./engine/v1/types.ts";

// Resolved lazily: the app's tests import this file under Node's own type
// stripping (ES modules, no __dirname) and pass their own loader.
export function modulesDir(): string {
  return join(__dirname, "..", "..", "supabase", "seed", "sims", "modules");
}

export interface ModuleFile {
  module: string;
  version: number;
  prefix: string;
  about: string;
  inputs: Record<string, { type: string; about?: string; values?: string[] }>;
  fragment: Record<string, unknown>;
}

export interface ModuleUse {
  use: string; // "code-acls@1"
  with: Record<string, unknown>;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function loadModule(ref: string): ModuleFile | null {
  if (!/^[a-z][a-z0-9-]*@[1-9][0-9]*$/.test(ref)) return null;
  const file = join(modulesDir(), `${ref}.module.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as ModuleFile;
}

function inputAt(inputs: Record<string, unknown>, path: string): { ok: boolean; value: unknown } {
  let cur: unknown = inputs;
  for (const k of path.split(".")) {
    if (!isObj(cur) || !(k in cur)) return { ok: false, value: undefined };
    cur = cur[k];
  }
  return { ok: true, value: cur };
}

const WHOLE = /^\{\{([A-Za-z][A-Za-z0-9_.]*)\}\}$/;
const SPREAD = /^\{\{\.\.\.([A-Za-z][A-Za-z0-9_.]*)\}\}$/;
const INLINE = /\{\{([A-Za-z][A-Za-z0-9_.]*)\}\}/g;

function substitute(v: unknown, inputs: Record<string, unknown>, missing: Set<string>): unknown {
  if (typeof v === "string") {
    const w = WHOLE.exec(v);
    if (w) {
      const r = inputAt(inputs, w[1]);
      if (!r.ok) missing.add(w[1]);
      return r.ok ? JSON.parse(JSON.stringify(r.value)) : v;
    }
    return v.replace(INLINE, (_m, p: string) => {
      const r = inputAt(inputs, p);
      if (!r.ok) {
        missing.add(p);
        return "";
      }
      return typeof r.value === "string" ? r.value : JSON.stringify(r.value);
    });
  }
  if (Array.isArray(v)) {
    const out: unknown[] = [];
    for (const item of v) {
      const s = typeof item === "string" ? SPREAD.exec(item) : null;
      if (s) {
        const r = inputAt(inputs, s[1]);
        if (!r.ok) missing.add(s[1]);
        else if (!Array.isArray(r.value)) missing.add(`${s[1]} (must be a list)`);
        else out.push(...(JSON.parse(JSON.stringify(r.value)) as unknown[]));
      } else out.push(substitute(item, inputs, missing));
    }
    return out;
  }
  if (isObj(v)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) {
      if (k === "$onlyIf") continue;
      if (isObj(v[k]) && !included(v[k] as Record<string, unknown>, inputs, missing)) continue;
      out[k] = substitute(v[k], inputs, missing);
    }
    return out;
  }
  return v;
}

// A fragment entry may carry "$onlyIf": { "input": "protocol", "equals": "cals" }:
// it is spliced only when that input has that value (an ending that only one
// protocol can reach would otherwise be unreachable, and the linter requires
// every terminal ending to be reached).
function included(o: Record<string, unknown>, inputs: Record<string, unknown>, missing: Set<string>): boolean {
  const c = o.$onlyIf;
  if (c === undefined) return true;
  if (!isObj(c) || typeof c.input !== "string") {
    missing.add("$onlyIf (expects { input, equals })");
    return false;
  }
  const r = inputAt(inputs, c.input);
  if (!r.ok) missing.add(c.input);
  return r.ok && r.value === c.equals;
}

// id-keyed maps the fragment merges into; arrays it appends to.
const MAPS = ["params", "catalogs", "state", "history", "derived", "tables", "phases", "actions", "timers", "prompts", "reasoning", "endings"] as const;

export interface SpliceResult {
  doc: Record<string, unknown> | null;
  problems: Problem[];
}

// Splice every module a host source declares, in alias order, and drop the
// `modules` key: what remains is a plain scenario document. The time_up
// ending stays last so a reader of the document sees it as the hard stop.
export function spliceModules(source: Record<string, unknown>, load: (ref: string) => ModuleFile | null = loadModule): SpliceResult {
  const problems: Problem[] = [];
  const mods = source.modules;
  const doc = JSON.parse(JSON.stringify(source)) as Record<string, unknown>;
  delete doc.modules;
  if (mods === undefined) return { doc, problems };
  if (!isObj(mods)) return { doc: null, problems: [{ level: "error", path: "modules", message: "modules is a map of alias -> { use, with }" }] };
  for (const alias of Object.keys(mods).sort()) {
    const use = mods[alias] as ModuleUse;
    const at = `modules.${alias}`;
    if (!isObj(use) || typeof use.use !== "string" || !isObj(use.with)) {
      problems.push({ level: "error", path: at, message: "expected { use: \"name@version\", with: { ... } }" });
      continue;
    }
    const mod = load(use.use);
    if (!mod) {
      problems.push({ level: "error", path: `${at}.use`, message: `no module "${use.use}" in seed/sims/modules` });
      continue;
    }
    if (alias !== mod.prefix) problems.push({ level: "error", path: at, message: `the alias must be the module's prefix "${mod.prefix}"` });
    for (const k of Object.keys(mod.inputs)) if (!(k in use.with)) problems.push({ level: "error", path: `${at}.with.${k}`, message: `missing input (${mod.inputs[k].about ?? mod.inputs[k].type})` });
    for (const k of Object.keys(use.with)) if (!(k in mod.inputs)) problems.push({ level: "error", path: `${at}.with.${k}`, message: `${use.use} has no input "${k}"` });
    for (const k of Object.keys(mod.inputs)) {
      const spec = mod.inputs[k];
      const v = use.with[k];
      if (v === undefined) continue;
      if (spec.type === "enum" && !(spec.values ?? []).includes(v as string)) problems.push({ level: "error", path: `${at}.with.${k}`, message: `one of ${(spec.values ?? []).join(", ")}` });
      if ((spec.type === "effects" || spec.type === "list" || spec.type === "options") && !Array.isArray(v)) problems.push({ level: "error", path: `${at}.with.${k}`, message: "must be a list" });
      if ((spec.type === "expr" || spec.type === "id") && typeof v !== "string") problems.push({ level: "error", path: `${at}.with.${k}`, message: "must be a string" });
      if (spec.type === "object" && !isObj(v)) problems.push({ level: "error", path: `${at}.with.${k}`, message: "must be an object" });
    }
    if (problems.some((p) => p.level === "error")) continue;
    const missing = new Set<string>();
    const frag = substitute(mod.fragment, use.with, missing) as Record<string, unknown>;
    for (const m of missing) problems.push({ level: "error", path: `${at}.with`, message: `the module reads input "${m}", which is not given` });
    if (missing.size) continue;
    const owns = (id: string): boolean => id.startsWith(mod.prefix) && id.length > mod.prefix.length && /[A-Z_]/.test(id[mod.prefix.length]);
    for (const map of MAPS) {
      const add = frag[map];
      if (add === undefined) continue;
      const target = (isObj(doc[map]) ? doc[map] : (doc[map] = {})) as Record<string, unknown>;
      for (const id of Object.keys(add as Record<string, unknown>)) {
        if (!owns(id) && id !== mod.prefix) problems.push({ level: "error", path: `${at}.${map}.${id}`, message: `a module id must start with its prefix "${mod.prefix}"` });
        if (id in target) problems.push({ level: "error", path: `${map}.${id}`, message: `${use.use} adds "${id}", which the host already has` });
        else target[id] = (add as Record<string, unknown>)[id];
      }
    }
    for (const arr of ["triggers", "processes", "sources"] as const) {
      const add = frag[arr];
      if (!Array.isArray(add)) continue;
      const target = (Array.isArray(doc[arr]) ? doc[arr] : (doc[arr] = [])) as unknown[];
      target.push(...add);
    }
    // REQ-227 (FAIL-1222): the module's endings go after the host's in the
    // explicit order, and only when the host declares one (a host below engine
    // minor 2 keeps key order, as before). An id the module dropped through
    // $onlyIf (code_epiHarm outside the CALS protocol) is left out.
    const eo = frag.endingOrder;
    if (eo !== undefined) {
      const rawEndings = isObj(mod.fragment.endings) ? mod.fragment.endings : {};
      if (!Array.isArray(eo) || eo.some((x) => typeof x !== "string")) problems.push({ level: "error", path: `${at}.endingOrder`, message: "a module's endingOrder is a list of its ending ids" });
      else {
        const spliced = isObj(frag.endings) ? frag.endings : {};
        for (const id of eo as string[]) {
          if (!(id in rawEndings)) problems.push({ level: "error", path: `${at}.endingOrder`, message: `${use.use} orders "${id}", which is not one of its endings` });
          else if (id in spliced && Array.isArray(doc.endingOrder)) (doc.endingOrder as string[]).push(id);
        }
        for (const id of Object.keys(spliced)) if (!(eo as string[]).includes(id) && (spliced[id] as { when?: unknown }).when) problems.push({ level: "error", path: `${at}.endingOrder`, message: `${use.use} has an ending "${id}" with a when that its endingOrder does not list` });
      }
    }
    const fs = frag.scoring;
    if (isObj(fs)) {
      const ds = (isObj(doc.scoring) ? doc.scoring : (doc.scoring = {})) as Record<string, unknown>;
      for (const arr of ["criteria", "kpis", "expertPath"] as const) {
        if (!Array.isArray(fs[arr])) continue;
        const target = (Array.isArray(ds[arr]) ? ds[arr] : (ds[arr] = [])) as { id?: string }[];
        for (const item of fs[arr] as { id?: string }[]) {
          if (item.id && target.some((x) => x.id === item.id)) problems.push({ level: "error", path: `scoring.${arr}.${item.id}`, message: "the host already has this id" });
          target.push(item);
        }
      }
      if (isObj(fs.debrief)) ds.debrief = { ...(isObj(ds.debrief) ? ds.debrief : {}), ...fs.debrief };
    }
    // scope of practice: every action offered in the module's phases must be the module's own,
    // and both compression modes stay offered (the non-tap mode is the accessible path, 13).
    const phases = (frag.phases ?? {}) as Record<string, { actions?: unknown }>;
    for (const ph of Object.keys(phases)) {
      const acts = phases[ph].actions;
      if (!Array.isArray(acts)) {
        problems.push({ level: "error", path: `${at}.with.scope`, message: "scope must be a list of action ids" });
        continue;
      }
      for (const a of acts) if (typeof a !== "string" || !isObj((frag.actions as Record<string, unknown>)?.[a])) problems.push({ level: "error", path: `${at}.with.scope`, message: `"${String(a)}" is not one of ${use.use}'s actions` });
      if (mod.prefix === "code" && !(acts.includes("code_compress") && acts.includes("code_compressPaced"))) problems.push({ level: "error", path: `${at}.with.scope`, message: "both code_compress (tap) and code_compressPaced (no tapping) must be in scope, so a screen-reader user can always progress" });
    }
  }
  // keep time_up last among endings
  if (isObj(doc.endings) && "time_up" in (doc.endings as Record<string, unknown>)) {
    const e = doc.endings as Record<string, unknown>;
    const tu = e.time_up;
    delete e.time_up;
    e.time_up = tu;
  }
  return { doc: problems.some((p) => p.level === "error") ? null : doc, problems };
}
