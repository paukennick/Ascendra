// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for KCSA/secret-read-by-unknown-serviceaccount
// on the security-console screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "KCSA", slug: "secret-read-by-unknown-serviceaccount" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Access and storage checked; Metadata auditing shipped; access scoped; KMS encryption with a rewrite; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["rbacCheck", "etcd"] }, answers: { auditPrompt: "metadata", rbacPrompt: "scope", atRestPrompt: "kms" }, close: { how: "honest" } }) },
      { id: "partialAudit", title: "Partly right on the audit policy, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["rbacCheck"] }, answers: { auditPrompt: "local", rbacPrompt: "scope", atRestPrompt: "kms" }, close: { how: "honest" } }) },
      { id: "partialAtRest", title: "Partly right on encryption at rest, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { auditPrompt: "metadata", rbacPrompt: "scope", atRestPrompt: "newOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { auditPrompt: "local", rbacPrompt: "namespaceOnly", atRestPrompt: "newOnly" }, close: { how: "honest" } }) },
      { id: "badAudit", title: "Secrets audited at RequestResponse", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["rbacCheck", "etcd"] }, answers: { auditPrompt: "reqResp", rbacPrompt: "scope", atRestPrompt: "kms" }, close: { how: "honest" } }) },
      { id: "badRbac", title: "The reporting account keeps cluster-wide Secret access", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["rbacCheck", "etcd"] }, answers: { auditPrompt: "metadata", rbacPrompt: "keepAccess", atRestPrompt: "kms" }, close: { how: "honest" } }) },
      { id: "badAtRest", title: "Base64 treated as encryption", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["rbacCheck", "etcd"] }, answers: { auditPrompt: "metadata", rbacPrompt: "scope", atRestPrompt: "obscure" }, close: { how: "honest" } }) },
    ],
  };
}
