// REQ-116 (audit 3, security): pure-logic tests -- image header limits,
// placeholder secrets, production CORS, replay binding, and the shared
// 400 mapping for malformed input.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readImageHeader, checkImageHeader, AvatarError, MAX_SIDE } from "./auth/avatar";
import { isPlaceholderSecret, placeholderSecrets, assertNoPlaceholderSecrets } from "./env-check";
import { allowedOriginsFor } from "../proxy";
import { replayMatches } from "./replay-binding";
import { readJson, serverError, INVALID_JSON, INVALID_INPUT } from "./http";

function pngHeader(w: number, h: number): Buffer {
  const b = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "latin1");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}

function jpegHeader(w: number, h: number): Buffer {
  // SOI, an APP0 segment, then SOF0 with height/width.
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.from("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const sof = Buffer.alloc(19);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(h, 5);
  sof.writeUInt16BE(w, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof]);
}

describe("avatar header limits (finding 6)", () => {
  test("reads PNG and JPEG dimensions without decoding", () => {
    assert.deepEqual(readImageHeader(pngHeader(640, 480)), { format: "png", width: 640, height: 480 });
    assert.deepEqual(readImageHeader(jpegHeader(1200, 900)), { format: "jpeg", width: 1200, height: 900 });
    assert.equal(readImageHeader(Buffer.from("GIF89a....")), null);
  });

  test("refuses sides over 4096, more than 16 MP, and unknown formats", () => {
    assert.throws(() => checkImageHeader(pngHeader(8000, 8000)), AvatarError);
    assert.throws(() => checkImageHeader(jpegHeader(MAX_SIDE + 1, 10)), AvatarError);
    assert.throws(() => checkImageHeader(pngHeader(4096, 4096)), AvatarError, "16.7 MP is over 16 MP");
    assert.throws(() => checkImageHeader(Buffer.from("BM........")), AvatarError);
    assert.doesNotThrow(() => checkImageHeader(jpegHeader(4000, 3000)));
  });
});

describe("placeholder secrets (low)", () => {
  test("the .env.example values are placeholders; real-looking ones are not", () => {
    for (const v of ["change-me-to-a-long-random-value", "change-me-to-a-32-byte-base64-value", "re_...", "sk-ant-...",
      "postgres://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres"]) {
      assert.equal(isPlaceholderSecret(v), true, v);
    }
    assert.equal(isPlaceholderSecret("q9F2v0e1Zr8yH7cJ0K3mN6pS9tW2xA5d"), false);
  });

  test("refused only in production", () => {
    const env = { AUTH_JWT_SECRET: "change-me-to-a-long-random-value", RESEND_API_KEY: "re_live123" };
    assert.deepEqual(placeholderSecrets({ ...env, NODE_ENV: "development" }), []);
    assert.deepEqual(placeholderSecrets({ ...env, NODE_ENV: "production" }), ["AUTH_JWT_SECRET"]);
    assert.throws(() => assertNoPlaceholderSecrets({ ...env, NODE_ENV: "production" }), /AUTH_JWT_SECRET/);
  });
});

describe("CORS (low)", () => {
  test("production allows no localhost origin by default; development does", () => {
    assert.ok(!allowedOriginsFor({ NODE_ENV: "production" }).some((o) => o.includes("localhost")));
    assert.ok(allowedOriginsFor({ NODE_ENV: "development" }).includes("http://localhost:8081"));
    assert.ok(allowedOriginsFor({ NODE_ENV: "production", ALLOWED_ORIGINS: "http://localhost:8081" }).includes("http://localhost:8081"));
  });
});

describe("replay binding (finding 3)", () => {
  const stored = { kind: "review", stage: "review", objective_id: "AAAAAAAA-0000-0000-0000-000000000001", question: "Q1" };
  test("same item matches (uuid case ignored); any other item does not", () => {
    assert.equal(replayMatches(stored, { kind: "review", stage: "review", objectiveId: "aaaaaaaa-0000-0000-0000-000000000001", question: "Q1" }), true);
    assert.equal(replayMatches(stored, { kind: "review", stage: "review", objectiveId: "aaaaaaaa-0000-0000-0000-000000000001", question: "Q2" }), false);
    assert.equal(replayMatches(stored, { kind: "quiz", stage: "discriminate", objectiveId: "aaaaaaaa-0000-0000-0000-000000000001" }), false);
    assert.equal(replayMatches(stored, { kind: "review", stage: "review", objectiveId: "bbbbbbbb-0000-0000-0000-000000000001" }), false);
    assert.equal(replayMatches({ kind: "unitcheck", unit_check_item_id: "x1" }, { kind: "unitcheck", unitCheckItemId: "x2" }), false);
  });
});

describe("malformed input answers 400 (low)", () => {
  test("readJson turns a bad body into a 400 through serverError", async () => {
    const req = new Request("http://t", { method: "POST", body: "{nope" });
    const err = await readJson(req).then(() => null, (e) => e);
    const res = serverError(err);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, INVALID_JSON);
  });

  test("database refusals of client input (bad uuid, NUL, too long) are 400; others stay 500", async () => {
    const orig = console.error;
    console.error = () => {};
    try {
      for (const code of ["22P02", "22021", "22P05", "22003", "22001"]) {
        const res = serverError(Object.assign(new Error("x"), { code }));
        assert.equal(res.status, 400, code);
        assert.equal((await res.json()).error, INVALID_INPUT);
      }
      assert.equal(serverError(Object.assign(new Error("x"), { code: "23505" })).status, 500);
      assert.equal(serverError(new Error("boom")).status, 500);
    } finally {
      console.error = orig;
    }
  });
});
