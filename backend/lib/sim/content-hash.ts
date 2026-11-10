// REQ-162 (docs/sims.md 4.5): the content hash and the client document.
// SHA-256 over canonical JSON of the runtime and learner-facing content,
// excluding every Source's checkedAt and recheckBy so re-checking a source
// never makes a new version or resets review. The client document drops the
// server-only parts (scoring, reasoning parts, debrief text) and those dates.
import { createHash } from "node:crypto";
import type { ScenarioDoc } from "./engine/v1/types.ts";

const DATE_KEYS = new Set(["checkedAt", "recheckBy"]);

function isSource(v: Record<string, unknown>): boolean {
  return typeof v.cite === "string" && typeof v.checkedAt === "string";
}

// Keys sorted, no whitespace, numbers in JSON's shortest round-trip form.
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("non-finite number in a document");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
}

// A deep copy with every Source's check dates removed.
export function stripSourceDates<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => stripSourceDates(v)) as unknown as T;
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const src = isSource(o);
  for (const k of Object.keys(o)) {
    if (src && DATE_KEYS.has(k)) continue;
    out[k] = stripSourceDates(o[k]);
  }
  return out as T;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function contentHash(doc: ScenarioDoc): string {
  return sha256Hex(canonicalJson(stripSourceDates(doc)));
}

// Server-only keys never sent to the app (4.5, 15). Everything else, with
// source dates dropped, is the client document.
export const SERVER_ONLY_TOP_LEVEL = ["scoring"] as const;

export type ClientDoc = Omit<ScenarioDoc, "scoring" | "reasoning"> & {
  reasoning: Record<string, { trigger?: string; question: string; pausesClock: true }>;
};

export function clientDocument(doc: ScenarioDoc): ClientDoc {
  const stripped = stripSourceDates(doc);
  const { scoring: _scoring, reasoning, ...rest } = stripped;
  void _scoring;
  const clientReasoning: ClientDoc["reasoning"] = {};
  for (const k of Object.keys(reasoning)) {
    const m = reasoning[k];
    clientReasoning[k] = { ...(m.trigger ? { trigger: m.trigger } : {}), question: m.question, pausesClock: true };
  }
  return { ...rest, reasoning: clientReasoning };
}

export function clientHash(doc: ScenarioDoc): string {
  return sha256Hex(canonicalJson(clientDocument(doc)));
}

// The earliest re-check date in the document, for the stale-sources report.
export function earliestRecheck(doc: ScenarioDoc, defaultMonths: number): string | null {
  let earliest: string | null = null;
  const visit = (v: unknown): void => {
    if (v === null || typeof v !== "object") return;
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    const o = v as Record<string, unknown>;
    if (isSource(o)) {
      const due = typeof o.recheckBy === "string" ? o.recheckBy : addMonths(o.checkedAt as string, defaultMonths);
      if (earliest === null || due < earliest) earliest = due;
    }
    for (const k of Object.keys(o)) visit(o[k]);
  };
  visit(doc);
  return earliest;
}

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-${pad(d)}`;
}
