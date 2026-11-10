// REQ-116 (audit 3, low): refuse to start in production with a secret
// still set to its backend/.env.example placeholder. Copying the example
// file into Vercel's environment as-is gave a working deploy whose JWT
// signing key, TOTP encryption key and catalog-agent token were public text
// in this repository. Missing values are still reported where they are
// used (lib/auth/tokens.ts and friends); this catches present-but-placeholder.

export const SECRET_ENV_NAMES = [
  "AUTH_JWT_SECRET",
  "AUTH_ENCRYPTION_KEY",
  "CHOICE_ORDER_SECRET",
  "CATALOG_REVIEW_AGENT_TOKEN",
  "RESEND_API_KEY",
  "ANTHROPIC_API_KEY",
  "DATABASE_URL",
  "CRON_SECRET",
] as const;

export function isPlaceholderSecret(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return (
    /^change-me/i.test(v) ||
    v.endsWith("...") ||
    v.includes(":PASSWORD@") ||
    v.includes("postgres.xxxxx") ||
    /^x{6,}/i.test(v)
  );
}

// The names whose value is a placeholder, in production only (local dev
// and tests may use anything).
export function placeholderSecrets(env: Record<string, string | undefined> = process.env): string[] {
  if (env.NODE_ENV !== "production") return [];
  return SECRET_ENV_NAMES.filter((name) => {
    const v = env[name];
    return typeof v === "string" && isPlaceholderSecret(v);
  });
}

export function assertNoPlaceholderSecrets(env: Record<string, string | undefined> = process.env): void {
  const bad = placeholderSecrets(env);
  if (bad.length) {
    throw new Error(
      `Refusing to start: ${bad.join(", ")} still ${bad.length === 1 ? "has" : "have"} the backend/.env.example placeholder value. ` +
        "Set real secrets in the Vercel project's environment variables."
    );
  }
}

// REQ-205 (FAIL-912): AI_PROVIDER=local sends every model request to a
// self-hosted Ollama (lib/anthropic.ts) instead of Anthropic. It exists for
// local iteration only. In production it would route learners' text to an
// unmanaged host the Privacy Policy does not name, so the server refuses to
// start with it set (any capitalisation, any padding).
export function localProviderInProduction(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "production" && (env.AI_PROVIDER ?? "").trim().toLowerCase() === "local";
}

export function assertSafeProductionConfig(env: Record<string, string | undefined> = process.env): void {
  assertNoPlaceholderSecrets(env);
  if (localProviderInProduction(env)) {
    throw new Error(
      "Refusing to start: AI_PROVIDER=local is for local development only and would send learners' text to a self-hosted model. " +
        "Remove AI_PROVIDER from the production environment variables."
    );
  }
}
