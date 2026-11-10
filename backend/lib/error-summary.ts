// REQ-207 (FAIL-946): what is safe to write to a log or send to the error
// tracker about an error. `console.error(label, err)` printed the whole
// object, and a node-postgres error carries `detail`, `where`, `parameters`
// and the failing statement's text: a unique-violation's detail reads
// `Key (email)=(someone@example.com) already exists.`, so a learner's address
// went to the platform logs on every collision that reached a 500.
//
// Only the error's name, its code (a SQLSTATE such as 23505 or a Node
// errno), and a short message with e-mail addresses masked. Never `detail`,
// `where`, `hint`, parameters, cause chains or the stack (the tracker adds
// its own capped stack separately).

const EMAIL = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export const LOG_MESSAGE_MAX = 200;

export function maskEmails(text: string): string {
  return text.replace(EMAIL, "[email]");
}

export interface ErrorSummary {
  name: string;
  code: string | null;
  message: string;
}

export function summarizeError(err: unknown, maxLength = LOG_MESSAGE_MAX): ErrorSummary {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    return {
      name: err.name || "Error",
      code: typeof code === "string" || typeof code === "number" ? String(code) : null,
      message: maskEmails(String(err.message ?? "")).slice(0, maxLength),
    };
  }
  return { name: typeof err, code: null, message: maskEmails(String(err)).slice(0, maxLength) };
}

// One line for console.error: `Error code=23505 duplicate key value ...`.
export function describeError(err: unknown, maxLength = LOG_MESSAGE_MAX): string {
  const s = summarizeError(err, maxLength);
  return `${s.name}${s.code ? ` code=${s.code}` : ""}: ${s.message}`;
}
