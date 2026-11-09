import { query, queryOne, withTransaction, type TxClient } from "@/lib/db";
import { foundingConfig, type FoundingConfig } from "@/lib/billing-config";

// REQ-170: founding members -- the first FOUNDING_MEMBERS_LIMIT (100) paying
// learners get FOUNDING_MEMBERS_PERCENT (40%) off, kept for as long as they
// stay subscribed. OFF by default (FOUNDING_MEMBERS_ENABLED), and only ever
// with plans on. With it off nothing here reads or writes a row.
//
// Seats: a learner takes one when they start a checkout (holdSeat); the
// first paid subscription event after that confirms it (confirmSeat, called
// from the webhooks). An unconfirmed hold lapses after
// FOUNDING_MEMBERS_HOLD_HOURS (48), and a lapsed hold doesn't count against
// the limit, so abandoned checkouts can't use up the seats. Holding and
// counting happen under one lock, so the limit can't be overrun by
// parallel checkouts.
//
// It is a published discount: the same percentage for every founding
// member, shown as "Founding member: 40% off", never as a personal price.
// It doesn't stack with a verified discount (the larger applies) and it
// never lowers the AI cap.

const LOCK = "founding-members";

// Seats taken: confirmed, or held and not yet lapsed.
const TAKEN = `(confirmed_at is not null or held_at > now() - make_interval(secs => $1))`;

export interface FoundingStatus {
  percent: number;
  // member: confirmed seat; held: a checkout in progress; open: seats left;
  // full: none left (the offer is no longer shown)
  state: "member" | "held" | "open" | "full";
}

export async function foundingStatus(userId: string, env: NodeJS.ProcessEnv = process.env): Promise<FoundingStatus | null> {
  const cfg = foundingConfig(env);
  if (!cfg.enabled) return null;
  const holdSecs = cfg.holdHours * 3600;
  const mine = await queryOne<{ confirmed: boolean; live: boolean }>(
    `select confirmed_at is not null as confirmed, ${TAKEN} as live from founding_members where user_id = $2`,
    [holdSecs, userId]
  );
  if (mine?.confirmed) return { percent: cfg.percent, state: "member" };
  if (mine?.live) return { percent: cfg.percent, state: "held" };
  const taken = await seatsTaken(cfg);
  return { percent: cfg.percent, state: taken < cfg.limit ? "open" : "full" };
}

export async function seatsTaken(cfg: FoundingConfig = foundingConfig()): Promise<number> {
  const row = await queryOne<{ n: number }>(`select count(*)::int as n from founding_members where ${TAKEN}`, [cfg.holdHours * 3600]);
  return row?.n ?? 0;
}

// Holds (or renews the hold on) a seat for this learner. Returns the
// percentage to apply, or null when the offer is off or full. A confirmed
// member keeps their seat (a later checkout for another plan gets it too).
export async function holdSeat(userId: string, env: NodeJS.ProcessEnv = process.env): Promise<number | null> {
  const cfg = foundingConfig(env);
  if (!cfg.enabled) return null;
  const holdSecs = cfg.holdHours * 3600;
  return withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [LOCK]);
    const mine = await tx.queryOne<{ confirmed: boolean; live: boolean; percent: number }>(
      `select confirmed_at is not null as confirmed, ${TAKEN} as live, percent from founding_members where user_id = $2`,
      [holdSecs, userId]
    );
    // A member keeps the percentage they joined at (the price lock).
    if (mine?.confirmed) return mine.percent;
    if (!mine?.live) {
      const taken = await tx.queryOne<{ n: number }>(`select count(*)::int as n from founding_members where ${TAKEN}`, [holdSecs]);
      if ((taken?.n ?? 0) >= cfg.limit) return null;
    }
    await tx.query(
      `insert into founding_members (user_id, percent, held_at) values ($1, $2, now())
       on conflict (user_id) do update set held_at = now(), percent = excluded.percent
        where founding_members.confirmed_at is null`,
      [userId, cfg.percent]
    );
    return cfg.percent;
  });
}

// The first paid subscription event after a live hold confirms the seat.
// Runs inside the webhook's transaction. Does nothing when the offer is off
// or the learner holds no live seat.
export async function confirmSeat(
  tx: TxClient,
  userId: string,
  source: "stripe" | "revenuecat",
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const cfg = foundingConfig(env);
  if (!cfg.enabled) return false;
  const rows = await tx.query(
    `update founding_members set confirmed_at = now(), source = $3
      where user_id = $2 and confirmed_at is null and held_at > now() - make_interval(secs => $1) returning user_id`,
    [cfg.holdHours * 3600, userId, source]
  );
  return rows.length > 0;
}

// Operator view (npm run billing:config): how many seats are gone.
export async function foundingCounts(env: NodeJS.ProcessEnv = process.env) {
  const cfg = foundingConfig({ ...env, BILLING_ENABLED: "true" });
  const rows = await query<{ confirmed: number; held: number }>(
    `select count(*) filter (where confirmed_at is not null)::int as confirmed,
            count(*) filter (where confirmed_at is null and held_at > now() - make_interval(secs => $1))::int as held
       from founding_members`,
    [cfg.holdHours * 3600]
  );
  return { limit: cfg.limit, confirmed: rows[0]?.confirmed ?? 0, held: rows[0]?.held ?? 0 };
}
