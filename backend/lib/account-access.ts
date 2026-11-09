import { query, queryOne, withTransaction } from "@/lib/db";
import { UserFacingError } from "@/lib/http";
import { sendAiCeilingNotice } from "@/lib/email";
import {
  ownerEmails,
  resolveLevel,
  switchOnForEveryone,
  type AccessLevel,
  type EarlyAccessFlag,
} from "@/lib/account-access-config";

// REQ-144: who has owner or unrestricted access, and the owner's tools to
// give and take it. Policy and the pure rules are in
// lib/account-access-config.ts; the gates that read this are in
// lib/entitlements.ts (plans), lib/ai-budget.ts (the daily budget and the
// safety ceiling) and lib/labs.ts (early access to unreviewed labs).
//
// Unrestricted is never admin: nothing here lets anyone read or change
// another learner's data, and the owner-only routes see only the grants.

export interface AccountAccess {
  level: AccessLevel;
  // null for an owner (decided by OWNER_EMAILS, not a grant)
  grant: { id: string; grantedAt: string; expiresAt: string | null; grantedByName: string | null } | null;
}

type Env = NodeJS.ProcessEnv;

interface AccessRow {
  email: string;
  verified: boolean;
  grant_id: string | null;
  grant_user_id: string | null;
  granted_at: Date | null;
  expires_at: Date | null;
  granted_by_name: string | null;
}

// One indexed read: the account, and a live grant bound to it or waiting
// for its (verified) address. A waiting grant found here is bound to the
// account (claimed) so it stays with it.
export async function accessFor(userId: string, env: Env = process.env): Promise<AccountAccess | null> {
  const row = await queryOne<AccessRow>(
    `select u.email, (u.email_verified_at is not null) as verified,
            g.id as grant_id, g.user_id as grant_user_id, g.granted_at, g.expires_at,
            coalesce(nullif(trim(gb.display_name), ''), 'the account owner') as granted_by_name
       from app_users u
       left join lateral (
         select a.* from account_access a
          where a.revoked_at is null and (a.expires_at is null or a.expires_at > now())
            and (a.user_id = u.id
                 or (a.user_id is null and u.email_verified_at is not null and a.email = lower(u.email)))
          order by (a.user_id is not null) desc, a.expires_at desc nulls first
          limit 1) g on true
       left join app_users gb on gb.id = g.granted_by
      where u.id = $1`,
    [userId]
  );
  if (!row) return null;
  const level = resolveLevel(
    { email: row.email, verified: row.verified },
    row.grant_id ? { id: row.grant_id, expiresAt: row.expires_at, revokedAt: null } : null,
    env
  );
  if (!level) return null;
  if (row.grant_id && row.grant_user_id === null) await claimGrant(row.grant_id, userId).catch(() => {});
  return {
    level,
    grant: row.grant_id
      ? {
          id: row.grant_id,
          grantedAt: new Date(row.granted_at!).toISOString(),
          expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
          grantedByName: row.granted_by_name,
        }
      : null,
  };
}

async function claimGrant(grantId: string, userId: string): Promise<void> {
  await withTransaction(async (tx) => {
    const claimed = await tx.queryOne<{ email: string }>(
      `update account_access set user_id = $2, claimed_at = now(), updated_at = now()
        where id = $1 and user_id is null returning email`,
      [grantId, userId]
    );
    if (!claimed) return; // a parallel request claimed it
    await tx.query(`update account_access_events set user_id = $2 where access_id = $1 and user_id is null`, [grantId, userId]);
    await tx.query(
      `insert into account_access_events (access_id, user_id, email, action, via) values ($1, $2, $3, 'claim', 'system')`,
      [grantId, userId, claimed.email]
    );
  });
}

export async function isUnrestricted(userId: string, env: Env = process.env): Promise<boolean> {
  return (await accessFor(userId, env)) !== null;
}

export async function isOwner(userId: string, env: Env = process.env): Promise<boolean> {
  return (await accessFor(userId, env))?.level === "owner";
}

// Early access: true when the switch is on for everyone, else only for
// owner and unrestricted accounts. No database read when it is on.
export async function featureEnabledFor(userId: string, flag: EarlyAccessFlag, env: Env = process.env): Promise<boolean> {
  if (switchOnForEveryone(flag, env)) return true;
  return isUnrestricted(userId, env);
}

// What GET /api/auth/me says about it (the app's Settings and Plans).
export async function accessSummary(userId: string, env: Env = process.env) {
  const a = await accessFor(userId, env).catch(() => null);
  if (!a) return null;
  return {
    level: a.level,
    grantedBy: a.grant?.grantedByName ?? null,
    expiresAt: a.grant?.expiresAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Owner tools
// ---------------------------------------------------------------------------

export const OWNER_ONLY_MESSAGE = "Only the account owner can manage access.";

export class OwnerOnlyError extends UserFacingError {
  constructor() {
    super(OWNER_ONLY_MESSAGE, 403);
    this.name = "OwnerOnlyError";
  }
}

export async function requireOwner(userId: string, env: Env = process.env): Promise<void> {
  if (!(await isOwner(userId, env))) throw new OwnerOnlyError();
}

export type Actor = { via: "app"; userId: string } | { via: "cli" };

export interface GrantListItem {
  id: string;
  email: string;
  status: "active" | "waiting" | "ended";
  // waiting: no verified account with this address yet
  grantedAt: string;
  grantedBy: string | null;
  expiresAt: string | null;
  note: string | null;
  claimedAt: string | null;
}

const LIST_COLS = `a.id, a.email, a.granted_at, a.expires_at, a.note, a.claimed_at, a.user_id,
  case when a.granted_by is null then 'command line' else coalesce(nullif(trim(gb.display_name), ''), gb.email) end as granted_by,
  (a.user_id is not null or exists(select 1 from app_users v where lower(v.email) = a.email and v.email_verified_at is not null)) as has_account`;

interface ListRow {
  id: string;
  email: string;
  granted_at: Date;
  expires_at: Date | null;
  note: string | null;
  claimed_at: Date | null;
  user_id: string | null;
  granted_by: string | null;
  has_account: boolean;
}

function toItem(r: ListRow, now = new Date()): GrantListItem {
  const ended = r.expires_at !== null && new Date(r.expires_at).getTime() <= now.getTime();
  return {
    id: r.id,
    email: r.email,
    status: ended ? "ended" : r.has_account ? "active" : "waiting",
    grantedAt: new Date(r.granted_at).toISOString(),
    grantedBy: r.granted_by,
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
    note: r.note,
    claimedAt: r.claimed_at ? new Date(r.claimed_at).toISOString() : null,
  };
}

export interface AccessHistoryItem {
  at: string;
  action: "grant" | "change" | "revoke" | "claim" | "ceiling_reached";
  email: string;
  by: string | null;
  detail: Record<string, unknown>;
}

// Every grant that is not revoked (ended ones too, so they can be renewed
// or removed), the owners from OWNER_EMAILS, and the recent audit trail.
export async function listAccess(env: Env = process.env) {
  const rows = await query<ListRow>(
    `select ${LIST_COLS} from account_access a left join app_users gb on gb.id = a.granted_by
      where a.revoked_at is null order by a.granted_at desc, a.id`
  );
  const owners = [...ownerEmails(env)].sort();
  const ownerAccounts = await query<{ email: string }>(
    `select lower(email) as email from app_users where lower(email) = any($1::text[]) and email_verified_at is not null`,
    [owners]
  );
  const verified = new Set(ownerAccounts.map((o) => o.email));
  const history = await query<{ created_at: Date; action: AccessHistoryItem["action"]; email: string; by: string | null; via: string; detail: Record<string, unknown> }>(
    `select e.created_at, e.action, e.email, e.via, e.detail,
            case when e.actor_id is not null then coalesce(nullif(trim(ac.display_name), ''), ac.email) end as by
       from account_access_events e left join app_users ac on ac.id = e.actor_id
      order by e.created_at desc, e.id desc limit 50`
  );
  return {
    owners: owners.map((email) => ({ email, hasAccount: verified.has(email) })),
    grants: rows.map((r) => toItem(r)),
    history: history.map((h) => ({
      at: new Date(h.created_at).toISOString(),
      action: h.action,
      email: h.email,
      by: h.by ?? (h.via === "cli" ? "command line" : null),
      detail: h.detail,
    })),
  };
}

export class AccessGrantError extends UserFacingError {
  constructor(message: string, status = 400) {
    super(message, status);
    this.name = "AccessGrantError";
  }
}

// Gives (or renews: a live grant for the address is updated, not
// duplicated) unrestricted access to an address. Bound at once to a
// verified account with that address, else waiting for one.
export async function grantAccess(
  input: { email: string; until: Date | null; note: string | null },
  actor: Actor,
  env: Env = process.env
): Promise<GrantListItem> {
  const email = input.email.toLowerCase();
  if (ownerEmails(env).has(email)) throw new AccessGrantError("That address is an owner already; owners always have unrestricted access.", 409);
  const actorId = actor.via === "app" ? actor.userId : null;
  const id = await withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`account-access:${email}`]);
    const account = await tx.queryOne<{ id: string }>(
      `select id from app_users where lower(email) = $1 and email_verified_at is not null limit 1`,
      [email]
    );
    const live = await tx.queryOne<{ id: string; user_id: string | null; expires_at: Date | null; note: string | null }>(
      `select id, user_id, expires_at, note from account_access where email = $1 and revoked_at is null`,
      [email]
    );
    const detail = { until: input.until?.toISOString() ?? null, note: input.note };
    if (live) {
      const userId = live.user_id ?? account?.id ?? null;
      await tx.query(
        `update account_access set expires_at = $2, note = $3, granted_by = coalesce($4, granted_by), user_id = $5,
                claimed_at = case when user_id is null and $5::uuid is not null then now() else claimed_at end, updated_at = now()
          where id = $1`,
        [live.id, input.until, input.note, actorId, userId]
      );
      await tx.query(
        `insert into account_access_events (access_id, user_id, email, action, actor_id, via, detail) values ($1, $2, $3, 'change', $4, $5, $6)`,
        [live.id, userId, email, actorId, actor.via, JSON.stringify({ ...detail, previousUntil: live.expires_at ? new Date(live.expires_at).toISOString() : null })]
      );
      return live.id;
    }
    const row = await tx.queryOne<{ id: string }>(
      `insert into account_access (email, user_id, granted_by, expires_at, note, claimed_at)
       values ($1, $2, $3, $4, $5, case when $2::uuid is null then null else now() end) returning id`,
      [email, account?.id ?? null, actorId, input.until, input.note]
    );
    await tx.query(
      `insert into account_access_events (access_id, user_id, email, action, actor_id, via, detail) values ($1, $2, $3, 'grant', $4, $5, $6)`,
      [row!.id, account?.id ?? null, email, actorId, actor.via, JSON.stringify(detail)]
    );
    return row!.id;
  });
  const r = await queryOne<ListRow>(`select ${LIST_COLS} from account_access a left join app_users gb on gb.id = a.granted_by where a.id = $1`, [id]);
  return toItem(r!);
}

// Ends a grant now. By id (the app) or by address (the CLI). Null when there
// is no such live grant.
export async function revokeAccess(target: { id: string } | { email: string }, actor: Actor): Promise<{ id: string; email: string } | null> {
  const actorId = actor.via === "app" ? actor.userId : null;
  return withTransaction(async (tx) => {
    const row = await tx.queryOne<{ id: string; email: string; user_id: string | null }>(
      `update account_access set revoked_at = now(), revoked_by = $2, updated_at = now()
        where ${"id" in target ? "id = $1::uuid" : "email = lower($1)"} and revoked_at is null
        returning id, email, user_id`,
      ["id" in target ? target.id : target.email, actorId]
    );
    if (!row) return null;
    await tx.query(
      `insert into account_access_events (access_id, user_id, email, action, actor_id, via) values ($1, $2, $3, 'revoke', $4, $5)`,
      [row.id, row.user_id, row.email, actorId, actor.via]
    );
    return { id: row.id, email: row.email };
  });
}

// ---------------------------------------------------------------------------
// The AI safety ceiling was reached (lib/ai-budget.ts)
// ---------------------------------------------------------------------------

// Logged every time; recorded in the audit trail and emailed to every
// owner at most once per account per 24 hours. Never throws: the learner
// gets the ceiling message whether or not the notice went out.
export async function noteCeilingReached(userId: string, spentUsd: number, ceilingUsd: number, env: Env = process.env): Promise<void> {
  // eslint-disable-next-line no-console
  console.error(`[ai-ceiling] unrestricted account ${userId} reached the AI safety ceiling: $${spentUsd.toFixed(2)} of $${ceilingUsd.toFixed(2)} in 24h`);
  try {
    const email = await withTransaction(async (tx) => {
      await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`ai-ceiling:${userId}`]);
      const recent = await tx.queryOne(
        `select 1 from account_access_events where user_id = $1 and action = 'ceiling_reached' and created_at > now() - interval '24 hours' limit 1`,
        [userId]
      );
      if (recent) return null;
      const u = await tx.queryOne<{ email: string }>(`select email from app_users where id = $1`, [userId]);
      if (!u) return null;
      await tx.query(
        `insert into account_access_events (user_id, email, action, via, detail) values ($1, lower($2), 'ceiling_reached', 'system', $3)`,
        [userId, u.email, JSON.stringify({ spentUsd: Math.round(spentUsd * 100) / 100, ceilingUsd })]
      );
      return u.email;
    });
    if (!email) return;
    for (const to of ownerEmails(env)) {
      await sendAiCeilingNotice(to, email, spentUsd, ceilingUsd).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[ai-ceiling] owner notice not sent:", (err as Error)?.message);
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ai-ceiling] could not record the ceiling:", (err as Error)?.message);
  }
}

