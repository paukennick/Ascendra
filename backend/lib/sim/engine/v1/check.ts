// REQ-162 (docs/sims.md 4.3, 4.4): the expression type checker. Every
// expression in a document is checked once, in the scope it will run in, so
// unknown names, enum mismatches, a `time` used as a number and a function in
// the wrong place fail validation, never at run time. The checker also reports
// what an expression reads and a static evaluation cost for the budgets.

import type { Ast } from "./parser.ts";
import { astDepth, astNodes, MAX_DEPTH, MAX_NODES } from "./parser.ts";

export type Ty =
  | { k: "number" }
  | { k: "bool" }
  | { k: "string" }
  | { k: "enum"; values: string[] }
  | { k: "time" }
  | { k: "null" }
  | { k: "list"; of: Ty; len?: number }
  | { k: "map"; fields: Record<string, Ty> }
  | { k: "set"; of: string[] }
  | { k: "records"; fields: Record<string, Ty>; max: number; catalog?: boolean; name?: string }
  | { k: "record"; fields: Record<string, Ty> }
  | { k: "history" };

export const T_NUM: Ty = { k: "number" };
export const T_BOOL: Ty = { k: "bool" };
export const T_STR: Ty = { k: "string" };
export const T_TIME: Ty = { k: "time" };

export class CheckError extends Error {
  pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.pos = pos;
  }
}

// Where an expression runs decides which functions it may use (4.3).
export interface Where {
  effects: boolean; // pick/chance allowed
  commandTime: boolean; // catalogue aggregates allowed
  scoring: boolean; // firstAct, countAct, ... allowed
  history: boolean; // past/delta/trend allowed (false inside history.of)
}

export const WHERE_TICK: Where = { effects: false, commandTime: false, scoring: false, history: true };
export const WHERE_TICK_EFFECT: Where = { effects: true, commandTime: false, scoring: false, history: true };
export const WHERE_COMMAND_EFFECT: Where = { effects: true, commandTime: true, scoring: false, history: true };
export const WHERE_SCORING: Where = { effects: false, commandTime: true, scoring: true, history: true };
export const WHERE_HISTORY_OF: Where = { effects: false, commandTime: false, scoring: false, history: false };

export interface Scope {
  names: Record<string, Ty>;
  parent: Scope | null;
}

export function scopeWith(parent: Scope | null, names: Record<string, Ty>): Scope {
  return { names, parent };
}

export function lookup(scope: Scope | null, name: string): Ty | undefined {
  for (let s = scope; s; s = s.parent) {
    if (Object.prototype.hasOwnProperty.call(s.names, name)) return s.names[name];
  }
  return undefined;
}

export interface CheckResult {
  ty: Ty;
  deps: Set<string>; // root names read (outermost scope resolution is the caller's business)
  cost: number; // static evaluation bound
  usesRandom: boolean;
  usesCatalog: boolean;
  usesHistory: boolean;
  warnings: string[];
}

export function tyName(t: Ty): string {
  switch (t.k) {
    case "enum":
      return `enum(${t.values.slice(0, 6).join("|")}${t.values.length > 6 ? "|…" : ""})`;
    case "list":
      return `list of ${tyName(t.of)}`;
    case "set":
      return "set";
    case "records":
      return t.catalog ? "catalogue" : "records";
    case "record":
      return "record";
    case "map":
      return "map";
    default:
      return t.k;
  }
}

export function literalTy(v: unknown): Ty {
  if (typeof v === "number") return T_NUM;
  if (typeof v === "boolean") return T_BOOL;
  if (typeof v === "string") return T_STR;
  if (Array.isArray(v)) {
    if (!v.length) return { k: "list", of: T_NUM, len: 0 };
    const first = literalTy(v[0]);
    for (const x of v) {
      if (tyName(literalTy(x)) !== tyName(first)) throw new CheckError("list literal must be homogeneous", 0);
    }
    return { k: "list", of: first, len: v.length };
  }
  if (v && typeof v === "object") {
    const fields: Record<string, Ty> = {};
    for (const key of Object.keys(v as object).sort()) fields[key] = literalTy((v as Record<string, unknown>)[key]);
    return { k: "map", fields };
  }
  throw new CheckError("unsupported literal", 0);
}

export function fieldSpecTy(spec: { type: string; values?: string[]; of?: string }): Ty {
  switch (spec.type) {
    case "number":
      return T_NUM;
    case "bool":
      return T_BOOL;
    case "string":
      return T_STR;
    case "enum":
      return { k: "enum", values: spec.values ?? [] };
    case "list":
      return { k: "list", of: spec.of === "number" ? T_NUM : T_STR };
    default:
      throw new CheckError(`unknown field type ${spec.type}`, 0);
  }
}

function isStringish(t: Ty): boolean {
  return t.k === "string" || t.k === "enum";
}

// Can a value of type `from` be stored where `to` is expected?
export function assignable(from: Ty, to: Ty): string | null {
  if (to.k === "number") return from.k === "number" ? null : `expected a number, got ${tyName(from)}`;
  if (to.k === "bool") return from.k === "bool" ? null : `expected a bool, got ${tyName(from)}`;
  if (to.k === "string") return isStringish(from) ? null : `expected a string, got ${tyName(from)}`;
  if (to.k === "enum") {
    if (from.k === "enum") {
      const bad = from.values.filter((v) => to.values.indexOf(v) < 0);
      // a single-valued enum (a literal) must be a member; a wider enum may overlap
      if (from.values.length === 1 && bad.length) return `"${from.values[0]}" is not one of ${tyName(to)}`;
      if (bad.length === from.values.length) return `${tyName(from)} has no value in common with ${tyName(to)}`;
      return null;
    }
    if (from.k === "string") return null; // a typed string (capture, catalogue field) is checked at run time
    return `expected ${tyName(to)}, got ${tyName(from)}`;
  }
  if (to.k === "time") return from.k === "time" || from.k === "number" || from.k === "null" ? null : `expected a time, got ${tyName(from)}`;
  if (to.k === "set") {
    if (from.k === "set") return null;
    if (from.k === "list" && (isStringish(from.of) || from.len === 0)) return null;
    return `expected a set (or a list of strings), got ${tyName(from)}`;
  }
  if (to.k === "list") {
    if (from.k !== "list") return `expected a list, got ${tyName(from)}`;
    if (from.len === 0) return null;
    return assignable(from.of, to.of);
  }
  if (to.k === "records") return from.k === "records" ? null : `expected records, got ${tyName(from)}`;
  if (to.k === "record") return from.k === "record" ? null : `expected a record, got ${tyName(from)}`;
  if (to.k === "map") return from.k === "map" ? null : `expected a map, got ${tyName(from)}`;
  return `cannot assign to ${tyName(to)}`;
}

function sameKind(a: Ty, b: Ty): boolean {
  if (isStringish(a) && isStringish(b)) return true;
  if ((a.k === "time" && b.k === "null") || (a.k === "null" && b.k === "time")) return true;
  return a.k === b.k;
}

function unify(a: Ty, b: Ty, pos: number): Ty {
  if (a.k === "enum" && b.k === "enum") return { k: "enum", values: Array.from(new Set([...a.values, ...b.values])) };
  if (a.k === "enum" && b.k === "string") return T_STR;
  if (a.k === "string" && b.k === "enum") return T_STR;
  if (a.k === "list" && b.k === "list") {
    if (a.len === 0) return b;
    if (b.len === 0) return a;
    return { k: "list", of: unify(a.of, b.of, pos) };
  }
  if (a.k === b.k) return a;
  if (a.k === "null" && b.k === "time") return b;
  if (a.k === "time" && b.k === "null") return a;
  throw new CheckError(`branches have different types: ${tyName(a)} and ${tyName(b)}`, pos);
}

const SCORING_FNS = new Set(["firstAct", "countAct", "actedBefore", "everTrue", "ending", "outcomeClass", "pausedTotal", "skips", "chose"]);
const COLLECTION_FNS = new Set(["count", "any", "all", "sum", "product", "minOf", "maxOf", "distinct", "find", "where", "sortBy", "take", "groupCount", "longestPrefixMatch"]);

export const ALL_FUNCTIONS = [
  "min", "max", "clamp", "abs", "floor", "ceil", "round", "exp", "ln", "sqrt", "sin", "cos", "pow", "lerp", "num",
  "isNull", "since", "timeAt", "seq", "past", "delta", "trend",
  ...COLLECTION_FNS,
  "len", "lower", "startsWith", "endsWith", "contains", "matchQuery",
  "ipInCidr", "cidrContains", "sameSubnet", "ipToInt", "cidrPrefix", "cidrNetwork",
  "pick", "chance",
  ...SCORING_FNS,
];

export interface CheckOptions {
  where: Where;
  // declared random streams (for pick/chance), action ids, trigger ids,
  // prompt ids with their choice ids, and ending ids, for the literal checks
  streams?: string[];
  actionIds?: string[];
  triggerIds?: string[];
  promptChoices?: Record<string, string[]>;
  endingIds?: string[];
  paramNames?: string[]; // names that are params (positive-literal checks for trend)
  // for firstAct's condition: the scope the condition runs in (t and the
  // action's params); the checker binds `t` as number and leaves params to
  // the caller's `actionParamScope`
  actionParamScope?: (actionId: string) => Record<string, Ty> | null;
}

function collMax(t: Ty): number {
  switch (t.k) {
    case "records":
      return Math.max(1, t.max);
    case "set":
      return Math.max(1, t.of.length);
    case "list":
      return Math.max(1, t.len ?? 64);
    default:
      return 1;
  }
}

function elemScope(t: Ty, parent: Scope): Scope {
  if (t.k === "records") return scopeWith(parent, { ...t.fields, _id: T_NUM });
  if (t.k === "set") return scopeWith(parent, { item: { k: "enum", values: t.of } });
  if (t.k === "list") return scopeWith(parent, { item: t.of });
  return parent;
}

function elemTy(t: Ty): Ty {
  if (t.k === "records") return { k: "record", fields: { ...t.fields, _id: T_NUM } };
  if (t.k === "set") return { k: "enum", values: t.of };
  if (t.k === "list") return t.of;
  return T_NUM;
}

export function checkExpr(ast: Ast, scope: Scope, opts: CheckOptions): CheckResult {
  const depth = astDepth(ast);
  if (depth > MAX_DEPTH) throw new CheckError(`expression deeper than ${MAX_DEPTH}`, ast.pos);
  const nodes = astNodes(ast);
  if (nodes > MAX_NODES) throw new CheckError(`expression has more than ${MAX_NODES} nodes`, ast.pos);
  const res: CheckResult = { ty: T_NUM, deps: new Set(), cost: 0, usesRandom: false, usesCatalog: false, usesHistory: false, warnings: [] };

  const expectNum = (t: Ty, what: string, pos: number): void => {
    if (t.k !== "number") throw new CheckError(`${what} must be a number, got ${tyName(t)}${t.k === "time" ? " (use isNull, since or timeAt)" : ""}`, pos);
  };
  const expectBool = (t: Ty, what: string, pos: number): void => {
    if (t.k !== "bool") throw new CheckError(`${what} must be a bool, got ${tyName(t)}`, pos);
  };

  // returns the type and adds this node's cost
  function go(a: Ast, sc: Scope, boundNames: Set<string>): Ty {
    res.cost++;
    switch (a.k) {
      case "num":
        return T_NUM;
      case "bool":
        return T_BOOL;
      case "str":
        return { k: "enum", values: [a.v] };
      case "null":
        return { k: "null" };
      case "list": {
        if (!a.items.length) return { k: "list", of: T_NUM, len: 0 };
        let t = go(a.items[0], sc, boundNames);
        for (let i = 1; i < a.items.length; i++) t = unify(t, go(a.items[i], sc, boundNames), a.items[i].pos);
        return { k: "list", of: t, len: a.items.length };
      }
      case "name": {
        const t = lookup(sc, a.name);
        if (t === undefined) {
          if (opts.where.scoring && (a.name === "ending" || a.name === "outcomeClass" || a.name === "pausedTotal" || a.name === "skips")) {
            return scoringZeroArg(a.name, a.pos);
          }
          throw new CheckError(`unknown name "${a.name}"`, a.pos);
        }
        if (!boundNames.has(a.name)) res.deps.add(a.name);
        if (t.k === "records" && t.catalog) res.usesCatalog = true;
        return t;
      }
      case "field": {
        const ot = go(a.obj, sc, boundNames);
        if (ot.k === "record" || ot.k === "map") {
          const ft = ot.fields[a.name];
          if (!ft) throw new CheckError(`"${a.name}" is not a field of this ${ot.k} (fields: ${Object.keys(ot.fields).join(", ")})`, a.pos);
          return ft;
        }
        throw new CheckError(`cannot read field "${a.name}" of ${tyName(ot)}`, a.pos);
      }
      case "index": {
        const ot = go(a.obj, sc, boundNames);
        const it = go(a.idx, sc, boundNames);
        if (ot.k === "list") {
          expectNum(it, "list index", a.idx.pos);
          return ot.of;
        }
        if (ot.k === "map") {
          if (!isStringish(it)) throw new CheckError(`map key must be a string, got ${tyName(it)}`, a.idx.pos);
          const keys = Object.keys(ot.fields);
          if (it.k === "enum") {
            const missing = it.values.filter((v) => keys.indexOf(v) < 0);
            if (a.idx.k === "str" && missing.length) throw new CheckError(`key "${a.idx.v}" is not in the map (keys: ${keys.join(", ")})`, a.idx.pos);
            if (missing.length) res.warnings.push(`map lookup may miss keys ${missing.join(", ")} (zero value at run time)`);
            if (!missing.length && it.values.length === 1) return ot.fields[it.values[0]];
            const present = it.values.filter((v) => keys.indexOf(v) >= 0);
            if (present.length) {
              let t = ot.fields[present[0]];
              for (const v of present) t = unify(t, ot.fields[v], a.pos);
              return t;
            }
          } else res.warnings.push("map lookup with a non-literal key yields the field type's zero value when the key is missing");
          let t = ot.fields[keys[0]];
          for (const kk of keys) t = unify(t, ot.fields[kk], a.pos);
          return t;
        }
        if (ot.k === "records" && ot.catalog && isStringish(it)) return { k: "record", fields: { ...ot.fields, _id: T_NUM } };
        if (ot.k === "records") {
          // records[i]: the i-th record in order, clamped like a list (an empty list yields an empty record)
          expectNum(it, ot.catalog ? "catalogue index (an entry id or a position)" : "records index", a.idx.pos);
          return { k: "record", fields: { ...ot.fields, _id: T_NUM } };
        }
        throw new CheckError(`cannot index ${tyName(ot)}`, a.pos);
      }
      case "unary": {
        const t = go(a.e, sc, boundNames);
        if (a.op === "-") {
          expectNum(t, "negation", a.pos);
          return T_NUM;
        }
        expectBool(t, "not", a.pos);
        return T_BOOL;
      }
      case "binary": {
        if (a.op === "and" || a.op === "or") {
          expectBool(go(a.l, sc, boundNames), `left side of ${a.op}`, a.l.pos);
          expectBool(go(a.r, sc, boundNames), `right side of ${a.op}`, a.r.pos);
          return T_BOOL;
        }
        if (a.op === "in") {
          const lt = go(a.l, sc, boundNames);
          const rt = go(a.r, sc, boundNames);
          if (rt.k === "set") {
            if (!isStringish(lt)) throw new CheckError(`"in" needs a string on the left for a set, got ${tyName(lt)}`, a.pos);
            if (lt.k === "enum" && lt.values.length === 1 && rt.of.indexOf(lt.values[0]) < 0) throw new CheckError(`"${lt.values[0]}" can never be in this set (${rt.of.join(", ")})`, a.l.pos);
            return T_BOOL;
          }
          if (rt.k === "list") {
            if (rt.len !== 0 && !sameKind(lt, rt.of)) throw new CheckError(`"in": ${tyName(lt)} cannot be in a ${tyName(rt)}`, a.pos);
            return T_BOOL;
          }
          throw new CheckError(`"in" needs a set or list on the right, got ${tyName(rt)}`, a.r.pos);
        }
        const lt = go(a.l, sc, boundNames);
        const rt = go(a.r, sc, boundNames);
        if (a.op === "+" || a.op === "-" || a.op === "*" || a.op === "/") {
          expectNum(lt, `left side of ${a.op}`, a.l.pos);
          expectNum(rt, `right side of ${a.op}`, a.r.pos);
          return T_NUM;
        }
        if (a.op === "<" || a.op === "<=" || a.op === ">" || a.op === ">=") {
          expectNum(lt, `left side of ${a.op}`, a.l.pos);
          expectNum(rt, `right side of ${a.op}`, a.r.pos);
          return T_BOOL;
        }
        // == and !=
        if (!sameKind(lt, rt)) throw new CheckError(`cannot compare ${tyName(lt)} with ${tyName(rt)}`, a.pos);
        if (lt.k === "enum" && rt.k === "enum") {
          const overlap = lt.values.some((v) => rt.values.indexOf(v) >= 0);
          if (!overlap) throw new CheckError(`${tyName(lt)} can never equal ${tyName(rt)}`, a.pos);
        }
        if (lt.k === "list" || lt.k === "records" || lt.k === "record" || lt.k === "map" || lt.k === "set" || lt.k === "history") {
          throw new CheckError(`cannot compare ${tyName(lt)} values with ${a.op}`, a.pos);
        }
        return T_BOOL;
      }
      case "cond": {
        expectBool(go(a.c, sc, boundNames), "condition", a.c.pos);
        const at = go(a.a, sc, boundNames);
        const bt = go(a.b, sc, boundNames);
        return unify(at, bt, a.pos);
      }
      case "call":
        return call(a, sc, boundNames);
    }
  }

  function scoringZeroArg(name: string, pos: number): Ty {
    if (!opts.where.scoring) throw new CheckError(`${name} is a scoring-only function`, pos);
    switch (name) {
      case "ending":
        return { k: "enum", values: opts.endingIds ?? [] };
      case "outcomeClass":
        return { k: "enum", values: ["target", "recovered", "harm", "none"] };
      default:
        return T_NUM;
    }
  }

  function arity(a: { fn: string; args: Ast[]; pos: number }, min: number, max: number): void {
    if (a.args.length < min || a.args.length > max) {
      throw new CheckError(`${a.fn} takes ${min === max ? min : `${min}-${max}`} argument${max === 1 ? "" : "s"}, got ${a.args.length}`, a.pos);
    }
  }

  function literalString(arg: Ast, what: string): string {
    if (arg.k !== "str") throw new CheckError(`${what} must be a string literal`, arg.pos);
    return arg.v;
  }

  function bareName(arg: Ast, what: string): string {
    if (arg.k !== "name") throw new CheckError(`${what} must be a bare name`, arg.pos);
    return arg.name;
  }

  function call(a: { fn: string; args: Ast[]; pos: number }, sc: Scope, bound: Set<string>): Ty {
    const fn = a.fn;
    const num1 = (): Ty => {
      arity(a, 1, 1);
      expectNum(go(a.args[0], sc, bound), `${fn}'s argument`, a.args[0].pos);
      return T_NUM;
    };
    switch (fn) {
      case "min":
      case "max": {
        arity(a, 2, 8);
        for (const x of a.args) expectNum(go(x, sc, bound), `${fn}'s arguments`, x.pos);
        return T_NUM;
      }
      case "clamp":
      case "lerp": {
        arity(a, 3, 3);
        for (const x of a.args) expectNum(go(x, sc, bound), `${fn}'s arguments`, x.pos);
        return T_NUM;
      }
      case "abs":
      case "floor":
      case "ceil":
      case "round":
      case "exp":
      case "sqrt":
      case "sin":
      case "cos":
        return num1();
      case "ln": {
        const t = num1();
        if (a.args[0].k !== "num") res.warnings.push("ln of a value the linter cannot prove positive yields 0 when it is not");
        return t;
      }
      case "pow": {
        arity(a, 2, 2);
        expectNum(go(a.args[0], sc, bound), "pow's base", a.args[0].pos);
        expectNum(go(a.args[1], sc, bound), "pow's exponent", a.args[1].pos);
        if (a.args[0].k === "num" && a.args[0].v <= 0 && !(a.args[1].k === "num" && a.args[1].v === Math.trunc(a.args[1].v))) {
          res.warnings.push("pow of a non-positive base with a non-integer exponent is 0");
        }
        return T_NUM;
      }
      case "num": {
        arity(a, 1, 1);
        const t = go(a.args[0], sc, bound);
        if (t.k === "enum") {
          const bad = t.values.filter((v) => !(v.trim().length > 0 && Number(v) === Number(v)));
          if (bad.length) throw new CheckError(`num: value${bad.length > 1 ? "s" : ""} ${bad.map((v) => `"${v}"`).join(", ")} ${bad.length > 1 ? "are" : "is"} not numeric`, a.args[0].pos);
          return T_NUM;
        }
        if (t.k === "string") return T_NUM; // run-time parse of a typed string; 0 when not numeric
        throw new CheckError(`num needs an enum or string, got ${tyName(t)}`, a.args[0].pos);
      }
      case "isNull": {
        arity(a, 1, 1);
        const t = go(a.args[0], sc, bound);
        if (t.k !== "time" && t.k !== "null") throw new CheckError(`isNull needs a time, got ${tyName(t)}`, a.args[0].pos);
        return T_BOOL;
      }
      case "since":
      case "timeAt": {
        arity(a, 1, 1);
        const t = go(a.args[0], sc, bound);
        if (t.k !== "time" && t.k !== "null") throw new CheckError(`${fn} needs a time, got ${tyName(t)}`, a.args[0].pos);
        return T_NUM;
      }
      case "seq": {
        arity(a, 2, 2);
        const lt = go(a.args[0], sc, bound);
        if (lt.k !== "list") throw new CheckError(`seq needs a list, got ${tyName(lt)}`, a.args[0].pos);
        expectNum(go(a.args[1], sc, bound), "seq's index", a.args[1].pos);
        return lt.of;
      }
      case "past":
      case "delta":
      case "trend": {
        if (!opts.where.history) throw new CheckError(`${fn} may not be used inside a history's own expression`, a.pos);
        arity(a, fn === "trend" ? 3 : 2, fn === "trend" ? 3 : 2);
        const ht = go(a.args[0], sc, bound);
        if (ht.k !== "history") throw new CheckError(`${fn} needs a history name, got ${tyName(ht)}`, a.args[0].pos);
        expectNum(go(a.args[1], sc, bound), `${fn}'s seconds`, a.args[1].pos);
        if (fn === "trend") {
          const th = a.args[2];
          const ok = (th.k === "num" && th.v > 0) || (th.k === "name" && (opts.paramNames ?? []).indexOf(th.name) >= 0);
          if (!ok) throw new CheckError("trend's threshold must be a positive literal or a param", th.pos);
          expectNum(go(th, sc, bound), "trend's threshold", th.pos);
        }
        res.usesHistory = true;
        return T_NUM;
      }
      case "len": {
        arity(a, 1, 1);
        const t = go(a.args[0], sc, bound);
        if (!isStringish(t) && t.k !== "list" && t.k !== "set" && t.k !== "records") throw new CheckError(`len needs a string, list, set or records, got ${tyName(t)}`, a.args[0].pos);
        return T_NUM;
      }
      case "lower": {
        arity(a, 1, 1);
        if (!isStringish(go(a.args[0], sc, bound))) throw new CheckError("lower needs a string", a.args[0].pos);
        return T_STR;
      }
      case "startsWith":
      case "endsWith":
      case "contains": {
        arity(a, 2, 2);
        if (!isStringish(go(a.args[0], sc, bound)) || !isStringish(go(a.args[1], sc, bound))) throw new CheckError(`${fn} needs two strings`, a.pos);
        return T_BOOL;
      }
      case "matchQuery": {
        arity(a, 3, 3);
        const rt = go(a.args[0], sc, bound);
        if (rt.k !== "record") throw new CheckError("matchQuery needs a record first", a.args[0].pos);
        if (!isStringish(go(a.args[1], sc, bound))) throw new CheckError("matchQuery's query must be a string", a.args[1].pos);
        const fl = a.args[2];
        if (fl.k !== "list" || fl.items.some((x) => x.k !== "str")) throw new CheckError("matchQuery's fields must be a list of string literals", fl.pos);
        for (const x of fl.items) if (x.k === "str" && !rt.fields[x.v]) throw new CheckError(`matchQuery: "${x.v}" is not a field of the record`, x.pos);
        res.cost += fl.items.length * 4;
        return T_BOOL;
      }
      case "ipInCidr":
      case "cidrContains": {
        arity(a, 2, 2);
        if (!isStringish(go(a.args[0], sc, bound)) || !isStringish(go(a.args[1], sc, bound))) throw new CheckError(`${fn} needs two strings`, a.pos);
        return T_BOOL;
      }
      case "sameSubnet": {
        arity(a, 3, 3);
        if (!isStringish(go(a.args[0], sc, bound)) || !isStringish(go(a.args[1], sc, bound))) throw new CheckError("sameSubnet needs two IP strings", a.pos);
        expectNum(go(a.args[2], sc, bound), "sameSubnet's prefix", a.args[2].pos);
        return T_BOOL;
      }
      case "ipToInt":
      case "cidrPrefix": {
        arity(a, 1, 1);
        if (!isStringish(go(a.args[0], sc, bound))) throw new CheckError(`${fn} needs a string`, a.args[0].pos);
        return T_NUM;
      }
      case "cidrNetwork": {
        arity(a, 1, 1);
        if (!isStringish(go(a.args[0], sc, bound))) throw new CheckError("cidrNetwork needs a string", a.args[0].pos);
        return T_STR;
      }
      case "pick":
      case "chance": {
        if (!opts.where.effects) throw new CheckError(`${fn} is allowed only in effect expressions (never in processes, derived values, conditions or scoring)`, a.pos);
        arity(a, 2, 2);
        const stream = bareName(a.args[0], `${fn}'s stream`);
        if ((opts.streams ?? []).indexOf(stream) < 0) throw new CheckError(`stream "${stream}" is not declared in random.streams`, a.args[0].pos);
        res.cost++;
        res.usesRandom = true;
        if (fn === "chance") {
          expectNum(go(a.args[1], sc, bound), "chance's probability", a.args[1].pos);
          return T_BOOL;
        }
        const lt = go(a.args[1], sc, bound);
        if (lt.k !== "list") throw new CheckError(`pick needs a list, got ${tyName(lt)}`, a.args[1].pos);
        return lt.of;
      }
      // scoring-only
      case "firstAct":
      case "countAct":
      case "actedBefore":
      case "everTrue":
      case "ending":
      case "outcomeClass":
      case "pausedTotal":
      case "skips":
      case "chose": {
        if (!opts.where.scoring) throw new CheckError(`${fn} is a scoring-only function`, a.pos);
        if (fn === "ending" || fn === "outcomeClass" || fn === "pausedTotal" || fn === "skips") {
          arity(a, 0, 0);
          return scoringZeroArg(fn, a.pos);
        }
        if (fn === "everTrue") {
          arity(a, 1, 1);
          const id = literalString(a.args[0], "everTrue's trigger id");
          if ((opts.triggerIds ?? []).indexOf(id) < 0) throw new CheckError(`unknown trigger "${id}"`, a.args[0].pos);
          return T_BOOL;
        }
        if (fn === "chose") {
          arity(a, 2, 2);
          const pid = literalString(a.args[0], "chose's prompt id");
          const cid = literalString(a.args[1], "chose's choice id");
          const choices = (opts.promptChoices ?? {})[pid];
          if (!choices) throw new CheckError(`unknown prompt "${pid}"`, a.args[0].pos);
          if (choices.indexOf(cid) < 0) throw new CheckError(`prompt "${pid}" has no choice "${cid}"`, a.args[1].pos);
          return T_BOOL;
        }
        const id = literalString(a.args[0], `${fn}'s action id`);
        if ((opts.actionIds ?? []).indexOf(id) < 0) throw new CheckError(`unknown action "${id}"`, a.args[0].pos);
        if (fn === "countAct") {
          arity(a, 1, 1);
          return T_NUM;
        }
        if (fn === "actedBefore") {
          arity(a, 2, 2);
          expectNum(go(a.args[1], sc, bound), "actedBefore's seconds", a.args[1].pos);
          return T_BOOL;
        }
        arity(a, 1, 2);
        if (a.args.length === 2) {
          const extra = opts.actionParamScope ? (opts.actionParamScope(id) ?? {}) : {};
          const inner = scopeWith(sc, { ...extra, t: T_NUM });
          const nb = new Set(bound);
          for (const k of Object.keys(extra)) nb.add(k);
          nb.add("t");
          expectBool(go(a.args[1], inner, nb), "firstAct's condition", a.args[1].pos);
          res.cost += 200;
        }
        return T_TIME;
      }
      default:
        if (COLLECTION_FNS.has(fn)) return collection(a, sc, bound);
        throw new CheckError(`unknown function "${fn}"`, a.pos);
    }
  }

  function collection(a: { fn: string; args: Ast[]; pos: number }, sc: Scope, bound: Set<string>): Ty {
    const fn = a.fn;
    if (!a.args.length) throw new CheckError(`${fn} needs a collection`, a.pos);
    const ct = go(a.args[0], sc, bound);
    if (ct.k !== "records" && ct.k !== "set" && ct.k !== "list") throw new CheckError(`${fn} needs records, a set or a list, got ${tyName(ct)}`, a.args[0].pos);
    if (ct.k === "records" && ct.catalog && !opts.where.commandTime) {
      throw new CheckError(`${fn} over a catalogue is allowed only in action, prompt and timer effects (and scoring), never per tick`, a.pos);
    }
    const n = collMax(ct);
    const inner = elemScope(ct, sc);
    const innerBound = new Set(bound);
    if (ct.k === "records") {
      for (const k of Object.keys(ct.fields)) innerBound.add(k);
      innerBound.add("_id");
    } else innerBound.add("item");
    const predCost = (arg: Ast, what: "bool" | "number" | "any"): Ty => {
      const before = res.cost;
      const t = go(arg, inner, innerBound);
      const c = res.cost - before;
      res.cost += c * (n - 1); // the body runs once per item
      if (what === "bool") expectBool(t, `${fn}'s predicate`, arg.pos);
      if (what === "number") expectNum(t, `${fn}'s expression`, arg.pos);
      return t;
    };
    switch (fn) {
      case "count":
        arity(a, 1, 2);
        if (a.args.length === 2) predCost(a.args[1], "bool");
        else res.cost += n;
        return T_NUM;
      case "any":
      case "all":
        arity(a, 2, 2);
        predCost(a.args[1], "bool");
        return T_BOOL;
      case "sum":
      case "product":
      case "minOf":
      case "maxOf":
        arity(a, 2, 2);
        predCost(a.args[1], "number");
        return T_NUM;
      case "distinct": {
        arity(a, 2, 2);
        const t = predCost(a.args[1], "any");
        res.cost += n * 2;
        return { k: "list", of: t.k === "enum" ? T_STR : t, len: n };
      }
      case "find":
        arity(a, 2, 2);
        predCost(a.args[1], "bool");
        if (ct.k !== "records") throw new CheckError("find needs records", a.args[0].pos);
        return elemTy(ct);
      case "where":
        arity(a, 2, 2);
        predCost(a.args[1], "bool");
        if (ct.k !== "records") throw new CheckError("where needs records", a.args[0].pos);
        return ct.catalog ? { ...ct, catalog: false } : ct;
      case "sortBy": {
        arity(a, 3, 3);
        if (ct.k !== "records") throw new CheckError("sortBy needs records", a.args[0].pos);
        const f = bareName(a.args[1], "sortBy's field");
        if (f !== "_id" && !ct.fields[f]) throw new CheckError(`sortBy: "${f}" is not a field`, a.args[1].pos);
        const dir = literalString(a.args[2], "sortBy's direction");
        if (dir !== "asc" && dir !== "desc") throw new CheckError('sortBy direction must be "asc" or "desc"', a.args[2].pos);
        res.cost += n * 8;
        return ct.catalog ? { ...ct, catalog: false } : ct;
      }
      case "take": {
        arity(a, 2, 2);
        if (ct.k !== "records") throw new CheckError("take needs records", a.args[0].pos);
        expectNum(go(a.args[1], sc, bound), "take's count", a.args[1].pos);
        res.cost += n;
        return ct.catalog ? { ...ct, catalog: false } : ct;
      }
      case "groupCount": {
        arity(a, 2, 2);
        if (ct.k !== "records") throw new CheckError("groupCount needs records", a.args[0].pos);
        const f = bareName(a.args[1], "groupCount's field");
        const ft = ct.fields[f];
        if (!ft) throw new CheckError(`groupCount: "${f}" is not a field`, a.args[1].pos);
        res.cost += n * 8;
        return { k: "records", fields: { key: ft.k === "enum" ? T_STR : ft, n: T_NUM }, max: n };
      }
      case "longestPrefixMatch": {
        arity(a, 3, 3);
        if (ct.k !== "records") throw new CheckError("longestPrefixMatch needs records or a catalogue", a.args[0].pos);
        if (!isStringish(go(a.args[1], sc, bound))) throw new CheckError("longestPrefixMatch's ip must be a string", a.args[1].pos);
        const f = bareName(a.args[2], "longestPrefixMatch's field");
        if (!ct.fields[f] || !isStringish(ct.fields[f])) throw new CheckError(`longestPrefixMatch: "${f}" is not a string field`, a.args[2].pos);
        res.cost += n * 6;
        return elemTy(ct);
      }
    }
    throw new CheckError(`unknown function "${fn}"`, a.pos);
  }

  res.ty = go(ast, scope, new Set());
  return res;
}
