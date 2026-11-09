import { grantAccess, listAccess, revokeAccess } from "@/lib/account-access";
import type { AccessCliArgs } from "@/lib/account-access-config";

// REQ-144: `npm run access:grant -- ...`, the emergency equivalent of
// Settings > Access (examples in docs/billing.md). Recorded in the audit
// trail with via = 'cli'.
//
//   --email <address> [--until YYYY-MM-DD] [--note "..."]   give or renew
//   --email <address> --revoke                              end it now
//   --list                                                  owners and grants
export async function runAccessCli(a: AccessCliArgs): Promise<string[]> {
  if (a.mode === "list") {
    const l = await listAccess();
    const out = [
      `owners (OWNER_EMAILS): ${l.owners.length ? l.owners.map((o) => `${o.email}${o.hasAccount ? "" : " (no verified account yet)"}`).join(", ") : "none set"}`,
    ];
    if (!l.grants.length) out.push("no unrestricted grants");
    for (const g of l.grants) {
      out.push(
        `${g.status.padEnd(7)} ${g.email}  until ${g.expiresAt ?? "no end"}  by ${g.grantedBy ?? "?"}${g.note ? `  note: ${g.note}` : ""}  id ${g.id}`
      );
    }
    return out;
  }
  if (a.mode === "revoke") {
    const r = await revokeAccess({ email: a.email }, { via: "cli" });
    return [r ? `revoked unrestricted access of ${r.email}` : `no live grant for ${a.email}; nothing changed`];
  }
  const g = await grantAccess({ email: a.email, until: a.until, note: a.note }, { via: "cli" });
  return [
    `unrestricted access for ${g.email} until ${g.expiresAt ?? "no end"} (${g.status === "waiting" ? "waiting: applies once that address has a verified account" : g.status})`,
  ];
}
