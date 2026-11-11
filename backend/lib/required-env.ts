// REQ-118 (Audit 3 MEDIUM-10 / LOW-11): every setting is read lazily, where
// it is used, so a deploy missing one went live and failed on a learner's
// request (sign-in, MFA, grading). /api/health now checks them, so the
// post-deploy and daily health checks turn red instead.
//
// Only names are reported, never values. Placeholder values copied from
// .env.example are a separate check (REQ-116, lib/env-check.ts, at startup).

type Env = Record<string, string | undefined>;

export interface EnvProblem {
  name: string;
  problem: "missing" | "invalid";
}

const set = (env: Env, name: string) => typeof env[name] === "string" && env[name]!.trim() !== "";

export function requiredEnvProblems(env: Env = process.env): EnvProblem[] {
  const out: EnvProblem[] = [];
  const need = (name: string) => {
    if (!set(env, name)) out.push({ name, problem: "missing" });
  };
  need("DATABASE_URL");
  need("AUTH_JWT_SECRET");
  need("APP_BASE_URL");
  need("RESEND_API_KEY");
  if (!set(env, "AUTH_ENCRYPTION_KEY")) out.push({ name: "AUTH_ENCRYPTION_KEY", problem: "missing" });
  else if (Buffer.from(env.AUTH_ENCRYPTION_KEY!, "base64").length !== 32) {
    out.push({ name: "AUTH_ENCRYPTION_KEY", problem: "invalid" });
  }
  // lib/choice-order.ts refuses to run without it in production only.
  if (env.NODE_ENV === "production") need("CHOICE_ORDER_SECRET");
  // FAIL-1161: every /api/cron/* route answers 503 without it (lib/cron-auth.ts),
  // and Vercel Cron only logs that, so the daily purge, retention, service
  // emails and content signals could stop for weeks with a green /api/health.
  if (env.NODE_ENV === "production") need("CRON_SECRET");
  // lib/anthropic.ts: a static key, or workload identity federation.
  if (env.AI_PROVIDER !== "local" && !set(env, "ANTHROPIC_API_KEY")) {
    if (!set(env, "ANTHROPIC_FEDERATION_RULE_ID")) out.push({ name: "ANTHROPIC_FEDERATION_RULE_ID", problem: "missing" });
    if (!set(env, "ANTHROPIC_ORGANIZATION_ID")) out.push({ name: "ANTHROPIC_ORGANIZATION_ID", problem: "missing" });
  }
  return out;
}

export function formatEnvProblems(p: EnvProblem[]): string[] {
  return p.map((x) => `${x.name} ${x.problem === "missing" ? "is not set" : "is not valid"}`);
}
