import { query } from "@/lib/db";
import { grantEntitlement, revokeGrants } from "@/lib/entitlements";
import type { PaidTier } from "@/lib/billing-config";

// REQ-122: comping learners (`npm run billing:grant -- ...`). The policy --
// who gets what, for how long -- is Nick's; this is only the tool.
// docs/billing.md has examples.
//
//   --email <address> | --user <uuid>   one account
//   --all-existing [--created-before YYYY-MM-DD]
//                                        every account (created before the date)
//   --tier plus|pro                      default pro
//   --until YYYY-MM-DD                   access to the end of that day (UTC); none = no end
//   --note "..."                         why (kept on the row)
//   --revoke                             end this account's grants instead
//   --dry-run                            say what would change, change nothing

export interface GrantArgs {
  email: string | null;
  user: string | null;
  allExisting: boolean;
  createdBefore: Date | null;
  tier: PaidTier;
  until: Date | null;
  note: string | null;
  revoke: boolean;
  dryRun: boolean;
}

function dayEnd(v: string, flag: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`${flag} must be YYYY-MM-DD`);
  const d = new Date(`${v}T23:59:59.999Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`${flag} is not a real date`);
  return d;
}

export function parseGrantArgs(argv: string[]): GrantArgs {
  const a: GrantArgs = { email: null, user: null, allExisting: false, createdBefore: null, tier: "pro", until: null, note: null, revoke: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${k} needs a value`);
      return v;
    };
    if (k === "--email") a.email = val().toLowerCase();
    else if (k === "--user") a.user = val().toLowerCase();
    else if (k === "--all-existing") a.allExisting = true;
    else if (k === "--created-before") a.createdBefore = new Date(`${val()}T00:00:00Z`);
    else if (k === "--tier") {
      const t = val();
      if (t !== "plus" && t !== "pro") throw new Error("--tier must be plus or pro");
      a.tier = t;
    } else if (k === "--until") a.until = dayEnd(val(), "--until");
    else if (k === "--note") a.note = val();
    else if (k === "--revoke") a.revoke = true;
    else if (k === "--dry-run") a.dryRun = true;
    else throw new Error(`Unknown option ${k}`);
  }
  const targets = [a.email, a.user, a.allExisting ? "all" : null].filter(Boolean).length;
  if (targets !== 1) throw new Error("Give exactly one of --email, --user or --all-existing");
  if (a.createdBefore && Number.isNaN(a.createdBefore.getTime())) throw new Error("--created-before must be YYYY-MM-DD");
  if (a.revoke && a.allExisting) throw new Error("--revoke works on one account at a time");
  if (a.until && a.until.getTime() < Date.now()) throw new Error("--until is in the past");
  return a;
}

export async function runGrant(a: GrantArgs): Promise<string[]> {
  const out: string[] = [];
  let ids: string[];
  if (a.allExisting) {
    // Accounts without a grant of this tier or higher that is still open.
    ids = (
      await query<{ id: string }>(
        `select u.id from app_users u
          where ($1::timestamptz is null or u.created_at < $1)
            and not exists (select 1 from entitlements e where e.user_id = u.id and e.source = 'grant' and e.status = 'active'
                              and (e.period_end is null or e.period_end > now())
                              and (e.tier = 'pro' or e.tier = $2))
          order by u.created_at`,
        [a.createdBefore, a.tier]
      )
    ).map((r) => r.id);
  } else {
    const row = await query<{ id: string }>(`select id from app_users where ${a.email ? "lower(email) = $1" : "id = $1::uuid"}`, [a.email ?? a.user]);
    if (!row.length) throw new Error("No such account");
    ids = [row[0].id];
  }
  for (const id of ids) {
    if (a.revoke) {
      out.push(a.dryRun ? `would revoke grants of ${id}` : `revoked ${await revokeGrants(id)} grant(s) of ${id}`);
    } else if (a.dryRun) {
      out.push(`would grant ${a.tier} to ${id} until ${a.until?.toISOString() ?? "no end"}`);
    } else {
      await grantEntitlement({ userId: id, tier: a.tier, until: a.until, note: a.note });
      out.push(`granted ${a.tier} to ${id} until ${a.until?.toISOString() ?? "no end"}`);
    }
  }
  out.push(`${ids.length} account(s)${a.dryRun ? " (dry run, nothing changed)" : ""}`);
  return out;
}
