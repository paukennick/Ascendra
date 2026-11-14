import { randomInt } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import {
  armFor,
  DEFAULT_TEACH_ORDER,
  teachOrderTestOn,
  type TeachOrder,
  type TeachOrderSource,
} from "@/lib/teach-order-rules";

export * from "@/lib/teach-order-rules";

// REQ-262 (levels phase 2, migration 082): "Explain first / Example first".
//
// Two orders for the same Teach cards. Explain first is today's lesson (what
// it is, why it matters, the worked example, the common mistake). Example
// first moves the worked example to the front. Nothing else changes: same
// content, same solo check, same mastery rules, so progress is comparable.
//
// It is a comfort setting AND an A/B test that is ON by default (Nick,
// 2026-11-13: no learners yet, so live from day one):
//   - a learner who has not chosen is given one order at random the first
//     time a lesson asks, stored once (assigned_order) and never redrawn, so
//     the assignment is stable across sessions, devices and courses;
//   - the learner can change it in Settings; that is recorded (chosen_at), so
//     analysis can tell an assigned order from a chosen one;
//   - lesson events carry the order and its source (docs/teach-order-test.md).
// TEACH_ORDER_TEST=off (backend/.env.example) stops handing out new random
// arms and shows Explain first to learners who have not chosen; it never
// changes what a learner chose.

export interface TeachOrderView {
  order: TeachOrder;
  source: TeachOrderSource;
  // Whether new learners are being randomly assigned (the test is on).
  testOn: boolean;
}

interface Row {
  assigned_order: TeachOrder;
  teach_order: TeachOrder;
  chosen_at: Date | null;
}

const view = (row: Row, testOn: boolean): TeachOrderView =>
  row.chosen_at
    ? { order: row.teach_order, source: "chosen", testOn }
    : testOn
      ? { order: row.assigned_order, source: "assigned", testOn }
      : { order: DEFAULT_TEACH_ORDER, source: "default", testOn };

// The learner's order. A learner with no row is assigned one at random and
// the row is stored (insert ... on conflict do nothing, so two requests at
// once settle on one arm; the loser reads the winner's row). With the test
// off nothing is stored for a learner who has not chosen.
export async function getTeachOrder(
  userId: string,
  opts: { testOn?: boolean; flip?: () => number } = {}
): Promise<TeachOrderView> {
  const testOn = opts.testOn ?? teachOrderTestOn();
  const read = () =>
    queryOne<Row>(`select assigned_order, teach_order, chosen_at from learner_teach_order where user_id = $1`, [userId]);
  const existing = await read();
  if (existing) return view(existing, testOn);
  if (!testOn) return { order: DEFAULT_TEACH_ORDER, source: "default", testOn };
  const arm = armFor((opts.flip ?? (() => randomInt(2)))());
  await query(
    `insert into learner_teach_order (user_id, assigned_order, teach_order) values ($1, $2, $2)
     on conflict (user_id) do nothing`,
    [userId, arm]
  );
  const row = await read();
  // The row is there (we inserted it or a concurrent request did).
  return view(row ?? { assigned_order: arm, teach_order: arm, chosen_at: null }, testOn);
}

// The learner chooses an order in Settings. Recorded as a choice even when it
// is the one they were assigned. A learner with no row yet is assigned first
// (a random arm is drawn and kept as assigned_order) so the choice never
// erases what the test gave them.
export async function chooseTeachOrder(
  userId: string,
  order: TeachOrder,
  opts: { testOn?: boolean; flip?: () => number } = {}
): Promise<TeachOrderView> {
  const testOn = opts.testOn ?? teachOrderTestOn();
  const arm = armFor((opts.flip ?? (() => randomInt(2)))());
  await query(
    `insert into learner_teach_order (user_id, assigned_order, teach_order, chosen_at)
     values ($1, $2, $3, now())
     on conflict (user_id) do update
        set teach_order = excluded.teach_order, chosen_at = now(), updated_at = now()`,
    [userId, arm, order]
  );
  return { order, source: "chosen", testOn };
}
