// REQ-187 (audit 2026-11-09 R4/P7): "verify by execution" for academic and
// developer items.
//
// For a question whose key is a computation (a derivative, a big-O count, what
// a snippet prints), the writer may add a small program that recomputes the
// answer and prints it. Running it is a check no second model can give: the
// number either comes out or it doesn't. A mismatch holds the item back like
// a failed fact-check (lib/lesson-generation.ts checkedPractice).
//
// THE SANDBOX IS NOT BUILT YET. Model-written code must never run inside the
// app's own process: node:vm is not a security boundary, and a serverless
// function has the database URL and the API key in its environment. Running
// it safely needs a separate, isolated runner with no network, no secrets, a
// CPU/memory cap and a hard timeout (for example a Vercel Sandbox or a
// container job). Until one exists, the production verifier is
// `unavailableVerifier`: every snippet is reported as not run, nothing is held
// back for it, and the item still goes through the model fact-check. The
// interface, the comparison and the gate are tested now with a fake runner
// (lib/verify-execution.test.ts), so plugging in a runner is one function.

export const VERIFY_LANGUAGES = ["python", "javascript"] as const;
export type VerifyLanguage = (typeof VERIFY_LANGUAGES)[number];

// What the writer emits next to an item. `code` prints ONE line: the
// expected answer, exactly as `expected` states it (e.g. "6", "O(n log n)",
// "[1, 2, 3]"). Python may use the standard library and SymPy; JavaScript is
// plain ECMAScript with no imports.
export interface VerifySnippet {
  language: VerifyLanguage;
  code: string;
  expected: string;
}

export interface RunLimits {
  timeoutMs: number;
  maxOutputBytes: number;
  network: false;
}

export const DEFAULT_RUN_LIMITS: RunLimits = { timeoutMs: 5_000, maxOutputBytes: 4_096, network: false };

export type RunResult =
  | { status: "ok"; stdout: string }
  | { status: "error"; message: string } // the program failed, timed out or printed too much
  | { status: "unavailable" }; // no sandbox to run it in

// A sandboxed runner. Implementations MUST enforce `limits` (no network, the
// timeout, the output cap) outside the process that called them.
export type CodeRunner = (snippet: VerifySnippet, limits: RunLimits) => Promise<RunResult>;

export const unavailableVerifier: CodeRunner = async () => ({ status: "unavailable" });

export const MAX_SNIPPET_CHARS = 4_000;

// Lenient comparison: trims, collapses whitespace, ignores case and a
// trailing period; numbers compare numerically to 1e-9 relative.
export function sameOutput(got: string, expected: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").replace(/\.$/, "").toLowerCase();
  const a = norm(got.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "");
  const b = norm(expected);
  if (a === b) return true;
  const x = Number(a);
  const y = Number(b);
  if (a !== "" && b !== "" && Number.isFinite(x) && Number.isFinite(y)) {
    return Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
  }
  return false;
}

export function snippetProblems(s: unknown): string | null {
  if (s === null || s === undefined) return null;
  const v = s as Partial<VerifySnippet>;
  if (!VERIFY_LANGUAGES.includes(v.language as VerifyLanguage)) return "verification language must be python or javascript";
  if (typeof v.code !== "string" || !v.code.trim()) return "verification code is empty";
  if (v.code.length > MAX_SNIPPET_CHARS) return "verification code is too long";
  if (typeof v.expected !== "string" || !v.expected.trim()) return "verification expected output is empty";
  return null;
}

export interface VerifyOutcome {
  ran: boolean;
  // null when not run (no snippet, no sandbox, or the snippet was malformed)
  agreed: boolean | null;
  detail: string;
}

// Runs one snippet, if there is one and a sandbox to run it in. A program
// that fails or times out counts as a disagreement: the writer claimed it
// computes the key, and it does not.
export async function verifyByExecution(
  snippet: VerifySnippet | null | undefined,
  runner: CodeRunner = unavailableVerifier,
  limits: RunLimits = DEFAULT_RUN_LIMITS
): Promise<VerifyOutcome> {
  if (!snippet) return { ran: false, agreed: null, detail: "no snippet" };
  const bad = snippetProblems(snippet);
  if (bad) return { ran: false, agreed: null, detail: bad };
  const r = await runner(snippet, limits).catch((err): RunResult => ({ status: "error", message: (err as Error)?.message ?? "runner failed" }));
  if (r.status === "unavailable") return { ran: false, agreed: null, detail: "no sandbox" };
  if (r.status === "error") return { ran: true, agreed: false, detail: `the verification program failed: ${r.message}`.slice(0, 300) };
  if (r.stdout.length > limits.maxOutputBytes) return { ran: true, agreed: false, detail: "the verification program printed too much" };
  const agreed = sameOutput(r.stdout, snippet.expected);
  return {
    ran: true,
    agreed,
    detail: agreed ? "execution matched" : `execution printed "${r.stdout.trim().slice(0, 80)}", the key says "${snippet.expected.slice(0, 80)}"`,
  };
}

// Which courses get the "verify by execution" request in their practice
// prompt: the development and academic catalog areas (MSCS, CMPCBS, Python,
// JavaScript) and academic tracks. Not clinical graduate tracks (MSHI), whose
// keys are not computations.
export function wantsVerification(ctx?: { trackType?: string | null; categorySlug?: string | null } | null): boolean {
  if (!ctx) return false;
  if (ctx.categorySlug === "development" || ctx.categorySlug === "teaching-academics") return true;
  return ctx.trackType === "academic";
}
