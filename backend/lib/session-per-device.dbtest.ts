// REQ-306: one session per device, and web sessions end after 14 days unused.
// Against a real Postgres (npm run test:db), with migration 086 applied.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { createRefreshToken, rotateRefreshToken, refreshTtlDays, WEB_REFRESH_TOKEN_TTL_DAYS } from "./auth/tokens";

process.env.AUTH_JWT_SECRET ??= "session-per-device-test-secret";

const run = Date.now().toString(36);
const users: string[] = [];
const DEVICE_A = `deviceA${run}`.padEnd(24, "a");
const DEVICE_B = `deviceB${run}`.padEnd(24, "b");

async function makeUser(tag: string): Promise<string> {
  const id = randomUUID();
  await query(`insert into app_users (id, email) values ($1, $2)`, [id, `spd-${run}-${tag}@example.test`]);
  users.push(id);
  return id;
}

const liveFamilies = async (userId: string) =>
  (
    await query<{ family_id: string; device_id: string | null }>(
      `select distinct family_id, device_id from refresh_tokens where user_id = $1 and revoked_at is null and expires_at > now()`,
      [userId]
    )
  );

after(async () => {
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("one session per device (REQ-306)", () => {
  test("signing in again on the same device ends that device's older session", async () => {
    const u = await makeUser("same");
    const first = await createRefreshToken(u, { deviceId: DEVICE_A });
    const second = await createRefreshToken(u, { deviceId: DEVICE_A });
    const live = await liveFamilies(u);
    assert.deepEqual(live.map((r) => r.family_id), [second.familyId]);
    await assert.rejects(rotateRefreshToken(first.raw, { deviceId: DEVICE_A }));
  });

  test("another device's session is left alone", async () => {
    const u = await makeUser("other");
    await createRefreshToken(u, { deviceId: DEVICE_A });
    await createRefreshToken(u, { deviceId: DEVICE_B });
    assert.equal((await liveFamilies(u)).length, 2);
  });

  test("sessions with no device id (older builds) never replace each other", async () => {
    const u = await makeUser("none");
    await createRefreshToken(u, {});
    await createRefreshToken(u, {});
    assert.equal((await liveFamilies(u)).length, 2);
  });

  test("an invalid device id is ignored, not stored", async () => {
    const u = await makeUser("bad");
    const s = await createRefreshToken(u, { deviceId: "short" });
    const row = await queryOne<{ device_id: string | null }>(`select device_id from refresh_tokens where family_id = $1`, [s.familyId]);
    assert.equal(row?.device_id, null);
  });

  test("rotation keeps the family's device id", async () => {
    const u = await makeUser("rotate");
    const s = await createRefreshToken(u, { deviceId: DEVICE_A });
    const r = await rotateRefreshToken(s.raw, {});
    const row = await queryOne<{ device_id: string | null }>(
      `select device_id from refresh_tokens where family_id = $1 and revoked_at is null`,
      [r.familyId]
    );
    assert.equal(row?.device_id, DEVICE_A);
  });
});

describe("idle limit: 14 days on the web, 30 in the app (REQ-306)", () => {
  test("the limits", () => {
    assert.equal(refreshTtlDays(true), WEB_REFRESH_TOKEN_TTL_DAYS);
    assert.equal(WEB_REFRESH_TOKEN_TTL_DAYS, 14);
    assert.equal(refreshTtlDays(false), 30);
    assert.equal(refreshTtlDays(undefined), 30);
  });

  test("a web sign-in and each web refresh expire 14 days out; the app's 30", async () => {
    const u = await makeUser("ttl");
    const days = async (familyId: string) => {
      const row = await queryOne<{ d: number }>(
        `select extract(epoch from (expires_at - now())) / 86400 as d from refresh_tokens where family_id = $1 and revoked_at is null`,
        [familyId]
      );
      return Number(row?.d);
    };
    const web = await createRefreshToken(u, { web: true });
    assert.ok(Math.abs((await days(web.familyId)) - 14) < 0.01);
    const app = await createRefreshToken(u, { web: false });
    assert.ok(Math.abs((await days(app.familyId)) - 30) < 0.01);
    const rotated = await rotateRefreshToken(web.raw, { web: true });
    assert.ok(Math.abs((await days(rotated.familyId)) - 14) < 0.01);
  });
});
