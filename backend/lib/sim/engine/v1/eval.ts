// REQ-162 (docs/sims.md 4.3, 5.5): the tree-walking interpreter. It only
// ever sees engine values, counts every node it evaluates against a budget,
// and coerces a missing field (an empty record from `find`) to the zero
// value of the use site, so no expression can throw at run time.

import type { Ast } from "./parser.ts";
import type { RecordValue, Value } from "./types.ts";
import { clamp, dcos, dexp, div, dln, dpow, dsin, dsqrt, lerp, sat } from "./math.ts";
import { cidrContains, cidrNetwork, cidrPrefix, ipInCidr, ipToInt, matchQuery, parseCidr, parseIpv4, networkOf, sameSubnet } from "./text.ts";

export class EngineError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface Frame {
  vars: Record<string, Value>;
  parent: Frame | null;
}

export interface ScoringHooks {
  firstAct(action: string, cond: ((frame: Frame) => boolean) | null): number | null;
  countAct(action: string): number;
  actedBefore(action: string, seconds: number): boolean;
  everTrue(trigger: string): boolean;
  ending(): string;
  outcomeClass(): string;
  pausedTotal(): number;
  skips(): number;
  focusedAt(): number; // REQ-209: sim seconds a focused start began at, 0 for a full case
  chose(prompt: string, choice: string): boolean;
}

export interface EvalCtx {
  evals: number;
  budget: number;
  t: number;
  root(name: string): Value | undefined; // params, state, derived, thresholds, built-ins
  historyPast(name: string, seconds: number): number;
  historyNewest(name: string): number;
  draw(stream: string): number; // next u in [0, 1) from that stream
  scoring: ScoringHooks | null;
}

export function frameWith(parent: Frame | null, vars: Record<string, Value>): Frame {
  return { vars, parent };
}

function lookupFrame(f: Frame | null, name: string): Value | undefined {
  for (let x = f; x; x = x.parent) {
    if (Object.prototype.hasOwnProperty.call(x.vars, name)) return x.vars[name];
  }
  return undefined;
}

export function asNum(v: Value | undefined): number {
  return typeof v === "number" ? v : 0;
}
export function asBool(v: Value | undefined): boolean {
  return v === true;
}
export function asStr(v: Value | undefined): string {
  return typeof v === "string" ? v : "";
}
function asList(v: Value | undefined): Value[] {
  return Array.isArray(v) ? v : [];
}
function asRecords(v: Value | undefined): RecordValue[] {
  return Array.isArray(v) ? (v as RecordValue[]) : [];
}
function asRecord(v: Value | undefined): RecordValue {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as RecordValue) : { _id: 0 };
}

export const EMPTY_RECORD: RecordValue = { _id: 0 };
// an empty list indexed yields 0 for scalars; its fields read as zero either way
const EMPTY_RECORD_OR_ZERO: Value = 0;

export function valuesEqual(a: Value | undefined, b: Value | undefined): boolean {
  if (a === undefined) a = null;
  if (b === undefined) b = null;
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return a === b;
  return false;
}

export function zeroOf(sample: Value | undefined): Value {
  if (typeof sample === "number") return 0;
  if (typeof sample === "boolean") return false;
  if (typeof sample === "string") return "";
  if (Array.isArray(sample)) return [];
  return 0;
}

// A missing map key yields the zero value of the map's values (4.3).
function mapGet(obj: Value | undefined, key: string): Value {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return 0;
  const o = obj as Record<string, Value>;
  if (Object.prototype.hasOwnProperty.call(o, key)) return o[key];
  const keys = Object.keys(o);
  return keys.length ? zeroOf(o[keys[0]]) : 0;
}

function catalogGet(entries: RecordValue[], key: string): RecordValue {
  for (const e of entries) if (e.id === key) return e;
  return EMPTY_RECORD;
}

function listIndex(list: Value[], i: number): Value {
  if (!list.length) return 0;
  let k = Math.floor(i);
  if (k < 0) k = 0;
  if (k >= list.length) k = list.length - 1;
  return list[k];
}

function compareValues(a: Value | undefined, b: Value | undefined): number {
  if (typeof a === "number" && typeof b === "number") return a < b ? -1 : a > b ? 1 : 0;
  const sa = asStr(a);
  const sb = asStr(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

export function evaluate(ast: Ast, frame: Frame | null, ctx: EvalCtx): Value {
  if (++ctx.evals > ctx.budget) throw new EngineError("budget", `evaluation budget of ${ctx.budget} exceeded`);
  switch (ast.k) {
    case "num":
      return ast.v;
    case "bool":
      return ast.v;
    case "str":
      return ast.v;
    case "null":
      return null;
    case "list": {
      const out: Value[] = [];
      for (const it of ast.items) out.push(evaluate(it, frame, ctx));
      return out;
    }
    case "name": {
      const v = lookupFrame(frame, ast.name);
      if (v !== undefined) return v;
      const r = ctx.root(ast.name);
      if (r !== undefined) return r;
      if (ctx.scoring) {
        switch (ast.name) {
          case "ending":
            return ctx.scoring.ending();
          case "outcomeClass":
            return ctx.scoring.outcomeClass();
          case "pausedTotal":
            return ctx.scoring.pausedTotal();
          case "skips":
            return ctx.scoring.skips();
          case "focusedAt":
            return ctx.scoring.focusedAt();
        }
      }
      throw new EngineError("unknown_name", `unknown name "${ast.name}"`);
    }
    case "field": {
      const o = evaluate(ast.obj, frame, ctx);
      if (!o || typeof o !== "object" || Array.isArray(o)) return 0;
      const v = (o as Record<string, Value>)[ast.name];
      return v === undefined ? 0 : v;
    }
    case "index": {
      const o = evaluate(ast.obj, frame, ctx);
      const i = evaluate(ast.idx, frame, ctx);
      if (Array.isArray(o)) {
        if (typeof i === "string") return catalogGet(o as RecordValue[], i);
        if (!o.length) return EMPTY_RECORD_OR_ZERO;
        return listIndex(o, asNum(i));
      }
      return mapGet(o, asStr(i));
    }
    case "unary": {
      const v = evaluate(ast.e, frame, ctx);
      return ast.op === "-" ? sat(-asNum(v)) : !asBool(v);
    }
    case "binary": {
      switch (ast.op) {
        case "and":
          return asBool(evaluate(ast.l, frame, ctx)) ? asBool(evaluate(ast.r, frame, ctx)) : false;
        case "or":
          return asBool(evaluate(ast.l, frame, ctx)) ? true : asBool(evaluate(ast.r, frame, ctx));
      }
      const l = evaluate(ast.l, frame, ctx);
      const r = evaluate(ast.r, frame, ctx);
      switch (ast.op) {
        case "+":
          return sat(asNum(l) + asNum(r));
        case "-":
          return sat(asNum(l) - asNum(r));
        case "*":
          return sat(asNum(l) * asNum(r));
        case "/":
          return div(asNum(l), asNum(r));
        case "<":
          return asNum(l) < asNum(r);
        case "<=":
          return asNum(l) <= asNum(r);
        case ">":
          return asNum(l) > asNum(r);
        case ">=":
          return asNum(l) >= asNum(r);
        case "==":
          return valuesEqual(l, r);
        case "!=":
          return !valuesEqual(l, r);
        case "in": {
          if (!Array.isArray(r)) return false;
          for (const x of r) if (valuesEqual(x, l)) return true;
          return false;
        }
      }
      return 0;
    }
    case "cond":
      return asBool(evaluate(ast.c, frame, ctx)) ? evaluate(ast.a, frame, ctx) : evaluate(ast.b, frame, ctx);
    case "call":
      return call(ast, frame, ctx);
  }
}

function call(ast: { fn: string; args: Ast[] }, frame: Frame | null, ctx: EvalCtx): Value {
  const A = ast.args;
  const num = (i: number): number => asNum(evaluate(A[i], frame, ctx));
  const str = (i: number): string => asStr(evaluate(A[i], frame, ctx));
  switch (ast.fn) {
    case "min": {
      let m = num(0);
      for (let i = 1; i < A.length; i++) {
        const v = num(i);
        if (v < m) m = v;
      }
      return m;
    }
    case "max": {
      let m = num(0);
      for (let i = 1; i < A.length; i++) {
        const v = num(i);
        if (v > m) m = v;
      }
      return m;
    }
    case "clamp":
      return clamp(num(0), num(1), num(2));
    case "lerp":
      return lerp(num(0), num(1), num(2));
    case "abs":
      return Math.abs(num(0));
    case "floor":
      return sat(Math.floor(num(0)));
    case "ceil":
      return sat(Math.ceil(num(0)));
    case "round":
      return sat(Math.round(num(0)));
    case "exp":
      return dexp(num(0));
    case "ln":
      return dln(num(0));
    case "sqrt":
      return dsqrt(num(0));
    case "sin":
      return dsin(num(0));
    case "cos":
      return dcos(num(0));
    case "pow":
      return dpow(num(0), num(1));
    case "num": {
      const s = str(0).trim();
      if (!s.length) return 0;
      const v = Number(s);
      return v === v ? sat(v) : 0;
    }
    case "isNull":
      return evaluate(A[0], frame, ctx) === null;
    case "since": {
      const v = evaluate(A[0], frame, ctx);
      return typeof v === "number" ? sat(ctx.t - v) : 0;
    }
    case "timeAt": {
      const v = evaluate(A[0], frame, ctx);
      return typeof v === "number" ? v : -1;
    }
    case "seq":
      return listIndex(asList(evaluate(A[0], frame, ctx)), num(1));
    case "past": {
      const h = A[0].k === "name" ? A[0].name : "";
      return ctx.historyPast(h, num(1));
    }
    case "delta": {
      const h = A[0].k === "name" ? A[0].name : "";
      return sat(ctx.historyNewest(h) - ctx.historyPast(h, num(1)));
    }
    case "trend": {
      const h = A[0].k === "name" ? A[0].name : "";
      const d = sat(ctx.historyNewest(h) - ctx.historyPast(h, num(1)));
      const th = num(2);
      return d >= th ? 1 : d <= -th ? -1 : 0;
    }
    case "len": {
      const v = evaluate(A[0], frame, ctx);
      if (typeof v === "string") return v.length;
      if (Array.isArray(v)) return v.length;
      return 0;
    }
    case "lower":
      return str(0).toLowerCase();
    case "startsWith":
      return str(0).startsWith(str(1));
    case "endsWith":
      return str(0).endsWith(str(1));
    case "contains":
      return str(0).indexOf(str(1)) >= 0;
    case "matchQuery": {
      const rec = asRecord(evaluate(A[0], frame, ctx));
      const q = str(1);
      const fields = asList(evaluate(A[2], frame, ctx)).map((x) => asStr(x));
      ctx.evals += fields.length;
      return matchQuery(rec, q, fields);
    }
    case "ipInCidr":
      return ipInCidr(str(0), str(1));
    case "cidrContains":
      return cidrContains(str(0), str(1));
    case "sameSubnet":
      return sameSubnet(str(0), str(1), num(2));
    case "ipToInt":
      return ipToInt(str(0));
    case "cidrPrefix":
      return cidrPrefix(str(0));
    case "cidrNetwork":
      return cidrNetwork(str(0));
    case "pick": {
      const stream = A[0].k === "name" ? A[0].name : "";
      const list = asList(evaluate(A[1], frame, ctx));
      const u = ctx.draw(stream); // exactly one draw, even for an empty list
      if (!list.length) return 0;
      return list[Math.floor(u * list.length)];
    }
    case "chance": {
      const stream = A[0].k === "name" ? A[0].name : "";
      const p = num(1);
      const u = ctx.draw(stream);
      return u < clamp(p, 0, 1);
    }
    case "count":
    case "any":
    case "all":
    case "sum":
    case "product":
    case "minOf":
    case "maxOf":
    case "distinct":
    case "find":
    case "where":
    case "sortBy":
    case "take":
    case "groupCount":
    case "longestPrefixMatch":
      return collection(ast, frame, ctx);
    // scoring-only
    case "firstAct": {
      if (!ctx.scoring) throw new EngineError("scoring_only", `${ast.fn} outside scoring`);
      const id = A[0].k === "str" ? A[0].v : "";
      const condAst = A.length > 1 ? A[1] : null;
      const cond = condAst ? (f: Frame): boolean => asBool(evaluate(condAst, f, ctx)) : null;
      return ctx.scoring.firstAct(id, cond);
    }
    case "countAct":
      if (!ctx.scoring) throw new EngineError("scoring_only", `${ast.fn} outside scoring`);
      return ctx.scoring.countAct(A[0].k === "str" ? A[0].v : "");
    case "actedBefore":
      if (!ctx.scoring) throw new EngineError("scoring_only", `${ast.fn} outside scoring`);
      return ctx.scoring.actedBefore(A[0].k === "str" ? A[0].v : "", num(1));
    case "everTrue":
      if (!ctx.scoring) throw new EngineError("scoring_only", `${ast.fn} outside scoring`);
      return ctx.scoring.everTrue(A[0].k === "str" ? A[0].v : "");
    case "chose":
      if (!ctx.scoring) throw new EngineError("scoring_only", `${ast.fn} outside scoring`);
      return ctx.scoring.chose(A[0].k === "str" ? A[0].v : "", A[1].k === "str" ? A[1].v : "");
    case "ending":
      if (!ctx.scoring) throw new EngineError("scoring_only", `${ast.fn} outside scoring`);
      return ctx.scoring.ending();
    case "outcomeClass":
      if (!ctx.scoring) throw new EngineError("scoring_only", `${ast.fn} outside scoring`);
      return ctx.scoring.outcomeClass();
    case "pausedTotal":
      if (!ctx.scoring) throw new EngineError("scoring_only", `${ast.fn} outside scoring`);
      return ctx.scoring.pausedTotal();
    case "skips":
      if (!ctx.scoring) throw new EngineError("scoring_only", `${ast.fn} outside scoring`);
      return ctx.scoring.skips();
  }
  throw new EngineError("unknown_function", `unknown function "${ast.fn}"`);
}

// Items of a collection with the frame each predicate runs in: records bind
// their fields as bare names, sets and lists bind `item`.
function items(v: Value | undefined, frame: Frame | null): { item: Value; frame: Frame }[] {
  const out: { item: Value; frame: Frame }[] = [];
  for (const x of asList(v)) {
    if (x && typeof x === "object" && !Array.isArray(x)) out.push({ item: x, frame: frameWith(frame, x as Record<string, Value>) });
    else out.push({ item: x, frame: frameWith(frame, { item: x }) });
  }
  return out;
}

function collection(ast: { fn: string; args: Ast[] }, frame: Frame | null, ctx: EvalCtx): Value {
  const A = ast.args;
  const coll = evaluate(A[0], frame, ctx);
  const its = items(coll, frame);
  const pred = (i: { frame: Frame }): boolean => asBool(evaluate(A[1], i.frame, ctx));
  const numOf = (i: { frame: Frame }): number => asNum(evaluate(A[1], i.frame, ctx));
  switch (ast.fn) {
    case "count": {
      if (A.length < 2) return its.length;
      let n = 0;
      for (const i of its) if (pred(i)) n++;
      return n;
    }
    case "any": {
      for (const i of its) if (pred(i)) return true;
      return false;
    }
    case "all": {
      for (const i of its) if (!pred(i)) return false;
      return true;
    }
    case "sum": {
      let s = 0;
      for (const i of its) s = sat(s + numOf(i));
      return s;
    }
    case "product": {
      let s = 1;
      for (const i of its) s = sat(s * numOf(i));
      return s;
    }
    case "minOf": {
      if (!its.length) return 0;
      let m = numOf(its[0]);
      for (let k = 1; k < its.length; k++) {
        const v = numOf(its[k]);
        if (v < m) m = v;
      }
      return m;
    }
    case "maxOf": {
      if (!its.length) return 0;
      let m = numOf(its[0]);
      for (let k = 1; k < its.length; k++) {
        const v = numOf(its[k]);
        if (v > m) m = v;
      }
      return m;
    }
    case "distinct": {
      const out: Value[] = [];
      for (const i of its) {
        const v = evaluate(A[1], i.frame, ctx);
        let seen = false;
        for (const x of out) if (valuesEqual(x, v)) seen = true;
        if (!seen) out.push(v);
      }
      return out;
    }
    case "find": {
      for (const i of its) if (pred(i)) return i.item;
      return EMPTY_RECORD;
    }
    case "where": {
      const out: Value[] = [];
      for (const i of its) if (pred(i)) out.push(i.item);
      return out;
    }
    case "sortBy": {
      const field = A[1].k === "name" ? A[1].name : "";
      const desc = A[2].k === "str" && A[2].v === "desc";
      const recs = asRecords(coll).slice();
      // stable: ties keep input (entry or _id) order through the index tie-break
      const indexed = recs.map((r, i) => ({ r, i }));
      indexed.sort((x, y) => {
        const c = compareValues(x.r[field] as Value, y.r[field] as Value);
        if (c !== 0) return desc ? -c : c;
        return x.i - y.i;
      });
      ctx.evals += recs.length;
      return indexed.map((x) => x.r);
    }
    case "take": {
      const n = Math.max(0, Math.floor(asNum(evaluate(A[1], frame, ctx))));
      return asRecords(coll).slice(0, n);
    }
    case "groupCount": {
      const field = A[1].k === "name" ? A[1].name : "";
      const counts: { key: Value; n: number }[] = [];
      for (const r of asRecords(coll)) {
        const key = r[field] as Value;
        let hit: { key: Value; n: number } | null = null;
        for (const c of counts) if (valuesEqual(c.key, key)) hit = c;
        if (hit) hit.n++;
        else counts.push({ key: key === undefined ? "" : key, n: 1 });
      }
      counts.sort((a, b) => (a.n !== b.n ? b.n - a.n : compareValues(a.key, b.key)));
      ctx.evals += counts.length;
      return counts.map((c, i) => ({ _id: i + 1, key: c.key as string | number, n: c.n }));
    }
    case "longestPrefixMatch": {
      const ip = parseIpv4(asStr(evaluate(A[1], frame, ctx)));
      const field = A[2].k === "name" ? A[2].name : "";
      let best: RecordValue = EMPTY_RECORD;
      let bestPrefix = -1;
      if (ip === null) return best;
      for (const r of asRecords(coll)) {
        const c = parseCidr(asStr(r[field] as Value));
        if (!c) continue;
        if (networkOf(ip, c.prefix) === networkOf(c.ip, c.prefix) && c.prefix > bestPrefix) {
          best = r;
          bestPrefix = c.prefix;
        }
      }
      return best;
    }
  }
  return 0;
}
