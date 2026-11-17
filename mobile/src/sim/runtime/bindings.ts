// REQ-314: the small binding readers the facility console, the sandbox report
// and the client trainer share (the console's view model keeps its own copy).
// Each reads a document expression or template over the run and never throws:
// a binding that cannot be read shows as empty, as on the other screens.
import { renderTemplate, simTimeText } from "../engine/v1/engine.ts";
import type { Run } from "../engine/v1/engine.ts";
import { evaluate } from "../engine/v1/eval.ts";
import { parseCached } from "../engine/v1/parser.ts";

export function value(run: Run, expr: string): unknown {
  try {
    return evaluate(parseCached(expr), null, run.ctx);
  } catch {
    return undefined;
  }
}

export function truthy(run: Run, expr: string | undefined, dflt = false): boolean {
  return expr === undefined ? dflt : value(run, expr) === true;
}

export function text(run: Run, tpl: string): string {
  try {
    return renderTemplate(run, tpl, null);
  } catch {
    return "";
  }
}

export function seconds(run: Run, expr: string): number {
  const v = value(run, expr);
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
}

export function clockAt(run: Run, s: number): string {
  const dt = run.c.dt > 0 ? run.c.dt : 1;
  return simTimeText(run, Math.floor(s / dt));
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], dflt: T): T {
  return typeof v === "string" && (allowed as readonly string[]).indexOf(v) >= 0 ? (v as T) : dflt;
}

// A gauge banded into words (the session's rule, 13.1): one more word than bands.
export function bandWord(v: number, bands: number[], words: string[]): string {
  let i = 0;
  while (i < bands.length && v >= bands[i]) i++;
  return words[i] ?? "";
}

// News lines for a list that grows: one sentence for one new item, a count and
// the newest for a burst, so the polite queue never fills (13.2).
export function burst(fresh: string[], one: string, many: string): string[] {
  if (fresh.length === 1) return [`${one} ${fresh[0]}`];
  if (fresh.length > 1) return [`${fresh.length} ${many} Newest: ${fresh[0]}`];
  return [];
}
